from rest_framework import serializers
from .models import User, HealthData, AlertHistory, ChatMessage
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Allow logging in with email or username
        username = attrs.get("username")
        password = attrs.get("password")

        if username and password:
            # Try to find user by email first
            from .models import User
            user = User.objects.filter(email=username).first()
            if user:
                attrs["username"] = user.username
        
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'age', 'gender')
        extra_kwargs = {
            'username': {'required': True},
        }

    def validate_email(self, value):
        # Exclude the current user from uniqueness check during profile updates
        request = self.context.get('request')
        user = request.user if request else None
        
        qs = User.objects.filter(email=value)
        if user and user.pk:
            qs = qs.exclude(pk=user.pk)
            
        if qs.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data.get('password'),
            age=validated_data.get('age'),
            gender=validated_data.get('gender')
        )
        return user

class HealthDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthData
        fields = '__all__'
        read_only_fields = ('user', 'timestamp')

class AlertHistorySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = AlertHistory
        fields = ('id', 'user', 'user_id', 'username', 'message', 'timestamp')

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'user', 'sender', 'message', 'image', 'audio', 'timestamp')
        read_only_fields = ('user', 'sender', 'timestamp')
