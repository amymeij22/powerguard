// =====================================================================
// Project       : PowerGuard Monitoring System - ESP32
// Description   : Monitoring status PLN & Genset, serta level BBM 3 tangki
// Board         : ESP32 Dev Module
// Sensor        : ZMPT101B (PLN & Genset), HC-SR04 (Ultrasonik), ADC Analog Radar
// Storage       : EEPROM (backup offline data)
// Connectivity  : WiFi + Firebase Realtime Database
// Time Sync     : RTC DS3231 + NTP (BMKG)
// Author        : |MBKM 2025-Inskal BBMKG I|
// Last Update   : 22 Juni 2025
// =====================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <EEPROM.h>
#include "time.h"
#include <vector> // Digunakan untuk menyimpan event yang tertunda saat offline
#include <queue>  // Digunakan untuk antrian pengiriman pesan
#include <algorithm> // Untuk std::sort di readLevelValidated
#include <math.h> // Untuk fabs()

// === Konfigurasi WiFi dan Firebase ===
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define DATABASE_URL    "YOUR_FIREBASE_URL"
#define NTP_SERVER      "YOUR_NTP_SERVER"
#define GMT_OFFSET      7 * 3600    // GMT+7 for WIB
#define DAYLIGHT_OFFSET 0

// === Konfigurasi Fonnte WhatsApp API ===
#define FONNTE_API_URL      "https://api.fonnte.com/send"
#define FONNTE_API_TOKEN    "YOUR_FONNTE_API_TOKEN" // GANTI DENGAN TOKEN API FONNTE ANDA
#define WHATSAPP_TARGET_NUMBER "YOUR_WHATSAPP_TARGET_NUMBER" // GANTI DENGAN NOMOR WHATSAPP TUJUAN (tanpa + di depan)

// === Pin dan Sensor ===
#define ZMPT_PLN_PIN    36 // Pin Analog untuk sensor tegangan PLN (Listrik Utama)
#define ZMPT_RADAR_PIN  39 // Pin Analog untuk sensor tegangan Genset Radar
#define ZMPT_135_PIN    34 // Pin Analog untuk sensor tegangan Genset 135kVA
#define ZMPT_150_PIN    35 // Pin Analog untuk sensor tegangan Genset 150kVA
#define TRIG_135        15 // Pin Trigger untuk sensor ultrasonik tangki 135kVA
#define ECHO_135        4  // Pin Echo untuk sensor ultrasonik tangki 135kVA
#define TRIG_150        13 // Pin Trigger untuk sensor ultrasonik tangki 150kVA
#define ECHO_150        14 // Pin Echo untuk sensor ultrasonik tangki 150kVA
#define RADAR_LEVEL_PIN 32 // Pin Analog untuk sensor Level Radar

// === Ambang Batas dan Dimensi Tangki ===
const float THRESHOLD_VOLT = 0.7; // Ambang batas tegangan untuk mendeteksi sumber daya aktif

// Definisi ulang untuk mempermudah pemahaman:
// Asumsi: Nilai-nilai ini adalah JARAK FISIK dari sensor ke permukaan BBM
// saat tangki PENUH dan KOSONG. Sesuaikan ini dengan kalibrasi fisik sensor Anda.
const float TANK135_FULL_CM = 2.0; // Jarak sensor ke permukaan BBM saat tangki 135kVA penuh (misal: 2 cm)
const float TANK135_EMPTY_CM = 20.0; // Jarak sensor ke permukaan BBM saat tangki 135kVA kosong (misal: 20 cm)

const float TANK150_FULL_CM = 2.0; // Jarak sensor ke permukaan BBM saat tangki 150kVA penuh (misal: 2 cm)
const float TANK150_EMPTY_CM = 19.0; // Jarak sensor ke permukaan BBM saat tangki 150kVA kosong (misal: 19 cm)

const float LOW_FUEL_THRESHOLD = 20.0; // Ambang batas persentase BBM rendah untuk peringatan

// === Variabel Global untuk Waktu dan Status ===
RTC_DS3231 rtc; // Objek RTC untuk modul DS3231
DateTime lastPLNOnTime, lastPLNOffTime; // Timestamp untuk perubahan status daya PLN
bool wifiConnectedBefore = false; // Flag untuk mengecek apakah WiFi pernah terhubung sebelumnya
int prevPLN = -1, prevRadar = -1, prev135 = -1, prev150 = -1; // Status sebelumnya dari sumber daya
float lastLevel135 = -1, lastLevel150 = -1, lastRadarLevel = -1; // Level bahan bakar terakhir yang dilaporkan (yang berhasil dikirim/diantrikan)
unsigned long lastLevelReadTime = 0; // Timestamp pembacaan sensor level terakhir (per 1 detik)
const unsigned long LEVEL_READ_INTERVAL = 1000; // Interval pembacaan sensor level (1 detik)
const unsigned long STATUS_INTERVAL = 100;  // Interval pembaruan status realtime (100 ms)
const unsigned long WIFI_RECONNECT_INTERVAL = 5000; // Interval mencoba reconnect WiFi (5 detik)
unsigned long lastStatusCheck = 0; // Timestamp pemeriksaan status terakhir
unsigned long lastWifiCheck = 0;   // Timestamp pemeriksaan WiFi terakhir

// === Variabel Global untuk Notifikasi WhatsApp ===
unsigned long lastLowFuelNotif135 = 0; // Timestamp notifikasi BBM rendah terakhir tangki 135kVA
unsigned long lastLowFuelNotif150 = 0; // Timestamp notifikasi BBM rendah terakhir tangki 150kVA
unsigned long lastLowFuelNotifRadar = 0; // Timestamp notifikasi BBM rendah terakhir tangki Radar
const unsigned long LOW_FUEL_NOTIF_COOLDOWN = 30 * 60 * 1000; // Cooldown 30 menit untuk notifikasi BBM rendah

// === Variabel Global untuk Pelacakan Waktu Operasi Genset ===
unsigned long genset135StartTime = 0; // Waktu mulai genset 135kVA berjalan
unsigned long genset150StartTime = 0; // Waktu mulai genset 150kVA berjalan
unsigned long radarGensetStartTime = 0; // Waktu mulai genset Radar berjalan

