# 🔌 CardioGo REST API Documentation

The CardioGo Backend exposes a secure REST API for authentication, profile management, vital logging, deep learning risk inference, chatbot interactions, and Doctor Dashboard synchronization.

---

## 🔒 Authentication & Headers

Most API endpoints require a JSON Web Token (JWT) bearer token.
- **Header format:**
  ```http
  Authorization: Bearer <your_access_token>
  ```

---

## 🚀 API Endpoints Reference

### 🔐 Auth & Registration

#### 1. Register a New User
* **Endpoint:** `/api/auth/register/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "strongpassword123",
    "age": 28,
    "gender": "M"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "user": {
      "id": 5,
      "username": "john_doe",
      "email": "john@example.com",
      "age": 28,
      "gender": "M"
    },
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### 2. User Login (Obtain Tokens)
* **Endpoint:** `/api/auth/login/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "username": "john_doe",
    "password": "strongpassword123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### 3. Refresh Access Token
* **Endpoint:** `/api/auth/refresh/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### 4. Password Reset Request
Generates a 6-digit OTP code and logs it (or sends it via email mock).
* **Endpoint:** `/api/auth/password-reset-request/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "OTP sent to your email!",
    "otp": "854291"
  }
  ```

#### 5. Password Reset Confirm
* **Endpoint:** `/api/auth/password-reset-confirm/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "otp": "854291",
    "new_password": "newSecurePassword789"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "Password updated successfully!"
  }
  ```

---

### 👤 User & Profile

#### 1. Retrieve or Update Profile
* **Endpoint:** `/api/user/profile/`
* **Method:** `GET` / `PUT` / `PATCH`
* **Auth Required:** Yes
* **Response (200 OK):**
  ```json
  {
    "id": 5,
    "username": "john_doe",
    "email": "john@example.com",
    "age": 28,
    "gender": "M"
  }
  ```

---

### 🏥 Health Vitals & Alerts

#### 1. Retrieve or Upload Patient Health Vitals
* **Endpoint:** `/api/health/data/`
* **Method:** `GET` / `POST`
* **Auth Required:** Yes
* **Request Body (POST):**
  ```json
  {
    "heart_rate": 78,
    "sp02": 97,
    "blood_pressure_sys": 122,
    "blood_pressure_dia": 81,
    "temperature": 36.8,
    "status": "normal"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": 104,
    "heart_rate": 78,
    "sp02": 97,
    "blood_pressure_sys": 122,
    "blood_pressure_dia": 81,
    "temperature": 36.8,
    "status": "normal",
    "timestamp": "2026-06-18T00:23:00Z"
  }
  ```

#### 2. Get Alarm/Alert History
* **Endpoint:** `/api/health/alerts/`
* **Method:** `GET`
* **Auth Required:** Yes
* **Response (200 OK):**
  ```json
  [
    {
      "id": 12,
      "message": "Health reading alert: critical for Heart Rate 54, SpO2 88",
      "timestamp": "2026-06-17T23:59:12Z"
    }
  ]
  ```

---

### 🤖 AI Models & Chat

#### 1. Send/Receive Chat Messages (with AI Advisor)
If `is_sync` is passed as `true`, this acts as a direct sync channel for storing locally composed offline chats to the cloud database.
* **Endpoint:** `/api/chat/`
* **Method:** `GET` / `POST`
* **Auth Required:** Yes
* **Request Body (POST):**
  ```json
  {
    "message": "I feel a bit lightheaded, what should I do?"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": 45,
    "sender": "ai",
    "message": "Hello John. Given your latest heart rate is 78 BPM and SpO2 is 97% (which are stable), feeling lightheaded might be due to dehydration or sudden movement. Please sit down, sip some water, and rest. If it persists, consult a physician.",
    "timestamp": "2026-06-18T00:24:15Z"
  }
  ```

#### 2. Clear Chat History
* **Endpoint:** `/api/chat/clear/`
* **Method:** `DELETE`
* **Auth Required:** Yes
* **Response (200 OK):**
  ```json
  {
    "message": "Chat history cleared successfully"
  }
  ```

#### 3. Deep Learning Sequence Risk Prediction (ONNX GRU Model)
Accepts a history of 15 frames of vital measurements and calculates the cardiac danger index.
* **Endpoint:** `/api/predict_risk/`
* **Method:** `POST`
* **Auth Required:** No (Public model API)
* **Request Body:**
  ```json
  {
    "sequence": [
      [80.0, 98.0, 120.0, 36.6],
      [81.0, 98.0, 120.0, 36.6],
      // ... 15 entries total representing [BPM, SpO2, Systolic, Temp]
      [85.0, 97.0, 122.0, 36.7]
    ]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "risk_score": 0.1428,
    "distance": 85.0,
    "status": "success"
  }
  ```

#### 4. CatBoost Risk Prediction
Single-record vital assessment utilizing the CatBoost model.
* **Endpoint:** `/api/predict_cardiac_risk/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "bpm": 85,
    "spo2": 98,
    "sys": 120,
    "temp": 36.6
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "cardiac_risk_score": 0.1376,
    "catboost_status": "normal",
    "status": "success"
  }
  ```

---

### 🔌 Hardware Sensor Integration (ESP32)

#### 1. Hardware Upload Vitals Endpoint
Enables ESP32 microcontrollers to push raw vitals directly to the database using an API secret key, skipping standard user JWT constraints.
* **Endpoint:** `/api/hardware/sensor/`
* **Method:** `POST`
* **Auth Required:** Secret API Key validation (`cardio_hw_2024`)
* **Request Body:**
  ```json
  {
    "api_key": "cardio_hw_2024",
    "username": "john_doe",
    "heart_rate": 74,
    "sp02": 98,
    "temperature": 36.7
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "message": "Sensor data received successfully!",
    "status": "normal",
    "heart_rate": 74,
    "sp02": 98,
    "temperature": 36.7,
    "record_id": 204
  }
  ```

---

### 🏥 Doctor Dashboard Admin APIs (Admin Only)

These endpoints require the requesting user to have `is_staff = True` (Admin/Doctor profile).

#### 1. Admin System Stats
* **Endpoint:** `/api/admin/stats/`
* **Method:** `GET`
* **Response (200 OK):**
  ```json
  {
    "total_users": 14,
    "total_alerts": 32,
    "critical": 2,
    "risk_pct": 14
  }
  ```

#### 2. Get All Patients List
* **Endpoint:** `/api/admin/users/`
* **Method:** `GET`
* **Response (200 OK):**
  ```json
  [
    {
      "id": 5,
      "username": "john_doe",
      "email": "john@example.com",
      "age": 28,
      "gender": "M",
      "date_joined": "2026-06-15T10:00:00Z"
    }
  ]
  ```

#### 3. Delete Patient
* **Endpoint:** `/api/admin/users/<int:user_id>/delete/`
* **Method:** `DELETE`
* **Response (204 No Content)**

#### 4. Get Global Alert History
* **Endpoint:** `/api/admin/alerts/`
* **Method:** `GET`

#### 5. Get Single Patient Health History
* **Endpoint:** `/api/admin/patients/<int:user_id>/health/`
* **Method:** `GET`
* **Response (200 OK):**
  ```json
  {
    "patient": "john_doe",
    "history": [
      {
        "id": 104,
        "heart_rate": 78,
        "sp02": 97,
        "blood_pressure_sys": 122,
        "blood_pressure_dia": 81,
        "temperature": 36.8,
        "status": "normal",
        "timestamp": "2026-06-18T00:23:00Z"
      }
    ]
  }
  ```

#### 6. Get Single Patient Chat History
* **Endpoint:** `/api/admin/patients/<int:user_id>/chat/`
* **Method:** `GET`
