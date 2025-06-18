#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <RTClib.h>
#include "time.h"

// === Konfigurasi ===
#define WIFI_SSID     "BMKG-MEDAN"
#define WIFI_PASSWORD "bmkg@123"
#define DATABASE_URL  "https://powerguard-bbmkg-default-rtdb.asia-southeast1.firebasedatabase.app"
#define NTP_SERVER     "ntp.bmkg.go.id"
#define GMT_OFFSET     7 * 3600
#define DAYLIGHT_OFFSET 0

// === Pin dan Sensor ===
#define ZMPT_PLN_PIN     36
#define ZMPT_RADAR_PIN   39
#define ZMPT_135_PIN     34
#define ZMPT_150_PIN     35
#define TRIG_PIN         15
#define ECHO_PIN         4
#define TRIG_PIN2        13
#define ECHO_PIN2        14

const float THRESHOLD_VOLT = 0.7;
const float TANK_FULL_CM = 2.0;
const float TANK_EMPTY_CM = 48.0;
const float TANK2_FULL_CM = 2.0;
const float TANK2_EMPTY_CM = 87.0;

// === Global Variables ===
RTC_DS3231 rtc;
DateTime lastPLNOnTime;   // Waktu terakhir PLN nyala (ON)
DateTime lastPLNOffTime;  // Waktu terakhir PLN mati (OFF)
bool wifiPreviouslyConnected = false;
int prevPLN = -1, prevRadar = -1, prev135 = -1, prev150 = -1;
float lastReservoirLevel = -1, lastDrumLevel = -1;
bool isPLNActive = false;  // Status PLN saat ini

unsigned long lastStatusUpdate = 0;
unsigned long lastLevelUpdate = 0;
const unsigned long LEVEL_INTERVAL = 10000; // cek level tiap 10 detik

// === Utilitas ===
String formatDateTime(const DateTime &dt) {
  char buf[20];
  sprintf(buf, "%02d/%02d/%04d %02d:%02d:%02d", dt.day(), dt.month(), dt.year(), dt.hour(), dt.minute(), dt.second());
  return String(buf);
}

String formatDuration(unsigned long seconds) {
  int days = seconds / 86400;
  seconds %= 86400;
  int hours = seconds / 3600;
  seconds %= 3600;
  int minutes = seconds / 60;
  seconds %= 60;
  char buf[100];
  sprintf(buf, "%d hari %02d jam %02d menit %02d detik", days, hours, minutes, (int)seconds);
  return String(buf);
}

void syncRTCWithNTP() {
  configTime(GMT_OFFSET, DAYLIGHT_OFFSET, NTP_SERVER);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
    Serial.println("[RTC] Sinkronisasi NTP berhasil");
  } else {
    Serial.println("[RTC] Gagal sinkronisasi NTP");
  }
}

void sendToFirebase(const String &path, const String &json, const String &method = "PUT") {
  HTTPClient http;
  http.begin(DATABASE_URL + path + ".json");
  http.addHeader("Content-Type", "application/json");
  int code = (method == "PATCH") ? http.sendRequest("PATCH", (uint8_t *)json.c_str(), json.length()) : http.PUT(json);
  Serial.printf("[Firebase] %s => %s\n", path.c_str(), http.getString().c_str());
  http.end();
}

void sendMessage(const String &text) {
  String message = "POWERGUARD - MONITORING BBMKG I\n\n" + text + "\n\n_MBKM STMKG - BBMKG I 2025_";
  message.replace("\"", "\\\""); message.replace("\n", "\\n");

  HTTPClient http;
  http.begin("http://20.2.65.42:3000/api/sendText");
  http.addHeader("accept", "application/json");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", "yoursecretkey");

  String payload = "{\"session\":\"default\",\"chatId\":\"6282283475043@c.us\",\"text\":\"" + message + "\"}";
  int httpCode = http.POST(payload);
  if (httpCode > 0) Serial.printf("[MESSAGE] %s\n", http.getString().c_str());
  else Serial.printf("[MESSAGE] GAGAL: %s\n", http.errorToString(httpCode).c_str());
  http.end();
}

