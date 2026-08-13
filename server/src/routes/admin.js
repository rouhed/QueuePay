const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const emailService = require('../email');
const { notifyEntityUpdate } = require('../socket');

// All routes here require ADMIN role
router.use(verifyToken, requireRole(['ADMIN']));

// 1. ADD NEW ENTITY (Collab Partner - e.g., BOA, HJRA, Mairie)
router.post('/entities', async (req, res) => {
  const { name, slug, logo_url, description, email, address, max_booking_price, commission_amount } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Entity Name and Slug are required' });
  }

  // Format slug to url-safe
  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check slug uniqueness
    const slugCheck = await client.query('SELECT id FROM entities WHERE slug = $1', [formattedSlug]);
    if (slugCheck.rowCount > 0) {
      return res.status(400).json({ error: 'This slug URL prefix is already taken' });
    }

    // Insert entity details (onboarding_completed = FALSE initially so enterprise owner completes setup)
    const insertEntitySql = `
      INSERT INTO entities (name, slug, logo_url, description, email, address, max_booking_price, commission_amount, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
      RETURNING *
    `;
    const entityRes = await client.query(insertEntitySql, [
      name,
      formattedSlug,
      logo_url || null,
      description || '',
      email || null,
      address || null,
      max_booking_price || 1000.00,
      commission_amount || 0.00
    ]);

    const newEntity = entityRes.rows[0];

    // Create default settings for hours & availability
    const insertSettingsSql = `
      INSERT INTO entity_settings (entity_id, working_hours_start, working_hours_end, working_days, average_duration_minutes)
      VALUES ($1, '08:00:00', '17:00:00', '1,2,3,4,5', 10)
    `;
    await client.query(insertSettingsSql, [newEntity.id]);

    await client.query('COMMIT');

    const onboardingUrl = `/entrp/${newEntity.slug}`;

    // Send real invitation/welcome email to enterprise owner email address
    const targetEmail = email || process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER || 'admin@queuepay.mg';
    emailService.sendEntityOnboardingInviteEmail(targetEmail, name, onboardingUrl)
      .catch(err => console.error('Error sending entity onboarding invite email:', err));

    // Notify all WebSocket clients (mobile & web) that a new entity was created
    notifyEntityUpdate(newEntity);

    return res.status(201).json({
      message: 'Entity collaboration created successfully',
      entity: newEntity,
      onboardingUrl
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create entity error:', err);
    return res.status(500).json({ error: 'Failed to create entity' });
  } finally {
    client.release();
  }
});

