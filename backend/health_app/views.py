from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
import google.generativeai as genai
import mimetypes
import random
from django.utils import timezone
from datetime import timedelta
from PIL import Image as PILImage
from .models import User, HealthData, AlertHistory, ChatMessage, PasswordResetOTP
from .serializers import (
    UserSerializer, HealthDataSerializer, AlertHistorySerializer,
    ChatMessageSerializer, CustomTokenObtainPairSerializer
)

from rest_framework_simplejwt.tokens import RefreshToken

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens immediately on registration to cut down sequential HTTP calls
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "user": serializer.data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

class HealthDataListCreateView(generics.ListCreateAPIView):
    serializer_class = HealthDataSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return HealthData.objects.filter(user=self.request.user).order_by('-timestamp')

    def perform_create(self, serializer):
        data = serializer.save(user=self.request.user)
        if data.status in ['warning', 'critical']:
            AlertHistory.objects.create(
                user=self.request.user,
                message=f"Health reading alert: {data.status} for Heart Rate {data.heart_rate}, SpO2 {data.sp02}"
            )

class AlertHistoryListView(generics.ListAPIView):
    serializer_class = AlertHistorySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return AlertHistory.objects.filter(user=self.request.user).order_by('-timestamp')

class ChatMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return ChatMessage.objects.filter(user=self.request.user).order_by('timestamp')

    def perform_create(self, serializer):
        user_message = serializer.save(user=self.request.user, sender='user')
        
        latest_health = HealthData.objects.filter(user=self.request.user).order_by('-timestamp').first()
        health_context = "No data yet."
        if latest_health:
            health_context = f"BPM: {latest_health.heart_rate}, SpO2: {latest_health.sp02}%, BP: {latest_health.blood_pressure_sys}/{latest_health.blood_pressure_dia}, Status: {latest_health.status}"

        try:
            from openai import OpenAI
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            
            recent_history = ChatMessage.objects.filter(user=self.request.user).order_by('-timestamp')[:10]
            recent_history = reversed(recent_history)
            
            messages = [
                {
                    "role": "system",
                    "content": f"""You are CardioGo AI, a highly advanced, empathetic, and professional medical assistant part of the CardioGo health monitoring app.
Patient Profile: Age {self.request.user.age}, Gender {self.request.user.gender}.
Latest Vitals: {health_context}.

Instructions:
1. You can answer ANY question the patient asks smoothly and naturally.
2. For medical questions, be accurate and add a disclaimer to consult a doctor if it's serious.
3. Use the patient's vitals context and the Chat History to give personalized, continuous advice.
4. Keep responses engaging, structured (use bullet points if needed), and helpful."""
                }
            ]

            for msg in recent_history:
                if msg.message:
                    role = "user" if msg.sender == "user" else "assistant"
                    messages.append({"role": role, "content": msg.message})

            messages.append({"role": "user", "content": user_message.message or "(User sent media)"})

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            ai_response = response.choices[0].message.content
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str or "rate limit" in error_str:
                ai_response = "⚠️ System Alert: My AI brain is currently out of quota. Please check your OpenAI / Gemini API key limits and billing to restore my functionality!"
            else:
                ai_response = "I'm CardioGo AI. Sorry, I encountered an issue processing your request."

        ChatMessage.objects.create(
            user=self.request.user,
            sender='ai',
            message=ai_response
        )

class ChatMessageClearView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request):
        ChatMessage.objects.filter(user=request.user).delete()
        return Response({"message": "Chat history cleared successfully"}, status=status.HTTP_200_OK)

