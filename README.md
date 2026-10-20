# 🔥 GasGuard IoT — Dashboard Monitoring Gas ESP32 & MQ-2

Sistem pemantauan konsentrasi gas berbasis **IoT (Internet of Things)** end-to-end yang mengintegrasikan simulasi mikrokontroler **ESP32** dan sensor gas **MQ-2** pada **Wokwi**, backend **Node.js + Express.js + MySQL**, serta dashboard antarmuka **React.js + Tailwind CSS + Chart.js + Socket.IO**.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Prinsip Fisika & Formula Kalibrasi Sensor MQ-2](#-prinsip-fisika--formula-kalibrasi-sensor-mq-2)
3. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
4. [Persyaratan Sistem](#-persyaratan-sistem)
5. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
   - [Langkah 1: Setup Database MySQL](#langkah-1-setup-database-mysql)
   - [Langkah 2: Menjalankan Backend](#langkah-2-menjalankan-backend)
   - [Langkah 3: Menjalankan Frontend](#langkah-3-menjalankan-frontend)
   - [Langkah 4: Menjalankan Simulasi ESP32 di Wokwi](#langkah-4-menjalankan-simulasi-esp32-di-wokwi)
6. [Pembedaan Data Sensor Aktual vs Data Demo](#-pembedaan-data-sensor-aktual-vs-data-demo)
7. [Dokumentasi API Endpoints](#-dokumentasi-api-endpoints)
8. [Panduan Pengujian Sistem (Testing Flow)](#-panduan-pengujian-sistem-testing-flow)

---

## 🚀 Fitur Utama

- **Pembacaan ADC Mentah (0–4095)**: ESP32 membaca output analog sensor MQ-2 dengan resolusi 12-bit dan oversampling smoothing 10 sampel.
- **Perhitungan Fisik & Kalibrasi MQ-2**: Tidak menyamakan ADC dengan PPM dan tanpa nilai palsu; konversi tegangan $V_{out}$, resistansi sensor $R_s$, resistansi udara bersih $R_0$, dan estimasi konsentrasi gas (PPM) kurva daya logaritmik (*Power-Law*).
- **Status Keamanan 3 Tingkat**:
  - 🟢 **AMAN**: Konsentrasi gas normal di bawah ambang batas waspada.
  - 🟡 **WASPADA**: Konsentrasi gas mulai meningkat di atas ambang waspada.
  - 🔴 **BAHAYA**: Konsentrasi gas melampaui batas bahaya dengan indikator visual berdenyut dan peringatan audio.
- **Status Koneksi Perangkat Real-time**: Deteksi status *ONLINE* / *OFFLINE* berbasis *Heartbeat Watchdog* otomatis jika mikrokontroler tidak mengirimkan data dalam rentang waktu tertentu.
- **Grafik Tren Real-Time Interaktif (Chart.js)**: Aliran data dinamis waktu nyata dengan opsi tampilan PPM, ADC mentah, maupun gabungan keduanya (*Dual View*).
- **Riwayat Pengukuran & Filter Canggih**: Tabel data historis dengan filter rentang tanggal, pemfilter data aktual vs demo, dan paginasi terstruktur.
- **Ekspor Data ke CSV**: Unduh data riwayat hasil filter langsung ke file format `.csv` dengan satu klik.
- **Konfigurasi Ambang Batas & Kalibrasi Dinamis**: Pengaturan nilai batas WASPADA, BAHAYA, nilai $R_0$, dan resistor beban $R_L$ melalui modal antarmuka pengguna tanpa perlu mengubah kode program.
- **Simulator Demo Bawaan**: Memungkinkan pengujian instan skenario AMAN, WASPADA, dan BAHAYA langsung dari peramban web tanpa perangkat keras.

---

## 🔬 Prinsip Fisika & Formula Kalibrasi Sensor MQ-2

Sensor MQ-2 menggunakan lapisan sensitif **Timah Dioksida ($SnO_2$)**. Pada udara bersih, konduktivitasnya rendah. Ketika gas target (seperti LPG, asap, atau propana) ada, konduktivitas sensor meningkat sebanding dengan konsentrasi gas.

```
       +Vcc (3.3V)
          │
        ┌─┴─┐
        │Rs │ (Sensor Gas MQ-2)
        └─┬─┘
          ├───────> Vout (Tegangan ke Pin ADC ESP32 GPIO 34)
        ┌─┴─┐
        │RL │ (Resistor Beban, biasanya 10 kΩ)
        └─┬─┘
          │
         GND
```

### 1. Konversi ADC ke Tegangan ($V_{out}$)
$$\text{ADC} \in [0, 4095] \implies V_{out} = \left(\frac{\text{ADC}}{4095.0}\right) \times 3.3\,\text{V}$$

### 2. Menghitung Resistansi Sensor ($R_s$)
Berdasarkan hukum pembagi tegangan:
$$V_{out} = V_{cc} \times \left(\frac{R_L}{R_s + R_L}\right) \implies R_s = R_L \times \left(\frac{V_{cc} - V_{out}}{V_{out}}\right)$$

### 3. Kalibrasi pada Udara Bersih ($R_0$)
Pada udara bersih (*Clean Air*), rasio karakteristik untuk sensor MQ-2 bernilai konstan:
$$\frac{R_s}{R_0} \approx 9.83 \implies R_0 = \frac{R_{s,\text{udara bersih}}}{9.83}$$

### 4. Estimasi Konsentrasi Gas (PPM)
Karakteristik kurva kepekaan pada lembar data (*Datasheet*) MQ-2 memiliki hubungan logaritmik daya (*power-law*):
$$\text{PPM} = A \times \left(\frac{R_s}{R_0}\right)^B$$

| Gas Target | Koefisien $A$ | Eksponen $B$ | Rentang Datasheet |
| :--- | :--- | :--- | :--- |
| **LPG** | $574.25$ | $-2.222$ | 200 – 10.000 PPM |
| **Asap (Smoke)** | $3697.4$ | $-3.109$ | 300 – 10.000 PPM |
| **Metana ($CH_4$)** | $1012.7$ | $-2.786$ | 500 – 10.000 PPM |

---

## 📂 Struktur Direktori Proyek

```
dashboard_monitoring_gas/
├── backend/                        # REST API & WebSocket Server
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # Koneksi MySQL & inisialisasi tabel otomatis
│   │   ├── controllers/
│   │   │   ├── sensorController.js # Logika data sensor, riwayat, CSV, & demo
│   │   │   └── settingsController.js # Pengaturan ambang batas & kalibrasi
│   │   ├── routes/
│   │   │   ├── sensorRoutes.js     # Route endpoint sensor
│   │   │   └── settingsRoutes.js   # Route endpoint settings
│   │   ├── services/
│   │   │   └── mq2Calibration.js   # Perhitungan fisika & rumus MQ-2
│   │   ├── socket.js               # Socket.IO & Heartbeat Watchdog
│   │   └── app.js                  # Konfigurasi aplikasi Express
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── server.js                   # Entry point backend server
│
├── database/
│   └── schema.sql                  # Skrip pembuatan database & tabel MySQL
│
├── frontend/                       # Dashboard Antarmuka Web
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header, jam real-time, status server, aksi
│   │   │   ├── DeviceStatusBadge.jsx # Kartu status ESP32 (Online/Offline, Heartbeat)
│   │   │   ├── StatCard.jsx        # Kartu status AMAN/WASPADA/BAHAYA, PPM, ADC, Rs/Ro
│   │   │   ├── RealtimeChart.jsx   # Grafik real-time Chart.js dengan filter view
│   │   │   ├── HistoryTable.jsx    # Tabel riwayat, filter tanggal, paginasi, ekspor CSV
│   │   │   ├── ThresholdModal.jsx  # Modal setting ambang batas & kalibrasi otomatis R0
│   │   │   └── DemoControl.jsx     # Generator data demo AMAN/WASPADA/BAHAYA
│   │   ├── services/
│   │   │   ├── api.js              # Klien HTTP Axios
│   │   │   └── socket.js           # Klien Socket.IO real-time
│   │   ├── App.jsx                 # Komponen utama React
│   │   ├── main.jsx
│   │   └── index.css               # Gaya Tailwind CSS & Dark Glassmorphism
│   ├── .env.example
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── wokwi_esp32/                    # Simulasi Wokwi Mikrokontroler
│   ├── diagram.json                # Skema sirkuit: ESP32 + Potensiometer MQ-2 + 3 LED + Buzzer
│   ├── sketch.ino                  # Program firmware Arduino C++ ESP32 HTTP POST
│   ├── wokwi.toml                  # Konfigurasi proyek Wokwi
│   └── README_WOKWI.md             # Panduan simulasi Wokwi & konektivitas
│
└── README.md                       # Dokumentasi lengkap proyek
```

---

## 💻 Persyaratan Sistem

- **Node.js** versi `v18.0.0` atau lebih baru
- **NPM** versi `9.0.0` atau lebih baru
- **MySQL / MariaDB** (dapat menggunakan **Laragon**, XAMPP, atau instalasi mandiri MySQL)
- Koneksi Internet untuk simulasi Wokwi dan dependensi paket

---

## 🛠️ Panduan Instalasi & Menjalankan

### Langkah 1: Setup Database MySQL

1. Pastikan servis MySQL di Laragon / XAMPP sudah berjalan (Port default: `3306`).
2. Backend dilengkapi fitur **Auto-Init**: secara otomatis membuat database `gas_monitoring_db` dan tabel-tabelnya jika belum ada saat backend pertama kali dijalankan.
3. *(Opsional)* Jika ingin membuat manual lewat HeidiSQL / phpMyAdmin, jalankan file:
   `database/schema.sql`

### Langkah 2: Menjalankan Backend

1. Buka terminal baru dan masuk ke direktori backend:
   ```bash
   cd c:\laragon\www\dashboard_monitoring_gas\backend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Sesuaikan konfigurasi file `.env` jika username/password MySQL Anda berbeda:
   ```ini
   PORT=5000
   CLIENT_URL=http://localhost:5173
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gas_monitoring_db
   DB_PORT=3306
   DEVICE_OFFLINE_TIMEOUT_MS=15000
   ```
4. Jalankan backend server:
   ```bash
   npm run dev
   # Atau jika tanpa nodemon:
   npm start
   ```
   *Backend akan aktif di `http://localhost:5000`.*

### Langkah 3: Menjalankan Frontend

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd c:\laragon\www\dashboard_monitoring_gas\frontend
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```
4. Buka peramban (browser) di alamat:
   `http://localhost:5173`

### Langkah 4: Menjalankan Simulasi ESP32 di Wokwi

1. Buka [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).
2. Salin seluruh isi file `wokwi_esp32/sketch.ino` ke tab editor program Wokwi.
3. Salin seluruh isi file `wokwi_esp32/diagram.json` ke tab skema sirkuit Wokwi.
4. Karena simulasi Wokwi berjalan di cloud, hubungkan backend localhost Anda menggunakan salah satu metode berikut:
   - **Metode ngrok (Paling Praktis)**:
     ```bash
     ngrok http 5000
     ```
     Salin URL ngrok (misal `https://xxxx.ngrok-free.app`) lalu ubah baris di `sketch.ino`:
     ```cpp
     const char* serverUrl = "https://xxxx.ngrok-free.app/api/sensor/data";
     ```
   - **Metode Wokwi IoT Gateway**:
     Jalankan Wokwi IoT Gateway di komputer Anda, lalu gunakan:
     ```cpp
     const char* serverUrl = "http://host.wokwi.internal:5000/api/sensor/data";
     ```
5. Tekan tombol **Play / Jalankan Simulasi** di Wokwi.
6. Putar knob potensiometer (simulasi output tegangan MQ-2):
   - Nilai ADC rendah: LED Hijau ESP32 menyala, Dashboard status **AMAN**.
   - Nilai ADC sedang: LED Kuning ESP32 menyala, Dashboard status **WASPADA**.
   - Nilai ADC tinggi: LED Merah ESP32 menyala + Buzzer aktif, Dashboard status **BAHAYA**!

---

## 🏷️ Pembedaan Data Sensor Aktual vs Data Demo

Sistem ini dirancang secara ketat untuk **membedakan data aktual fisik dari data simulasi demo**:

1. **Flag Database `is_demo`**:
   - Nilai `0` (`FALSE`): Data berasal langsung dari perangkat keras ESP32 / Wokwi hardware emulation.
   - Nilai `1` (`TRUE`): Data berasal dari generator simulator demo perangkat lunak.
2. **Visualisasi pada Antarmuka**:
   - Data aktual berlabel lencana biru bertuliskan **AKTUAL** lengkap dengan ikon mikrokontroler.
   - Data demo berlabel lencana kuning-oranye bertuliskan **DEMO** dengan ikon tabung laboratorium.
3. **Filter Riwayat & Ekspor**:
   - Pengguna dapat memfilter tabel dan mengekspor CSV untuk hanya menyertakan data aktual murni tanpa kontaminasi data uji coba.

---

## 📡 Dokumentasi API Endpoints

| Metode | URL Endpoint | Deskripsi | Payload / Parameter |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sensor/data` | Menerima data sensor dari ESP32 | `{"device_id": "ESP32-01", "adc_value": 850, "is_demo": false}` |
| `GET` | `/api/sensor/latest` | Mengambil data terbaru & status perangkat | Tidak ada |
| `GET` | `/api/sensor/history` | Riwayat pengukuran terpaginasi | `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&isDemo=all&page=1&limit=15` |
| `GET` | `/api/sensor/export` | Mengunduh file stream format CSV | `?startDate=...&endDate=...&isDemo=...` |
| `POST` | `/api/sensor/demo/generate` | Menghasilkan data simulasi demo | `{"scenario": "safe" \| "warning" \| "danger"}` |
| `GET` | `/api/settings` | Mengambil nilai ambang batas & kalibrasi | Tidak ada |
| `PUT` | `/api/settings` | Memperbarui nilai ambang batas | `{"warning_ppm": 200, "danger_ppm": 500, "ro_clean_air": 10, "rl_kohm": 10, "gas_type": "LPG"}` |
| `POST` | `/api/settings/calibrate` | Kalibrasi otomatis $R_0$ udara bersih | `{"adc_clean_air": 350, "rl_kohm": 10}` |

---

## 🧪 Panduan Pengujian Sistem (Testing Flow)

1. **Uji Konektivitas Real-Time (Socket.IO)**:
   - Buka dashboard di browser.
   - Perhatikan indikator di navbar; jika backend berjalan, lencana akan menyala hijau: *"Server WebSocket Aktif"*.
2. **Uji Simulator Demo Bawaan**:
   - Klik tombol **"Simulasi Demo"** di pojok kanan atas navbar dashboard.
   - Klik **"Simulasi Udara Bersih (AMAN)"**; amati nilai ADC ~300 dan status AMAN.
   - Klik **"Simulasi Asap / Gas Sedang (WASPADA)"**; amati nilai ADC ~1350 dan status WASPADA.
   - Klik **"Simulasi Kebocoran Gas Tinggi (BAHAYA)"**; amati nilai ADC ~2800, status BAHAYA dengan efek denyut merah dan bunyi alarm.
   - Periksa bahwa grafik real-time bergerak secara langsung tanpa *refresh* halaman.
3. **Uji Filter & Ekspor CSV**:
   - Pada tabel riwayat, coba filter berdasarkan *"Hanya Data Demo"* atau *"Hanya Sensor Fisik"*.
   - Klik tombol **"Ekspor CSV"**, buka file yang terunduh di Microsoft Excel atau Text Editor untuk memverifikasi struktur kolom data.
4. **Uji Perubahan Ambang Batas (Threshold)**:
   - Klik tombol **"Ambang Batas"** di navbar.
   - Ubah batas waspada menjadi nilai yang diinginkan (misal 150 PPM) lalu simpan.
   - Perubahan akan langsung disinkronkan ke seluruh klien terhubung via WebSocket.
5. **Uji Heartbeat Watchdog**:
   - Jika ESP32 / Simulator tidak mengirim data lebih dari 15 detik, status perangkat otomatis berubah menjadi **OFFLINE**.
   - Begitu data baru masuk kembali, status seketika kembali menjadi **ONLINE**.
