const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET konfigurasi ambang batas & kalibrasi saat ini
router.get('/', settingsController.getSettings);

// PUT perbarui ambang batas & kalibrasi
router.put('/', settingsController.updateSettings);

// POST kalibrasi otomatis R0 dari ADC udara bersih
router.post('/calibrate', settingsController.autoCalibrateR0);

module.exports = router;
