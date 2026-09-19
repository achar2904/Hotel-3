-- =============================================================================
-- Hotel 3 Database Migration & Initialization Script
-- Hotel: The Regent Cha-am Beach Resort & VALA
-- Charset: utf8mb4
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `hotel_case_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hotel_case_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Departments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name_th` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(10) DEFAULT '#4A5568',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departments` (`id`, `code`, `name_th`, `name_en`, `color_hex`) VALUES
(1, 'IT', 'ไอที (IT Support)', 'Information Technology', '#4F46E5'),
(2, 'HK', 'แม่บ้าน (Housekeeping)', 'Housekeeping', '#0D9488'),
(3, 'ENG', 'ช่าง (Engineering)', 'Engineering / Maintenance', '#D97706'),
(4, 'FRONT', 'ฟร้อนท์ (Front Office)', 'Front Office', '#2563EB'),
(5, 'ALL', 'ส่วนกลาง / ผู้บริหาร', 'Central Administration', '#C2410C')
ON DUPLICATE KEY UPDATE 
  `name_th` = VALUES(`name_th`),
  `color_hex` = VALUES(`color_hex`);

-- -----------------------------------------------------------------------------
-- 2. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(120) NULL,
  `pin` VARCHAR(20) NOT NULL DEFAULT '123456',
  `password_hash` VARCHAR(255) NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(50) NULL,
  `dept_code` VARCHAR(20) NOT NULL DEFAULT 'ENG',
  `department_id` INT UNSIGNED NULL,
  `role` ENUM('staff', 'dept_head', 'admin', 'owner') NOT NULL DEFAULT 'staff',
  `phone` VARCHAR(30) NULL,
  `avatar_url` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_dept` (`dept_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add dept_code / pin column if not exists
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "dept_code";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN dept_code VARCHAR(20) NOT NULL DEFAULT 'ENG';"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "pin";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN pin VARCHAR(20) NOT NULL DEFAULT '123456';"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Seed Standard 6-Digit Numeric Users Only
INSERT INTO `users` (`username`, `email`, `pin`, `password_hash`, `full_name`, `dept_code`, `role`, `phone`, `is_active`) VALUES
('900001', '900001@regent-chaam.com', '123456', '123456', 'คุณเอก (Admin)', 'ALL', 'admin', '9001', 1),
('900002', '900002@regent-chaam.com', '123456', '123456', 'คุณประธาน (Owner)', 'ALL', 'owner', '9002', 1),
('999999', '999999@regent-chaam.com', '123456', '123456', 'ผู้บริหารสูงสุด (GM)', 'ALL', 'owner', '9999', 1),
('100101', '100101@regent-chaam.com', '123456', '123456', 'คุณน้ำหวาน (Front)', 'FRONT', 'staff', '1001', 1),
('100102', '100102@regent-chaam.com', '123456', '123456', 'เจ้าหน้าที่ฟร้อนท์ 2', 'FRONT', 'staff', '1002', 1),
('200101', '200101@regent-chaam.com', '123456', '123456', 'ช่างสมศักดิ์ (หัวหน้าช่าง)', 'ENG', 'dept_head', '2001', 1),
('200102', '200102@regent-chaam.com', '123456', '123456', 'ช่างเทคนิคประจำกะ', 'ENG', 'staff', '2002', 1),
('300101', '300101@regent-chaam.com', '123456', '123456', 'พี่บัวผัน (หัวหน้าแม่บ้าน)', 'HK', 'dept_head', '3001', 1),
('300102', '300102@regent-chaam.com', '123456', '123456', 'เจ้าหน้าที่แม่บ้าน', 'HK', 'staff', '3002', 1),
('300103', '300103@regent-chaam.com', '123456', '123456', 'นายแมน (พนักงานแม่บ้าน)', 'HK', 'staff', '3003', 1),
('400101', '400101@regent-chaam.com', '123456', '123456', 'นายวิชัย (IT Support)', 'IT', 'staff', '4001', 1),
('400102', '400102@regent-chaam.com', '123456', '123456', 'หัวหน้าแผนกไอที', 'IT', 'dept_head', '4002', 1)
ON DUPLICATE KEY UPDATE
  `pin` = VALUES(`pin`),
  `password_hash` = VALUES(`password_hash`),
  `full_name` = VALUES(`full_name`),
  `dept_code` = VALUES(`dept_code`),
  `role` = VALUES(`role`),
  `phone` = VALUES(`phone`),
  `is_active` = 1;

-- -----------------------------------------------------------------------------
-- 3. Hotel Rooms Table (422 Rooms)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `room_no` VARCHAR(20) NOT NULL UNIQUE,
  `building` VARCHAR(60) NOT NULL DEFAULT 'Regent Main Wing',
  `floor` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `room_type` VARCHAR(60) NOT NULL DEFAULT 'Deluxe Room',
  `status` ENUM('AVAILABLE', 'MAINTENANCE', 'CLOSED', 'CLEANING', 'OCCUPIED') NOT NULL DEFAULT 'AVAILABLE',
  `closed_reason` VARCHAR(255) NULL,
  `current_open_cases` INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_by` VARCHAR(100) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_rooms_status` (`status`),
  INDEX `idx_rooms_floor` (`floor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Cases Table
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cases`;
CREATE TABLE `cases` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `case_no` VARCHAR(30) NOT NULL UNIQUE,
  `loc` VARCHAR(100) NOT NULL,
  `dept_from` VARCHAR(20) NOT NULL,
  `dept_to` VARCHAR(20) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `photo_url` TEXT NULL,
  `priority` ENUM('NORMAL', 'URGENT', 'EMERGENCY') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('NEW', 'IN_PROGRESS', 'WAITING_PARTS', 'CLOSED') NOT NULL DEFAULT 'NEW',
  `reporter_name` VARCHAR(100) NOT NULL,
  `reporter_code` VARCHAR(20) NOT NULL,
  `assignee_name` VARCHAR(100) NULL,
  `assignee_code` VARCHAR(20) NULL,
  `assignee_phone` VARCHAR(30) NULL,
  `accepted_at` VARCHAR(50) NULL,
  `closed_by` VARCHAR(100) NULL,
  `closed_at` VARCHAR(50) NULL,
  `close_note` TEXT NULL,
  `logs` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cases_status` (`status`),
  INDEX `idx_cases_dept_to` (`dept_to`),
  INDEX `idx_cases_dept_from` (`dept_from`),
  INDEX `idx_cases_assignee` (`assignee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Seed Initial Cases
-- -----------------------------------------------------------------------------
INSERT INTO `cases` (
  `case_no`, `loc`, `dept_from`, `dept_to`, `subject`, `photo_url`, `priority`, `status`,
  `reporter_name`, `reporter_code`, `assignee_name`, `assignee_code`, `assignee_phone`, `accepted_at`,
  `logs`
) VALUES
(
  'CASE-20260908-0001',
  'ห้อง 102',
  'FRONT',
  'ENG',
  'แอร์ไม่เย็น มีเสียงดังผิดปกติ',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  'URGENT',
  'IN_PROGRESS',
  'คุณน้ำหวาน',
  '100101',
  'ช่างสมศักดิ์',
  '100301',
  '1310',
  '12:20 น.',
  '["12:15 น. สร้างเคสโดย คุณน้ำหวาน (#100101)", "12:20 น. ช่างสมศักดิ์ (#100301) กดรับงาน"]'
),
(
  'CASE-20260908-0002',
  'ห้อง 305',
  'HK',
  'IT',
  'สัญญาณ Wi-Fi ไม่ขึ้นในห้องพัก',
  NULL,
  'NORMAL',
  'NEW',
  'พี่บัวผัน',
  '100201',
  NULL,
  NULL,
  NULL,
  NULL,
  '["13:00 น. สร้างเคสโดย พี่บัวผัน (#100201)"]'
),
(
  'CASE-20260908-0003',
  'ห้อง 201',
  'FRONT',
  'HK',
  'ทำความสะอาดด่วน แขกขอ Early Check-in',
  NULL,
  'URGENT',
  'CLOSED',
  'คุณน้ำหวาน',
  '100101',
  'พี่บัวผัน',
  '100201',
  '1205',
  '10:35 น.',
  '["10:30 น. สร้างเคสโดย คุณน้ำหวาน (#100101)", "10:35 น. พี่บัวผัน (#100201) รับงาน", "11:15 น. พี่บัวผัน ปิดงานเสร็จสิ้น"]'
);

UPDATE `cases` SET `closed_by` = 'พี่บัวผัน (#100201)', `closed_at` = '11:15 น.', `close_note` = 'ทำความสะอาดและจัดเตรียมห้องเรียบร้อยพร้อมเปิดขาย' WHERE `case_no` = 'CASE-20260908-0003';

SET FOREIGN_KEY_CHECKS = 1;