// === Data Structures for EEPROM Storage ===

// Struktur untuk menyimpan data level bahan bakar
struct LevelData {
  float tangki135;
  float tangki150;
  float radar;
  char datetime[25]; // String Timestamp (max 24 chars + null terminator)
  bool valid;        // Flag untuk menunjukkan apakah data valid (untuk penyimpanan offline)
};

// Struktur untuk menyimpan data event
struct EventData {
  char type[20];     // Tipe event (misalnya, "pln_off", "genset_warmup")
  char datetime[25]; // String Timestamp (max 24 chars + null terminator)
  int genset_135;    // Status genset 135kVA saat event
  int genset_150;    // Status genset 150kVA saat event
  int genset_radar;  // Status genset radar saat event
  bool valid;        // Flag untuk menunjukkan apakah data valid (untuk penyimpanan offline)
};

// Struktur untuk menyimpan data waktu operasi genset yang persisten di EEPROM
struct RuntimeData {
    unsigned long totalGenset135RunTime = 0; // Total waktu operasi genset 135kVA (detik)
    unsigned long totalGenset150RunTime = 0; // Total waktu operasi genset 150kVA (detik)
    unsigned long totalRadarRunTime = 0;     // Total waktu operasi genset Radar (detik)
    bool valid = false; // Flag untuk mengecek apakah data EEPROM sudah diinisialisasi
};

LevelData eepromLevel;      // Variabel global untuk menyimpan data level dari EEPROM
EventData storedEvent;      // Variabel global untuk menyimpan data event dari EEPROM
RuntimeData persistedRunTimes; // Variabel global untuk menyimpan data runtime dari EEPROM

// === Alamat EEPROM ===
#define EEPROM_ADDRESS_EVENTDATA 0
#define EEPROM_ADDRESS_LEVELDATA 100
#define EEPROM_ADDRESS_RUNTIMEDATA 200

// === Offline Data Queue (Volatile - Hilang jika ESP32 restart) ===
struct QueuedData {
    String type; // "firebase" or "whatsapp"
    String path; // Untuk Firebase
    String jsonOrMessage; // Untuk Firebase atau WhatsApp
    String method; // Untuk Firebase (PUT/PATCH)
    String whatsappTarget; // Untuk WhatsApp
};
std::queue<QueuedData> offlineDataQueue;
unsigned long lastQueueSendTime = 0;
const unsigned long QUEUE_SEND_DELAY = 10000; // 10 detik jeda pengiriman

// === Control Flag for Offline Data Processing ===
bool isProcessingOfflineQueue = false; // Flag untuk menjeda operasi normal selama pengiriman data offline

// === Global variable for System Status Update ===
unsigned long lastSystemStatusSent = 0;
const unsigned long SYSTEM_STATUS_INTERVAL = 20000; // 20 detik

/**
 * @brief Memformat objek DateTime menjadi string "DD/MM/YYYY HH:MM:SS".
 * @param dt Objek DateTime yang akan diformat.
 * @return String yang berisi tanggal dan waktu yang diformat.
 */
String formatDateTime(const DateTime &dt) {
  char buf[25]; // Buffer untuk menampung string yang diformat
  // Pastikan buffer diakhiri null dan cukup besar untuk "DD/MM/YYYY HH:MM:SS\0" (20 karakter)
  snprintf(buf, sizeof(buf), "%02d/%02d/%04d %02d:%02d:%02d", dt.day(), dt.month(), dt.year(), dt.hour(), dt.minute(), dt.second());
  return String(buf);
}

/**
 * @brief Memformat objek TimeSpan menjadi string "X hari Y jam Z menit W detik".
 * @param ts Objek TimeSpan yang akan diformat.
 * @return String yang berisi durasi yang diformat.
 */
String formatTimeSpan(const TimeSpan& ts) {
  String formatted = "";
  if (ts.days() > 0) formatted += String(ts.days()) + " hari ";
  // Hanya tampilkan jam, menit, detik jika ada nilainya, atau jika hari == 0
  if (ts.hours() > 0 || formatted != "") formatted += String(ts.hours()) + " jam ";
  if (ts.minutes() > 0 || formatted != "") formatted += String(ts.minutes()) + " menit ";
  formatted += String(ts.seconds()) + " detik"; // Detik selalu ditampilkan
  return formatted;
}

/**
 * @brief Mengirim data (JSON) ke Firebase.
 * Jika WiFi tidak terhubung, data akan dimasukkan ke dalam antrian untuk dikirim nanti.
 * @param path Jalur Firebase untuk mengirim data.
 * @param json String JSON yang akan dikirim.
 * @param method Metode HTTP yang akan digunakan ("PUT" atau "PATCH"). Defaultnya "PUT".
 * @return True jika data berhasil dikirim (HTTP 200 atau 204), false jika gagal atau WiFi tidak terhubung.
 */
bool sendToFirebase(const String &path, const String &json, const String &method = "PUT") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Firebase] WiFi tidak terhubung, data ditambahkan ke antrian.");
    offlineDataQueue.push({"firebase", path, json, method, ""}); // Tambahkan ke antrian
    return false;
  }
  HTTPClient http;
  http.begin(DATABASE_URL + path + ".json");
  http.addHeader("Content-Type", "application/json");

  // Debug: Cetak JSON yang akan dikirim ke Firebase
  Serial.print("[Debug JSON to Firebase] ");
  Serial.println(json);

  int code;
  if (method == "PATCH") {
    code = http.sendRequest("PATCH", (uint8_t *)json.c_str(), json.length());
  } else {
    code = http.PUT(json);
  }
  bool success = (code == 200 || code == 204);
  Serial.printf("[Firebase] %s (Code: %d) Response: %s\n", path.c_str(), code, http.getString().c_str());
  http.end();
  return success;
}

/**
 * @brief Mengirim data status sistem ke Firebase, hanya jika WiFi terhubung.
 * Fungsi ini tidak akan mengantrekan data jika WiFi terputus.
 * @param path Jalur Firebase untuk mengirim data.
 * @param json String JSON yang akan dikirim.
 * @param method Metode HTTP yang akan digunakan ("PUT" atau "PATCH"). Defaultnya "PATCH".
 * @return True jika data berhasil dikirim (HTTP 200 atau 204), false jika gagal atau WiFi tidak terhubung.
 */
