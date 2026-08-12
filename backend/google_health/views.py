from django.shortcuts import redirect, HttpResponse
from django.utils import timezone
from .oauth import GoogleOAuthService
from .models import Participant, GoogleAccount, Fitbit, SyncLog, Assignment, PhysiologicalData, Alert, VariableType
from decouple import config
from urllib.parse import urlencode
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.hashers import make_password
from django.db.models import Sum
from django.db import models
import json
import csv
import io
from datetime import datetime

User = get_user_model()

def _add_cors_headers(request, resp):
    """Añade cabeceras CORS en desarrollo permitiendo orígenes localhost dinámicos."""
    origin = request.META.get('HTTP_ORIGIN') or request.headers.get('Origin') if hasattr(request, 'headers') else None
    if origin and (origin.startswith('http://localhost') or origin.startswith('http://127.0.0.1')):
        resp['Access-Control-Allow-Origin'] = origin
        resp['Access-Control-Allow-Credentials'] = 'true'
        resp['Vary'] = 'Origin'
    return resp

def google_login_view(request):
    auth_url = GoogleOAuthService.get_authorization_url()
    return redirect(auth_url)

def google_callback_view(request):
    code = request.GET.get('code')
    if not code:
        return HttpResponse("No se encontró el código de autorización", status=400)

    token_data = GoogleOAuthService.exchange_code_for_tokens(code)
    if not token_data or 'access_token' not in token_data:
        error_detail = token_data.get('error') if isinstance(token_data, dict) else 'Unknown error'
        return HttpResponse(f"Error al intercambiar el código por tokens: {error_detail}", status=400)

    access_token = token_data.get('access_token')
    refresh_token = token_data.get('refresh_token') # Google solo lo manda la primera vez que se da consentimiento
    expires_in = token_data.get('expires_in', 3600)
    expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
    user_info_resp = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if user_info_resp.status_code == 200:
        email = user_info_resp.json().get('email')
    else:
        email = "unknown@senda.com"

    # buscamos si existe una GoogleAccount para este correo
    google_account = GoogleAccount.objects.filter(email=email).first()

    if google_account:
        # Si existe, reutilizamos su participante asociado
        participant = google_account.participant
    else:
        participant = Participant.objects.filter(email=email).first()
        if participant:
            participant.email = email
            participant.save(update_fields=['email'])
        else:
            # Si es nuevo, calculamos el siguiente código autoincremental
            total_participants = Participant.objects.count()
            next_code_num = total_participants + 1
            participant_code = f"SENDA_{next_code_num:03d}"

            participant = Participant.objects.create(
                participant_code=participant_code,
                email=email
            )

    google_account, created = GoogleAccount.objects.update_or_create(
        email=email,
        defaults={
            'participant': participant,
            'access_token': access_token,
            'refresh_token': refresh_token if refresh_token else (google_account.refresh_token if google_account else "EXISTING_REFRESH_TOKEN_PLACEHOLDER"),
            'access_token_expiration': expires_at,
            'authentication_status': 'ACTIVE'
        }
    )
    action_text = "creado" if created else "actualizado"
    print(f"¡Autorización exitosa! Cuenta vinculada al participante {participant.participant_code} ({action_text}).")
    frontend_url = config("FRONTEND_URL", default="http://localhost:5174").rstrip('/')
    query = urlencode({
        'oauth': 'success',
        'participant_code': participant.participant_code,
    })
    return redirect(f"{frontend_url}/?{query}")
    