float getRMS(int pin) {
  int minVal = 4095, maxVal = 0;
  for (int i = 0; i < 200; i++) {
    int v = analogRead(pin);
    minVal = min(minVal, v);
    maxVal = max(maxVal, v);
    delayMicroseconds(100);
  }
  return (maxVal - minVal) * 3.3 / 4096.0;
}

float readLevel(int trigPin, int echoPin, float fullCM, float emptyCM) {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long dur = pulseIn(echoPin, HIGH, 30000);
  float dist = dur * 0.0343 / 2;
  return constrain((emptyCM - dist) / (emptyCM - fullCM) * 100.0, 0.0f, 100.0f);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println(" WiFi Tersambung");

  Wire.begin();
  if (!rtc.begin()) {
    Serial.println("RTC ERROR"); while (1);
  }
  syncRTCWithNTP();

  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(TRIG_PIN2, OUTPUT); pinMode(ECHO_PIN2, INPUT);

  DateTime now = rtc.now();
  sendToFirebase("/system_status", "{\"isOnline\":1,\"datetime\":\"" + formatDateTime(now) + "\"}", "PATCH");
  wifiPreviouslyConnected = true;
  
  // Inisialisasi waktu PLN
  lastPLNOnTime = now;
  lastPLNOffTime = now;
  
  // Cek status awal PLN
  isPLNActive = (getRMS(ZMPT_PLN_PIN) > THRESHOLD_VOLT);
  if (isPLNActive) {
    lastPLNOnTime = now;
  } else {
    lastPLNOffTime = now;
  }
}

