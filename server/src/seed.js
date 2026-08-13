const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  console.log('Starting database seeding process...');

  const adminDbUrl = process.env.ADMIN_DATABASE_URL;
  const targetDbUrl = process.env.DATABASE_URL;

  // Step 1: Connect to default postgres DB and ensure target database exists
  const adminClient = new Client({ connectionString: adminDbUrl });
  try {
    await adminClient.connect();
    console.log('Connected to default database for check/creation.');

    // Check if database exists
    const checkDbRes = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'queuepay'"
    );

    if (checkDbRes.rowCount === 0) {
      console.log("Database 'queuepay' does not exist. Creating database...");
      await adminClient.query('CREATE DATABASE queuepay');
      console.log("Database 'queuepay' created successfully.");
    } else {
      console.log("Database 'queuepay' already exists.");
    }
  } catch (err) {
    console.error('Error during database check/creation step:', err);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to the target 'queuepay' database and execute schema.sql
  const targetClient = new Client({ connectionString: targetDbUrl });
  try {
    await targetClient.connect();
    console.log("Connected to 'queuepay' database.");

    // Read and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await targetClient.query(schemaSql);
    console.log('Tables and indexes created successfully.');

    // Step 3: Seed default super admin user if not exists
    const adminEmail = 'admin@queuepay.com';
    const checkAdmin = await targetClient.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (checkAdmin.rowCount === 0) {
      console.log('Seeding default Super Admin user...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      
      const insertUserRes = await targetClient.query(
        `INSERT INTO users (name, email, password_hash, role, phone_number) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Super Admin', adminEmail, passwordHash, 'ADMIN', '+261340000001']
      );

      const adminUserId = insertUserRes.rows[0].id;

      // Create a wallet for the admin (optional, but clean)
      await targetClient.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
        [adminUserId, 0.00]
      );

      console.log('Super Admin user seeded successfully! Email: admin@queuepay.com, Password: admin123');
    } else {
      console.log('Super Admin user already exists.');
    }

  } catch (err) {
    console.error('Error seeding target database schema:', err);
    process.exit(1);
  } finally {
    await targetClient.end();
    console.log('Database seeding process completed.');
  }
}

seedDatabase();