@csrf_exempt
def api_participants(request):
    """Devuelve y crea participantes pre-registrados en la aplicación."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method == 'GET':
        participants = Participant.objects.all().order_by('participant_code')
        data = []
        for p in participants:
            try:
                g_account = p.google_account
            except GoogleAccount.DoesNotExist:
                g_account = None

            data.append({
                'participant_code': p.participant_code,
                'email': p.email,
                'access_token': g_account.access_token if g_account else None,
                'refresh_token': g_account.refresh_token if g_account else None,
                'access_token_expiration': g_account.access_token_expiration.isoformat() if g_account and g_account.access_token_expiration else None,
                'authentication_status': g_account.authentication_status if g_account else 'PENDING',
            })
        return _json_response(request, {'count': len(data), 'items': data})

    if request.method == 'DELETE':
        # Eliminar participante por participant_code (body JSON) o por query param
        try:
            if request.body:
                payload = json.loads(request.body.decode('utf-8'))
            else:
                payload = {}
        except Exception:
            payload = {}

        participant_code = payload.get('participant_code') or request.GET.get('participant_code')
        if not participant_code:
            return _validation_error(request, 'missing_participant_code')

        participant = Participant.objects.filter(participant_code=participant_code).first()
        if not participant:
            return _json_response(request, {'ok': False, 'error': 'Participant not found'}, status=404)

        participant.delete()
        return _json_response(request, {'ok': True, 'deleted': participant_code})

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception:
            return _validation_error(request, 'invalid_json')

        email = payload.get('email')
        password = payload.get('password')

        if not email:
            return _validation_error(request, 'missing_email')
        if not password:
            return _validation_error(request, 'missing_password')

        if Participant.objects.filter(email__iexact=email).exists():
            return _validation_error(request, 'Email ya registrado', status=409)

        total_participants = Participant.objects.count()
        next_code_num = total_participants + 1
        participant_code = f"SENDA_{next_code_num:03d}"
        while Participant.objects.filter(participant_code=participant_code).exists():
            next_code_num += 1
            participant_code = f"SENDA_{next_code_num:03d}"

        participant = Participant(participant_code=participant_code, email=email)
        participant.set_password(password)
        participant.save()

        GoogleAccount.objects.get_or_create(
            participant=participant,
            defaults={
                'email': email,
                'access_token': '',
                'refresh_token': '',
                'access_token_expiration': None,
                'authentication_status': 'PENDING',
            }
        )

        return _json_response(request, {
            'participant_code': participant.participant_code,
            'email': participant.email,
            'access_token': '',
            'refresh_token': '',
            'access_token_expiration': None,
            'authentication_status': 'PENDING',
        }, status=201)

    return _validation_error(request, 'method_not_allowed', status=405)



@csrf_exempt
def api_participants_list(request):
    """Devuelve solo los códigos de los participantes."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    codes = list(Participant.objects.values_list('participant_code', flat=True).order_by('participant_code'))
    return _json_response(request, {'items': codes})