bool sendSystemStatusOnlyIfConnected(const String &path, const String &json, const String &method = "PATCH") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[System Status] WiFi tidak terhubung, tidak mengirim status sistem.");
    return false;
  }
  HTTPClient http;
  http.begin(DATABASE_URL + path + ".json");
  http.addHeader("Content-Type", "application/json");
  int code;
  if (method == "PATCH") {
    code = http.sendRequest("PATCH", (uint8_t *)json.c_str(), json.length());
  } else {
    code = http.PUT(json);
  }
  bool success = (code == 200 || code == 204);
  Serial.printf("[System Status] %s => %s (Code: %d)\n", path.c_str(), http.getString().c_str(), code);
  http.end();
  return success;
}


/**
 * @brief Mengirim pesan WhatsApp melalui Fonnte API.
 * Jika WiFi tidak terhubung, pesan akan dimasukkan ke dalam antrian untuk dikirim nanti.
 * @param target Nomor WhatsApp tujuan (tanpa kode negara di depan).
 * @param message Isi pesan yang akan dikirim.
 * @return True jika pesan berhasil dikirim, false jika gagal atau WiFi tidak terhubung.
 */
bool sendWhatsAppMessage(const String& target, const String& message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WhatsApp] WiFi tidak terhubung, pesan ditambahkan ke antrian.");
    offlineDataQueue.push({"whatsapp", "", message, "", target}); // Tambahkan ke antrian
    return false;
  }
  HTTPClient http;
  http.begin(FONNTE_API_URL);
  http.addHeader("Authorization", FONNTE_API_TOKEN);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String postData = "target=" + target + "&message=" + message;

  int httpResponseCode = http.POST(postData);

  if (httpResponseCode > 0) {
    Serial.printf("[WhatsApp] Pesan terkirim. Kode: %d, Respon: %s\n", httpResponseCode, http.getString().c_str());
    http.end();
    return true;
  } else {
    Serial.printf("[WhatsApp] Gagal mengirim pesan. Kode: %d, Error: %s\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    http.end();
    return false;
  }
}

/**
 * @brief Membaca tegangan RMS dari pin analog.
 * @param pin Pin analog yang akan dibaca.
 * @return Tegangan RMS yang dihitung.
 */
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

/**
 * @brief Menghitung median dari array float.
 * @param arr Pointer ke array float.
 * @param size Jumlah elemen dalam array.
 * @return Nilai median.
 */
float median(float* arr, int size) {
  // Simple bubble sort for small arrays
  for (int i = 0; i < size - 1; i++) {
    for (int j = i + 1; j < size; j++) {
      if (arr[j] < arr[i]) {
        float temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
      }
    }
  }
  return (size % 2 == 0) ? (arr[size/2 - 1] + arr[size/2]) / 2.0 : arr[size/2];
}

/**
 * @brief Membaca level bahan bakar dari sensor ultrasonik dan memvalidasi pembacaan.
 * @param trigPin Pin trigger sensor ultrasonik.
 * @param echoPin Pin echo sensor ultrasonik.
 * @param fullCM Jarak (cm) saat tangki dianggap penuh.
 * @param emptyCM Jarak (cm) saat tangki dianggap kosong.
 * @return Level bahan bakar dalam persentase (0-100), atau -1.0 jika pembacaan tidak valid.
 */
float readLevelValidated(int trigPin, int echoPin, float fullCM, float emptyCM) {
  float samples[5];
  for (int i = 0; i < 5; i++) {
    digitalWrite(trigPin, LOW); delayMicroseconds(2);
    digitalWrite(trigPin, HIGH); delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long dur = pulseIn(echoPin, HIGH, 30000); // Blocking for max 30ms
    float dist = dur * 0.0343 / 2;
    samples[i] = (dur == 0 || dist < 1 || dist > 100) ? 999.0 : dist; // Tandai pembacaan tidak valid
    delay(30); // Penundaan singkat
  }
  // Urutkan dan ambil median dari sampel yang valid
  // Pertama, saring nilai 999.0
  std::vector<float> validSamples;
  for(int i = 0; i < 5; ++i) {
      if (samples[i] != 999.0) {
          validSamples.push_back(samples[i]);
      }
  }

  if (validSamples.empty()) return -1.0; // Tidak ada pembacaan yang valid

  // Urutkan sampel yang valid
  std::sort(validSamples.begin(), validSamples.end());

  float med;
  int mid = validSamples.size() / 2;
  if (validSamples.size() % 2 == 0) {
      med = (validSamples[mid - 1] + validSamples[mid]) / 2.0;
  } else {
      med = validSamples[mid];
  }
  
  // Perhitungan persentase: (Jarak saat Kosong - Pembacaan Sensor) / (Jarak saat Kosong - Jarak saat Penuh) * 100
  return constrain((emptyCM - med) / (emptyCM - fullCM) * 100.0, 0.0, 100.0);
}

/**
 * @brief Membaca level bahan bakar dari sensor ADC Radar dengan validasi dan median.
 * @param pin Pin analog ADC Radar.
 * @return Level bahan bakar dalam persentase (0-100), atau -1.0 jika pembacaan tidak valid.
 */
