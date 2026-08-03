from django.shortcuts import redirect, HttpResponse
from django.utils import timezone
from .oauth import GoogleOAuthService
from .models import Participant, GoogleAccount
import requests

def google_login_view(request):
    auth_url = GoogleOAuthService.get_authorization_url()
    return redirect(auth_url)

def google_callback_view(request):
    code = request.GET.get('code')
    if not code:
        return HttpResponse("No se encontró el código de autorización", status=400)

    token_data = GoogleOAuthService.exchange_code_for_tokens(code)
    if not token_data:
        return HttpResponse("Error al intercambiar el código por tokens", status=400)

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
        # Si es nuevo, calculamos el siguiente código autoincremental
        total_participants = Participant.objects.count()
        next_code_num = total_participants + 1
        participant_code = f"P_{next_code_num:03d}"  

        participant = Participant.objects.create(
            participant_code=participant_code
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
    return HttpResponse(f"¡Autorización exitosa! Cuenta vinculada al participante **{participant.participant_code}** ({action_text}).")