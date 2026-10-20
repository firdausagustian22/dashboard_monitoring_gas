const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// POST data sensor dari ESP32 atau Simulator
router.post('/data', sensorController.postSensorData);

// GET pembacaan sensor terbaru
router.get('/latest', sensorController.getLatestReading);

// GET riwayat sensor dengan filter & pagination
router.get('/history', sensorController.getHistory);

// GET unduh ekspor CSV riwayat sensor
router.get('/export', sensorController.exportCSV);

// POST memicu data demo secara terprogram
router.post('/demo/generate', sensorController.generateDemoData);

module.exports = router;
