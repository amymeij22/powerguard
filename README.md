# PowerGuard - Sistem Monitoring Sumber Daya Listrik

## Deskripsi Proyek

PowerGuard adalah sistem monitoring real-time untuk memantau status sumber daya listrik di BBMKG I Medan. Sistem ini dirancang untuk memantau dan menampilkan status sumber listrik PLN dan tiga unit genset (135kVA, 150kVA, dan Radar), serta level bahan bakar pada tangki genset.

## Fitur Utama

- **Monitoring Status Sumber Listrik**:
  - Status PLN (aktif/nonaktif)
  - Status Genset 135kVA (aktif/nonaktif)
  - Status Genset 150kVA (aktif/nonaktif)
  - Status Genset Radar (aktif/nonaktif)

- **Monitoring Level Bahan Bakar**:
  - Level tangki Genset 135kVA
  - Level tangki Genset 150kVA
  - Level tangki Genset Radar
  - Peringatan saat level bahan bakar rendah

- **Fitur Tambahan**:
  - Riwayat status perubahan sumber listrik
  - Notifikasi WhatsApp saat terjadi perubahan status kritis
  - Pencatatan pengisian bahan bakar
  - Mode gelap/terang
  - Antarmuka responsif untuk berbagai perangkat

## Teknologi yang Digunakan

### Frontend
- Next.js (React)
- TypeScript
- Tailwind CSS
- Shadcn UI Components

### Backend dan Penyimpanan Data
- Firebase Realtime Database

### Hardware
- ESP32 Development Board
- Sensor ZMPT101B (untuk deteksi tegangan PLN & Genset)
- Sensor HC-SR04 (Ultrasonik untuk level bahan bakar)
- Sensor ADC Analog (untuk level bahan bakar Radar)
- RTC DS3231 (untuk sinkronisasi waktu)
- Koneksi WiFi untuk transmisi data

## Struktur Proyek

- **app/**: Komponen utama aplikasi Next.js
- **arduino/**: Kode Arduino untuk ESP32 yang menangani sensor dan pengiriman data
- **components/**: Komponen React untuk UI
- **hooks/**: React hooks kustom
- **lib/**: Layanan dan utilitas
- **scripts/**: Skrip pendukung, termasuk simulator data untuk pengujian

## Cara Kerja Sistem

1. **Pengumpulan Data**:
   - ESP32 membaca status dari sensor tegangan untuk mendeteksi sumber listrik aktif
   - ESP32 membaca level bahan bakar dari sensor ultrasonik dan analog
   - Data dikirim ke Firebase Realtime Database melalui WiFi

2. **Penyimpanan Data**:
   - Firebase menyimpan data status sumber listrik dan level bahan bakar
   - Data disimpan dengan timestamp untuk analisis historis

3. **Tampilan Data**:
   - Aplikasi web menampilkan status sumber listrik secara real-time
   - Visualisasi level bahan bakar dalam bentuk tangki virtual
   - Riwayat perubahan status dapat dilihat melalui modal riwayat

4. **Penanganan Offline**:
   - ESP32 menyimpan data di EEPROM saat koneksi WiFi terputus
   - Data dikirim kembali ke Firebase saat koneksi pulih

5. **Notifikasi**:
   - Sistem mengirim notifikasi WhatsApp saat terjadi kondisi kritis
   - Indikator visual dan animasi untuk kondisi darurat

## Pengembangan Lokal

### Prasyarat
- Node.js (v18+)
- NPM atau Yarn
- Arduino IDE (untuk pengembangan firmware ESP32)

### Instalasi dan Menjalankan Aplikasi Web
```bash
# Clone repositori
git clone https://github.com/username/powerguard.git
cd powerguard

# Instal dependensi
npm install

# Jalankan aplikasi dalam mode pengembangan
npm run dev
```

### Menjalankan Simulator Data
```bash
cd scripts
npm install
node data-simulator.js
```

### Memprogram ESP32
1. Buka file `arduino/arduino.ino` dengan Arduino IDE
2. Sesuaikan konfigurasi WiFi dan Firebase
3. Upload kode ke ESP32

## Deployment

Aplikasi web dapat di-deploy ke platform seperti Vercel, Netlify, atau Firebase Hosting.

## Kontributor

Proyek ini dikembangkan oleh tim MBKM 2025-Inskal BBMKG I.

## Lisensi

© 2025 PowerGuard - BBMKG I. All rights reserved.
