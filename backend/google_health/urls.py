from django.urls import path
from .views import google_login_view, google_callback_view

urlpatterns = [
    path('auth/login/', google_login_view, name='google_login'),
    path('auth/callback/', google_callback_view, name='google_callback'),
]