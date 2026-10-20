-- ========================================================
-- Database Schema: Gas Monitoring IoT (ESP32 + MQ-2)
-- Database Name: gas_monitoring_db
-- ========================================================

CREATE DATABASE IF NOT EXISTS `gas_monitoring_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `gas_monitoring_db`;

-- 1. Table for Threshold & Calibration Settings
CREATE TABLE IF NOT EXISTS `threshold_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `warning_ppm` FLOAT NOT NULL DEFAULT 200.0,
    `danger_ppm` FLOAT NOT NULL DEFAULT 500.0,
    `ro_clean_air` FLOAT NOT NULL DEFAULT 10.0, -- R0 in kilo-ohms (kΩ) measured in clean air
    `rl_kohm` FLOAT NOT NULL DEFAULT 10.0,      -- Load resistance on MQ-2 breakout board (usually 10kΩ or 20kΩ)
    `gas_type` VARCHAR(20) NOT NULL DEFAULT 'LPG', -- Target gas curve: LPG, SMOKE, CH4
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default settings if empty
INSERT INTO `threshold_settings` (`id`, `warning_ppm`, `danger_ppm`, `ro_clean_air`, `rl_kohm`, `gas_type`)
VALUES (1, 200.0, 500.0, 10.0, 10.0, 'LPG')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 2. Table for Registered Devices & Connection Status
CREATE TABLE IF NOT EXISTS `devices` (
    `device_id` VARCHAR(50) PRIMARY KEY,
    `device_name` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `last_seen` DATETIME NOT NULL,
    `status` ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Table for Historical Sensor Data
CREATE TABLE IF NOT EXISTS `sensor_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `adc_value` INT NOT NULL COMMENT 'Raw ESP32 ADC reading (0-4095)',
    `voltage` FLOAT NOT NULL COMMENT 'Calculated voltage (0-3.3V)',
    `rs_ro_ratio` FLOAT NOT NULL COMMENT 'Sensor resistance divided by R0',
    `ppm_estimate` FLOAT NOT NULL COMMENT 'Calibrated gas concentration in PPM',
    `gas_status` ENUM('AMAN', 'WASPADA', 'BAHAYA') NOT NULL,
    `is_demo` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Real Sensor / Hardware, 1: Demo / Simulator',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_device_time` (`device_id`, `created_at`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_is_demo` (`is_demo`)
);
