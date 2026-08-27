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
import random
from django.core.cache import cache
from django.core.mail import send_mail, EmailMultiAlternatives
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.urls import reverse
from django.conf import settings
from collections import defaultdict

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

    # Buscamos primero si la cuenta ya existe de forma segura
    existing_account = GoogleAccount.objects.filter(email=email).first()
    
    # Determinamos el refresh token definitivo: si Google manda uno nuevo, lo usamos. 
    # Si no, mantenemos el que ya tuviéramos guardado en la base de datos (o vacío si era totalmente nueva).
    if refresh_token:
        final_refresh_token = refresh_token
    elif existing_account and existing_account.refresh_token:
        final_refresh_token = existing_account.refresh_token
    else:
        final_refresh_token = ""

    google_account, created = GoogleAccount.objects.update_or_create(
        email=email,
        defaults={
            'participant': participant,
            'access_token': access_token,
            'refresh_token': final_refresh_token,
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
    """Devuelve pulseras y su estado operativo calculado según las asignaciones activas."""
    now = timezone.now()
    fitbits = []
    
    for f in Fitbit.objects.all():
        has_active_assignment = f.assignments.filter(
            models.Q(real_end_date__isnull=True) | models.Q(real_end_date__gt=now),
            start_date__lte=now
        ).exists()

        # Si está en mantenimiento o inactiva manualmente, respetamos ese estado
        if f.status in ['MAINTENANCE', 'INACTIVE']:
            operational_status = f.status
        else:
            operational_status = 'IN_USE' if has_active_assignment else 'FREE'
            
            if f.status != operational_status:
                f.status = operational_status
                f.save(update_fields=['status'])

        fitbits.append({
            'fitbit_code': f.fitbit_code,
            'status': operational_status,
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
def api_fitbits_update_status(request):
    """Permite cambiar manualmente el estado operativo de una Fitbit (FREE, IN_USE, MAINTENANCE, INACTIVE)."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
        fitbit_code = payload.get('fitbit_code')
        new_status = payload.get('status')
        
        if not fitbit_code or not new_status:
            return _validation_error(request, 'missing_required_fields', status=400)
            
        valid_statuses = ['FREE', 'IN_USE', 'MAINTENANCE', 'INACTIVE']
        if new_status not in valid_statuses:
            return _validation_error(request, 'invalid_status', status=400)

        fitbit = Fitbit.objects.filter(fitbit_code=fitbit_code).first()
        if not fitbit:
            return _validation_error(request, 'Fitbit not found', status=404)

        fitbit.status = new_status
        fitbit.save(update_fields=['status'])

        return _json_response(request, {'ok': True, 'fitbit_code': fitbit.fitbit_code, 'status': fitbit.status})
    except Exception as e:
        return _validation_error(request, str(e), status=400)


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
    now = timezone.now()
    
    items = []
    for assignment in assignments:
        if not assignment.real_end_date:
            status = 'ACTIVE'
        elif assignment.real_end_date > now:
            status = 'ACTIVE'  # Sigue activo si la fecha de fin real aún no ha ocurrido
        else:
            status = 'COMPLETED'

        items.append({
            'id': str(assignment.id),
            'participant_code': assignment.participant.participant_code if assignment.participant else None,
            'fitbit_code': assignment.fitbit.fitbit_code if assignment.fitbit else None,
            'start_date': assignment.start_date.isoformat() if assignment.start_date else None,
            'estimated_end_date': assignment.estimated_end_date.isoformat() if assignment.estimated_end_date else None,
            'real_end_date': assignment.real_end_date.isoformat() if assignment.real_end_date else None,
            'status': status,
        })
        
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
def api_assignments_update(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
        assignment_id = payload.get('id')
        assignment = Assignment.objects.get(id=assignment_id)
        assignment.start_date = datetime.fromisoformat(payload.get('start_date'))
        assignment.estimated_end_date = datetime.fromisoformat(payload.get('estimated_end_date')) if payload.get('estimated_end_date') else None
        real_end = payload.get('real_end_date')
        assignment.real_end_date = datetime.fromisoformat(real_end) if real_end else None
        assignment.save()
        return _json_response(request, {'ok': True})
    except Exception as e:
        return _validation_error(request, str(e), status=400)


@csrf_exempt
def api_assignments_delete(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
        assignment_id = payload.get('id')
        
        if not assignment_id:
            return _validation_error(request, 'missing_id', status=400)
            
        assignment = Assignment.objects.get(id=assignment_id)
        assignment.delete()
        
        return _json_response(request, {'ok': True, 'message': 'Asignación eliminada correctamente'})
    except Assignment.DoesNotExist:
        return _validation_error(request, 'assignment_not_found', status=404)
    except Exception as e:
        return _validation_error(request, str(e), status=400)


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
    status_filter = request.GET.get('status')

    qs = PhysiologicalData.objects.select_related(
        'assignment__participant',
        'assignment__fitbit'
    )

    # -----------------------------------------------------
    # FILTRAR POR PARTICIPANTE
    # -----------------------------------------------------
    if participant_code:
        codes = [
            c.strip()
            for c in participant_code.split(',')
            if c.strip()
        ]

        qs = qs.filter(
            assignment__participant__participant_code__in=codes
        )

    # -----------------------------------------------------
    # FILTRAR POR FITBIT
    # -----------------------------------------------------
    if fitbit_code:
        f_codes = [
            f.strip()
            for f in fitbit_code.split(',')
            if f.strip()
        ]

        qs = qs.filter(
            assignment__fitbit__fitbit_code__in=f_codes
        )

    # -----------------------------------------------------
    # FILTRAR POR VARIABLE
    # -----------------------------------------------------
    if variable_type:
        vars_list = [
            v.strip()
            for v in variable_type.split(',')
            if v.strip()
        ]

        qs = qs.filter(variable_type__in=vars_list)

    # -----------------------------------------------------
    # FILTRAR POR FECHAS
    # -----------------------------------------------------
    if date_from:
        try:
            qs = qs.filter(
                physical_time__gte=datetime.fromisoformat(date_from)
            )
        except ValueError:
            pass

    if date_to:
        try:
            qs = qs.filter(
                physical_time__lte=datetime.fromisoformat(date_to)
            )
        except ValueError:
            pass

    # -----------------------------------------------------
    # FILTRAR POR ESTADO DEL PARTICIPANTE
    # -----------------------------------------------------
    if status_filter and status_filter != 'ALL':
        valid_participants = []

        for participant in Participant.objects.all():

            assignment = (
                Assignment.objects
                .filter(participant=participant)
                .order_by('-start_date')
                .first()
            )

            if not assignment:
                p_status = 'PENDING'

            elif (
                assignment.real_end_date
                and assignment.real_end_date <= timezone.now()
            ):
                p_status = 'COMPLETED'

            elif assignment.start_date > timezone.now():
                p_status = 'PENDING'

            else:
                p_status = 'ACTIVE'

            if p_status == status_filter:
                valid_participants.append(
                    participant.participant_code
                )

        qs = qs.filter(
            assignment__participant__participant_code__in=valid_participants
        )

    # =====================================================
    # ACUMULACIÓN DE STEPS Y DISTANCE POR DÍA
    # =====================================================

    # Obtenemos los 500 registros más recientes de la base de datos (orden descendente)
    recent_qs = qs.order_by('-physical_time')[:500]
    records = list(recent_qs)
    records.sort(key=lambda x: x.physical_time)

    accumulated_values = defaultdict(float)
    items = []

    for item in records:
        participant = item.assignment.participant.participant_code
        fitbit = item.assignment.fitbit.fitbit_code
        variable = item.variable_type
        day = timezone.localtime(item.physical_time).date()
        value = item.metric_value

        accumulation_key = (
            participant,
            fitbit,
            variable,
            day
        )

        # Solo acumulamos STEPS y DISTANCE de forma progresiva
        if variable in [
            VariableType.STEPS,
            VariableType.DISTANCE
        ]:
            if value is not None:
                accumulated_values[accumulation_key] += float(value)

            display_value = accumulated_values[accumulation_key]
        else:
            display_value = value

        items.append({
            'participant_code': participant,
            'fitbit_code': fitbit,
            'variable_type': variable,
            'physical_time': item.physical_time.isoformat(),
            'metric_value': display_value,
        })

    items.reverse()

    return _json_response(
        request,
        {
            'count': len(items),
            'items': items
        }
    )


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
        return _validation_error(
            request,
            'method_not_allowed',
            status=405
        )

    status_filter = request.GET.get('status', 'ALL')
    priority_filter = request.GET.get('priority', 'ALL')
    participant_filter = request.GET.get('participant', '').strip()
    alert_type_filter = request.GET.get('type', 'ALL')

    alerts = (
        Alert.objects
        .select_related(
            'assignment__participant',
            'assignment__fitbit',
            'google_account'
        )
    )

    # ----------------------------------------
    # FILTRO POR ESTADO
    # ----------------------------------------

    if status_filter == 'ACTIVE':
        alerts = alerts.filter(resolved=False)

    elif status_filter == 'RESOLVED':
        alerts = alerts.filter(resolved=True)

    # ----------------------------------------
    # FILTRO POR PRIORIDAD
    # ----------------------------------------

    if priority_filter in ['HIGH', 'MEDIUM']:
        alerts = alerts.filter(priority=priority_filter)

    # ----------------------------------------
    # FILTRO POR TIPO DE ALERTA
    # ----------------------------------------

    if alert_type_filter != 'ALL':
        alerts = alerts.filter(alert_type=alert_type_filter)

    # ----------------------------------------
    # FILTRO POR PARTICIPANTE
    # ----------------------------------------

    if participant_filter:
        alerts = alerts.filter(
            assignment__participant__participant_code__icontains=participant_filter
        )

    # ----------------------------------------
    # ORDEN
    # Activas primero y más recientes primero
    # ----------------------------------------

    alerts = alerts.order_by(
        'resolved',
        '-last_detected_at'
    )[:500]

    items = []

    for alert in alerts:

        participant_code = None
        fitbit_code = None

        if alert.assignment:
            if alert.assignment.participant:
                participant_code = (
                    alert.assignment.participant.participant_code
                )

            if alert.assignment.fitbit:
                fitbit_code = (
                    alert.assignment.fitbit.fitbit_code
                )

        items.append({
            'id': str(alert.id),

            'type': alert.alert_type,
            'type_label': alert.get_alert_type_display(),

            'message': alert.message,
            'priority': alert.priority,

            'resolved': alert.resolved,

            'participant_code': participant_code,

            'fitbit_code': fitbit_code,

            'email': (
                alert.google_account.email
                if alert.google_account
                else None
            ),

            'details': alert.details or {},

            'first_detected_at': (
                alert.first_detected_at.isoformat()
                if alert.first_detected_at
                else None
            ),

            'last_detected_at': (
                alert.last_detected_at.isoformat()
                if alert.last_detected_at
                else None
            ),

            'created_at': (
                alert.created_at.isoformat()
                if alert.created_at
                else None
            ),

            'resolved_at': (
                alert.resolved_at.isoformat()
                if alert.resolved_at
                else None
            ),
        })

    return _json_response(
        request,
        {
            'count': len(items),
            'items': items,
        }
    )

@csrf_exempt
def api_resolve_alert(request, alert_id):

    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'POST':
        return _validation_error(
            request,
            'method_not_allowed',
            status=405
        )

    try:
        alert = Alert.objects.get(id=alert_id)

        if alert.resolved:
            return _json_response(
                request,
                {
                    'ok': True,
                    'already_resolved': True,
                    'message': 'La alerta ya estaba resuelta'
                }
            )

        alert.resolved = True
        alert.resolved_at = timezone.now()

        alert.save(
            update_fields=[
                'resolved',
                'resolved_at'
            ]
        )

        return _json_response(
            request,
            {
                'ok': True,
                'message': 'Alerta marcada como resuelta correctamente',
                'resolved_at': alert.resolved_at.isoformat()
            }
        )

    except Alert.DoesNotExist:
        return _validation_error(
            request,
            'alert_not_found',
            status=404
        )


@csrf_exempt
def api_export(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)

    if request.method != 'GET':
        return _validation_error(
            request,
            'method_not_allowed',
            status=405
        )

    export_type = request.GET.get('type')
    export_format = request.GET.get('format', 'csv')

    rows = []

    # =========================================================
    # PARTICIPANTES
    # =========================================================

    if export_type == 'participants':

        rows.append([
            'participant_code',
            'email',
            'authentication_status'
        ])

        for account in GoogleAccount.objects.select_related('participant'):
            rows.append([
                account.participant.participant_code,
                account.email,
                account.authentication_status
            ])

        file_root = 'participants'

    # =========================================================
    # FITBITS
    # =========================================================

    elif export_type == 'fitbits':

        rows.append([
            'fitbit_code',
            'status',
            'assigned_participant'
        ])

        for fitbit in Fitbit.objects.all():

            assignment = (
                fitbit.assignments
                .filter(real_end_date__isnull=True)
                .order_by('-start_date')
                .first()
            )

            assigned = (
                assignment.participant.participant_code
                if assignment
                else ''
            )

            rows.append([
                fitbit.fitbit_code,
                fitbit.status,
                assigned
            ])

        file_root = 'fitbits'

    # =========================================================
    # SINCRONIZACIONES
    # =========================================================

    elif export_type == 'syncs':

        rows.append([
            'sync_date',
            'email',
            'result',
            'downloaded_records'
        ])

        for log in (
            SyncLog.objects
            .select_related('google_account')
            .order_by('-sync_date')
        ):
            rows.append([
                log.sync_date.isoformat(),
                log.google_account.email
                if log.google_account
                else '',
                log.result,
                log.downloaded_records
            ])

        file_root = 'syncs'

    # =========================================================
    # DATOS FISIOLÓGICOS
    # =========================================================

    elif export_type == 'physiological':

        participant_code = request.GET.get('participant')
        fitbit_code = request.GET.get('fitbit')
        variable_type = request.GET.get('variable_type')
        date_from = request.GET.get('from')
        date_to = request.GET.get('to')
        status_filter = request.GET.get('status')

        qs = (
            PhysiologicalData.objects
            .select_related(
                'assignment__participant',
                'assignment__fitbit'
            )
        )

        # -----------------------------------------------------
        # FILTRO PARTICIPANTE
        # -----------------------------------------------------

        if participant_code:
            codes = [c.strip() for c in participant_code.split(',') if c.strip()]
            qs = qs.filter(
                assignment__participant__participant_code__in=codes
            )

        # -----------------------------------------------------
        # FILTRO FITBIT
        # -----------------------------------------------------

        if fitbit_code:
            f_codes = [f.strip() for f in fitbit_code.split(',') if f.strip()]
            qs = qs.filter(
                assignment__fitbit__fitbit_code__in=f_codes
            )

        # -----------------------------------------------------
        # FILTRO VARIABLE
        # -----------------------------------------------------

        if variable_type:
            vars_list = [v.strip() for v in variable_type.split(',') if v.strip()]
            qs = qs.filter(
                variable_type__in=vars_list
            )

        # -----------------------------------------------------
        # FILTRO FECHA DESDE
        # -----------------------------------------------------

        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from)

                qs = qs.filter(
                    physical_time__date__gte=date_from_obj.date()
                )

            except ValueError:
                pass

        # -----------------------------------------------------
        # FILTRO FECHA HASTA
        # -----------------------------------------------------

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to)

                qs = qs.filter(
                    physical_time__date__lte=date_to_obj.date()
                )

            except ValueError:
                pass

        # -----------------------------------------------------
        # FILTRO POR ESTADO DEL PARTICIPANTE
        # -----------------------------------------------------

        if status_filter and status_filter != 'ALL':

            valid_participants = []

            for participant in Participant.objects.all():

                assignment = (
                    Assignment.objects
                    .filter(participant=participant)
                    .order_by('-start_date')
                    .first()
                )

                if not assignment:
                    participant_status = 'PENDING'

                elif assignment.real_end_date:
                    participant_status = 'COMPLETED'

                elif assignment.start_date > timezone.now():
                    participant_status = 'PENDING'

                else:
                    participant_status = 'ACTIVE'

                if participant_status == status_filter:
                    valid_participants.append(
                        participant.participant_code
                    )

            qs = qs.filter(
                assignment__participant__participant_code__in=
                valid_participants
            )

        # =====================================================
        # CONSTRUCCIÓN DE TABLA PIVOT
        # =====================================================

        from zoneinfo import ZoneInfo

        local_tz = ZoneInfo("Europe/Madrid")

        pivot_data = {}
        variables_found = set()

        for item in qs.order_by('-physical_time')[:5000]:

            if not item.assignment:
                continue

            participant = item.assignment.participant
            fitbit = item.assignment.fitbit

            if not participant or not fitbit:
                continue

            participant_code_value = participant.participant_code
            fitbit_code_value = fitbit.fitbit_code

            # -------------------------------------------------
            # Convertir UTC -> Europe/Madrid
            # -------------------------------------------------

            local_time = item.physical_time.astimezone(local_tz)
            time_key = local_time.replace(microsecond=0)

            # -------------------------------------------------
            # CLAVE DE LA FILA
            # -------------------------------------------------

            row_key = (
                participant_code_value,
                fitbit_code_value,
                time_key
            )

            if row_key not in pivot_data:

                pivot_data[row_key] = {
                    'participant_code': participant_code_value,
                    'fitbit_code': fitbit_code_value,
                    'physical_time': time_key,
                    'variables': {}
                }

            # -------------------------------------------------
            # VARIABLE -> VALOR
            # -------------------------------------------------

            val = item.metric_value

            if val is not None and float(val) > 0:
                try:
                    num_val = float(val)

                    # Convertimos a texto para que CSV y XLSX muestren siempre el punto decimal
                    if num_val.is_integer():
                        formatted_value = str(int(num_val))
                    else:
                        formatted_value = format(num_val, '.15g')

                    pivot_data[row_key]['variables'][item.variable_type] = formatted_value

                except (ValueError, TypeError):
                    pivot_data[row_key]['variables'][item.variable_type] = str(val)

            else:
                pivot_data[row_key]['variables'][item.variable_type] = 'null'

        # =====================================================
        # ORDEN DE VARIABLES
        # =====================================================

        if variable_type:
            # Si hay filtro de variables, limitamos las columnas a las seleccionadas
            ordered_variables = [v.strip() for v in variable_type.split(',') if v.strip() in variables_found or v.strip() in [c[0] for c in VariableType.choices]]
        else:
            # Si no hay filtro, mostramos todas las del sistema
            ordered_variables = [choice[0] for choice in VariableType.choices]

        remaining_variables = sorted(variables_found - set(ordered_variables))  # Por si aparece en BD una variable que no esté todavía definida en VariableType
        ordered_variables.extend(remaining_variables)

        # =====================================================
        # CABECERA
        # =====================================================

        rows = []

        header = [
            'participant_code',
            'fitbit_code',
            'physical_time'
        ]

        header.extend(ordered_variables)

        rows.append(header)

        # =====================================================
        # DATOS
        # =====================================================

        sorted_rows = sorted(
            pivot_data.values(),
            key=lambda row: row['physical_time'],
            reverse=True
        )

        for row in sorted_rows:

            row_data = [
                row['participant_code'],
                row['fitbit_code'],
                row['physical_time'].isoformat()
            ]

            for variable in ordered_variables:
                # Si no hay registro para esta variable en este timestamp, dejamos la celda VACÍA ('' para Excel/CSV)
                value = row['variables'].get(
                    variable,
                    ''
                )

                row_data.append(value)

            rows.append(row_data)

        # =====================================================
        # NOMBRE DEL ARCHIVO
        # =====================================================

        name_parts = []

        if participant_code:
            name_parts.append(
                participant_code
            )

        if variable_type:
            name_parts.append(
                variable_type.lower()
            )

        if status_filter and status_filter != 'ALL':
            name_parts.append(
                status_filter.lower()
            )

        file_root = (
            "_".join(name_parts)
            if name_parts
            else 'physiological_data'
        )

    # =========================================================
    # TIPO DE EXPORTACIÓN NO VÁLIDO
    # =========================================================

    else:
        return _validation_error(
            request,
            'invalid_export_type',
            status=400
        )

    # =========================================================
    # EXPORTAR XLSX
    # =========================================================

    if export_format == 'xlsx':

        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Datos"

        for row in rows:
            ws.append(row)

        # Ajustar automáticamente el ancho de las columnas
        for column_cells in ws.columns:

            max_length = 0
            column_letter = column_cells[0].column_letter

            for cell in column_cells:

                if cell.value is not None:
                    max_length = max(
                        max_length,
                        len(str(cell.value))
                    )

            ws.column_dimensions[
                column_letter
            ].width = min(
                max_length + 2,
                40
            )

        output = io.BytesIO()

        wb.save(output)

        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type=(
                'application/vnd.openxmlformats-officedocument.'
                'spreadsheetml.sheet'
            )
        )

        response['Content-Disposition'] = (
            f'attachment; filename="{file_root}.xlsx"'
        )

    # =========================================================
    # EXPORTAR CSV
    # =========================================================

    else:

        output = io.BytesIO()

        wrapper = io.TextIOWrapper(
            output,
            encoding='utf-8-sig',
            newline=''
        )

        writer = csv.writer(
            wrapper,
            delimiter=';'
        )

        for row in rows:
            writer.writerow(row)

        wrapper.flush()
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='text/csv'
        )

        response['Content-Disposition'] = (
            f'attachment; filename="{file_root}.csv"'
        )

    return _add_cors_headers(
        request,
        response
    )


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


@csrf_exempt
def api_clear_synclogs(request):
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _json_response(request, {'ok': False, 'error': 'method_not_allowed'}, status=405)
    
    if not _admin_required(request):
     return _json_response(request, {'ok': False, 'error': 'not_authorized'}, status=403)

    # Borramos todos los logs de sincronización
    SyncLog.objects.all().delete()
    return _json_response(request, {'ok': True, 'message': 'Historial de sincronizaciones vaciado correctamente'})


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
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
    except json.JSONDecodeError:
        return _validation_error(request, 'Invalid JSON format')

    # Validar que existan los datos
    if not username or not password:
        return _validation_error(request, 'missing_credentials')

    user = authenticate(request, username=username, password=password)

    if user is None:
        return _validation_error(request, 'invalid_credentials', status=401)

    if not user.is_active:
        return _validation_error(request, 'account_disabled', status=401)

    login(request, user)

    return _json_response(request, {
        'ok': True,
        'username': user.username,
        'is_researcher': True
    })


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
    """El administrador autoriza un correo y envía un email con opciones de Sí/No."""
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
    if not email:
        return _validation_error(request, 'missing_email')

    if User.objects.filter(username=email).exists():
        return _validation_error(request, 'Ya existe un usuario con ese correo', status=409)

    # Creamos el usuario como inactivo (pendiente de aceptación)
    user = User.objects.create_user(username=email, email=email, is_active=False)
    user.set_unusable_password()
    user.save()

    # Generar enlaces de confirmación Sí / No usando codificación segura del email
    uid = urlsafe_base64_encode(force_bytes(email))
    frontend_url = config("FRONTEND_URL", default="http://localhost:5174")
    
    yes_url = f"http://localhost:1574/api/auth/researcher/respond/?uid={uid}&action=yes"
    no_url = f"http://localhost:1574/api/auth/researcher/respond/?uid={uid}&action=no"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; }}
        .button-yes {{ background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px; }}
        .button-no {{ background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }}
        .footer {{ margin-top: 25px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
    </style>
</head>
<body>
    <div class="container">
        <h2 style="color: #1e293b;">Verificación de cuenta - SENDA</h2>
        <p>Hola,</p>
        <p>Has sido autorizado/a para colaborar como investigador/a en la plataforma <strong>SENDA</strong>.</p>
        <p>Para confirmar tu identidad y activar tu acceso institucional, por favor haz clic en una de las siguientes opciones:</p>
        
        <div style="margin: 30px 0;">
            <a href="{yes_url}" class="button-yes">Sí, aceptar autorización</a>
            <a href="{no_url}" class="button-no">No, rechazar</a>
        </div>

        <p>Si tú no has solicitado este acceso, puedes ignorar este mensaje de forma segura.</p>
        
        <div class="footer">
            <p>Atentamente,<br><strong>Equipo SENDA</strong></p>
        </div>
    </div>
</body>
</html>
"""

    subject = 'Autorización como investigador/a en SENDA'
    from_email = config('DEFAULT_FROM_EMAIL', default='admin@sendaproject.es')
    text_content = f"Hola,\n\nTe han autorizado como investigador/a en SENDA.\n\nAcepta aquí: {yes_url}\nRechaza aquí: {no_url}\n\nEquipo SENDA"

    email_msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    email_msg.attach_alternative(html_content, "text/html")
    email_msg.send(fail_silently=False)

    return _json_response(request, {'ok': True, 'email': email})


def researcher_response_view(request):
    """Vista que procesa cuando el investigador hace clic en Sí o No desde su correo."""
    uid = request.GET.get('uid')
    action = request.GET.get('action')

    if not uid or not action:
        return HttpResponse("Enlace inválido o incompleto.", status=400)

    try:
        email = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(username=email)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return HttpResponse("Usuario no encontrado.", status=404)

    frontend_url = config("FRONTEND_URL", default="http://localhost:5174")

    if action == 'yes':
        user.is_active = True
        user.save()
        return HttpResponse(
            f"<html><body style='font-family:sans-serif; text-align:center; padding-top:50px;'>"
            f"<h2 style='color:green;'>¡Autorización aceptada con éxito!</h2>"
            f"<p>Tu cuenta para el correo <b>{email}</b> ya está activa. Ya puedes iniciar sesión en SENDA.</p>"
            f"</body></html>"
        )
    elif action == 'no':
        user.delete() 
        return HttpResponse(
            f"<html><body style='font-family:sans-serif; text-align:center; padding-top:50px;'>"
            f"<h2 style='color:red;'>Autorización rechazada</h2>"
            f"<p>Has rechazado la invitación para el correo <b>{email}</b>. La cuenta ha sido descartada.</p>"
            f"</body></html>"
        )
    
    return HttpResponse("Acción no válida.", status=400)

@csrf_exempt
def api_researcher_request_code(request):
    """Paso 1 del Login: El investigador introduce su correo y se le envía un código temporal de un solo uso."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _validation_error(request, 'method_not_allowed', status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email')
    except json.JSONDecodeError:
        return _validation_error(request, 'Invalid JSON format')

    if not email:
        return _validation_error(request, 'missing_email')

    try:
        user = User.objects.get(username=email, is_superuser=False)
    except User.DoesNotExist:
        return _validation_error(request, 'Email no autorizado', status=404)

    # Generar código OTP temporal de un solo uso
    code = f"{random.randint(100000, 999999)}"
    cache.set(f"otp_{email}", code, timeout=300)  # 5 minutos de validez

    send_mail(
        subject='Verificación de cuenta en SENDA',
        message=f'Tu código de verificación es: {code}',
        from_email=settings.DEAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False, 
    )
    return _json_response(request, {'ok': True, 'message': 'Código enviado correctamente'})


@csrf_exempt
def api_researcher_verify_code(request):
    """Paso 2 del Login: El investigador introduce el código y accede directamente a la plataforma."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _validation_error(request, 'method_not_allowed', status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email')
        code = data.get('code')
    except json.JSONDecodeError:
        return _validation_error(request, 'Invalid JSON format')

    if not email or not code:
        return _validation_error(request, 'missing_credentials')

    cached_code = cache.get(f"otp_{email}")

    if not cached_code or str(cached_code) != str(code):
        return _validation_error(request, 'invalid_or_expired_code', status=401)

    try:
        user = User.objects.get(username=email, is_superuser=False)
        if not user.is_active:
            return _validation_error(request, 'La cuenta aún no ha sido verificada con el código inicial', status=403)
    except User.DoesNotExist:
        return _validation_error(request, 'Email no autorizado', status=404)

    # Invalidar el código usado para que no se pueda reutilizar
    cache.delete(f"otp_{email}")

    user.backend = 'django.contrib.auth.backends.ModelBackend'
    login(request, user)

    return _json_response(request, {
        'ok': True,
        'username': user.username,
        'is_researcher': True
    })


@csrf_exempt
def api_researcher_verify_registration(request):
    """Paso final del alta: El investigador verifica el código enviado por el admin para activar su cuenta."""
    if request.method == 'OPTIONS':
        resp = JsonResponse({'ok': True})
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return _add_cors_headers(request, resp)
    if request.method != 'POST':
        return _validation_error(request, 'method_not_allowed', status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email')
        code = data.get('code')
    except json.JSONDecodeError:
        return _validation_error(request, 'Invalid JSON format')

    if not email or not code:
        return _validation_error(request, 'missing_credentials')

    cached_code = cache.get(f"otp_{email}")

    if not cached_code or str(cached_code) != str(code):
        return _validation_error(request, 'invalid_or_expired_code', status=401)

    try:
        user = User.objects.get(username=email, is_superuser=False)
    except User.DoesNotExist:
        return _validation_error(request, 'user_not_found', status=404)

    # Activar la cuenta del investigador definitivamente
    user.is_active = True
    user.save()
    cache.delete(f"otp_{email}")

    return _json_response(request, {'ok': True, 'message': 'Cuenta verificada y activada con éxito'})


@csrf_exempt
def api_admin_delete_researcher(request):
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
        email = payload.get('email')
        user = User.objects.get(username=email)
        user.delete()
        return _json_response(request, {'ok': True})
    except User.DoesNotExist:
        return _validation_error(request, 'user_not_found', status=404)
    except Exception:
        return _validation_error(request, 'error_deleting')

    
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




