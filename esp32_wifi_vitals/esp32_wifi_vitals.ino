#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>

#include "ClosedCube_MAX30205.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// ---------- Wi-Fi & Hotspot Configuration ----------
// Set to true to make ESP32 act as a Hotspot (Access Point Mode)
// Set to false to connect the ESP32 to your local Wi-Fi router/phone hotspot
#define USE_ESP32_HOTSPOT true

// 1. Settings if running as a Hotspot (Access Point Mode)
const char* ap_ssid = "CardioGo-ESP32";
const char* ap_password = "password123"; // Must be at least 8 characters!

// 2. Settings if connecting to your Wi-Fi router (Station Mode)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);

#define SDA_PIN 21
#define SCL_PIN 22

// ---------- Temperature ----------
ClosedCube_MAX30205 tempSensor;

#define TEMP_INTERVAL 100
#define TEMP_OFFSET 5.0

unsigned long lastTempRead = 0;
float bodyTemp = 0;

// ---------- Heart ----------
MAX30105 particleSensor;

#define FINGER_THRESHOLD 50000

const byte RATE_SIZE = 5;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;

float bpm = 0;
int bpmAvg = 0;

// ---------- Blood Pressure (ESTIMATION ONLY) ----------
int sysBP = 0;
int diaBP = 0;

// Faster SpO2
#define SPO2_SAMPLES 50
uint32_t irBuffer[100];
uint32_t redBuffer[100];

int32_t spo2 = 0;
int8_t validSPO2 = 0;
int32_t spo2HeartRate = 0;
int8_t validHeartRate = 0;

unsigned long lastSpo2Time = 0;
unsigned long lastPrintTime = 0;

// ---------- Web Server Endpoints ----------
void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "CardioGo ESP32 Vitals Server is running! Fetch from /vitals");
}

void handleVitals() {
  // CORS header to allow React Native Expo Web/Simulators to query safely
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  int finalSpO2 = (validSPO2 && spo2 >= 70 && spo2 <= 100) ? spo2 : 0;
  
  // Package our real-time hardware readings into standard JSON
  String json = "{";
  json += "\"bpm\":" + String(bpmAvg) + ",";
  json += "\"spo2\":" + String(finalSpO2) + ",";
  json += "\"temperature\":" + String(bodyTemp, 2) + ",";
  json += "\"sys\":" + String(sysBP) + ",";
  json += "\"dia\":" + String(diaBP);
  json += "}";
  
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  Serial.println("Starting sensors...");

  tempSensor.begin(0x4F);

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found");
    while (1);
  }

  byte ledBrightness = 0x1F;
  byte sampleAverage = 2;
  byte ledMode = 2;
  int sampleRate = 400;
  int pulseWidth = 411;
  int adcRange = 4096;

  particleSensor.setup(
    ledBrightness,
    sampleAverage,
    ledMode,
    sampleRate,
    pulseWidth,
    adcRange
  );

  particleSensor.setPulseAmplitudeRed(0x1F);
  particleSensor.setPulseAmplitudeIR(0x1F);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("MAX30205 + MAX30102 ready");

  // ---------- Wi-Fi / Hotspot Setup ----------
  if (USE_ESP32_HOTSPOT) {
    Serial.println("Starting ESP32 Hotspot (Access Point Mode)...");
    WiFi.softAP(ap_ssid, ap_password);
    
    Serial.println("Hotspot started successfully!");
    Serial.print("Connect your Phone to Wi-Fi Network: ");
    Serial.println(ap_ssid);
    Serial.print("Hotspot Password: ");
    Serial.println(ap_password);
    Serial.print("ESP32 Server IP Address: ");
    Serial.println(WiFi.softAPIP()); // Standard AP IP is 192.168.4.1
  } else {
    Serial.print("Connecting to Wi-Fi router: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
      delay(1000);
      Serial.print(".");
      retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("");
      Serial.println("Wi-Fi connected successfully!");
      Serial.print("ESP32 IP Address: ");
      Serial.println(WiFi.localIP()); // Enter this IP in settings
    } else {
      Serial.println("");
      Serial.println("Wi-Fi connection failed. Running offline, but server is inactive.");
    }
  }

  // ---------- Start HTTP Server ----------
  server.on("/", handleRoot);
  server.on("/vitals", handleVitals);
  server.begin();
  Serial.println("Vitals HTTP Server started.");
}