@csrf_exempt
def api_fitbits_list(request):
    """Devuelve solo los códigos de los fitbits."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    codes = list(Fitbit.objects.values_list('fitbit_code', flat=True).order_by('fitbit_code'))
    return _json_response(request, {'items': codes})


def api_fitbits(request):
    """Devuelve pulseras y su estado operativo."""
    fitbits = []
    for f in Fitbit.objects.all():
        status = f.operational_status
        fitbits.append({
            'fitbit_code': f.fitbit_code,
            'status': status,
        })

    counts = {
        'in_use': sum(1 for f in fitbits if f['status'] == 'IN_USE'),
        'free': sum(1 for f in fitbits if f['status'] == 'FREE'),
        'maintenance': sum(1 for f in fitbits if f['status'] == 'MAINTENANCE'),
        'inactive': sum(1 for f in fitbits if f['status'] == 'INACTIVE'),
    }
    resp = JsonResponse({'count': len(fitbits), 'items': fitbits, 'counts': counts})
    return _add_cors_headers(request, resp)


@csrf_exempt
def api_fitbits_create(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return _validation_error(request, 'invalid_json')

    fitbit_code = payload.get('fitbit_code')
    status = payload.get('status') or 'FREE'

    if not fitbit_code:
        return _validation_error(request, 'missing_fitbit_code')

    if Fitbit.objects.filter(fitbit_code=fitbit_code).exists():
        return _validation_error(request, 'Fitbit code already exists', status=409)

    fb = Fitbit.objects.create(fitbit_code=fitbit_code, status=status)
    return _json_response(request, {'ok': True, 'fitbit_code': fb.fitbit_code, 'status': fb.status}, status=201)


@csrf_exempt
def api_fitbits_delete(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'DELETE, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'DELETE':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        payload = {}

    fitbit_code = payload.get('fitbit_code') or request.GET.get('fitbit_code')
    if not fitbit_code:
        return _validation_error(request, 'missing_fitbit_code')

    fb = Fitbit.objects.filter(fitbit_code=fitbit_code).first()
    if not fb:
        return _json_response(request, {'ok': False, 'error': 'Fitbit not found'}, status=404)

    fb.delete()
    return _json_response(request, {'ok': True, 'deleted': fitbit_code})


@csrf_exempt
def api_assignments(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)

    assignments = Assignment.objects.select_related('participant', 'fitbit').order_by('-start_date')
    items = [
        {
            'id': str(assignment.id),
            'participant_code': assignment.participant.participant_code if assignment.participant else None,
            'fitbit_code': assignment.fitbit.fitbit_code if assignment.fitbit else None,
            'start_date': assignment.start_date.isoformat() if assignment.start_date else None,
            'estimated_end_date': assignment.estimated_end_date.isoformat() if assignment.estimated_end_date else None,
            'real_end_date': assignment.real_end_date.isoformat() if assignment.real_end_date else None,
            'status': assignment.status if hasattr(assignment, 'status') else 'ACTIVE',
        }
        for assignment in assignments
    ]
    return _json_response(request, {'count': len(items), 'items': items})


@csrf_exempt
def api_assignments_create(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return _validation_error(request, 'invalid_json')

    participant_code = payload.get('participant_code')
    fitbit_code = payload.get('fitbit_code')
    start_date_str = payload.get('start_date')
    estimated_end_date_str = payload.get('estimated_end_date')
    real_end_date_str = payload.get('real_end_date')

    if not participant_code or not fitbit_code or not start_date_str:
        return _validation_error(request, 'missing_required_fields')

    participant = Participant.objects.filter(participant_code=participant_code).first()
    fitbit = Fitbit.objects.filter(fitbit_code=fitbit_code).first()

    if not participant or not fitbit:
        return _validation_error(request, 'Participant or Fitbit not found', status=404)

    try:
        # Convertir y asegurar zona horaria consciente (timezone-aware)
        tz = timezone.get_current_timezone()
        
        start_date = datetime.fromisoformat(start_date_str)
        if timezone.is_naive(start_date):
            start_date = timezone.make_aware(start_date, tz)

        estimated_end_date = None
        if estimated_end_date_str:
            estimated_end_date = datetime.fromisoformat(estimated_end_date_str)
            if timezone.is_naive(estimated_end_date):
                estimated_end_date = timezone.make_aware(estimated_end_date, tz)

        real_end_date = None
        if real_end_date_str:
            real_end_date = datetime.fromisoformat(real_end_date_str)
            if timezone.is_naive(real_end_date):
                real_end_date = timezone.make_aware(real_end_date, tz)

        assignment = Assignment.objects.create(
            participant=participant,
            fitbit=fitbit,
            start_date=start_date,
            estimated_end_date=estimated_end_date,
            real_end_date=real_end_date,
        )
    except Exception as e:
        return _validation_error(request, str(e), status=400)

    return _json_response(request, {
        'ok': True,
        'id': str(assignment.id),
        'status': assignment.status
    }, status=201)


@csrf_exempt
def api_physiological_data(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)

    participant_code = request.GET.get('participant')
    fitbit_code = request.GET.get('fitbit')         
    variable_type = request.GET.get('variable_type')      
    date_from = request.GET.get('from')
    date_to = request.GET.get('to')

    qs = PhysiologicalData.objects.select_related('assignment__participant', 'assignment__fitbit')
    
    if participant_code:
        qs = qs.filter(assignment__participant__participant_code=participant_code)
        
    if fitbit_code:                                  
        qs = qs.filter(assignment__fitbit__fitbit_code=fitbit_code)
        
    if variable_type:                                
        qs = qs.filter(variable_type=variable_type)

    if date_from:
        try:
            qs = qs.filter(physical_time__gte=datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            qs = qs.filter(physical_time__lte=datetime.fromisoformat(date_to))
        except ValueError:
            pass

    items = [
        {
            'participant_code': item.assignment.participant.participant_code,
            'fitbit_code': item.assignment.fitbit.fitbit_code,
            'variable_type': item.variable_type,
            'physical_time': item.physical_time.isoformat(),
            'metric_value': item.metric_value,
        }
        for item in qs.order_by('-physical_time')[:200]
    ]
    return _json_response(request, {'count': len(items), 'items': items})


@csrf_exempt
def api_variable_types_list(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    
    variables = [{'code': choice[0], 'label': choice[1]} for choice in VariableType.choices]
    resp = JsonResponse({'items': variables})
    return _add_cors_headers(request, resp)


@csrf_exempt
def api_alerts(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)

    alerts = Alert.objects.select_related('assignment__participant', 'google_account').order_by('-created_at')[:100]
    items = [
        {
            'id': str(alert.id),
            'message': alert.message,
            'priority': alert.priority,
            'type': alert.alert_type,
            'resolved': alert.resolved,
            'participant_code': alert.assignment.participant.participant_code if alert.assignment else None,
            'email': alert.google_account.email if alert.google_account else None,
            'created_at': alert.created_at.isoformat(),
        }
        for alert in alerts
    ]
    return _json_response(request, {'count': len(items), 'items': items})


@csrf_exempt
def api_export(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)

    export_type = request.GET.get('type')
    export_format = request.GET.get('format', 'csv') 

    rows = []

    if export_type == 'participants':
        rows.append(['participant_code', 'email', 'authentication_status'])
        for account in GoogleAccount.objects.select_related('participant'):
            rows.append([account.participant.participant_code, account.email, account.authentication_status])
        file_root = 'participants'
        
    elif export_type == 'fitbits':
        rows.append(['fitbit_code', 'status', 'assigned_participant'])
        for fitbit in Fitbit.objects.all():
            assignment = fitbit.assignments.filter(real_end_date__isnull=True).order_by('-start_date').first()
            assigned = assignment.participant.participant_code if assignment else ''
            rows.append([fitbit.fitbit_code, fitbit.status, assigned])
        file_root = 'fitbits'
        
    elif export_type == 'syncs':
        rows.append(['sync_date', 'email', 'result', 'downloaded_records'])
        for log in SyncLog.objects.select_related('google_account').order_by('-sync_date'):
            rows.append([log.sync_date.isoformat(), log.google_account.email if log.google_account else '', log.result, log.downloaded_records])
        file_root = 'syncs'
        
    elif export_type == 'physiological':
        rows.append(['participant_code', 'fitbit_code', 'variable_type', 'physical_time', 'metric_value'])
        
        participant_code = request.GET.get('participant')
        fitbit_code = request.GET.get('fitbit')            
        variable_type = request.GET.get('variable_type')       
        date_from = request.GET.get('from')
        date_to = request.GET.get('to')
        status_filter = request.GET.get('status') # ACTIVE o COMPLETED

        qs = PhysiologicalData.objects.select_related('assignment__participant', 'assignment__fitbit')
        
        if participant_code:
            qs = qs.filter(assignment__participant__participant_code=participant_code)
        if fitbit_code:                                    
            qs = qs.filter(assignment__fitbit__fitbit_code=fitbit_code)
        if variable_type:                                    
            qs = qs.filter(variable_type=variable_type)
        if date_from:
            try:
                qs = qs.filter(physical_time__gte=datetime.fromisoformat(date_from))
            except ValueError:
                pass
        if date_to:
            try:
                qs = qs.filter(physical_time__lte=datetime.fromisoformat(date_to))
            except ValueError:
                pass

        now = timezone.now()
        if status_filter and status_filter != 'ALL':
            valid_participants = []
            for p in Participant.objects.all():
                assign = Assignment.objects.filter(participant=p).order_by('-start_date').first()
                
                if not assign:
                    p_status = 'PENDING'
                elif assign.real_end_date:
                    p_status = 'COMPLETED'
                else:
                    p_status = 'ACTIVE'
                
                if p_status == status_filter:
                    valid_participants.append(p.participant_code)
            
            qs = qs.filter(assignment__participant__participant_code__in=valid_participants)

        from zoneinfo import ZoneInfo
        local_tz = ZoneInfo("Europe/Madrid")

        for item in qs.order_by('-physical_time')[:5000]:
            p_code = item.assignment.participant.participant_code if item.assignment and item.assignment.participant else ''
            f_code = item.assignment.fitbit.fitbit_code if item.assignment and item.assignment.fitbit else ''
            # Convertimos la fecha UTC de la base de datos a hora local de España
            local_time = item.physical_time.astimezone(local_tz)
            rows.append([p_code, f_code, item.variable_type, local_time.isoformat(), item.metric_value])
        
        # Construcción del nombre del archivo
        name_parts = []
        if participant_code:
            name_parts.append(participant_code)
        if variable_type:
            name_parts.append(variable_type.lower())
        if status_filter and status_filter != 'ALL':
            name_parts.append(status_filter.lower())
            
        file_root = "_".join(name_parts) if name_parts else 'physiological_data'
        
    else:
        return _validation_error(request, 'invalid_export_type', status=400)

    if export_format == 'xlsx':
        import openpyxl
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Datos"

        for row in rows:
            ws.append(row)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{file_root}.xlsx"'
    else:
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8-sig', newline='')
        writer = csv.writer(wrapper, delimiter=';')
        
        for row in rows:
            writer.writerow(row)
        
        wrapper.flush()
        output.seek(0)
            
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{file_root}.csv"'

    return _add_cors_headers(request, response)


@csrf_exempt
def api_synclogs(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    syncs = SyncLog.objects.select_related('google_account').order_by('-sync_date')[:100]
    items = [
        {
            'id': str(log.id),
            'sync_date': log.sync_date.isoformat() if log.sync_date else None,
            'email': log.google_account.email if log.google_account else None,
            'result': log.result,
            'downloaded_records': log.downloaded_records,
        }
        for log in syncs
    ]
    total_records = syncs.aggregate(Sum('downloaded_records'))['downloaded_records__sum'] or 0
    return _json_response(request, {'count': len(items), 'total_records': total_records, 'items': items})


def _json_response(request, payload, status=200):
    resp = JsonResponse(payload, status=status)
    return _add_cors_headers(request, resp)


def _validation_error(request, message, status=400):
    return _json_response(request, {'ok': False, 'error': message}, status=status)


def _admin_required(request):
    return request.user.is_authenticated and request.user.is_superuser


def _researcher_required(request):
    return request.user.is_authenticated and not request.user.is_superuser


@csrf_exempt
def api_auth_status(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    data = {
        'authenticated': request.user.is_authenticated,
        'username': request.user.username if request.user.is_authenticated else None,
        'is_superuser': request.user.is_authenticated and request.user.is_superuser,
        'is_researcher': request.user.is_authenticated and not request.user.is_superuser,
    }
    return _json_response(request, data)


@csrf_exempt
def api_researcher_login(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        participants = Participant.objects.all().order_by('participant_code')
        data = []
        for p in participants:
            # Try to use related GoogleAccount, or find one by email if not linked
            ga = getattr(p, 'google_account', None)
            if not ga and p.email:
                ga = GoogleAccount.objects.filter(email=p.email).first()
                if ga and ga.participant_id != p.id:
                    # Link it so future queries are consistent
                    ga.participant = p
                    ga.save(update_fields=['participant'])

            access_token_expiration = None
            authentication_status = 'PENDING'
            if ga:
                access_token_expiration = ga.access_token_expiration.isoformat() if getattr(ga, 'access_token_expiration', None) else None
                authentication_status = ga.authentication_status or authentication_status

            data.append({
                'participant_code': p.participant_code,
                'email': p.email,
                'access_token_expiration': access_token_expiration,
                'authentication_status': authentication_status,
            })
        return _validation_error(request, 'missing_credentials')

    user = authenticate(request, username=email, password=password)
    if user is None or user.is_superuser or not user.is_active:
        return _validation_error(request, 'invalid_credentials', status=401)

    login(request, user)
    return _json_response(request, {'ok': True, 'username': user.username, 'is_researcher': True})


@csrf_exempt
def api_logout(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _validation_error(request, 'method_not_allowed', status=405)

    logout(request)
    return _json_response(request, {'ok': True})


@csrf_exempt
def api_dashboard(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)

    participants_count = Participant.objects.count()
    fitbits = list(Fitbit.objects.all())
    active_fitbits = sum(1 for f in fitbits if f.operational_status == 'IN_USE')
    free_fitbits = sum(1 for f in fitbits if f.operational_status == 'FREE')
    maintenance_fitbits = sum(1 for f in fitbits if f.operational_status == 'MAINTENANCE')
    sync_logs = SyncLog.objects.all()
    success_count = sync_logs.filter(result__icontains='success').count()
    error_count = sync_logs.exclude(result__icontains='success').count()
    total_records = sync_logs.aggregate(Sum('downloaded_records'))['downloaded_records__sum'] or 0
    alerts_count = Alert.objects.filter(resolved=False).count()

    return _json_response(request, {
        'participants_count': participants_count,
        'active_fitbits': active_fitbits,
        'free_fitbits': free_fitbits,
        'maintenance_fitbits': maintenance_fitbits,
        'sync_success': success_count,
        'sync_error': error_count,
        'total_records': total_records,
        'alerts_count': alerts_count,
    })


@csrf_exempt
def api_admin_create_researcher(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _validation_error(request, 'method_not_allowed', status=405)
    if not _admin_required(request):
        return _validation_error(request, 'not_authorized', status=403)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return _validation_error(request, 'invalid_json')

    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        return _validation_error(request, 'missing_credentials')

    if User.objects.filter(username=email).exists():
        return _validation_error(request, 'Ya existe un usuario con ese correo/contraseña', status=409)

    User.objects.create_user(username=email, email=email, password=password, is_active=True)
    return _json_response(request, {'ok': True, 'email': email})


@csrf_exempt
def api_admin_researchers(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'GET':
        return _validation_error(request, 'method_not_allowed', status=405)
    if not _admin_required(request):
        return _validation_error(request, 'not_authorized', status=403)

    users = User.objects.filter(is_superuser=False).order_by('-date_joined')
    items = [
        {'email': user.email, 'created_at': user.date_joined.isoformat(), 'is_active': user.is_active}
        for user in users
    ]
    return _json_response(request, {'count': len(items), 'items': items})


@csrf_exempt
def api_admin_login(request):
    """Autentica un administrador usando username/password y crea sesión para /admin/.
    Se espera POST con JSON {username, password}.
    """
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        resp = JsonResponse({'ok': False, 'error': 'method_not_allowed'}, status=405)
        return _add_cors_headers(request, resp)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        resp = JsonResponse({'ok': False, 'error': 'invalid_json'}, status=400)
        return _add_cors_headers(request, resp)

    username = payload.get('username')
    password = payload.get('password')
    if not username or not password:
        resp = JsonResponse({'ok': False, 'error': 'missing_credentials'}, status=400)
        return _add_cors_headers(request, resp)

    user = authenticate(request, username=username, password=password)
    if user is None:
        resp = JsonResponse({'ok': False, 'error': 'invalid_credentials'}, status=401)
        return _add_cors_headers(request, resp)

    if not user.is_active or not user.is_superuser:
        resp = JsonResponse({'ok': False, 'error': 'No tiene permisos'}, status=403)
        return _add_cors_headers(request, resp)

    login(request, user)
    resp = JsonResponse({'ok': True, 'username': user.username, 'is_superuser': user.is_superuser})
    return _add_cors_headers(request, resp)




