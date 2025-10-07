const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test the connection pool
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection pool initialized successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection pool failed:', error.message);
  }
}

// Initialize the pool
testConnection();

module.exports = pool;
