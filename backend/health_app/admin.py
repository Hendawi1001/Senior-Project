from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, HealthData, AlertHistory, ChatMessage, PasswordResetOTP

admin.site.site_header  = "CardioGo  — Doctor Panel"
admin.site.site_title   = "CardioGo Admin"
admin.site.index_title  = "Welcome, Doctor "


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ('username', 'email', 'age', 'gender', 'is_staff', 'is_active', 'date_joined')
    list_filter     = ('gender', 'is_staff', 'is_active')
    search_fields   = ('username', 'email')
    ordering        = ('-date_joined',)
    fieldsets       = BaseUserAdmin.fieldsets + (
        ('Health Profile', {'fields': ('age', 'gender')}),
    )
    add_fieldsets   = BaseUserAdmin.add_fieldsets + (
        ('Health Profile', {'fields': ('age', 'gender')}),
    )


@admin.register(HealthData)
class HealthDataAdmin(admin.ModelAdmin):
    list_display    = ('user', 'heart_rate', 'sp02', 'blood_pressure', 'temperature', 'status_badge', 'timestamp')
    list_filter     = ('status',)
    search_fields   = ('user__username',)
    date_hierarchy  = 'timestamp'
    ordering        = ('-timestamp',)
    readonly_fields = ('timestamp',)

    @admin.display(description='Blood Pressure')
    def blood_pressure(self, obj):
        return f"{obj.blood_pressure_sys}/{obj.blood_pressure_dia}"

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'normal':   ('#22c55e', '✅'),
            'warning':  ('#f59e0b', '⚠️'),
            'critical': ('#ef4444', '🚨'),
        }
        color, icon = colors.get(obj.status, ('#6b7280', '❓'))
        return format_html(
            '<span style="color:{};font-weight:bold;">{} {}</span>',
            color, icon, obj.status.upper()
        )


@admin.register(AlertHistory)
class AlertHistoryAdmin(admin.ModelAdmin):
    list_display    = ('user', 'short_message', 'timestamp')
    search_fields   = ('user__username', 'message')
    date_hierarchy  = 'timestamp'
    ordering        = ('-timestamp',)
    readonly_fields = ('timestamp',)

    @admin.display(description='Message')
    def short_message(self, obj):
        return obj.message[:80] + ('…' if len(obj.message) > 80 else '')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display    = ('user', 'sender_badge', 'message_preview', 'timestamp')
    list_filter     = ('sender',)
    search_fields   = ('user__username', 'message')
    date_hierarchy  = 'timestamp'
    ordering        = ('-timestamp',)
    readonly_fields = ('timestamp',)

    @admin.display(description='Sender')
    def sender_badge(self, obj):
        if obj.sender == 'ai':
            return format_html('<span style="color:#818cf8;font-weight:bold;">{}</span>', ' AI')
        return format_html('<span style="color:#34d399;font-weight:bold;">{}</span>', ' User')

    @admin.display(description='Message')
    def message_preview(self, obj):
        text = obj.message or '(media only)'
        return text[:100] + ('…' if len(text) > 100 else '')


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display    = ('email', 'otp', 'is_used', 'created_at')
    list_filter     = ('is_used',)
    search_fields   = ('email',)
    ordering        = ('-created_at',)
    readonly_fields = ('created_at',)
