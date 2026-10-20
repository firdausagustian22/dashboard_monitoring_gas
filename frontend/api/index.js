import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simpan data di memori cloud Vercel
let latestData = {
  id: 1,
  device_id: "ESP32-MQ2-WOKWI-01",
  device_name: "ESP32 Node MQ-2 Lab 1",
  adc_value: 350,
  voltage: 0.28,
  rs_ro_ratio: 9.83,
  ppm_estimate: 50.0,
  gas_status: "AMAN",
  gas_type: "LPG",
  is_demo: false,
  created_at: new Date().toISOString()
};

let sensorHistory = [latestData];
let devices = [
  {
    device_id: "ESP32-MQ2-WOKWI-01",
    device_name: "ESP32 Node MQ-2 Lab 1",
    last_seen: new Date().toISOString(),
    status: "ONLINE"
  }
];

let settings = {
  id: 1,
  warning_ppm: 200.0,
  danger_ppm: 500.0,
  ro_clean_air: 10.0,
  rl_kohm: 10.0,
  gas_type: "LPG"
};

function calculatePPM(adc) {
  const VCC = 3.3;
  const RL = settings.rl_kohm;
  const R0 = settings.ro_clean_air;
  const clampedADC = Math.max(0, Math.min(4095, Number(adc)));
  const voltage = (clampedADC / 4095.0) * VCC;
  const safeVoltage = Math.max(0.005, Math.min(VCC - 0.005, voltage));
  const rs = RL * ((VCC - safeVoltage) / safeVoltage);
  const rsRoRatio = rs / R0;
  let ppm = 574.25 * Math.pow(rsRoRatio, -2.222);
  if (ppm < 0) ppm = 0;
  if (ppm > 20000) ppm = 20000;

  let status = "AMAN";
  if (ppm >= settings.danger_ppm) status = "BAHAYA";
  else if (ppm >= settings.warning_ppm) status = "WASPADA";

  return {
    adcValue: clampedADC,
    voltage: Number(voltage.toFixed(2)),
    rsRoRatio: Number(rsRoRatio.toFixed(2)),
    ppmEstimate: Number(ppm.toFixed(1)),
    gasStatus: status
  };
}

// Handler fleksibel untuk path /api
app.all(['/api', '/'], (req, res) => {
  res.json({
    service: 'GasGuard IoT Serverless API (Vercel Cloud)',
    status: 'ONLINE',
    device: latestData.device_id,
    latest_ppm: latestData.ppm_estimate,
    gas_status: latestData.gas_status
  });
});

app.post(['/api/sensor/data', '/sensor/data'], (req, res) => {
  const { 
    device_id = 'ESP32-MQ2-WOKWI-01', 
    adc_value = 0, 
    voltage,
    rs_ro_ratio,
    ppm_estimate,
    gas_status,
    is_demo = false 
  } = req.body;

  let calc;
  // Jika ESP32 mengirimkan ppm_estimate langsung, pakai langsung agar 100% sinkron dengan LCD Wokwi
  if (ppm_estimate !== undefined && ppm_estimate !== null && !isNaN(Number(ppm_estimate))) {
    const rawPPM = Number(ppm_estimate);
    const adc = Number(adc_value);
    const v = voltage !== undefined ? Number(voltage) : Number(((adc / 4095.0) * 3.3).toFixed(2));
    let status = gas_status;
    if (!status) {
      if (rawPPM >= settings.danger_ppm) status = "BAHAYA";
      else if (rawPPM >= settings.warning_ppm) status = "WASPADA";
      else status = "AMAN";
    }
    calc = {
      adcValue: adc,
      voltage: v,
      rsRoRatio: rs_ro_ratio !== undefined ? Number(rs_ro_ratio) : 1.0,
      ppmEstimate: Number(rawPPM.toFixed(1)),
      gasStatus: status
    };
  } else {
    calc = calculatePPM(adc_value);
  }

  latestData = {
    id: Date.now(),
    device_id,
    device_name: "ESP32 Node MQ-2 Lab 1",
    adc_value: calc.adcValue,
    voltage: calc.voltage,
    rs_ro_ratio: calc.rsRoRatio,
    ppm_estimate: calc.ppmEstimate,
    gas_status: calc.gasStatus,
    gas_type: settings.gas_type,
    is_demo: Boolean(is_demo),
    created_at: new Date().toISOString()
  };

  sensorHistory.unshift(latestData);
  if (sensorHistory.length > 50) sensorHistory.pop();

  devices[0].last_seen = new Date().toISOString();
  devices[0].status = "ONLINE";

  return res.status(201).json({
    success: true,
    message: "Data sensor berhasil diproses di Vercel Cloud",
    data: latestData
  });
});

