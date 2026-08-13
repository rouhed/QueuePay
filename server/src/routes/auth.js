const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const emailService = require('../email');

const JWT_SECRET = process.env.JWT_SECRET || 'queuepay_super_secret_session_token_key_2026';

// In-memory store for registration OTPs (Simulated SMS/Email OTP)
const otpStore = new Map();

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. REGISTER CLIENT (Initiate - Send OTP)
router.post('/register', async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  if (!name || !email || !password || !phone_number) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Store in memory
    otpStore.set(email, {
      name,
      email,
      passwordHash,
      phone_number,
      otp,
      expires
    });

    // Send real email with OTP (asynchronously)
    emailService.sendRegistrationOTPEmail(email, name, otp).catch(err => console.error('Error sending registration OTP email:', err));

    // SIMULATED SMS: Output the OTP to the console
    console.log('\n====================================');
    console.log(`[SIMULATED SMS OTP] For client: ${name} (${phone_number})`);
    console.log(`CODE OTP : ${otp}`);
    console.log('Valid for 5 minutes.');
    console.log('====================================\n');

    return res.json({ 
      message: 'OTP sent successfully (check email or backend console)', 
      email // return email so frontend knows where to verify
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. VERIFY OTP (Complete Registration)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const record = otpStore.get(email);
  if (!record) {
    return res.status(400).json({ error: 'No pending registration found for this email' });
  }

  if (Date.now() > record.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Code OTP invalide ou expiré.' });
  }

  // OTP is valid, insert user into PostgreSQL
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Insert user
    const insertUserSql = `
      INSERT INTO users (name, email, password_hash, role, phone_number)
      VALUES ($1, $2, $3, 'CLIENT', $4)
      RETURNING id, name, email, role, phone_number
    `;
    const userRes = await client.query(insertUserSql, [
      record.name,
      record.email,
      record.passwordHash,
      record.phone_number
    ]);

    const newUser = userRes.rows[0];

    // Create wallet for the new client
    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [newUser.id, 0.00]
    );

    await client.query('COMMIT');
    otpStore.delete(email); // Clean up OTP store

    // Send welcome email
    emailService.sendWelcomeEmail(newUser.email, newUser.name).catch(err => console.error('Error sending welcome email:', err));

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: newUser
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Verify OTP transaction error:', err);
    return res.status(500).json({ error: 'Failed to complete registration' });
  } finally {
    client.release();
  }
});

// 3. LOGIN
router.post('/login', async (req, res) => {
  const { login_id, password } = req.body; // login_id can be email or phone number

  if (!login_id || !password) {
    return res.status(400).json({ error: 'Credentials are required' });
  }

  try {
    // Find user by email or phone
    const userRes = await db.query(
      'SELECT * FROM users WHERE email = $1 OR phone_number = $1',
      [login_id]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        entityId: user.entity_id 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    delete user.password_hash; // Don't return password hash in response

    return res.json({
      message: 'Login successful',
      token,
      user
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. ME (CURRENT USER PROFILE)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userRes = await db.query(
      'SELECT id, name, email, role, phone_number, entity_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // If client, fetch wallet balance
    if (user.role === 'CLIENT') {
      const walletRes = await db.query('SELECT balance FROM wallets WHERE user_id = $1', [user.id]);
      user.wallet_balance = walletRes.rowCount > 0 ? parseFloat(walletRes.rows[0].balance) : 0;
    }

    return res.json({ user });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// In-memory store for password reset OTPs
const passwordResetStore = new Map();

// 5. FORGOT PASSWORD (Request OTP)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists
    const userRes = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé avec cet e-mail.' });
    }

    const user = userRes.rows[0];
    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 mins

    passwordResetStore.set(email, { otp, expires });

    // Send email to user
    emailService.sendForgotPasswordEmail(email, otp).catch(err => console.error('Error sending forgot password email:', err));

    // Send alert to Super Admin (simulated or real SMTP)
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@queuepay.mg';
    emailService.sendForgotPasswordAdminAlertEmail(adminEmail, user.name, email).catch(err => console.error('Error alerting admin:', err));

    console.log('\n====================================');
    console.log(`[PASSWORD RESET OTP] For user: ${user.name} (${email})`);
    console.log(`CODE OTP : ${otp}`);
    console.log('====================================\n');

    return res.json({ message: 'Code de réinitialisation envoyé par e-mail.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. RESET PASSWORD (Validate OTP and change password)
router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, OTP and new password are required' });
  }

  const record = passwordResetStore.get(email);
  if (!record) {
    return res.status(400).json({ error: 'Aucune demande de réinitialisation trouvée.' });
  }

  if (Date.now() > record.expires) {
    passwordResetStore.delete(email);
    return res.status(400).json({ error: 'Le code OTP a expiré.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Code OTP incorrect.' });
  }

  try {
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update in database
    await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);

    passwordResetStore.delete(email); // Cleanup

    return res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
