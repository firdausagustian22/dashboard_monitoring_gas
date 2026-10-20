const express = require('express');
const cors = require('cors');
const sensorRoutes = require('./routes/sensorRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Izinkan akses dari React frontend atau ESP32
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging sederhana
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/sensor/data') {
    // ringkas log untuk streaming sensor
  } else {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/sensor', sensorRoutes);
app.use('/api/settings', settingsRoutes);

// Root endpoint info
app.get('/', (req, res) => {
  res.json({
    service: 'GasGuard IoT Backend API',
    status: 'ONLINE',
    frontend_url: process.env.CLIENT_URL || 'http://localhost:5173',
    endpoints: {
      health: '/health',
      sensor_post: 'POST /api/sensor/data',
      sensor_latest: 'GET /api/sensor/latest',
      sensor_history: 'GET /api/sensor/history',
      sensor_export_csv: 'GET /api/sensor/export',
      demo_generate: 'POST /api/sensor/demo/generate',
      settings: 'GET /api/settings'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'IoT Gas Monitoring Backend', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server', error: err.message });
});

module.exports = app;
