const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gas_monitoring_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Inisialisasi database dan tabel otomatis jika belum tersedia
 */
async function initDatabase() {
  try {
    // 1. Buat koneksi tanpa database terpilih untuk memastikan database ada
    const initConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306', 10)
    });

    const dbName = process.env.DB_NAME || 'gas_monitoring_db';
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initConn.end();

    // 2. Buat tabel menggunakan pool
    const connection = await pool.getConnection();

    // Tabel threshold_settings
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`threshold_settings\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`warning_ppm\` FLOAT NOT NULL DEFAULT 200.0,
        \`danger_ppm\` FLOAT NOT NULL DEFAULT 500.0,
        \`ro_clean_air\` FLOAT NOT NULL DEFAULT 10.0,
        \`rl_kohm\` FLOAT NOT NULL DEFAULT 10.0,
        \`gas_type\` VARCHAR(20) NOT NULL DEFAULT 'LPG',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Inisialisasi baris default threshold jika kosong
    await connection.query(`
      INSERT INTO \`threshold_settings\` (\`id\`, \`warning_ppm\`, \`danger_ppm\`, \`ro_clean_air\`, \`rl_kohm\`, \`gas_type\`)
      VALUES (1, 200.0, 500.0, 10.0, 10.0, 'LPG')
      ON DUPLICATE KEY UPDATE \`id\` = \`id\`;
    `);

    // Tabel devices
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`devices\` (
        \`device_id\` VARCHAR(50) PRIMARY KEY,
        \`device_name\` VARCHAR(100) NOT NULL,
        \`ip_address\` VARCHAR(45) NULL,
        \`last_seen\` DATETIME NOT NULL,
        \`status\` ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel sensor_logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`sensor_logs\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` VARCHAR(50) NOT NULL,
        \`adc_value\` INT NOT NULL,
        \`voltage\` FLOAT NOT NULL,
        \`rs_ro_ratio\` FLOAT NOT NULL,
        \`ppm_estimate\` FLOAT NOT NULL,
        \`gas_status\` ENUM('AMAN', 'WASPADA', 'BAHAYA') NOT NULL,
        \`is_demo\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_device_time\` (\`device_id\`, \`created_at\`),
        INDEX \`idx_created_at\` (\`created_at\`),
        INDEX \`idx_is_demo\` (\`is_demo\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    connection.release();
    console.log('✅ Database dan tabel berhasil diinisialisasi / diverifikasi.');
  } catch (error) {
    console.error('❌ Gagal menginisialisasi database:', error.message);
  }
}

module.exports = {
  pool,
  initDatabase
};
