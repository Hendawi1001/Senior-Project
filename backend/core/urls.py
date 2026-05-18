"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from health_app.views import dashboard_view, dashboard_login_view

urlpatterns = [
    path("admin/",           admin.site.urls),
    path("api/",             include('health_app.urls')),
    # Doctor dashboard — top-level for easy access
    path("dashboard/",       dashboard_view,       name='dashboard_root'),
    path("dashboard/login/", dashboard_login_view, name='dashboard_login_root'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
