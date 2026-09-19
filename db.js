/**
 * Hotel Operations System - MySQL Database Connection Pool
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_case_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL Database (hotel_case_db) successfully!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Failed to connect to MySQL database:', err.message);
  });

module.exports = pool;