float readRadarLevelValidated(int pin) {
  float samples[5];
  for (int i = 0; i < 5; i++) {
    int rawValue = analogRead(pin);
    float volt = rawValue * 3.3 / 4095.0; // Konversi ke voltase
    // Batasi rentang voltase yang valid untuk mencegah pembacaan aneh
    samples[i] = (volt >= 0.1 && volt <= 1.27) ? volt : 999.0; // Tandai tidak valid jika di luar rentang
    delay(5); // Penundaan singkat antar sampel
  }

  // Saring sampel yang tidak valid
  std::vector<float> validSamples;
  for(int i = 0; i < 5; ++i) {
      if (samples[i] != 999.0) {
          validSamples.push_back(samples[i]);
      }
  }

  if (validSamples.empty()) return -1.0; // Tidak ada pembacaan valid

  // Urutkan sampel valid untuk mendapatkan median
  std::sort(validSamples.begin(), validSamples.end());

  float medVolt;
  int mid = validSamples.size() / 2;
  if (validSamples.size() % 2 == 0) {
      medVolt = (validSamples[mid - 1] + validSamples[mid]) / 2.0;
  } else {
      medVolt = validSamples[mid];
  }

  // Konversi median voltase ke persentase level
  // Contoh: 0.1V = 0%, 1.27V = 100%. Sesuaikan rumus ini dengan karakteristik sensor Anda.
  // Jika 0.1V adalah 0% dan 1.27V adalah 100%:
  // range_volt = 1.27 - 0.1 = 1.17V
  // (medVolt - 0.1) / range_volt * 100.0
  return constrain((medVolt - 0.1) / (1.27 - 0.1) * 100.0, 0.0, 100.0);
}


/**
 * @brief Mensinkronkan RTC (Real-Time Clock) dengan server NTP.
 */
void syncRTCWithNTP() {
  configTime(GMT_OFFSET, DAYLIGHT_OFFSET, NTP_SERVER);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1,
                        timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
    Serial.println("[RTC] Sinkronisasi NTP berhasil");
  } else {
    Serial.println("[RTC] Gagal sinkronisasi NTP");
  }
}

/**
 * @brief Memeriksa status WiFi dan mencoba reconnect jika terputus.
 * Juga menangani pengiriman data yang diantri saat WiFi kembali terhubung.
 */
void checkAndReconnectWiFi() {
  // Hanya jalankan cek WiFi pada interval tertentu
  if (millis() - lastWifiCheck < WIFI_RECONNECT_INTERVAL) {
    return;
  }
  lastWifiCheck = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnectedBefore) {
      Serial.println("[WiFi] WiFi terputus. Mencoba menghubungkan kembali...");
    } else {
      Serial.println("[WiFi] Mencoba menghubungkan ke WiFi...");
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    wifiConnectedBefore = false; // Reset flag karena WiFi tidak terhubung
  } else {
    if (!wifiConnectedBefore) {
      Serial.println("[WiFi] WiFi terhubung kembali!");
      wifiConnectedBefore = true;
      Serial.println("[WiFi] Mengirim data yang tertunda...");
      // Panggil sendQueuedOfflineData setelah koneksi pulih
      isProcessingOfflineQueue = true; // Set flag untuk menjeda operasi normal
      sendQueuedOfflineData();         // Ini akan memblokir hingga semua data terkirim
      isProcessingOfflineQueue = false; // Reset flag setelah memproses antrian
      Serial.println("[WiFi] Semua data tertunda terkirim. Melanjutkan operasi normal.");

      // Sinkronkan RTC dengan NTP setelah reconnecting
      syncRTCWithNTP();
    }
  }
}

/**
 * @brief Mengirim data yang telah diantri (dari RAM dan EEPROM) setelah WiFi terhubung kembali.
 * Pengiriman dilakukan dengan jeda 10 detik antar setiap item.
 */
void sendQueuedOfflineData() {
    DateTime now = rtc.now(); // Perbarui waktu saat ini

    // Prioritaskan pengiriman event EEPROM yang persisten
    if (storedEvent.valid) {
        // Pastikan null termination setelah membaca dari EEPROM
        storedEvent.datetime[sizeof(storedEvent.datetime) - 1] = '\0';
        String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
        String json = "{\"event\":\"" + String(storedEvent.type) + "\",\"datetime\":\"" + String(storedEvent.datetime) +
                      "\",\"genset_135\":" + String(storedEvent.genset_135) +
                      ",\"genset_150\":" + String(storedEvent.genset_150) +
                      ",\"genset_radar\":" + String(storedEvent.genset_radar) + "}";

        // Log JSON yang akan dikirim dari EEPROM
        Serial.print("[Debug JSON from EEPROM Event] ");
        Serial.println(json);

        if (sendToFirebase("/event/" + String(storedEvent.type) + "/" + uid, json)) {
            storedEvent.valid = false;
            EEPROM.put(EEPROM_ADDRESS_EVENTDATA, storedEvent);
            EEPROM.commit();
            Serial.println("[EEPROM] Event offline berhasil dikirim ke Firebase. EEPROM dibersihkan.");
        } else {
            Serial.println("[EEPROM] Gagal mengirim event offline dari EEPROM, akan coba lagi nanti.");
        }
        delay(QUEUE_SEND_DELAY); // Jeda pengiriman
    }

    if (eepromLevel.valid) {
        // Pastikan null termination setelah membaca dari EEPROM
        eepromLevel.datetime[sizeof(eepromLevel.datetime) - 1] = '\0';
        String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
        String json = "{\"tangki_135kva\":";
        if (eepromLevel.tangki135 >= 0) json += String(eepromLevel.tangki135, 2); else json += "null";
        json += ",\"tangki_150kva\":";
        if (eepromLevel.tangki150 >= 0) json += String(eepromLevel.tangki150, 2); else json += "null";
        json += ",\"tangki_radar\":";
        if (eepromLevel.radar >= 0) json += String(eepromLevel.radar, 2); else json += "null";
        json += ",\"datetime\":\"" + String(eepromLevel.datetime) + "\"}"; // Menggunakan String(char*)

        // Log JSON yang akan dikirim dari EEPROM
        Serial.print("[Debug JSON from EEPROM Level] ");
        Serial.println(json);

        if (sendToFirebase("/level/" + uid, json)) {
            eepromLevel.valid = false;
            EEPROM.put(EEPROM_ADDRESS_LEVELDATA, eepromLevel);
            EEPROM.commit();
            Serial.println("[EEPROM] Data level offline berhasil dikirim ke Firebase. EEPROM dibersihkan.");
        } else {
            Serial.println("[EEPROM] Gagal mengirim data level offline dari EEPROM, akan coba lagi nanti.");
        }
        delay(QUEUE_SEND_DELAY); // Jeda pengiriman
    }

    // Kirim data yang diantri di RAM (volatile)
    while (!offlineDataQueue.empty()) {
        QueuedData data = offlineDataQueue.front();
        bool success = false;
        if (data.type == "firebase") {
            String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
            String finalPath = data.path;
            // Tambahkan UID hanya jika path tidak spesifik (tidak mengandung .json)
            if (finalPath.indexOf(".json") == -1) {
              if (!finalPath.endsWith("/")) finalPath += "/";
              finalPath += uid; // Tambahkan UID langsung ke path
            }
            success = sendToFirebase(finalPath, data.jsonOrMessage, data.method);
        } else if (data.type == "whatsapp") {
            success = sendWhatsAppMessage(data.whatsappTarget, data.jsonOrMessage);
        }

        if (success) {
            offlineDataQueue.pop(); // Hapus dari antrian jika berhasil
            Serial.println("[Queue] Data berhasil dikirim dari antrian.");
        } else {
            Serial.println("[Queue] Gagal mengirim data dari antrian, akan coba lagi nanti.");
            // Jika gagal, biarkan di antrian untuk dicoba lagi di loop berikutnya
            break; // Hentikan pengiriman antrian jika ada yang gagal, coba lagi nanti
        }
        delay(QUEUE_SEND_DELAY); // Jeda pengiriman antar item
    }
}

