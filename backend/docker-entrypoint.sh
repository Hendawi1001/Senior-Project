#!/bin/bash
set -e

echo "⏳ Running Django migrations..."
python manage.py migrate --noinput

echo "👤 Creating superuser if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@cardiogo.com', 'adminpassword123')
    print('✅ Superuser created: admin / adminpassword123')
else:
    print('ℹ️  Superuser already exists.')
"

echo "🚀 Starting CardioGo Backend Server..."
exec "$@"
