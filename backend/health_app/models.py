from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')], null=True, blank=True)

class HealthData(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_data')
    heart_rate = models.IntegerField()
    sp02 = models.IntegerField()
    blood_pressure_sys = models.IntegerField()
    blood_pressure_dia = models.IntegerField()
    temperature = models.FloatField()
    status = models.CharField(max_length=20, default='normal') 
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.timestamp}"

class AlertHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    message = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - Alert: {self.message}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_history')
    sender = models.CharField(max_length=10) # 'user' or 'ai'
    message = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    audio = models.FileField(upload_to='chat_audio/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} - {self.timestamp}"

class PasswordResetOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.email} - {self.otp}"