class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()
        if not user:
             return Response({"error": "No account found with this email."}, status=status.HTTP_404_NOT_FOUND)

        otp = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(email=email, otp=otp)
        
        print(f"\n\n--- [RESET PASSWORD] ---\nEmail: {email}\nOTP Code: {otp}\n------------------------\n\n")
        
        return Response({
            "message": "OTP sent to your email!",
            "otp": otp  
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not all([email, otp, new_password]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        reset_obj = PasswordResetOTP.objects.filter(email=email, otp=otp, is_used=False).order_by('-created_at').first()
        
        if not reset_obj:
            return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
        if reset_obj.created_at < timezone.now() - timedelta(minutes=10):
            return Response({"error": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
        users = User.objects.filter(email=email)
        for user in users:
            user.set_password(new_password)
            user.save()
        
        reset_obj.is_used = True
        reset_obj.save()
        
        return Response({"message": "Password updated successfully!"}, status=status.HTTP_200_OK)

def dashboard_view(request):
    """
    Render the beautiful doctor dashboard.
    """
    return render(request, 'health_app/dashboard.html')

def dashboard_login_view(request):
    """
    Render the login page for the dashboard.
    """
    return render(request, 'health_app/dashboard_login.html')

# ── Admin / Doctor Dashboard API Views ───────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = (IsAdminUser,)
    def get(self, request):
        total_users = User.objects.filter(is_staff=False).count()
        critical = HealthData.objects.filter(status='critical').values('user').distinct().count()
        
        # Calculate risk percentage
        risk_pct = 0
        if total_users > 0:
            risk_pct = round((critical / total_users) * 100)

        return Response({
            "total_users": total_users,
            "total_alerts": AlertHistory.objects.count(),
            "critical": critical,
            "risk_pct": risk_pct
        })

class AdminUsersView(generics.ListAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = UserSerializer
    queryset = User.objects.filter(is_staff=False).order_by('-date_joined')

class AdminDeleteUserView(generics.DestroyAPIView):
    permission_classes = (IsAdminUser,)
    queryset = User.objects.all()
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'

class AdminAlertsView(generics.ListAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = AlertHistorySerializer
    queryset = AlertHistory.objects.all().order_by('-timestamp')

class AdminPatientHealthView(generics.ListAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = HealthDataSerializer
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return HealthData.objects.filter(user_id=user_id).order_by('-timestamp')

class AdminPatientChatView(generics.ListAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = ChatMessageSerializer
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return ChatMessage.objects.filter(user_id=user_id).order_by('timestamp')


# ── Hardware Sensor Integration (ESP32 / Arduino) ───────────────────────────────
# This endpoint allows your ESP32 microcontroller to POST sensor readings
# directly to the database without JWT auth — uses a simple API key instead.

HARDWARE_API_KEY = "cardio_hw_2024"  # Change this to any secret key you want

class HardwareSensorDataView(APIView):
    """
    Accepts POST from ESP32 hardware with sensor readings.
    Expected JSON body:
    {
        "api_key": "cardio_hw_2024",
        "username": "patient_username",
        "heart_rate": 78,
        "sp02": 97,
        "temperature": 36.8
    }
    """
    permission_classes = (AllowAny,)  # No JWT needed — uses API key

    def post(self, request):
        # Validate API key
        api_key = request.data.get('api_key')
        if api_key != HARDWARE_API_KEY:
            return Response({"error": "Invalid API key"}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        heart_rate = request.data.get('heart_rate')
        sp02 = request.data.get('sp02')
        temperature = request.data.get('temperature')

        if not all([username, heart_rate, sp02, temperature]):
            return Response({"error": "Missing fields: username, heart_rate, sp02, temperature"}, status=status.HTTP_400_BAD_REQUEST)

        # Find the user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": f"User '{username}' not found"}, status=status.HTTP_404_NOT_FOUND)

        hr = int(heart_rate)
        spo2 = int(sp02)
        temp = float(temperature)

        # Auto-calculate health status from sensor values
        status_val = 'normal'
        if hr >= 60 and hr <= 75:
            status_val = 'warning'
        elif hr < 60 or hr > 120:
            status_val = 'critical'
        elif hr > 100:
            status_val = 'warning'

        if spo2 < 90:
            status_val = 'critical'
        elif spo2 < 95:
            if status_val == 'normal':
                status_val = 'warning'

        if temp > 38.0 or temp < 35.0:
            if status_val != 'critical':
                status_val = 'warning'
        if temp > 39.5 or temp < 34.0:
            status_val = 'critical'

        # Save to database
        health_record = HealthData.objects.create(
            user=user,
            heart_rate=hr,
            sp02=spo2,
            blood_pressure_sys=120,  # Default — sensors don't measure BP
            blood_pressure_dia=80,
            temperature=temp,
            status=status_val
        )

        # Create alert if abnormal
        if status_val in ['warning', 'critical']:
            AlertHistory.objects.create(
                user=user,
                message=f"[HARDWARE SENSOR] {status_val.upper()}: HR={hr}, SpO2={spo2}%, Temp={temp}°C"
            )

        print(f"\n📡 [HARDWARE DATA] User: {username} | HR: {hr} | SpO2: {spo2}% | Temp: {temp}°C | Status: {status_val}\n")

        return Response({
            "message": "Sensor data received successfully!",
            "status": status_val,
            "heart_rate": hr,
            "sp02": spo2,
            "temperature": temp,
            "record_id": health_record.id
        }, status=status.HTTP_201_CREATED)
