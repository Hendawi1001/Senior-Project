from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, ProfileView,
    HealthDataListCreateView, AlertHistoryListView, ChatMessageListCreateView,
    ChatMessageClearView, PasswordResetRequestView, PasswordResetConfirmView,
    # Admin / Doctor Dashboard
    AdminStatsView, AdminUsersView, AdminDeleteUserView,
    AdminAlertsView, AdminPatientHealthView, AdminPatientChatView,
    dashboard_view, dashboard_login_view,
    # Hardware Sensor Integration
    HardwareSensorDataView,
)
from .views_risk import PredictRiskView, PredictCardiacRiskView

urlpatterns = [
    path('auth/register/',              RegisterView.as_view(),              name='register'),
    path('auth/login/',                 CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/',               TokenRefreshView.as_view(),          name='token_refresh'),
    path('auth/password-reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    path('user/profile/',  ProfileView.as_view(),              name='profile'),
    path('health/data/',   HealthDataListCreateView.as_view(), name='health_data'),
    path('health/alerts/', AlertHistoryListView.as_view(),     name='alerts'),
    path('chat/',          ChatMessageListCreateView.as_view(), name='chat'),
    path('chat/clear/',    ChatMessageClearView.as_view(),     name='chat_clear'),
    
    # AR Safety Risk Model API
    path('predict_risk/', PredictRiskView.as_view(), name='predict_risk'),
    
    # Cardiac Deep Learning Risk Model API
    path('predict_cardiac_risk/', PredictCardiacRiskView.as_view(), name='predict_cardiac_risk'),

    # Hardware Sensor Data Endpoint (ESP32 / Arduino)
    path('hardware/sensor/', HardwareSensorDataView.as_view(), name='hardware_sensor'),

    path('admin/stats/',                     AdminStatsView.as_view(),         name='admin_stats'),
    path('admin/users/',                     AdminUsersView.as_view(),         name='admin_users'),
    path('admin/users/<int:user_id>/delete/', AdminDeleteUserView.as_view(),   name='admin_delete_user'),
    path('admin/alerts/',                    AdminAlertsView.as_view(),        name='admin_alerts'),
    path('admin/patients/<int:user_id>/health/', AdminPatientHealthView.as_view(), name='admin_patient_health'),
    path('admin/patients/<int:user_id>/chat/',   AdminPatientChatView.as_view(),   name='admin_patient_chat'),

    path('dashboard/',       dashboard_view,        name='dashboard'),
    path('dashboard/login/', dashboard_login_view,  name='dashboard_login'),
]