void loop() {
  // Handle HTTP client requests
  server.handleClient();
  
  readTemperature();
  readHeartAndSpo2();
  printAllData();
}

// ---------- Temperature ----------
void readTemperature() {
  if (millis() - lastTempRead >= TEMP_INTERVAL) {
    lastTempRead = millis();

    float temp = tempSensor.readTemperature() + TEMP_OFFSET;

    if (temp > 20.0 && temp < 45.0) {
      bodyTemp = temp;
    }
  }
}

// ---------- BPM + SpO2 + BP ----------
void readHeartAndSpo2() {
  long irValue = particleSensor.getIR();

  bool fingerDetected = irValue > FINGER_THRESHOLD;

  if (!fingerDetected) {
    bpm = 0;
    bpmAvg = 0;
    spo2 = 0;
    sysBP = 0;
    diaBP = 0;
    validSPO2 = 0;
    lastBeat = 0;
    rateSpot = 0;

    for (byte i = 0; i < RATE_SIZE; i++) {
      rates[i] = 0;
    }

    return;
  }

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    bpm = 60 / (delta / 1000.0);

    if (bpm > 40 && bpm < 180) {
      rates[rateSpot++] = (byte)bpm;
      rateSpot %= RATE_SIZE;

      bpmAvg = 0;
      for (byte i = 0; i < RATE_SIZE; i++) {
        bpmAvg += rates[i];
      }
      bpmAvg /= RATE_SIZE;

      // ESTIMATE BLOOD PRESSURE (NOT MEDICALLY ACCURATE)
      sysBP = 115 + ((bpmAvg - 70) * 0.4); 
      diaBP = 75 + ((bpmAvg - 70) * 0.2);
    }
  }

  // Faster SpO2 update every 5 seconds
  if (millis() - lastSpo2Time > 5000) {
    lastSpo2Time = millis();

    for (byte i = 0; i < SPO2_SAMPLES; i++) {
      while (particleSensor.available() == false) {
        particleSensor.check();
      }

      redBuffer[i] = particleSensor.getRed();
      irBuffer[i] = particleSensor.getIR();
      particleSensor.nextSample();
    }

    maxim_heart_rate_and_oxygen_saturation(
      irBuffer,
      SPO2_SAMPLES,
      redBuffer,
      &spo2,
      &validSPO2,
      &spo2HeartRate,
      &validHeartRate
    );
  }
}

// ---------- Print ----------
void printAllData() {
  if (millis() - lastPrintTime < 200) {
    return;
  }

  lastPrintTime = millis();

  long irValue = particleSensor.getIR();

  Serial.print("Temp: ");
  Serial.print(bodyTemp, 2);
  Serial.print(" C");

  Serial.print(" | IR: ");
  Serial.print(irValue);

  if (irValue <= FINGER_THRESHOLD) {
    Serial.println(" | No finger detected");
    return;
  }

  Serial.print(" | BPM: ");
  Serial.print(bpm);

  Serial.print(" | Avg BPM: ");
  Serial.print(bpmAvg);

  Serial.print(" | BP (Est): ");
  Serial.print(sysBP);
  Serial.print("/");
  Serial.print(diaBP);

  Serial.print(" | SpO2: ");

  if (validSPO2 && spo2 >= 70 && spo2 <= 100) {
    Serial.print(spo2);
    Serial.print("%");
  } else {
    Serial.print("Invalid");
  }

  Serial.println();
}