/**
 * @brief Fungsi Setup, berjalan sekali saat startup.
 * Menginisialisasi komunikasi serial, EEPROM, RTC, dan mengirim status sistem awal.
 */
void setup() {
  Serial.begin(115200); // Inisialisasi komunikasi serial
  analogReadResolution(12); // Atur resolusi ADC ke 12 bit
  EEPROM.begin(EEPROM_ADDRESS_RUNTIMEDATA + sizeof(RuntimeData)); // Inisialisasi EEPROM
  Wire.begin(); // Inisialisasi I2C untuk komunikasi RTC

  pinMode(TRIG_135, OUTPUT); pinMode(ECHO_135, INPUT);
  pinMode(TRIG_150, OUTPUT); pinMode(ECHO_150, INPUT);

  Serial.print("Memulai koneksi WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD); // Mulai koneksi WiFi, akan mencoba terus di background
  unsigned long startWifiConnect = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startWifiConnect < 10000)) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " WiFi Tersambung" : " WiFi Gagal pada Startup");
  wifiConnectedBefore = (WiFi.status() == WL_CONNECTED);

  if (!rtc.begin()) {
    Serial.println("RTC ERROR, lanjut pakai waktu dummy");
    rtc.adjust(DateTime(2025, 1, 1, 0, 0, 0));
  }
  if (WiFi.status() == WL_CONNECTED) {
    syncRTCWithNTP(); // Sinkronkan RTC hanya jika WiFi terhubung saat startup
  } else {
    Serial.println("[RTC] Tidak dapat sinkronisasi NTP, WiFi tidak terhubung.");
  }

  // Baca data waktu operasi genset yang persisten dari EEPROM
  EEPROM.get(EEPROM_ADDRESS_RUNTIMEDATA, persistedRunTimes);
  if (!persistedRunTimes.valid) {
      persistedRunTimes.totalGenset135RunTime = 0;
      persistedRunTimes.totalGenset150RunTime = 0;
      persistedRunTimes.totalRadarRunTime = 0;
      persistedRunTimes.valid = true;
      EEPROM.put(EEPROM_ADDRESS_RUNTIMEDATA, persistedRunTimes);
      EEPROM.commit();
      Serial.println("[EEPROM] Data waktu operasi genset diinisialisasi.");
  } else {
      Serial.println("[EEPROM] Data waktu operasi genset berhasil dimuat.");
  }

  // === Inisialisasi Awal Level BBM ===
  // Lakukan pembacaan awal agar lastLevelX memiliki nilai sebelum loop() berjalan
  lastLevel135 = readLevelValidated(TRIG_135, ECHO_135, TANK135_FULL_CM, TANK135_EMPTY_CM);
  lastLevel150 = readLevelValidated(TRIG_150, ECHO_150, TANK150_FULL_CM, TANK150_EMPTY_CM);
  lastRadarLevel = readRadarLevelValidated(RADAR_LEVEL_PIN); // Gunakan fungsi baru
  Serial.printf("[Setup] Initial BBM Levels: 135kVA: %.1f%%, 150kVA: %.1f%%, Radar: %.1f%%\n", lastLevel135, lastLevel150, lastRadarLevel);

  // Baca data EEPROM yang valid (akan diantri jika offline)
  EEPROM.get(EEPROM_ADDRESS_EVENTDATA, storedEvent);
  // Pastikan datetime diinisialisasi jika data tidak valid
  if (!storedEvent.valid) {
    storedEvent.datetime[0] = '\0';
  }

  EEPROM.get(EEPROM_ADDRESS_LEVELDATA, eepromLevel);
  // Pastikan datetime diinisialisasi jika data tidak valid
  if (!eepromLevel.valid) {
    eepromLevel.datetime[0] = '\0';
  }

  // Kirim status online sistem awal ke Firebase (akan dikirim hanya jika online)
  DateTime now = rtc.now();
  sendSystemStatusOnlyIfConnected("/system_status", "{\"isOnline\":1,\"datetime\":\"" + formatDateTime(now) + "\"}", "PATCH");
  lastSystemStatusSent = millis(); // Initialize this to avoid immediate re-sending
}

/**
 * @brief Fungsi loop utama, berjalan berulang kali.
 * Memeriksa status daya, memperbarui level bahan bakar, dan mengirim data.
 */
