const { pool } = require('../config/db');
const { calculateMQ2PPM } = require('../services/mq2Calibration');
const { getIO } = require('../socket');

/**
 * Menerima data sensor dari ESP32 (HTTP POST) atau Demo Simulator
 */
async function postSensorData(req, res) {
  try {
    const { device_id, adc_value, device_name, is_demo } = req.body;

    // 1. Validasi Input
    if (!device_id || typeof device_id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'device_id wajib diisi (string)'
      });
    }

    const adc = parseInt(adc_value, 10);
    if (isNaN(adc) || adc < 0 || adc > 4095) {
      return res.status(400).json({
        success: false,
        message: 'adc_value tidak valid. Harus berupa bilangan bulat antara 0 dan 4095 (ESP32 ADC 12-bit).'
      });
    }

    const isDemoFlag = (is_demo === true || is_demo === 1 || is_demo === '1' || is_demo === 'true') ? 1 : 0;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const devName = device_name || (isDemoFlag ? 'Simulator Demo Device' : `ESP32-${device_id}`);

    // 2. Ambil parameter kalibrasi aktif dari database
    const [settingsRows] = await pool.query('SELECT * FROM threshold_settings WHERE id = 1 LIMIT 1');
    const settings = settingsRows[0] || {
      warning_ppm: 200.0,
      danger_ppm: 500.0,
      ro_clean_air: 10.0,
      rl_kohm: 10.0,
      gas_type: 'LPG'
    };

    // 3. Lakukan konversi fisik dan kalibrasi MQ-2 (atau gunakan kalkulasi langsung jika dikirim dari ESP32)
    const { ppm_estimate, voltage: reqVoltage, rs_ro_ratio: reqRsRo, gas_status: reqStatus } = req.body;
    let calculation;
    if (ppm_estimate !== undefined && ppm_estimate !== null && !isNaN(Number(ppm_estimate))) {
      const p = Number(ppm_estimate);
      let s = reqStatus;
      if (!s) {
        if (p >= settings.danger_ppm) s = 'BAHAYA';
        else if (p >= settings.warning_ppm) s = 'WASPADA';
        else s = 'AMAN';
      }
      calculation = {
        adcValue: adc,
        voltage: reqVoltage !== undefined ? Number(reqVoltage) : Number(((adc / 4095.0) * 3.3).toFixed(2)),
        rsRoRatio: reqRsRo !== undefined ? Number(reqRsRo) : 1.0,
        ppmEstimate: Number(p.toFixed(1)),
        gasStatus: s
      };
    } else {
      calculation = calculateMQ2PPM(adc, settings);
    }

    // 4. Perbarui status perangkat (Heartbeat & Status ONLINE)
    await pool.query(
      `INSERT INTO devices (device_id, device_name, ip_address, last_seen, status, updated_at)
       VALUES (?, ?, ?, NOW(), 'ONLINE', NOW())
       ON DUPLICATE KEY UPDATE 
         device_name = VALUES(device_name),
         ip_address = VALUES(ip_address),
         last_seen = NOW(),
         status = 'ONLINE',
         updated_at = NOW()`,
      [device_id, devName, clientIp]
    );

    // 5. Simpan log pengukuran ke database
    const [insertResult] = await pool.query(
      `INSERT INTO sensor_logs 
       (device_id, adc_value, voltage, rs_ro_ratio, ppm_estimate, gas_status, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        device_id,
        calculation.adcValue,
        calculation.voltage,
        calculation.rsRoRatio,
        calculation.ppmEstimate,
        calculation.gasStatus,
        isDemoFlag
      ]
    );

    const newRecord = {
      id: insertResult.insertId,
      device_id,
      device_name: devName,
      adc_value: calculation.adcValue,
      voltage: calculation.voltage,
      rs_ro_ratio: calculation.rsRoRatio,
      ppm_estimate: calculation.ppmEstimate,
      gas_status: calculation.gasStatus,
      gas_type: calculation.gasType,
      is_demo: isDemoFlag,
      created_at: new Date().toISOString()
    };

    // 6. Broadcast pembaruan ke frontend secara real-time via Socket.IO
    try {
      const io = getIO();
      io.emit('sensor_reading', newRecord);
      io.emit('device_status_change', {
        deviceId: device_id,
        deviceName: devName,
        status: 'ONLINE',
        lastSeen: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Socket broadcast warning:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Data sensor berhasil diproses dan disimpan',
      data: newRecord
    });

  } catch (error) {
    console.error('Error postSensorData:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses data sensor',
      error: error.message
    });
  }
}

/**
 * Mendapatkan data sensor terbaru beserta ringkasan status perangkat
 */
async function getLatestReading(req, res) {
  try {
    const [latestRows] = await pool.query(`
      SELECT s.*, d.device_name, d.status AS device_status, d.last_seen 
      FROM sensor_logs s
      LEFT JOIN devices d ON s.device_id = d.device_id
      ORDER BY s.id DESC 
      LIMIT 1
    `);

    const [devices] = await pool.query(`
      SELECT * FROM devices ORDER BY last_seen DESC
    `);

    const [settings] = await pool.query('SELECT * FROM threshold_settings WHERE id = 1 LIMIT 1');

    return res.json({
      success: true,
      latest: latestRows.length > 0 ? latestRows[0] : null,
      devices,
      settings: settings[0] || null
    });
  } catch (error) {
    console.error('Error getLatestReading:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data sensor terbaru' });
  }
}

/**
 * Mengambil riwayat data dengan filter tanggal, jenis data (demo/real), dan pagination
 */
async function getHistory(req, res) {
  try {
    const { startDate, endDate, isDemo, page = 1, limit = 50 } = req.query;

    let query = 'SELECT * FROM sensor_logs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM sensor_logs WHERE 1=1';
    const params = [];
    const countParams = [];

    if (startDate) {
      query += ' AND created_at >= ?';
      countQuery += ' AND created_at >= ?';
      params.push(`${startDate} 00:00:00`);
      countParams.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      countQuery += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
      countParams.push(`${endDate} 23:59:59`);
    }

    if (isDemo !== undefined && isDemo !== 'all') {
      const demoVal = (isDemo === '1' || isDemo === 'true') ? 1 : 0;
      query += ' AND is_demo = ?';
      countQuery += ' AND is_demo = ?';
      params.push(demoVal);
      countParams.push(demoVal);
    }

    // Hitung total data
    const [countResult] = await pool.query(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Tambah pengurutan dan pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await pool.query(query, params);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getHistory:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat data' });
  }
}

/**
 * Ekspor data riwayat ke format CSV
 */
async function exportCSV(req, res) {
  try {
    const { startDate, endDate, isDemo } = req.query;

    let query = `
      SELECT id, device_id, adc_value, voltage, rs_ro_ratio, ppm_estimate, gas_status, is_demo, created_at 
      FROM sensor_logs 
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }
    if (isDemo !== undefined && isDemo !== 'all') {
      const demoVal = (isDemo === '1' || isDemo === 'true') ? 1 : 0;
      query += ' AND is_demo = ?';
      params.push(demoVal);
    }

    query += ' ORDER BY id DESC LIMIT 5000'; // Batas aman ekspor CSV

    const [rows] = await pool.query(query, params);

    // Siapkan Header CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=riwayat_sensor_gas_${Date.now()}.csv`);

    const header = ['ID', 'Device ID', 'Waktu (WIB)', 'ADC (0-4095)', 'Tegangan (V)', 'Rasio Rs/R0', 'Estimasi PPM', 'Status Gas', 'Tipe Data'];
    const csvLines = [header.join(',')];

    rows.forEach(r => {
      const formattedDate = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const dataType = r.is_demo ? 'DEMO/SIMULASI' : 'AKTUAL/HARDWARE';
      const line = [
        r.id,
        `"${r.device_id}"`,
        `"${formattedDate}"`,
        r.adc_value,
        r.voltage,
        r.rs_ro_ratio,
        r.ppm_estimate,
        `"${r.gas_status}"`,
        `"${dataType}"`
      ];
      csvLines.push(line.join(','));
    });

    return res.send(csvLines.join('\n'));
  } catch (error) {
    console.error('Error exportCSV:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengekspor CSV' });
  }
}

/**
 * Generator data simulator demo (untuk pengujian instan tanpa harus menjalankan ESP32)
 */
async function generateDemoData(req, res) {
  try {
    const { scenario = 'random' } = req.body;
    let adcValue = 350; // default clean air

    if (scenario === 'safe') {
      // Kondisi Aman (ADC rendah, PPM < 200)
      adcValue = Math.floor(Math.random() * 200) + 200; // 200 - 400
    } else if (scenario === 'warning') {
      // Kondisi Waspada (ADC sedang, PPM 200 - 500)
      adcValue = Math.floor(Math.random() * 400) + 1100; // 1100 - 1500
    } else if (scenario === 'danger') {
      // Kondisi Bahaya (ADC tinggi, PPM > 500)
      adcValue = Math.floor(Math.random() * 1200) + 2200; // 2200 - 3400
    } else {
      // Random variasi
      adcValue = Math.floor(Math.random() * 3000) + 250;
    }

    req.body = {
      device_id: 'SIMULATOR-DEMO-01',
      device_name: 'Wokwi Simulator (Demo Mode)',
      adc_value: adcValue,
      is_demo: true
    };

    return postSensorData(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  postSensorData,
  getLatestReading,
  getHistory,
  exportCSV,
  generateDemoData
};
