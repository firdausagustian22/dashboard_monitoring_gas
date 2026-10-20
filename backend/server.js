require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { initDatabase } = require('./src/config/db');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const server = http.createServer(app);

// Inisialisasi Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSocket(io);

// Start server setelah DB check
async function startServer() {
  await initDatabase();

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Server Backend Gas Monitoring berjalan di Port: ${PORT}`);
    console.log(`📡 WebSocket Socket.IO aktif`);
    console.log(`🔗 Endpoint Sensor HTTP POST: http://localhost:${PORT}/api/sensor/data`);
    console.log(`💻 Frontend Client: ${CLIENT_URL}`);
    console.log(`=======================================================`);
  });
}

startServer();