void loop() {
  checkAndReconnectWiFi(); // Selalu coba untuk memastikan WiFi terhubung

  // Hanya proses antrian jika WiFi terhubung dan sudah waktunya untuk mengirim
  // isProcessingOfflineQueue flag memastikan ini hanya dilakukan sekali saat reconnect
  // sendQueuedOfflineData() sekarang memblokir selama durasinya saat dipanggil oleh checkAndReconnectWiFi()
  // Jadi, blok ini hanya berfungsi sebagai cadangan untuk pemrosesan antrian yang terputus-putus
  if (WiFi.status() == WL_CONNECTED && !offlineDataQueue.empty() && millis() - lastQueueSendTime >= QUEUE_SEND_DELAY) {
      sendQueuedOfflineData(); // Panggilan ini juga akan mengelola penundaannya sendiri
      lastQueueSendTime = millis(); // Perbarui waktu pengiriman terakhir
  }

  // === Pembaruan Status Sistem Rutin ===
  // Pembaruan ini akan dikirim hanya jika WiFi terhubung, tidak diantri saat offline.
  if (millis() - lastSystemStatusSent >= SYSTEM_STATUS_INTERVAL) {
      DateTime now = rtc.now();
      sendSystemStatusOnlyIfConnected("/system_status", "{\"isOnline\":1,\"datetime\":\"" + formatDateTime(now) + "\"}", "PATCH");
      lastSystemStatusSent = millis();
  }

  // Hanya lakukan operasi normal jika tidak sedang memproses antrian offline
  if (!isProcessingOfflineQueue) {
    DateTime now = rtc.now();

    // Deklarasikan variabel status di awal loop() agar dapat diakses di seluruh fungsi
    int PLN = 0;
    int RADAR = 0;
    int GEN135 = 0;
    int GEN150 = 0;

    // === Cek dan Perbarui Status Daya (setiap STATUS_INTERVAL) ===
    // Pembacaan sensor tetap berjalan meskipun offline
    if (millis() - lastStatusCheck >= STATUS_INTERVAL) {
      lastStatusCheck = millis();

      PLN    = (getRMS(ZMPT_PLN_PIN) > THRESHOLD_VOLT) ? 1 : 0;
      RADAR  = (getRMS(ZMPT_RADAR_PIN) > THRESHOLD_VOLT) ? 1 : 0;
      GEN135 = (getRMS(ZMPT_135_PIN) > THRESHOLD_VOLT) ? 1 : 0;
      GEN150 = (getRMS(ZMPT_150_PIN) > THRESHOLD_VOLT) ? 1 : 0;

      // Logika Pelacakan Waktu Operasi Genset
      if (GEN135 == 1 && prev135 == 0) {
        genset135StartTime = millis();
      } else if (GEN135 == 0 && prev135 == 1) {
        if (genset135StartTime != 0) {
          persistedRunTimes.totalGenset135RunTime += (millis() - genset135StartTime) / 1000;
          genset135StartTime = 0;
          EEPROM.put(EEPROM_ADDRESS_RUNTIMEDATA, persistedRunTimes);
          EEPROM.commit();
        }
      }
      // Tangani Genset 135kVA yang sudah ON saat startup (set gensetStartTime jika belum diset)
      if (GEN135 == 1 && genset135StartTime == 0) {
        genset135StartTime = millis();
      }

      if (GEN150 == 1 && prev150 == 0) {
        genset150StartTime = millis();
      } else if (GEN150 == 0 && prev150 == 1) {
        if (genset150StartTime != 0) {
          persistedRunTimes.totalGenset150RunTime += (millis() - genset150StartTime) / 1000;
          genset150StartTime = 0;
          EEPROM.put(EEPROM_ADDRESS_RUNTIMEDATA, persistedRunTimes);
          EEPROM.commit();
        }
      }
      if (GEN150 == 1 && genset150StartTime == 0) {
        genset150StartTime = millis();
      }

      if (RADAR == 1 && prevRadar == 0) {
        radarGensetStartTime = millis();
      } else if (RADAR == 0 && prevRadar == 1) {
        if (radarGensetStartTime != 0) {
          persistedRunTimes.totalRadarRunTime += (millis() - radarGensetStartTime) / 1000;
          radarGensetStartTime = 0;
          EEPROM.put(EEPROM_ADDRESS_RUNTIMEDATA, persistedRunTimes);
          EEPROM.commit();
        }
      }
      if (RADAR == 1 && radarGensetStartTime == 0) {
        radarGensetStartTime = millis();
      }

      // Deteksi PLN mati dan rekam event
      if (prevPLN == 1 && PLN == 0) {
        lastPLNOffTime = now;
        String datetimeStr = formatDateTime(now);
        EventData e = {"pln_off", "", 0, 0, 0, true};
        strncpy(e.datetime, datetimeStr.c_str(), sizeof(e.datetime) - 1); // Gunakan strncpy untuk salinan yang lebih aman
        e.datetime[sizeof(e.datetime) - 1] = '\0'; // Pastikan pengakhiran null
        e.genset_135 = GEN135; // Rekam status genset saat PLN mati
        e.genset_150 = GEN150;
        e.genset_radar = RADAR;
        EEPROM.put(EEPROM_ADDRESS_EVENTDATA, e); EEPROM.commit(); // Simpan ke EEPROM
        storedEvent = e; // Perbarui variabel global
        Serial.println("[Event] PLN MATI terdeteksi, event disimpan ke EEPROM.");
      }
      // Deteksi PLN hidup
      if (prevPLN == 0 && PLN == 1) {
        lastPLNOnTime = now;
        // Kirim event PLN HIDUP (akan diantri jika offline)
        String datetimeStr = formatDateTime(now);
        String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
        String json = "{\"event\":\"pln_on\",\"datetime\":\"" + datetimeStr +
                      "\",\"genset_135\":" + String(GEN135) +
                      ",\"genset_150\":" + String(GEN150) +
                      ",\"genset_radar\":" + String(RADAR) + "}";
        sendToFirebase("/event/pln_on/" + uid, json);
        Serial.println("[Event] PLN HIDUP terdeteksi.");
      }

      // Deteksi event pemanasan genset
      // Asumsi: "pemanasan genset" terjadi jika genset menyala saat PLN juga ON
      if (PLN == 1 && (GEN135 || GEN150 || RADAR)) {
        TimeSpan dur = now - lastPLNOnTime; // Durasi PLN hidup sejak terakhir ON
        // Hanya rekam pemanasan jika PLN sudah ON selama minimal 5 menit (300 detik)
        // Ini adalah contoh logika, sesuaikan dengan definisi "pemanasan" yang sebenarnya
        if (dur.totalseconds() >= 300 && (prev135 == 0 || prev150 == 0 || prevRadar == 0)) { // Hanya ketika genset baru menyala
          String datetimeStr = formatDateTime(now);
          EventData e = {"genset_warmup", "", GEN135, GEN150, RADAR, true};
          strncpy(e.datetime, datetimeStr.c_str(), sizeof(e.datetime) - 1); // Gunakan strncpy untuk salinan yang lebih aman
          e.datetime[sizeof(e.datetime) - 1] = '\0'; // Pastikan pengakhiran null
          EEPROM.put(EEPROM_ADDRESS_EVENTDATA, e); EEPROM.commit(); // Simpan ke EEPROM
          storedEvent = e;
          Serial.println("[Event] Genset Pemanasan terdeteksi, event disimpan ke EEPROM.");
        }
      }

      // Kirim pembaruan status ke Firebase DAN WhatsApp jika ada perubahan status sumber daya
      if ((PLN != prevPLN || RADAR != prevRadar || GEN135 != prev135 || GEN150 != prev150)) {
        String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
        String json = "{\"pln\":" + String(PLN) + ",\"genset_135\":" + String(GEN135) +
                      ",\"genset_150\":" + String(GEN150) + ",\"genset_radar\":" + String(RADAR) +
                      ",\"datetime\":\"" + formatDateTime(now) + "\"}";
        sendToFirebase("/status/" + uid, json); // Akan diantri jika offline

        // --- Bentuk pesan WhatsApp untuk perubahan status listrik ---
        String whatsappMessage = "";

        if (PLN == 0 && prevPLN == 1) {
            whatsappMessage += "Status Listrik: PLN MATI | " + formatDateTime(now) + "\n";
        } else if (PLN == 1 && prevPLN == 0) {
            whatsappMessage += "Status Listrik: PLN HIDUP | " + formatDateTime(now) + "\n";
        } else {
            whatsappMessage += "Status Listrik: Perubahan | " + formatDateTime(now) + "\n";
        }

        whatsappMessage += "- PLN: " + String(PLN == 1 ? "ON" : "OFF") + "\n";
        whatsappMessage += "- Genset 135kVA: " + String(GEN135 == 1 ? "ON" : "OFF") + "\n";
        whatsappMessage += "- Genset 150kVA: " + String(GEN150 == 1 ? "ON" : "OFF") + "\n";
        whatsappMessage += "- Genset Radar: " + String(RADAR == 1 ? "ON" : "OFF") + "\n";

        if (PLN == 0 && prevPLN == 1) {
            TimeSpan plnOnDuration = now - lastPLNOnTime;
            whatsappMessage += "\nPLN sebelumnya menyala selama: " + formatTimeSpan(plnOnDuration) + "\n";
            if (GEN135 == 0 && GEN150 == 0 && RADAR == 0) {
                whatsappMessage += "\nPeringatan: Genset perlu di Start-Up Manual!\n";
            }
        } else if (PLN == 1 && prevPLN == 0) {
            // Hanya laporkan total runtime saat PLN hidup kembali (indikasi genset mati)
            if (persistedRunTimes.totalGenset135RunTime > 0) whatsappMessage += "Total waktu Genset 135kVA beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalGenset135RunTime)) + "\n";
            if (persistedRunTimes.totalGenset150RunTime > 0) whatsappMessage += "Total waktu Genset 150kVA beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalGenset150RunTime)) + "\n";
            if (persistedRunTimes.totalRadarRunTime > 0) whatsappMessage += "Total waktu Genset Radar beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalRadarRunTime)) + "\n";
        }

        // Bagian level BBM di sini dihapus karena notifikasi level BBM sekarang terpisah.
        // Ini untuk mencegah spam WhatsApp jika hanya status listrik berubah, tapi level BBM tidak rendah.

        sendWhatsAppMessage(WHATSAPP_TARGET_NUMBER, whatsappMessage); // Akan diantri jika offline
      }

      prevPLN = PLN; prevRadar = RADAR; prev135 = GEN135; prev150 = GEN150;
    }

    // === Pembacaan dan Pembaruan Level Bahan Bakar ===
    // Pembacaan sensor level selalu dilakukan setiap 1 detik.
    if (millis() - lastLevelReadTime >= LEVEL_READ_INTERVAL) { // Menggunakan LEVEL_READ_INTERVAL (1 detik)
      lastLevelReadTime = millis(); // Perbarui waktu pembacaan terakhir

      float currentTangki135 = readLevelValidated(TRIG_135, ECHO_135, TANK135_FULL_CM, TANK135_EMPTY_CM);
      float currentTangki150 = readLevelValidated(TRIG_150, ECHO_150, TANK150_FULL_CM, TANK150_EMPTY_CM);
      float currentRadarLevel = readRadarLevelValidated(RADAR_LEVEL_PIN); // Menggunakan fungsi baru untuk radar

      // Tentukan apakah ada perubahan signifikan pada level valid manapun
      bool hasSignificantChange = false;
      // Periksa perubahan 5% untuk tangki yang valid
      if (lastLevel135 >= 0 && currentTangki135 >= 0 && fabs(currentTangki135 - lastLevel135) > 5.0) hasSignificantChange = true;
      if (lastLevel150 >= 0 && currentTangki150 >= 0 && fabs(currentTangki150 - lastLevel150) > 5.0) hasSignificantChange = true;
      if (lastRadarLevel >= 0 && currentRadarLevel >= 0 && fabs(currentRadarLevel - lastRadarLevel) > 5.0) hasSignificantChange = true;

      // Juga pertimbangkan perubahan antara status valid/invalid sebagai "signifikan"
      // Jika sensor baru mulai memberikan bacaan valid (dari -1 ke >=0) atau sebaliknya
      if ((currentTangki135 >= 0) != (lastLevel135 >= 0)) hasSignificantChange = true;
      if ((currentTangki150 >= 0) != (lastLevel150 >= 0)) hasSignificantChange = true;
      if ((currentRadarLevel >= 0) != (lastRadarLevel >= 0)) hasSignificantChange = true;

      // Jika ini adalah pembacaan valid pertama untuk tangki mana pun, selalu kirim sekali.
      bool isInitialValidReadings = (lastLevel135 < 0 && currentTangki135 >= 0) ||
                                    (lastLevel150 < 0 && currentTangki150 >= 0) ||
                                    (lastRadarLevel < 0 && currentRadarLevel >= 0);

      // Kondisi untuk mengirim data level ke Firebase:
      // Hanya jika ada perubahan signifikan ATAU ini adalah pembacaan valid pertama
      if (hasSignificantChange || isInitialValidReadings) {
        String uid = String(rtc.now().unixtime(), HEX) + String(millis(), HEX); // UID yang lebih unik
        String json = "{\"tangki_135kva\":";
        if (currentTangki135 >= 0) json += String(currentTangki135, 2); else json += "null";
        json += ",\"tangki_150kva\":";
        if (currentTangki150 >= 0) json += String(currentTangki150, 2); else json += "null";
        json += ",\"tangki_radar\":";
        if (currentRadarLevel >= 0) json += String(currentRadarLevel, 2); else json += "null";
        json += ",\"datetime\":\"" + formatDateTime(now) + "\"}";

        // sendToFirebase akan mengantri data jika WiFi offline
        if (sendToFirebase("/level/" + uid, json)) {
          // Update lastLevelX HANYA jika berhasil dikirim (atau diantrikan)
          lastLevel135 = currentTangki135;
          lastLevel150 = currentTangki150;
          lastRadarLevel = currentRadarLevel;
          eepromLevel.valid = false; // Bersihkan backup EEPROM jika berhasil dikirim
          EEPROM.put(EEPROM_ADDRESS_LEVELDATA, eepromLevel);
          EEPROM.commit();
        } else {
          // Jika gagal dikirim (dan diantrikan), simpan pembacaan saat ini ke EEPROM
          LevelData d = {currentTangki135, currentTangki150, currentRadarLevel, "", true};
          String datetimeStr = formatDateTime(now);
          strncpy(d.datetime, datetimeStr.c_str(), sizeof(d.datetime) - 1); // Gunakan strncpy untuk salinan yang lebih aman
          d.datetime[sizeof(d.datetime) - 1] = '\0'; // Pastikan pengakhiran null
          EEPROM.put(EEPROM_ADDRESS_LEVELDATA, d); EEPROM.commit(); // Simpan ke EEPROM sebagai cadangan terakhir
          eepromLevel = d;
          Serial.println("[EEPROM] Data level disimpan ke EEPROM karena gagal dikirim.");
        }
      }

      // --- Cek untuk notifikasi level bahan bakar rendah ---
      // Logika ini tetap dieksekusi setiap 1 detik pembacaan sensor
      String lowFuelMessageHeader = "PERINGATAN BBM RENDAH | " + formatDateTime(now) + "\n\n";
      String lowFuelMessageDetails = "";
      bool anyLowFuelDetected = false;

      // Periksa setiap tangki secara individual untuk bahan bakar rendah dan cooldown
      if (currentTangki135 >= 0 && currentTangki135 < LOW_FUEL_THRESHOLD) {
          if (millis() - lastLowFuelNotif135 >= LOW_FUEL_NOTIF_COOLDOWN) {
              lowFuelMessageDetails += "Tangki 135kVA mencapai " + String(currentTangki135, 1) + "% (di bawah batas aman)\n";
              anyLowFuelDetected = true;
              lastLowFuelNotif135 = millis(); // Reset cooldown untuk tangki spesifik ini
          }
      } else {
          // Reset cooldown jika tangki tidak lagi rendah (atau pembacaan tidak valid)
          // Ini mencegah notifikasi berulang jika level naik/sensor error, lalu turun lagi
          if (lastLowFuelNotif135 != 0) { // Hanya reset jika sebelumnya pernah ada notif
             lastLowFuelNotif135 = 0;
          }
      }

      if (currentTangki150 >= 0 && currentTangki150 < LOW_FUEL_THRESHOLD) {
          if (millis() - lastLowFuelNotif150 >= LOW_FUEL_NOTIF_COOLDOWN) {
              lowFuelMessageDetails += "Tangki 150kVA mencapai " + String(currentTangki150, 1) + "% (di bawah batas aman)\n";
              anyLowFuelDetected = true;
              lastLowFuelNotif150 = millis(); // Reset cooldown untuk tangki spesifik ini
          }
      } else {
          if (lastLowFuelNotif150 != 0) {
             lastLowFuelNotif150 = 0;
          }
      }

      if (currentRadarLevel >= 0 && currentRadarLevel < LOW_FUEL_THRESHOLD) {
          if (millis() - lastLowFuelNotifRadar >= LOW_FUEL_NOTIF_COOLDOWN) {
              lowFuelMessageDetails += "Tangki Radar mencapai " + String(currentRadarLevel, 1) + "% (di bawah batas aman)\n";
              anyLowFuelDetected = true;
              lastLowFuelNotifRadar = millis(); // Reset cooldown untuk tangki spesifik ini
          }
      } else {
          if (lastLowFuelNotifRadar != 0) {
             lastLowFuelNotifRadar = 0;
          }
      }

      if (anyLowFuelDetected) {
          String finalLowFuelMessage = lowFuelMessageHeader + lowFuelMessageDetails;
          finalLowFuelMessage += "\nSegera lakukan pengisian ulang sebelum genset berhenti mendadak.\n\n";
          finalLowFuelMessage += "Status saat ini:\n";
          // Gunakan status PLN dan Genset terbaru yang sudah diperbarui di awal loop()
          finalLowFuelMessage += "- PLN: " + String(PLN == 1 ? "ON" : "OFF") + "\n";
          finalLowFuelMessage += "- Genset 135kVA: " + String(GEN135 == 1 ? "ON" : "OFF") + "\n";
          finalLowFuelMessage += "- Genset 150kVA: " + String(GEN150 == 1 ? "ON" : "OFF") + "\n";
          finalLowFuelMessage += "- Genset Radar: " + String(RADAR == 1 ? "ON" : "OFF") + "\n";
          sendWhatsAppMessage(WHATSAPP_TARGET_NUMBER, finalLowFuelMessage); // Akan diantri jika offline
      }
    }
  }
  delay(1); // Penundaan singkat untuk memberikan waktu CPU ke tugas lain
}
