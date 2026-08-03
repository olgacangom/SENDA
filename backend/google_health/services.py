from decouple import config
import requests
from django.utils import timezone
from .models import GoogleAccount

class GoogleAuthService:
    @staticmethod
    def refresh_access_token(google_account: GoogleAccount):
        client_id = config("GOOGLE_CLIENT_ID")
        client_secret = config("GOOGLE_CLIENT_SECRET")
        token_uri = config("GOOGLE_TOKEN_URI")

        payload = {
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': google_account.refresh_token,
            'grant_type': 'refresh_token',
        }

        response = requests.post(token_uri, data=payload)
        
        if response.status_code == 200:
            token_data = response.json()
            google_account.access_token = token_data['access_token']
            
            # Calcular nueva fecha de expiración
            expires_in = token_data.get('expires_in', 3600)
            google_account.access_token_expiration = timezone.now() + timezone.timedelta(seconds=expires_in)
            google_account.authentication_status = 'ACTIVE'
            google_account.save()
            return True
        else:
            google_account.authentication_status = 'EXPIRED_OR_REVOKED'
            google_account.save()
            return False