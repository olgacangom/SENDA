from urllib.parse import urlencode

from decouple import config
import requests


class GoogleOAuthService:

    @staticmethod
    def get_authorization_url():

        params = {
            "client_id": config("GOOGLE_CLIENT_ID"),
            "redirect_uri": config("GOOGLE_REDIRECT_URI"),
            "response_type": "code",
            "scope": " ".join([
                "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
                "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
                "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
                "https://www.googleapis.com/auth/userinfo.email",    
                "https://www.googleapis.com/auth/userinfo.profile"  
            ]),
            "access_type": "offline",
            "prompt": "select_account consent",
        }

        auth_uri = config("GOOGLE_AUTH_URI")

        return f"{auth_uri}?{urlencode(params)}"

    @staticmethod
    def exchange_code_for_tokens(code):
        token_uri = config("GOOGLE_TOKEN_URI")
        payload = {
            "code": code,
            "client_id": config("GOOGLE_CLIENT_ID"),
            "client_secret": config("GOOGLE_CLIENT_SECRET"),
            "redirect_uri": config("GOOGLE_REDIRECT_URI"),
            "grant_type": "authorization_code",
        }
        response = requests.post(token_uri, data=payload)
        if response.status_code == 200:
            return response.json()
        try:
            error_data = response.json()
        except Exception:
            error_data = response.text
        return {'error': error_data, 'status_code': response.status_code}
    