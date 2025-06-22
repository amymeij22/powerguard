// Gabungan Skrip: Event + Status + BBM Monitoring dengan Notifikasi WhatsApp Asynchronous
// Output: Kirim data ke Firebase, simpan sementara jika offline, dan kirim notifikasi WhatsApp
// Struktur data: /status/, /level/, /event/, /system_status

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <EEPROM.h>
#include "time.h"
#include <freertos/FreeRTOS.h> // Untuk FreeRTOS
#include <freertos/task.h>     // Untuk tugas (tasks) FreeRTOS
#include <freertos/queue.h>    // Untuk antrian (queues) FreeRTOS

// === Konfigurasi WiFi dan Firebase ===
#define WIFI_SSID       "YOUR_WIFI_SSID_HERE"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD_HERE"
#define DATABASE_URL    "YOUR_FIREBASE_DATABASE_URL_HERE"
#define NTP_SERVER      "YOUR_NTP_SERVER_HERE"
#define GMT_OFFSET      7 * 3600    // GMT+7 untuk WIB
#define DAYLIGHT_OFFSET 0

// === Konfigurasi Fonnte WhatsApp API ===
#define FONNTE_API_URL      "https://api.fonnte.com/send"
#define FONNTE_API_TOKEN    "YOUR_FONNTE_TOKEN_HERE" // GANTI DENGAN TOKEN API FONNTE ANDA
#define WHATSAPP_TARGET_NUMBER "YOUR_WHATSAPP_TARGET_NUMBER_HERE" // GANTI DENGAN NOMOR WHATSAPP TUJUAN (tanpa + di depan)

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
const float TANK135_FULL_CM = 2.0; // Jarak saat tangki 135kVA penuh (cm)
const float TANK135_EMPTY_CM = 20.0; // Jarak saat tangki 135kVA kosong (cm)
const float TANK150_FULL_CM = 2.0; // Jarak saat tangki 150kVA penuh (cm)
const float TANK150_EMPTY_CM = 19.0; // Jarak saat tangki 150kVA kosong (cm)
const float LOW_FUEL_THRESHOLD = 20.0; // Ambang batas persentase BBM rendah untuk peringatan

// === Variabel Global untuk Waktu dan Status ===
RTC_DS3231 rtc; // Objek RTC untuk modul DS3231
DateTime lastPLNOnTime, lastPLNOffTime; // Timestamp untuk perubahan status daya PLN
bool wifiConnectedBefore = false; // Flag untuk mengecek apakah WiFi pernah terhubung sebelumnya
int prevPLN = -1, prevRadar = -1, prev135 = -1, prev150 = -1; // Status sebelumnya dari sumber daya
float lastLevel135 = -1, lastLevel150 = -1, lastRadarLevel = -1; // Level bahan bakar terakhir yang dilaporkan
unsigned long lastLevelUpdate = 0; // Timestamp pembaruan data level terakhir
const unsigned long LEVEL_INTERVAL = 10000; // Interval pembaruan level bahan bakar (10 detik)
const unsigned long STATUS_INTERVAL = 100;  // Interval pembaruan status realtime (100 ms)
unsigned long lastStatusCheck = 0; // Timestamp pemeriksaan status terakhir

// === Variabel Global untuk Notifikasi WhatsApp ===
unsigned long lastLowFuelNotif135 = 0; // Timestamp notifikasi BBM rendah terakhir tangki 135kVA
unsigned long lastLowFuelNotif150 = 0; // Timestamp notifikasi BBM rendah terakhir tangki 150kVA
unsigned long lastLowFuelNotifRadar = 0; // Timestamp notifikasi BBM rendah terakhir tangki Radar
const unsigned long LOW_FUEL_NOTIF_COOLDOWN = 30 * 60 * 1000; // Cooldown 30 menit untuk notifikasi BBM rendah

// === Variabel Global untuk Pelacakan Waktu Operasi Genset ===
unsigned long genset135StartTime = 0; // Waktu mulai genset 135kVA berjalan
unsigned long genset150StartTime = 0; // Waktu mulai genset 150kVA berjalan
unsigned long radarGensetStartTime = 0; // Waktu mulai genset Radar berjalan

