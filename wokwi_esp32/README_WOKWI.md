# Panduan Menjalankan Simulasi Wokwi ESP32 + MQ-2

Folder ini berisi kode firmware (`sketch.ino`) dan skema rangkaian (`diagram.json`) untuk mensimulasikan modul **ESP32 DevKit v1** bersama **sensor gas MQ-2** (disimulasikan dengan Potensiometer analog), 3 LED indikator (Hijau/Kuning/Merah), dan Buzzer alarm.

---

## 1. Rangkaian Komponen (Wiring Pinout Sesuai Skema UTS)

| Komponen | Pin Komponen | Terhubung ke ESP32 | Keterangan |
| :--- | :--- | :--- | :--- |
| **Sensor Gas MQ-2** | VCC | `3V3` | Catu daya modul MQ-2 |
| | GND | `GND` | Ground bersama |
| | AOUT | `GPIO 34` | Input Analog 12-bit (0–4095) |
| **LCD 16x2 (I2C)** | GND | `GND` | Ground |
| | VCC | `VIN / 5V` | Catu daya LCD |
| | SDA | `GPIO 21` | I2C Serial Data |
| | SCL | `GPIO 22` | I2C Serial Clock |
| **LED Merah (Alarm)** | Anoda (A) | `GPIO 4` | Kontrol nyala/kedip peringatan |
| | Katoda (C) | `GND` (via 220Ω) | Pembatas arus |
| **Buzzer Alarm** | Positif (+) | `GPIO 13` | Suara alarm bahaya gas |
| | Negatif (-) | `GND` | Ground |

---

## 2. Cara Menjalankan di Wokwi Web (wokwi.com)

1. Buka browser dan kunjungi [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).
2. Salin isi file `sketch.ino` ke tab editor kode Wokwi.
3. Klik tab `diagram.json` (jika belum ada, klik tombol **Add File** lalu buat `diagram.json`), lalu salin isi file `diagram.json`.
4. Tekan tombol **Play / Start Simulation** (tombol hijau).

---

## 3. Menghubungkan Wokwi ke Backend Localhost (Port 5000)

Simulator Wokwi berjalan di cloud browser, sehingga tidak bisa langsung memanggil `http://localhost:5000` tanpa jembatan jaringan. Ada 2 cara mudah:

### Opsi A: Menggunakan `ngrok` (Paling Direkomendasikan & Cepat)
1. Buka terminal di komputer Anda, lalu jalankan:
   ```bash
   ngrok http 5000
   ```
2. Anda akan mendapatkan URL publik, contohnya: `https://a1b2-114-124-x-x.ngrok-free.app`
3. Buka `sketch.ino`, ubah baris:
   ```cpp
   const char* serverUrl = "https://a1b2-114-124-x-x.ngrok-free.app/api/sensor/data";
   ```
4. Jalankan kembali simulasi Wokwi. Data ADC akan langsung masuk ke backend dan tampil di dashboard!

### Opsi B: Menggunakan Wokwi IoT Gateway
1. Unduh dan jalankan Wokwi IoT Gateway dari [https://github.com/wokwi/wokwi-features/issues/231](https://github.com/wokwi/wokwi-features/issues/231).
2. Pada `sketch.ino`, gunakan:
   ```cpp
   const char* serverUrl = "http://host.wokwi.internal:5000/api/sensor/data";
   ```

---

## 4. Menguji Interaksi
- Putar potensiometer pada Wokwi:
  - **Nilai Rendah (ADC < 1000)**: LED Hijau menyala (Kondisi AMAN).
  - **Nilai Menengah (ADC 1000 - 1999)**: LED Kuning menyala (Kondisi WASPADA).
  - **Nilai Tinggi (ADC ≥ 2000)**: LED Merah menyala dan Buzzer berbunyi (Kondisi BAHAYA).
- Periksa Serial Monitor di Wokwi untuk memverifikasi respon kode HTTP 201 dari backend Node.js.