app.get(['/api/sensor/latest', '/sensor/latest'], (req, res) => {
  // Evaluasi status perangkat secara dinamis berbasis heartbeat waktu nyata (timeout stabil 60 detik)
  if (devices && devices.length > 0 && devices[0].last_seen) {
    const timeDiffMs = Date.now() - new Date(devices[0].last_seen).getTime();
    devices[0].status = timeDiffMs <= 60000 ? "ONLINE" : "OFFLINE";
  }

  res.json({
    success: true,
    latest: latestData,
    devices: devices,
    settings: settings
  });
});

app.get(['/api/sensor/history', '/sensor/history'], (req, res) => {
  const { page = 1, limit = 15 } = req.query;
  // Selalu tampilkan data riil dari Wokwi ESP32
  const filtered = sensorHistory.filter(item => !item.is_demo);

  res.json({
    success: true,
    data: filtered.slice(0, 50),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalRecords: filtered.length,
      totalPages: 1
    }
  });
});

app.get(['/api/sensor/export', '/sensor/export'], (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=riwayat_sensor_${Date.now()}.csv`);
  const lines = ['ID,Device ID,Waktu,ADC,Tegangan,Rs/R0,PPM,Status,Tipe'];
  sensorHistory.forEach(r => {
    lines.push(`${r.id},"${r.device_id}","${r.created_at}",${r.adc_value},${r.voltage},${r.rs_ro_ratio},${r.ppm_estimate},"${r.gas_status}","${r.is_demo ? 'DEMO' : 'AKTUAL'}"`);
  });
  res.send(lines.join('\n'));
});

app.get(['/api/settings', '/settings'], (req, res) => res.json({ success: true, data: settings }));

app.put(['/api/settings', '/settings'], (req, res) => {
  const { warning_ppm, danger_ppm, ro_clean_air, rl_kohm } = req.body;
  if (warning_ppm) settings.warning_ppm = parseFloat(warning_ppm);
  if (danger_ppm) settings.danger_ppm = parseFloat(danger_ppm);
  if (ro_clean_air) settings.ro_clean_air = parseFloat(ro_clean_air);
  if (rl_kohm) settings.rl_kohm = parseFloat(rl_kohm);
  res.json({ success: true, message: 'Pengaturan berhasil diperbarui', data: settings });
});

app.post(['/api/sensor/demo/generate', '/sensor/demo/generate'], (req, res) => {
  const { scenario = 'random' } = req.body;
  let adc = 350;
  if (scenario === 'safe') adc = Math.floor(Math.random() * 150) + 250;
  else if (scenario === 'warning') adc = Math.floor(Math.random() * 200) + 1650;
  else if (scenario === 'danger') adc = Math.floor(Math.random() * 600) + 2300;
  else adc = Math.floor(Math.random() * 2500) + 300;

  const calc = calculatePPM(adc);

  latestData = {
    id: Date.now(),
    device_id: 'SIMULATOR-DEMO',
    device_name: 'Wokwi Simulator (Demo Mode)',
    adc_value: calc.adcValue,
    voltage: calc.voltage,
    rs_ro_ratio: calc.rsRoRatio,
    ppm_estimate: calc.ppmEstimate,
    gas_status: calc.gasStatus,
    gas_type: settings.gas_type,
    is_demo: true,
    created_at: new Date().toISOString()
  };

  sensorHistory.unshift(latestData);
  if (sensorHistory.length > 50) sensorHistory.pop();

  return res.status(201).json({
    success: true,
    message: `Data simulasi ${scenario.toUpperCase()} berhasil dibuat`,
    data: latestData
  });
});

export default app;