// === Struktur Data untuk Penyimpanan EEPROM ===

// Struktur untuk menyimpan data level bahan bakar
struct LevelData {
  float tangki135;
  float tangki150;
  float radar;
  char datetime[25]; // String Timestamp
  bool valid;        // Flag untuk menunjukkan apakah data valid (untuk penyimpanan offline)
};

// Struktur untuk menyimpan data event
struct EventData {
  char type[20];     // Tipe event (misalnya, "pln_off", "genset_pemanasan")
  char datetime[25]; // String Timestamp
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

LevelData eepromLevel;     // Variabel global untuk menyimpan data level dari EEPROM
EventData storedEvent;     // Variabel global untuk menyimpan data event dari EEPROM
RuntimeData persistedRunTimes; // Variabel global untuk menyimpan data runtime dari EEPROM

// === Alamat EEPROM ===
#define EEPROM_ADDRESS_EVENTDATA 0
#define EEPROM_ADDRESS_LEVELDATA 100
#define EEPROM_ADDRESS_RUNTIMEDATA 200

// === FreeRTOS Globals ===
QueueHandle_t networkQueue; // Antrian untuk komunikasi jaringan

// Struktur untuk pesan yang akan dikirim melalui tugas jaringan
struct NetworkMessage {
    enum MessageType {
        FB_STATUS,        // Pesan status Firebase
        FB_LEVEL,         // Pesan level Firebase
        FB_EVENT,         // Pesan event Firebase
        WA_MESSAGE        // Pesan WhatsApp
    } type;
    char path[50];      // Untuk jalur Firebase atau nomor target WhatsApp
    char payload[700];  // Payload JSON untuk Firebase atau pesan untuk WhatsApp (ukuran ditingkatkan)
    unsigned long timestamp; // Timestamp untuk pesan (berguna untuk percobaan ulang atau debugging)
    int retryCount;     // Berapa kali pesan ini telah dicoba ulang
};

// --- Function Prototypes for Network Task ---
void networkTask(void *pvParameters); // Prototipe fungsi tugas jaringan
bool enqueueNetworkMessage(NetworkMessage::MessageType type, const String& path, const String& payload); // Prototipe fungsi untuk menambahkan pesan ke antrian

/**
 * @brief Memformat objek DateTime menjadi string "DD/MM/YYYY HH:MM:SS".
 * @param dt Objek DateTime yang akan diformat.
 * @return String yang berisi tanggal dan waktu yang diformat.
 */
String formatDateTime(const DateTime &dt) {
  char buf[25]; // Buffer untuk menampung string yang diformat
  sprintf(buf, "%02d/%02d/%04d %02d:%02d:%02d", dt.day(), dt.month(), dt.year(), dt.hour(), dt.minute(), dt.second());
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
 * @brief Mengirim data (JSON) ke Firebase secara langsung (blocking).
 * Fungsi ini digunakan hanya di dalam `networkTask`.
 * @param path Jalur Firebase untuk mengirim data.
 * @param json String JSON yang akan dikirim.
 * @param method Metode HTTP yang akan digunakan ("PUT" atau "PATCH"). Defaultnya "PUT".
 * @return True jika data berhasil dikirim (HTTP 200 atau 204), false jika gagal.
 */
bool _sendToFirebaseDirect(const String &path, const String &json, const String &method = "PUT") {
  HTTPClient http; // Objek klien HTTP
  http.begin(DATABASE_URL + path + ".json");
  http.addHeader("Content-Type", "application/json");
  int code;
  if (method == "PATCH") {
    code = http.sendRequest("PATCH", (uint8_t *)json.c_str(), json.length());
  } else {
    code = http.PUT(json);
  }
  bool success = (code == 200 || code == 204);
  Serial.printf("[Firebase Direct] %s => %s (Code: %d)\n", path.c_str(), http.getString().c_str(), code);
  http.end();
  return success;
}

/**
 * @brief Mengirim pesan WhatsApp melalui Fonnte API secara langsung (blocking).
 * Fungsi ini digunakan hanya di dalam `networkTask`.
 * @param target Nomor WhatsApp tujuan (tanpa kode negara di depan).
 * @param message Isi pesan yang akan dikirim.
 * @return True jika pesan berhasil dikirim, false jika gagal.
 */
bool _sendWhatsAppMessageDirect(const String& target, const String& message) {
  HTTPClient http;
  http.begin(FONNTE_API_URL);
  http.addHeader("Authorization", FONNTE_API_TOKEN);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String postData = "target=" + target + "&message=" + message;

  int httpResponseCode = http.POST(postData);

  if (httpResponseCode > 0) {
    Serial.printf("[WhatsApp Direct] Pesan terkirim. Kode: %d, Respon: %s\n", httpResponseCode, http.getString().c_str());
    http.end();
    return true;
  } else {
    Serial.printf("[WhatsApp Direct] Gagal mengirim pesan. Kode: %d, Error: %s\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    http.end();
    return false;
  }
}

/**
 * @brief Fungsi untuk menambahkan pesan ke antrian jaringan.
 * Ini adalah fungsi non-blocking yang dipanggil dari `loop()` utama.
 * @param type Tipe pesan (mis. FB_STATUS, WA_MESSAGE).
 * @param path Jalur Firebase atau nomor target WhatsApp.
 * @param payload Payload JSON atau isi pesan.
 * @return True jika pesan berhasil ditambahkan ke antrian, false jika gagal (antrian penuh).
 */
bool enqueueNetworkMessage(NetworkMessage::MessageType type, const String& path, const String& payload) {
    NetworkMessage msg;
    msg.type = type;
    strncpy(msg.path, path.c_str(), sizeof(msg.path) - 1);
    msg.path[sizeof(msg.path) - 1] = '\0'; // Pastikan null-terminated
    strncpy(msg.payload, payload.c_str(), sizeof(msg.payload) - 1);
    msg.payload[sizeof(msg.payload) - 1] = '\0'; // Pastikan null-terminated
    msg.timestamp = millis();
    msg.retryCount = 0;

    // Coba kirim ke antrian. Jika antrian penuh, ini akan memblokir sebentar (100ms) sebelum gagal.
    if (xQueueSend(networkQueue, &msg, pdMS_TO_TICKS(100)) != pdPASS) {
        Serial.println("[Enqueue] Gagal menambahkan pesan ke antrian. Antrian penuh atau timeout.");
        return false;
    }
    return true;
}

/**
 * @brief Membaca tegangan RMS dari pin analog.
 * Fungsi ini mengambil beberapa sampel, menemukan tegangan puncak-ke-puncak,
 * dan mengkonversinya ke RMS. Meskipun ada `delayMicroseconds`, ini adalah blokir singkat
 * yang umumnya dapat diterima untuk pembacaan sensor.
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
 * Fungsi ini menggunakan `pulseIn` yang merupakan fungsi blocking. Namun, dengan timeout 30ms,
 * efek blocking-nya minimal untuk interval pembacaan yang jarang (setiap 10 detik).
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
    samples[i] = (dur == 0 || dist < 1 || dist > 100) ? 999.0 : dist;
    delay(30); // Small blocking delay
  }
  float med = median(samples, 3);
  if (med == 999.0) return -1.0;
  return constrain((emptyCM - med) / (emptyCM - fullCM) * 100.0, 0.0, 100.0);
}

/**
 * @brief Mensinkronkan RTC (Real-Time Clock) dengan server NTP.
 * @param: Tidak ada.
 * @return: Tidak ada.
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
 * @brief Implementasi tugas FreeRTOS untuk komunikasi jaringan.
 * Tugas ini berjalan secara independen dan menangani semua permintaan HTTP ke Firebase dan Fonnte,
 * sehingga `loop()` utama tidak terblokir.
 * @param pvParameters Pointer ke parameter tugas (tidak digunakan).
 */
void networkTask(void *pvParameters) {
    NetworkMessage msg;
    const int MAX_RETRIES = 5; // Maksimal percobaan ulang untuk pesan yang gagal

    for (;;) {
        // Menunggu tanpa batas waktu untuk pesan dari antrian.
        // Tugas ini akan 'tidur' jika tidak ada pesan dan tidak mengkonsumsi CPU.
        if (xQueueReceive(networkQueue, &msg, portMAX_DELAY) == pdPASS) {
            Serial.printf("[NetworkTask] Menerima pesan: Tipe=%d, Jalur=%s, Payload=%s\n", msg.type, msg.path, msg.payload);

            if (WiFi.status() != WL_CONNECTED) {
                Serial.println("[NetworkTask] WiFi tidak terhubung. Mencoba lagi nanti...");
                msg.retryCount++;
                if (msg.retryCount < MAX_RETRIES) {
                    vTaskDelay(pdMS_TO_TICKS(5000)); // Tunggu 5 detik sebelum mencoba lagi
                    xQueueSend(networkQueue, &msg, 0); // Kirim kembali ke antrian (non-blocking)
                } else {
                    Serial.println("[NetworkTask] Percobaan ulang maksimal tercapai untuk pesan. Pesan dibuang.");
                    // Dalam aplikasi nyata, Anda mungkin ingin menyimpan ini ke penyimpanan persisten atau memberikan peringatan.
                }
                continue; // Lanjut ke pesan berikutnya jika WiFi tidak terhubung
            }

            bool success = false;
            switch (msg.type) {
                case NetworkMessage::FB_STATUS:
                case NetworkMessage::FB_LEVEL:
                case NetworkMessage::FB_EVENT:
                    // Untuk kesederhanaan, asumsikan PUT untuk semua data Firebase yang dikirim dari sini.
                    // Jika PATCH spesifik diperlukan, logika perlu diperluas.
                    success = _sendToFirebaseDirect(String(msg.path), String(msg.payload));
                    break;
                case NetworkMessage::WA_MESSAGE:
                    success = _sendWhatsAppMessageDirect(String(msg.path), String(msg.payload));
                    break;
            }

            if (!success) {
                Serial.printf("[NetworkTask] Gagal mengirim pesan. Tipe: %d, Jalur: %s. Mencoba ulang...\n", msg.type, msg.path);
                msg.retryCount++;
                if (msg.retryCount < MAX_RETRIES) {
                    vTaskDelay(pdMS_TO_TICKS(1000)); // Penundaan kecil sebelum mencoba ulang
                    xQueueSend(networkQueue, &msg, 0); // Kirim kembali ke antrian (non-blocking)
                } else {
                    Serial.println("[NetworkTask] Percobaan ulang maksimal tercapai untuk pesan. Pesan dibuang.");
                }
            }
        }
        vTaskDelay(1); // Memberikan kendali ke tugas lain
    }
}

/**
 * @brief Fungsi Setup, berjalan sekali saat startup.
 * Menginisialisasi komunikasi serial, EEPROM, RTC, WiFi, FreeRTOS task, dan mengirim status sistem awal.
 * Juga memeriksa dan mengirim data event offline yang tersimpan sebelumnya.
 */
void setup() {
  Serial.begin(115200); // Inisialisasi komunikasi serial
  analogReadResolution(12); // Atur resolusi ADC ke 12 bit
  EEPROM.begin(EEPROM_ADDRESS_RUNTIMEDATA + sizeof(RuntimeData)); // Inisialisasi EEPROM
  Wire.begin(); // Inisialisasi I2C untuk komunikasi RTC

  pinMode(TRIG_135, OUTPUT); pinMode(ECHO_135, INPUT);
  pinMode(TRIG_150, OUTPUT); pinMode(ECHO_150, INPUT);

  Serial.print("Menghubungkan ke WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500); // Blocking delay in setup is acceptable
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " WiFi Tersambung" : " WiFi Gagal");
  wifiConnectedBefore = WiFi.status() == WL_CONNECTED;

  if (!rtc.begin()) {
    Serial.println("RTC ERROR, lanjut pakai waktu dummy");
    rtc.adjust(DateTime(2025, 1, 1, 0, 0, 0));
  }
  syncRTCWithNTP();

  // === Inisialisasi FreeRTOS Queue dan Task ===
  networkQueue = xQueueCreate(10, sizeof(NetworkMessage)); // Buat antrian dengan 10 slot
  if (networkQueue == NULL) {
      Serial.println("Gagal membuat antrian jaringan!");
      // Handle error (fatal)
  }

  xTaskCreatePinnedToCore(
      networkTask,          // Fungsi yang akan dieksekusi oleh tugas
      "NetworkTask",        // Nama tugas
      4096,                 // Ukuran stack tugas (byte)
      NULL,                 // Parameter tugas
      5,                    // Prioritas tugas (lebih tinggi = lebih penting)
      NULL,                 // Handle tugas (tidak digunakan)
      1                     // Jalankan di Core 1 (Core jaringan ESP32)
  );

  // Kirim status online sistem awal ke Firebase melalui antrian (non-blocking)
  DateTime now = rtc.now();
  enqueueNetworkMessage(NetworkMessage::FB_STATUS, "/system_status", "{\"isOnline\":1,\"datetime\":\"" + formatDateTime(now) + "\"}");

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

  // Cek data event offline yang tersimpan dan kirim jika WiFi terhubung
  EEPROM.get(EEPROM_ADDRESS_EVENTDATA, storedEvent);
  if (storedEvent.valid && WiFi.status() == WL_CONNECTED) {
    String uid = String(millis(), HEX);
    String json = "{\"event\":\"" + String(storedEvent.type) + "\",\"datetime\":\"" + String(storedEvent.datetime) +
                  "\",\"genset_135\":" + String(storedEvent.genset_135) +
                  ",\"genset_150\":" + String(storedEvent.genset_150) +
                  ",\"genset_radar\":" + String(storedEvent.genset_radar) + "}";
    // Enqueue the stored event instead of direct send
    if (enqueueNetworkMessage(NetworkMessage::FB_EVENT, "/event/" + String(storedEvent.type) + "/" + uid, json)) {
      storedEvent.valid = false;
      EEPROM.put(EEPROM_ADDRESS_EVENTDATA, storedEvent);
      EEPROM.commit();
      Serial.println("[EEPROM] Event offline berhasil ditambahkan ke antrian.");
    } else {
      Serial.println("[EEPROM] Gagal menambahkan event offline ke antrian, akan coba lagi nanti.");
    }
  }
}

/**
 * @brief Fungsi loop utama, berjalan berulang kali secara non-blocking.
 * Memeriksa status daya, memperbarui level bahan bakar, dan menambahkan permintaan ke antrian
 * untuk diproses oleh tugas jaringan.
 */
void loop() {
  DateTime now = rtc.now();

  // === Cek dan Perbarui Status Daya (setiap STATUS_INTERVAL) ===
  if (millis() - lastStatusCheck >= STATUS_INTERVAL) {
    lastStatusCheck = millis();

    int PLN    = (getRMS(ZMPT_PLN_PIN) > THRESHOLD_VOLT) ? 1 : 0;
    int RADAR  = (getRMS(ZMPT_RADAR_PIN) > THRESHOLD_VOLT) ? 1 : 0;
    int GEN135 = (getRMS(ZMPT_135_PIN) > THRESHOLD_VOLT) ? 1 : 0;
    int GEN150 = (getRMS(ZMPT_150_PIN) > THRESHOLD_VOLT) ? 1 : 0;

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
      String datetime = formatDateTime(now);
      EventData e = {"pln_off", "", 0, 0, 0, true};
      datetime.toCharArray(e.datetime, 25);
      EEPROM.put(EEPROM_ADDRESS_EVENTDATA, e); EEPROM.commit();
      storedEvent = e;
    }
    // Deteksi PLN hidup
    if (prevPLN == 0 && PLN == 1) {
      lastPLNOnTime = now;
    }

    // Deteksi event pemanasan genset
    if (PLN == 1 && (GEN135 || GEN150 || RADAR)) {
      TimeSpan dur = now - lastPLNOnTime;
      if (dur.totalseconds() >= 300) {
        String datetime = formatDateTime(now);
        EventData e = {"genset_pemanasan", "", GEN135, GEN150, RADAR, true};
        datetime.toCharArray(e.datetime, 25);
        EEPROM.put(EEPROM_ADDRESS_EVENTDATA, e); EEPROM.commit();
        storedEvent = e;
      }
    }

    // Kirim pembaruan status ke Firebase DAN WhatsApp jika ada perubahan status sumber daya
    if ((PLN != prevPLN || RADAR != prevRadar || GEN135 != prev135 || GEN150 != prev150)) {
      String uid = String(millis(), HEX);
      String json = "{\"pln\":" + String(PLN) + ",\"genset_135\":" + String(GEN135) +
                    ",\"genset_150\":" + String(GEN150) + ",\"genset_radar\":" + String(RADAR) +
                    ",\"datetime\":\"" + formatDateTime(now) + "\"}";
      enqueueNetworkMessage(NetworkMessage::FB_STATUS, "/status/" + uid, json); // Non-blocking send

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
          if (persistedRunTimes.totalGenset135RunTime > 0) whatsappMessage += "Total waktu Genset 135kVA beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalGenset135RunTime)) + "\n";
          if (persistedRunTimes.totalGenset150RunTime > 0) whatsappMessage += "Total waktu Genset 150kVA beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalGenset150RunTime)) + "\n";
          if (persistedRunTimes.totalRadarRunTime > 0) whatsappMessage += "Total waktu Genset Radar beroperasi: " + formatTimeSpan(TimeSpan(persistedRunTimes.totalRadarRunTime)) + "\n";
      }

      whatsappMessage += "\nLevel BBM:\n";
      whatsappMessage += "- Tangki 135kVA: " + String(lastLevel135, 1) + "%";
      if (lastLevel135 >= 0 && lastLevel135 < LOW_FUEL_THRESHOLD) whatsappMessage += " (Peringatan: BBM hampir habis)";
      whatsappMessage += "\n";

      whatsappMessage += "- Tangki 150kVA: " + String(lastLevel150, 1) + "%";
      if (lastLevel150 >= 0 && lastLevel150 < LOW_FUEL_THRESHOLD) whatsappMessage += " (Peringatan: BBM hampir habis)";
      whatsappMessage += "\n";

      whatsappMessage += "- Tangki Radar: " + String(lastRadarLevel, 1) + "%";
      if (lastRadarLevel >= 0 && lastRadarLevel < LOW_FUEL_THRESHOLD) whatsappMessage += " (Peringatan: BBM hampir habis)";
      whatsappMessage += "\n";

      enqueueNetworkMessage(NetworkMessage::WA_MESSAGE, WHATSAPP_TARGET_NUMBER, whatsappMessage); // Non-blocking send
    }

    prevPLN = PLN; prevRadar = RADAR; prev135 = GEN135; prev150 = GEN150;
  }

  // === Cek dan Perbarui Level Bahan Bakar (setiap LEVEL_INTERVAL) ===
  if (millis() - lastLevelUpdate >= LEVEL_INTERVAL) {
    lastLevelUpdate = millis();

    float tangki135 = readLevelValidated(TRIG_135, ECHO_135, TANK135_FULL_CM, TANK135_EMPTY_CM);
    float tangki150 = readLevelValidated(TRIG_150, ECHO_150, TANK150_FULL_CM, TANK150_EMPTY_CM);
    float radarVolt = analogRead(RADAR_LEVEL_PIN) * 3.3 / 4095.0;
    float radarLevel = (radarVolt >= 0.1 && radarVolt <= 1.27) ? constrain((radarVolt / 1.27) * 100.0, 0.0, 100.0) : -1.0;

    bool chg135 = fabs(tangki135 - lastLevel135) > 5;
    bool chg150 = fabs(tangki150 - lastLevel150) > 5;
    bool chgRadar = (radarLevel >= 0 && fabs(radarLevel - lastRadarLevel) > 5);

    if ((chg135 || chg150 || chgRadar || lastLevel135 < 0)) {
      String uid = String(millis(), HEX);
      String json = "{\"tangki_135kva\":" + String(tangki135, 2) + ",\"tangki_150kva\":" + String(tangki150, 2);
      if (radarLevel >= 0) json += ",\"tangki_radar\":" + String(radarLevel, 2);
      json += ",\"datetime\":\"" + formatDateTime(now) + "\"}";

      // Enqueue the level data. If enqueue fails, save to EEPROM as a fallback.
      if (!enqueueNetworkMessage(NetworkMessage::FB_LEVEL, "/level/" + uid, json)) {
        LevelData d = {tangki135, tangki150, radarLevel, "", true};
        formatDateTime(now).toCharArray(d.datetime, 25);
        EEPROM.put(EEPROM_ADDRESS_LEVELDATA, d); EEPROM.commit();
        eepromLevel = d;
        Serial.println("[EEPROM] Data level disimpan ke EEPROM karena antrian penuh.");
      }
      lastLevel135 = tangki135;
      lastLevel150 = tangki150;
      if (radarLevel >= 0) lastRadarLevel = radarLevel;
    }

    // --- Cek untuk notifikasi level bahan bakar rendah ---
    String lowFuelMessage = "PERINGATAN BBM RENDAH | " + formatDateTime(now) + "\n\n";
    bool lowFuelDetected = false;

    if (tangki135 >= 0 && tangki135 < LOW_FUEL_THRESHOLD && (millis() - lastLowFuelNotif135 >= LOW_FUEL_NOTIF_COOLDOWN)) {
        lowFuelMessage += "Tangki 135kVA mencapai " + String(tangki135, 1) + "% (di bawah batas aman)\n";
        lowFuelDetected = true;
        lastLowFuelNotif135 = millis();
    }
    if (tangki150 >= 0 && tangki150 < LOW_FUEL_THRESHOLD && (millis() - lastLowFuelNotif150 >= LOW_FUEL_NOTIF_COOLDOWN)) {
        lowFuelMessage += "Tangki 150kVA mencapai " + String(tangki150, 1) + "% (di bawah batas aman)\n";
        lowFuelDetected = true;
        lastLowFuelNotif150 = millis();
    }
    if (radarLevel >= 0 && radarLevel < LOW_FUEL_THRESHOLD && (millis() - lastLowFuelNotifRadar >= LOW_FUEL_NOTIF_COOLDOWN)) {
        lowFuelMessage += "Tangki Radar mencapai " + String(radarLevel, 1) + "% (di bawah batas aman)\n";
        lowFuelDetected = true;
        lastLowFuelNotifRadar = millis();
    }

    if (lowFuelDetected) {
        lowFuelMessage += "\nSegera lakukan pengisian ulang sebelum genset berhenti mendadak.\n\n";
        lowFuelMessage += "Status saat ini:\n";
        // Gunakan status PLN dan Genset terbaru dari variabel global
        lowFuelMessage += "- PLN: " + String(PLN == 1 ? "ON" : "OFF") + "\n";
        lowFuelMessage += "- Genset 135kVA: " + String(GEN135 == 1 ? "ON" : "OFF") + "\n";
        lowFuelMessage += "- Genset 150kVA: " + String(GEN150 == 1 ? "ON" : "OFF") + "\n";
        lowFuelMessage += "- Genset Radar: " + String(RADAR == 1 ? "ON" : "OFF") + "\n";
        enqueueNetworkMessage(NetworkMessage::WA_MESSAGE, WHATSAPP_TARGET_NUMBER, lowFuelMessage); // Non-blocking send
    }
  }
  delay(1); // Penundaan singkat untuk memberikan waktu CPU ke tugas lain
}
