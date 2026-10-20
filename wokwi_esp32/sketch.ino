/**
 * ===================================================================
 * ESP32 + MQ-2 Gas Sensor + LCD 16x2 I2C + LED + Buzzer
 * Sesuai Skema Rangkaian UTS Monitoring Gas IoT
 * ===================================================================
 * 
 * Komponen & Pinout:
 * 1. Sensor MQ-2 (AOUT)  -> GPIO 34 (ADC1_CH6)
 * 2. LCD 16x2 I2C        -> SDA: GPIO 21, SCL: GPIO 22
 * 3. LED Merah (Alarm)   -> GPIO 4 (melalui Resistor 220Ω)
 * 4. Buzzer Alarm        -> GPIO 13
 * 5. Wi-Fi & HTTP Client -> Kirim data otomatis ke backend Dashboard
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <math.h>

// --- KONFIGURASI PIN HARDWARE ---
#define MQ2_ANALOG_PIN  34   // Pin AOUT Sensor MQ-2
#define LED_RED_PIN     4    // Pin LED Indikator Merah
#define BUZZER_PIN      13   // Pin Buzzer Alarm

// Inisialisasi LCD 16x2 I2C (Alamat default I2C: 0x27, 16 kolom, 2 baris)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// --- KONFIGURASI WI-FI WOKWI ---
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// --- KONFIGURASI BACKEND SERVER ---
// URL Backend Cloud Vercel:
const char* serverUrl = "https://dashboard-monitoring-gas.vercel.app/api/sensor/data";

// ID & Nama Perangkat
const char* DEVICE_ID = "ESP32-MQ2-WOKWI-01";
const char* DEVICE_NAME = "ESP32 Node MQ-2 Lab 1";

// Interval pengiriman data ke server (milidetik) - 3000ms sangat stabil untuk HTTPS Wokwi
const unsigned long SEND_INTERVAL = 3000;
unsigned long lastSendTime = 0;

// --- PARAMETER KALIBRASI MQ-2 ---
const float RL_VALUE     = 10.0;   // Resistor beban pada modul (kΩ)
const float RO_CLEAN_AIR = 10.0;   // R0 terkalibrasi di udara bersih (kΩ)
const float CURVE_A      = 574.25; // Koefisien A kurva LPG Datasheet
const float CURVE_B      = -2.222; // Eksponen B kurva LPG Datasheet

// Ambang Batas Status Gas (PPM)
const float PPM_WARNING = 200.0;   // Batas Waspada
const float PPM_DANGER  = 500.0;   // Batas Bahaya

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  Sistem Monitoring Gas IoT (ESP32 + MQ-2 + LCD)");
  Serial.println("==============================================");

  // Inisialisasi Pin
  pinMode(MQ2_ANALOG_PIN, INPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Resolusi ADC 12-bit (0 - 4095)
  analogReadResolution(12);

  // Inisialisasi Layar LCD 16x2 I2C
  Wire.begin(21, 22); // SDA: 21, SCL: 22
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Gas Monitoring");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");

  // Hubungkan ke Wi-Fi
  connectToWiFi();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready!");
  delay(1000);
  lcd.clear();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // 1. Baca ADC dari sensor MQ-2 dengan smoothing (10 sampel)
  int rawADC = readSmoothedADC(MQ2_ANALOG_PIN, 10);

  // 2. Hitung tegangan V_out (0 - 3.3V)
  float voltage = (rawADC / 4095.0) * 3.3;
  float safeVoltage = constrain(voltage, 0.01, 3.29);

  // 3. Hitung resistansi sensor (Rs)
  float rs = RL_VALUE * ((3.3 - safeVoltage) / safeVoltage);

  // 4. Hitung estimasi PPM berdasarkan kurva fisik MQ-2
  float rsRoRatio = rs / RO_CLEAN_AIR;
  float ppmEstimate = CURVE_A * pow(rsRoRatio, CURVE_B);
  if (ppmEstimate < 0) ppmEstimate = 0;
  if (ppmEstimate > 20000) ppmEstimate = 20000;

  // 5. Tentukan status teks
  String statusStr = "AMAN";
  if (ppmEstimate >= PPM_DANGER) {
    statusStr = "BAHAYA";
  } else if (ppmEstimate >= PPM_WARNING) {
    statusStr = "WASPADA";
  }

  // 6. Tampilkan ke Layar LCD 16x2
  updateLCD(ppmEstimate, statusStr);

  // 7. Kontrol Indikator Fisik (LED & Buzzer)
  updateIndicators(statusStr);

  // 8. Kirim data ke Backend Server tiap interval waktu
  unsigned long currentMillis = millis();
  if (currentMillis - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentMillis;
    sendDataToBackend(rawADC, voltage, rsRoRatio, ppmEstimate, statusStr);
  }

  delay(100);
}

void connectToWiFi() {
  Serial.print("Menghubungkan ke Wi-Fi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Terhubung ke Wokwi-GUEST!");
    Serial.print("[Wi-Fi] IP Address: ");
    Serial.println(WiFi.localIP());
  }
}

int readSmoothedADC(int pin, int samples) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / samples);
}

void updateLCD(float ppm, String statusStr) {
  // Baris 1: "Gas: XXX PPM"
  lcd.setCursor(0, 0);
  lcd.print("Gas: ");
  lcd.print((int)ppm);
  lcd.print(" PPM    ");

  // Baris 2: "Status: AMAN/WASPADA/BAHAYA"
  lcd.setCursor(0, 1);
  lcd.print("Status: ");
  lcd.print(statusStr);
  lcd.print("       ");
}

void updateIndicators(String statusStr) {
  if (statusStr == "BAHAYA") {
    // LED Merah Menyala & Buzzer Alarm Berbunyi
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (statusStr == "WASPADA") {
    // LED Merah Berkedip & Buzzer Mati
    digitalWrite(LED_RED_PIN, (millis() / 300) % 2 == 0 ? HIGH : LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else {
    // Kondisi AMAN: Semua Indikator Bahaya Mati
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }
}

void sendDataToBackend(int adcValue, float voltage, float rsRo, float ppm, String statusStr) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Bypass-Tunnel-Reminder", "true");

  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"device_name\":\"" + String(DEVICE_NAME) + "\",";
  jsonPayload += "\"adc_value\":" + String(adcValue) + ",";
  jsonPayload += "\"is_demo\":false";
  jsonPayload += "}";

  Serial.println("\n-------------------------------------------");
  Serial.printf("[SENSOR MQ-2] ADC: %d | Tegangan: %.2fV\n", adcValue, voltage);
  Serial.printf("[LCD DISPLAY] Gas: %d PPM | Status: %s\n", (int)ppm, statusStr.c_str());

  int httpResponseCode = http.POST(jsonPayload);
  if (httpResponseCode > 0) {
    Serial.printf("[BACKEND]     Berhasil kirim! (Kode HTTP: %d)\n", httpResponseCode);
  } else {
    Serial.printf("[BACKEND]     Gagal kirim: %s (%d)\n", http.errorToString(httpResponseCode).c_str(), httpResponseCode);
  }
  http.end();
}
