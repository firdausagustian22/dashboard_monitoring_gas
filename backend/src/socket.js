let io = null;
const { pool } = require('./config/db');

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`🔌 Klien frontend terhubung: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Klien frontend terputus: ${socket.id}`);
    });
  });

  // Watchdog Heartbeat: cek status perangkat setiap 5 detik
  const timeoutMs = parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_MS || '15000', 10);
  setInterval(async () => {
    try {
      const [offlineDevices] = await pool.query(`
        SELECT device_id, device_name, last_seen 
        FROM devices 
        WHERE status = 'ONLINE' 
          AND TIMESTAMPDIFF(SECOND, last_seen, NOW()) > ?
      `, [Math.floor(timeoutMs / 1000)]);

      if (offlineDevices.length > 0) {
        for (const dev of offlineDevices) {
          await pool.query(
            "UPDATE devices SET status = 'OFFLINE', updated_at = NOW() WHERE device_id = ?",
            [dev.device_id]
          );

          console.log(`⚠️ Perangkat ${dev.device_id} dinyatakan OFFLINE (timeout ${timeoutMs}ms).`);

          if (io) {
            io.emit('device_status_change', {
              deviceId: dev.device_id,
              deviceName: dev.device_name,
              status: 'OFFLINE',
              lastSeen: dev.last_seen
            });
          }
        }
      }
    } catch (err) {
      console.error('Error saat memeriksa heartbeat perangkat:', err.message);
    }
  }, 5000);

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io belum diinisialisasi!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO
};
