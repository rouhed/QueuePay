const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
const isCloud = databaseUrl && (databaseUrl.includes('render.com') || databaseUrl.includes('dpg-'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isCloud ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Auto-initialize DB schema and ensure Super Admin on Cloud / Server Startup
async function initDb() {
  try {
    const tableCheck = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'users'"
    );

    if (tableCheck.rowCount === 0) {
      console.log('⚡ Initializing Database Schema & Table Relations on Cloud PostgreSQL...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(schemaSql);
      console.log('✅ All Database Tables & Relations created successfully!');
    } else {
      // Ensure column is_email_verified exists if schema was created earlier
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT TRUE');
    }

    // Always ensure Super Admin account exists with correct credentials
    const hashedPass = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone_number, is_email_verified) 
       VALUES ('Super Admin', 'admin@queuepay.com', $1, 'ADMIN', '0340000000', TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'ADMIN'`,
      [hashedPass]
    );

    console.log('🔑 Super Admin account (admin@queuepay.com / admin123) is ready!');

  } catch (err) {
    console.error('Error during DB auto initialization:', err);
  }
}

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
