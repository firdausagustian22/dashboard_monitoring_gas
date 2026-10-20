const { pool } = require('../config/db');
const { calibrateCleanAirR0 } = require('../services/mq2Calibration');
const { getIO } = require('../socket');

/**
 * Mendapatkan konfigurasi ambang batas dan kalibrasi saat ini
 */
async function getSettings(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM threshold_settings WHERE id = 1 LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengaturan tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getSettings:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan' });
  }
}

/**
 * Memperbarui nilai ambang batas (Warning, Danger, R0, RL, Gas Type)
 */
async function updateSettings(req, res) {
  try {
    const { warning_ppm, danger_ppm, ro_clean_air, rl_kohm, gas_type } = req.body;

    const wPPM = parseFloat(warning_ppm);
    const dPPM = parseFloat(danger_ppm);
    const roVal = parseFloat(ro_clean_air);
    const rlVal = parseFloat(rl_kohm);
    const targetGas = (gas_type || 'LPG').toUpperCase();

    if (isNaN(wPPM) || isNaN(dPPM) || isNaN(roVal) || isNaN(rlVal)) {
      return res.status(400).json({ success: false, message: 'Parameter pengaturan harus berupa angka yang valid' });
    }

    if (wPPM <= 0 || dPPM <= 0 || roVal <= 0 || rlVal <= 0) {
      return res.status(400).json({ success: false, message: 'Nilai ambang batas dan resistansi harus lebih besar dari 0' });
    }

    if (dPPM <= wPPM) {
      return res.status(400).json({ success: false, message: 'Ambang batas Bahaya (PPM) harus lebih tinggi dari ambang Waspada (PPM)' });
    }

    await pool.query(
      `UPDATE threshold_settings 
       SET warning_ppm = ?, danger_ppm = ?, ro_clean_air = ?, rl_kohm = ?, gas_type = ?, updated_at = NOW()
       WHERE id = 1`,
      [wPPM, dPPM, roVal, rlVal, targetGas]
    );

    const [updated] = await pool.query('SELECT * FROM threshold_settings WHERE id = 1 LIMIT 1');
    const settingsData = updated[0];

    // Beritahukan ke semua klien frontend melalui Socket.IO
    try {
      getIO().emit('settings_updated', settingsData);
    } catch (e) {
      // socket might not be ready yet
    }

    return res.json({
      success: true,
      message: 'Pengaturan ambang batas dan kalibrasi berhasil diperbarui',
      data: settingsData
    });
  } catch (error) {
    console.error('Error updateSettings:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan' });
  }
}

/**
 * Kalibrasi otomatis nilai R0 dari nilai ADC udara bersih
 */
async function autoCalibrateR0(req, res) {
  try {
    const { adc_clean_air, rl_kohm } = req.body;
    const adc = parseInt(adc_clean_air, 10);
    const rl = parseFloat(rl_kohm) || 10.0;

    if (isNaN(adc) || adc < 50 || adc > 3800) {
      return res.status(400).json({
        success: false,
        message: 'Nilai ADC udara bersih tidak valid untuk kalibrasi (rentang wajar: 50 - 3800)'
      });
    }

    const calculatedR0 = calibrateCleanAirR0(adc, rl);

    await pool.query(
      'UPDATE threshold_settings SET ro_clean_air = ?, updated_at = NOW() WHERE id = 1',
      [calculatedR0]
    );

    const [updated] = await pool.query('SELECT * FROM threshold_settings WHERE id = 1 LIMIT 1');

    try {
      getIO().emit('settings_updated', updated[0]);
    } catch (e) {}

    return res.json({
      success: true,
      message: `Kalibrasi berhasil. Nilai R0 baru: ${calculatedR0} kΩ`,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error autoCalibrateR0:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan kalibrasi otomatis' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  autoCalibrateR0
};
