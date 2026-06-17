# 🐳 CardioGo Docker Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────┐
  Mobile App        │         Docker Host          │
  (Expo/RN)  ──────▶│  ┌──────────┐  ┌──────────┐ │
  :8000 / :80       │  │  Nginx   │  │  Django  │ │
                    │  │  :80     │──▶│  :8000   │ │
  ESP32 ───────────▶│  └──────────┘  │ Gunicorn │ │
  POST /api/...     │                └──────────┘ │
                    └─────────────────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git (already installed)

### 2. Setup Environment Variables

```bash
# Copy the example file and fill in your API keys
cp .env.example .env
```

Edit `.env` with your actual values:

```env
SECRET_KEY=your-very-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,YOUR_PC_IP

OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-google-key
```

### 3. Build & Run

```bash
# From the project root directory:
docker compose up --build -d
```

### 4. Access the App

| Service | URL |
|---------|-----|
| 🏥 Doctor Dashboard | http://localhost/dashboard/ |
| ⚙️ Django Admin | http://localhost/admin/ |
| 🔌 API Root | http://localhost/api/ |
| 📊 Direct Backend | http://localhost:8000/ |

**Default Admin Login:**
- Username: `admin`
- Password: `adminpassword123`

---

## 📱 Mobile App Configuration

The React Native / Expo mobile app runs on **physical devices** and is NOT containerized.
After running `docker compose up`, update the API URL in `mobile/src/services/api.js`:

```javascript
// Replace with your PC's actual local IP (run 'ipconfig' to find it)
const BASE_URL = 'http://YOUR_PC_LOCAL_IP:80/api/';
// OR use port 8000 directly:
const BASE_URL = 'http://YOUR_PC_LOCAL_IP:8000/api/';
```

Then run the mobile app as usual:
```bash
cd mobile
npm install
npx expo start
```

---

## 🛠️ Management Commands

```bash
# View live logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Stop all containers
docker compose down

# Stop and remove volumes (⚠️ deletes database!)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d

# Run Django management commands
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Open a shell inside the container
docker compose exec backend bash
```

---

## 📁 Project Structure After Docker Setup

```
Senior-Project/
├── docker-compose.yml          ← Main orchestration file
├── .env.example                ← Environment template
├── .env                        ← Your secrets (NOT in git!)
├── nginx/
│   └── nginx.conf              ← Reverse proxy config
├── backend/
│   ├── Dockerfile              ← Backend image definition
│   ├── .dockerignore           ← Files excluded from build
│   ├── docker-entrypoint.sh    ← Runs migrations on startup
│   ├── requirements.txt        ← Python dependencies
│   └── ...                     ← Django source code
└── mobile/                     ← React Native app (not dockerized)
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 80 already in use | Change `"80:80"` to `"8080:80"` in docker-compose.yml |
| Port 8000 already in use | Change `"8000:8000"` to `"8001:8000"` |
| Mobile can't reach backend | Use your PC's actual LAN IP, not `localhost` |
| Container keeps restarting | Run `docker compose logs backend` to see errors |
| Database reset needed | Run `docker compose down -v && docker compose up -d` |

---

## 🏭 Production Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Use a strong random `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` to your actual domain/IP
- [ ] Add real `OPENAI_API_KEY`
- [ ] Consider switching from SQLite to PostgreSQL for production
- [ ] Set up SSL/HTTPS with Let's Encrypt or a reverse proxy
