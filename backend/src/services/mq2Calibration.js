/**
 * MQ-2 Sensor Calibration & Conversion Service
 * 
 * Sesuai prinsip sensor semikonduktor gas SnO2:
 * 1. ESP32 membaca ADC 12-bit (0 - 4095)
 * 2. V_out dihitung berdasarkan tegangan referensi V_in (3.3V)
 * 3. Resistansi sensor (Rs) dihitung berdasarkan rangkaian pembagi tegangan dengan load resistor RL (10 kΩ):
 *      Rs = RL * ((Vcc - Vout) / Vout)
 * 4. Nilai R0 adalah resistansi sensor pada udara bersih terkalibrasi:
 *      Pada udara bersih, rasio Rs / R0 untuk MQ-2 adalah ~9.83.
 * 5. Konsentrasi gas (PPM) dihitung berdasarkan kurva logaritmik datasheet MQ-2:
 *      PPM = A * (Rs / R0) ^ B
 * 
 * Jangan samakan ADC dengan PPM! Fungsi ini menghitung estimasi fisik gas riil.
 */

const GAS_CURVE_PARAMETERS = {
  LPG: {
    A: 574.25,
    B: -2.222,
    minPPM: 200,
    maxPPM: 10000
  },
  SMOKE: {
    A: 3697.4,
    B: -3.109,
    minPPM: 300,
    maxPPM: 10000
  },
  CH4: { // Methane
    A: 1012.7,
    B: -2.786,
    minPPM: 500,
    maxPPM: 10000
  }
};

/**
 * Menghitung parameter fisik dan estimasi PPM dari nilai ADC ESP32
 * @param {number} adcValue - Nilai ADC (0 - 4095)
 * @param {object} settings - Parameter kalibrasi dari database/pengaturan
 * @returns {object} { voltage, rs, rsRoRatio, ppmEstimate, gasStatus }
 */
function calculateMQ2PPM(adcValue, settings = {}) {
  const VCC = 3.3; // ESP32 ADC logic voltage
  const RL = parseFloat(settings.rl_kohm) || 10.0; // Load resistor dalam kΩ (biasanya 10kΩ pada modul MQ-2)
  const R0 = parseFloat(settings.ro_clean_air) || 10.0; // R0 terkalibrasi dalam kΩ
  const gasType = (settings.gas_type || 'LPG').toUpperCase();
  const warningPPM = parseFloat(settings.warning_ppm) || 200.0;
  const dangerPPM = parseFloat(settings.danger_ppm) || 500.0;

  // 1. Validasi batas ADC 12-bit
  const clampedADC = Math.max(0, Math.min(4095, Number(adcValue)));

  // 2. Hitung tegangan keluaran V_out (0 - 3.3V)
  const voltage = (clampedADC / 4095.0) * VCC;

  // Hindari pembagian nol dengan mengamankan tegangan (clamping)
  const safeVoltage = Math.max(0.005, Math.min(VCC - 0.005, voltage));

  // 3. Hitung resistansi sensor (Rs)
  // Rangkaian voltage divider: Vout = Vcc * (RL / (Rs + RL)) => Rs = RL * ((Vcc - Vout) / Vout)
  const rs = RL * ((VCC - safeVoltage) / safeVoltage);

  // 4. Hitung rasio Rs/R0
  const rsRoRatio = rs / Math.max(0.001, R0);

  // 5. Hitung estimasi PPM berdasarkan kurva power-law datasheet
  const curve = GAS_CURVE_PARAMETERS[gasType] || GAS_CURVE_PARAMETERS.LPG;
  let ppmEstimate = curve.A * Math.pow(rsRoRatio, curve.B);

  // Sensor saturation & noise clamp
  if (ppmEstimate < 0) ppmEstimate = 0;
  if (ppmEstimate > 20000) ppmEstimate = 20000;

  // 6. Tentukan status gas berdasarkan ambang batas (thresholds)
  let gasStatus = 'AMAN';
  if (ppmEstimate >= dangerPPM) {
    gasStatus = 'BAHAYA';
  } else if (ppmEstimate >= warningPPM) {
    gasStatus = 'WASPADA';
  }

  return {
    adcValue: clampedADC,
    voltage: Number(voltage.toFixed(3)),
    rs: Number(rs.toFixed(3)),
    rsRoRatio: Number(rsRoRatio.toFixed(3)),
    ppmEstimate: Number(ppmEstimate.toFixed(2)),
    gasStatus,
    gasType
  };
}

/**
 * Menghitung nilai R0 pada saat kalibrasi di udara bersih (Clean Air)
 * Pada udara bersih MQ-2: Rs / R0 ≈ 9.83
 * Sehingga: R0 = Rs_clean_air / 9.83
 * @param {number} adcCleanAir - Rata-rata ADC di lingkungan udara bersih
 * @param {number} rlKohm - Nilai resistor beban dalam kΩ (default 10)
 * @returns {number} R0 terhitung
 */
function calibrateCleanAirR0(adcCleanAir, rlKohm = 10.0) {
  const VCC = 3.3;
  const clampedADC = Math.max(1, Math.min(4094, Number(adcCleanAir)));
  const voltage = (clampedADC / 4095.0) * VCC;
  const rsCleanAir = rlKohm * ((VCC - voltage) / voltage);
  const cleanAirFactor = 9.83; // Konstanta MQ-2 Clean Air Factor
  const calculatedR0 = rsCleanAir / cleanAirFactor;
  return Number(calculatedR0.toFixed(3));
}

module.exports = {
  calculateMQ2PPM,
  calibrateCleanAirR0,
  GAS_CURVE_PARAMETERS
};
