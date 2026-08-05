from django.urls import path
from .views import (
    google_login_view,
    google_callback_view,
    api_participants,
    api_fitbits,
    api_synclogs,
    api_admin_login,
    api_researcher_login,
    api_auth_status,
    api_admin_create_researcher,
    api_admin_researchers,
    api_alerts,
    api_physiological_data,
    api_export,
    api_logout,
    api_assignments,
)

urlpatterns = [
    path('auth/login/', google_login_view, name='google_login'),
    path('auth/callback/', google_callback_view, name='google_callback'),
    # API endpoints for frontend
    path('api/auth/status/', api_auth_status, name='api_auth_status'),
    path('api/auth/researcher/login/', api_researcher_login, name='api_researcher_login'),
    path('api/auth/logout/', api_logout, name='api_logout'),
    path('api/admin/login/', api_admin_login, name='api_admin_login'),
    path('api/admin/researchers/', api_admin_researchers, name='api_admin_researchers'),
    path('api/admin/researchers/create/', api_admin_create_researcher, name='api_admin_create_researcher'),
    path('api/alerts/', api_alerts, name='api_alerts'),
    path('api/physiological-data/', api_physiological_data, name='api_physiological_data'),
    path('api/export/', api_export, name='api_export'),
    path('api/participants/', api_participants, name='api_participants'),
    path('api/fitbits/', api_fitbits, name='api_fitbits'),
    path('api/synclogs/', api_synclogs, name='api_synclogs'),
    path('api/assignments/', api_assignments, name='api_assignments')
]