// 2. LIST ALL ENTITIES (Collaborators)
router.get('/entities', async (req, res) => {
  try {
    const entitiesRes = await db.query(
      `SELECT e.*, 
              s.working_hours_start, s.working_hours_end, s.working_days, s.average_duration_minutes,
              (SELECT COUNT(*) FROM bookings b WHERE b.entity_id = e.id) as total_tickets_booked
       FROM entities e
       LEFT JOIN entity_settings s ON e.id = s.entity_id
       ORDER BY e.id DESC`
    );

    return res.json({ entities: entitiesRes.rows });
  } catch (err) {
    console.error('List entities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2.5 GET SPECIFIC ENTITY DETAILS
router.get('/entities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const entityRes = await db.query(
      `SELECT e.*, 
              s.working_hours_start, s.working_hours_end, s.working_days, s.average_duration_minutes
       FROM entities e
       LEFT JOIN entity_settings s ON e.id = s.entity_id
       WHERE e.id = $1`,
      [id]
    );

    if (entityRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = entityRes.rows[0];

    // Fetch services
    const servicesRes = await db.query('SELECT * FROM services WHERE entity_id = $1 ORDER BY id ASC', [id]);
    
    // Fetch agents
    const agentsRes = await db.query(
      "SELECT id, name, email, phone_number, created_at FROM users WHERE entity_id = $1 AND role = 'AGENT' ORDER BY id ASC",
      [id]
    );

    // Fetch recent bookings
    const bookingsRes = await db.query(
      `SELECT b.*, s.name as service_name, c.name as client_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users c ON b.client_id = c.id
       WHERE b.entity_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [id]
    );

    // Fetch stats
    const statsRes = await db.query(
      `SELECT 
        COUNT(id) as total_tickets,
        COALESCE(SUM(price), 0) as total_revenue
       FROM bookings
       WHERE entity_id = $1 AND status != 'CANCELLED'`,
      [id]
    );

    const totalTickets = parseInt(statsRes.rows[0].total_tickets);
    const totalRevenue = parseFloat(statsRes.rows[0].total_revenue);
    const commissionEarned = totalTickets * parseFloat(entity.commission_amount || 0);

    return res.json({
      entity,
      services: servicesRes.rows,
      agents: agentsRes.rows,
      recentBookings: bookingsRes.rows,
      stats: {
        total_tickets: totalTickets,
        total_revenue: totalRevenue,
        commission_earned: commissionEarned
      }
    });

  } catch (err) {
    console.error('Get entity detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2.7 DELETE ENTITY (COLLABORATION)
router.delete('/entities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteRes = await db.query('DELETE FROM entities WHERE id = $1 RETURNING *', [id]);
    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    return res.json({ message: 'Entity deleted successfully', entity: deleteRes.rows[0] });
  } catch (err) {
    console.error('Delete entity error:', err);
    return res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// 3. UPDATE CONTRACT TERMS (Max Booking Price, Commission, etc.)
router.put('/entities/:id', async (req, res) => {
  const { id } = req.params;
  const { name, max_booking_price, commission_amount, description, logo_url, email, address } = req.body;

  if (max_booking_price === undefined || commission_amount === undefined) {
    return res.status(400).json({ error: 'max_booking_price and commission_amount are required' });
  }

  try {
    const updateSql = `
      UPDATE entities
      SET name = COALESCE($1, name),
          max_booking_price = $2, 
          commission_amount = $3,
          description = COALESCE($4, description),
          logo_url = COALESCE($5, logo_url),
          email = COALESCE($6, email),
          address = COALESCE($7, address)
      WHERE id = $8
      RETURNING *
    `;
    const resUpdate = await db.query(updateSql, [
      name || null,
      max_booking_price,
      commission_amount,
      description || null,
      logo_url || null,
      email || null,
      address || null,
      id
    ]);

    if (resUpdate.rowCount === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    return res.json({
      message: 'Entity contract terms updated successfully',
      entity: resUpdate.rows[0]
    });
  } catch (err) {
    console.error('Update entity contract error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. GET SYSTEM-WIDE STATISTICS (Revenues, tickets, etc.)
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Total tickets count
    const ticketsRes = await db.query('SELECT COUNT(*) as count FROM bookings');
    stats.total_tickets = parseInt(ticketsRes.rows[0].count);

    // Total transaction counts and sum of deposits
    const depositsRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE transaction_type = 'DEPOSIT' AND status = 'SUCCESS'`
    );
    stats.total_deposits = parseFloat(depositsRes.rows[0].total);

    // Total commissions collected by QueuePay
    const commissionRes = await db.query(
      `SELECT COALESCE(SUM(e.commission_amount), 0) as total
       FROM bookings b
       JOIN entities e ON b.entity_id = e.id
       WHERE b.status != 'CANCELLED'`
    );
    stats.total_commissions_earned = parseFloat(commissionRes.rows[0].total);

    // Entity breakdown of tickets and commissions
    const entityStats = await db.query(
      `SELECT e.id, e.name, e.commission_amount, e.max_booking_price,
              COUNT(b.id) as tickets_count,
              COALESCE(SUM(b.price), 0) as total_revenue,
              COUNT(b.id) * e.commission_amount as queuepay_com
       FROM entities e
       LEFT JOIN bookings b ON e.id = b.entity_id AND b.status != 'CANCELLED'
       GROUP BY e.id, e.name, e.commission_amount, e.max_booking_price`
    );
    stats.entities = entityStats.rows;

    return res.json({ stats });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. RESET ENTITY PASSWORD WITH TEMPORARY PASSWORD & EMAIL
router.post('/entities/:id/reset-onboarding', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get the company admin user details & entity info
    const userRes = await db.query(
      "SELECT u.id, u.name, u.email, e.name as entity_name, e.slug, e.logo_url FROM users u JOIN entities e ON u.entity_id = e.id WHERE u.entity_id = $1 AND u.role = 'COMPANY'",
      [id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Compte administrateur introuvable pour cette entreprise. L\'entreprise doit d\'abord finaliser son inscription initiale.' });
    }

    const adminUser = userRes.rows[0];

    // 2. Generate a secure temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tempPassword = 'QP-';
    for (let i = 0; i < 6; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 3. Hash temporary password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 4. Update password in the database
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, adminUser.id]
    );

    // 5. Send Email with temp password
    await emailService.sendCompanyResetPasswordEmail(
      adminUser.email, 
      adminUser.entity_name, 
      tempPassword, 
      adminUser.slug, 
      adminUser.logo_url
    );

    return res.json({ 
      message: `Le mot de passe de l'administrateur a été réinitialisé. Un e-mail premium contenant le mot de passe temporaire (${tempPassword}) a été envoyé à ${adminUser.email}.`
    });
  } catch (err) {
    console.error('Reset onboarding password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
