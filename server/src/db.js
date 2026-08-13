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

// Auto-initialize DB schema and create Super Admin on Cloud / First Startup
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

      // Create ONLY the Super Admin Account as requested
      console.log('🔑 Creating Super Admin account (admin@queuepay.com)...');
      const hashedPass = await bcrypt.hash('admin123', 10);

      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, phone_number, is_email_verified) 
         VALUES ('Super Admin', 'admin@queuepay.com', $1, 'ADMIN', '0340000000', TRUE) ON CONFLICT DO NOTHING`,
        [hashedPass]
      );

      console.log('✅ Cloud Database Initialization Complete! Ready for Enterprise & Client setup.');
    }
  } catch (err) {
    console.error('Error during DB auto initialization:', err);
  }
}

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