void loop() {
  DateTime now = rtc.now();
  String dt = formatDateTime(now);

  if (WiFi.status() != WL_CONNECTED) {
    if (wifiPreviouslyConnected) {
      sendToFirebase("/system_status", "{\"isOnline\":0}", "PATCH");
      wifiPreviouslyConnected = false;
    }
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    delay(5000);
    return;
  }

  if (!wifiPreviouslyConnected || (millis() - lastStatusUpdate > 20000)) {
    lastStatusUpdate = millis();
    sendToFirebase("/system_status", "{\"isOnline\":1,\"datetime\":\"" + dt + "\"}", "PATCH");
    wifiPreviouslyConnected = true;
  }

  // === STATUS LISTRIK ===
  int PLN = (getRMS(ZMPT_PLN_PIN) > THRESHOLD_VOLT) ? 1 : 0;
  int RADAR = (getRMS(ZMPT_RADAR_PIN) > THRESHOLD_VOLT) ? 1 : 0;
  int GEN135 = (getRMS(ZMPT_135_PIN) > THRESHOLD_VOLT) ? 1 : 0;
  int GEN150 = (getRMS(ZMPT_150_PIN) > THRESHOLD_VOLT) ? 1 : 0;

  bool isStatusChanged = PLN != prevPLN || RADAR != prevRadar || GEN135 != prev135 || GEN150 != prev150;

  if (isStatusChanged) {
    String uid = String(millis(), HEX);

    // Simpan ke Firebase
    String json = "{";
    json += "\"pln\":" + String(PLN) + ",";
    json += "\"genset_135\":" + String(GEN135) + ",";
    json += "\"genset_150\":" + String(GEN150) + ",";
    json += "\"genset_radar\":" + String(RADAR) + ",";
    json += "\"datetime\":\"" + dt + "\"}";
    sendToFirebase("/status/" + uid, json);

    // Hitung durasi PLN berdasarkan status perubahan
    String durasiPLN = "";
    if (PLN == 1 && prevPLN == 0) {
      // PLN baru nyala
      lastPLNOnTime = now;
      durasiPLN = formatDuration(now.unixtime() - lastPLNOffTime.unixtime());
    } else if (PLN == 0 && prevPLN == 1) {
      // PLN baru mati
      lastPLNOffTime = now;
      durasiPLN = formatDuration(now.unixtime() - lastPLNOnTime.unixtime());
    } else if (PLN == 1 && prevPLN == 1) {
      // PLN tetap nyala
      durasiPLN = formatDuration(now.unixtime() - lastPLNOnTime.unixtime());
    } else if (PLN == 0 && prevPLN == 0) {
      // PLN tetap mati
      durasiPLN = formatDuration(now.unixtime() - lastPLNOffTime.unixtime());
    }

    // Buat pesan notifikasi berdasarkan kondisi
    String notif = "";

    // Kondisi 1: PLN aktif, semua genset nonaktif
    if (PLN == 1 && GEN135 == 0 && GEN150 == 0 && RADAR == 0) {
      notif = "- PLN Aktif\n- Genset otomatis Nonaktif.\nPLN sebelumnya menyala selama: " + durasiPLN;
    }
    // Kondisi 2: PLN aktif, ada genset yang aktif (dipanaskan)
    else if (PLN == 1 && (GEN135 == 1 || GEN150 == 1 || RADAR == 1)) {
      String gensetDipanas = "";
      if (GEN135 == 1) gensetDipanas += "135kVA ";
      if (GEN150 == 1) gensetDipanas += "150kVA ";
      if (RADAR == 1) gensetDipanas += "Radar ";
      notif = "- PLN Aktif\n- Genset " + gensetDipanas + "sedang dipanaskan.\nPLN sebelumnya menyala selama: " + durasiPLN;
    }
    // Kondisi 3: PLN nonaktif, genset radar aktif dan salah satu genset operasional aktif
    else if (PLN == 0 && RADAR == 1 && (GEN135 == 1 || GEN150 == 1)) {
      notif = "- PLN Nonaktif\n- Genset otomatis aktif.\nPLN sebelumnya menyala selama: " + durasiPLN;
    }
    else if (PLN == 0 && RADAR == 0 && (GEN135 == 1 || GEN150 == 1)) {
      notif = "- PLN Nonaktif\n- Genset radar aktif\n- Genset operasional *tidak aktif*\nSilakan nyalakan manual!\nPLN sebelumnya menyala selama: " + durasiPLN;
    }
    // Kondisi 4a: PLN nonaktif, genset radar aktif tapi kedua genset operasional nonaktif
    else if (PLN == 0 && RADAR == 1 && GEN135 == 0 && GEN150 == 0) {
      notif = "- PLN Nonaktif\n- Genset operasional aktif\n- Genset radar *tidak aktif*\nSilakan nyalakan manual!\nPLN sebelumnya menyala selama: " + durasiPLN;
    }

    // Kirim pesan jika ada perubahan status yang relevan
    if (notif != "") {
      sendMessage(notif);
    }

    // Simpan status lama
    prevPLN = PLN;
    prevRadar = RADAR;
    prev135 = GEN135;
    prev150 = GEN150;
  }

  // === LEVEL AIR ===
  if (millis() - lastLevelUpdate > LEVEL_INTERVAL) {
    lastLevelUpdate = millis();
    float reservoir = readLevel(TRIG_PIN, ECHO_PIN, TANK_FULL_CM, TANK_EMPTY_CM);
    float drum = readLevel(TRIG_PIN2, ECHO_PIN2, TANK2_FULL_CM, TANK2_EMPTY_CM);

    bool reservoirChanged = fabs(reservoir - lastReservoirLevel) > 5;
    bool drumChanged = fabs(drum - lastDrumLevel) > 5;

    if (reservoirChanged || drumChanged || lastReservoirLevel < 0 || lastDrumLevel < 0) {
      String uid = String(millis(), HEX);
      String json = "{";
      json += "\"reservoir\":" + String(reservoir, 2) + ",";
      json += "\"drum\":" + String(drum, 2) + ",";
      json += "\"datetime\":\"" + dt + "\"}";
      sendToFirebase("/level/" + uid, json);

      lastReservoirLevel = reservoir;
      lastDrumLevel = drum;
    }
  }

  delay(500);
}
