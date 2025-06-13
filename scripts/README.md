# PowerGuard Data Simulator

Script untuk mensimulasikan data real-time ke Firebase untuk sistem PowerGuard.

## Setup

1. **Install dependencies:**
   ```bash
   cd scripts
   npm install
   ```

2. **Konfigurasi Firebase:**
   - Buka file `data-simulator.js`
   - Ganti konfigurasi Firebase dengan konfigurasi project Anda:
   ```javascript
   const firebaseConfig = {
     apiKey: "your_api_key_here",
     authDomain: "your_project_id.firebaseapp.com",
     databaseURL: "https://your_project_id-default-rtdb.firebaseio.com/",
     projectId: "your_project_id",
     storageBucket: "your_project_id.appspot.com",
     messagingSenderId: "your_messaging_sender_id",
     appId: "your_app_id"
   };
   ```

3. **Jalankan simulator:**
   ```bash
   npm start
   ```

## Fitur Simulator

### 1. Data Status Sumber Listrik
- **Path:** `root/status/{auto_id}`
- **Interval:** Setiap 10 detik
- **Data:**
  - `pln`: 0 atau 1
  - `genset_135`: 0 atau 1
  - `genset_150`: 0 atau 1
  - `genset_radar`: 0 atau 1
  - `datetime`: dd/mm/yyyy hh:mm:ss

### 2. Data Level Minyak
- **Path:** `root/level/{auto_id}`
- **Interval:** Setiap 10 detik
- **Data:**
  - `level`: 20-95 (persentase)
  - `datetime`: dd/mm/yyyy hh:mm:ss

### 3. Data Pengisian Minyak (Initial Dummy)
- **Path:** `root/fuel/{auto_id}`
- **Dibuat sekali:** 5 data dummy saat startup
- **Data:**
  - `date`: dd/mm/yyyy
  - `time`: hh:mm:ss
  - `amount`: jumlah liter

## Skenario Simulasi

Simulator akan menghasilkan berbagai skenario realistis:

1. **PLN Normal:** PLN aktif, semua genset nonaktif
2. **PLN Mati:** PLN nonaktif, genset 135kVA dan 150kVA aktif
3. **PLN + Backup:** PLN aktif dengan genset sebagai backup siaga
4. **Genset Radar:** Hanya genset radar yang aktif
5. **Mixed Scenarios:** Kombinasi berbagai status

## Kontrol Simulator

- **Start:** `npm start`
- **Stop:** Tekan `Ctrl+C`

## Output Log

Simulator akan menampilkan log real-time:
```
🔥 PowerGuard Firebase Data Simulator
=====================================

🔄 Creating initial fuel refill data...
✅ Fuel refill added: { date: '15/01/2025', time: '08:30:00', amount: 25.5 }
...
✅ Initial fuel refill data created successfully!

🚀 Starting PowerGuard data simulation...
📊 Power status updates every 10 seconds
⛽ Fuel level updates every 10 seconds

✅ Power status added: { pln: 1, genset_135: 0, genset_150: 0, genset_radar: 0, datetime: '20/01/2025 14:30:15' }
✅ Fuel level added: { level: 85, datetime: '20/01/2025 14:30:15' }
```

## Troubleshooting

1. **Error koneksi Firebase:**
   - Pastikan konfigurasi Firebase sudah benar
   - Periksa koneksi internet
   - Pastikan Firebase Realtime Database sudah diaktifkan

2. **Permission denied:**
   - Periksa Firebase Security Rules
   - Pastikan rules mengizinkan write access

3. **Data tidak muncul di dashboard:**
   - Pastikan konfigurasi Firebase di `.env.local` sama dengan simulator
   - Periksa console browser untuk error
   - Restart development server Next.js