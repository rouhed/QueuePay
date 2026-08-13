const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const emailService = require('../email');
const { notifyEntityUpdate } = require('../socket');

// 1. GET ONBOARDING DETAILS BY SLUG (Public, used during onboarding link load)
router.get('/onboarding/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const entityRes = await db.query(
      'SELECT id, name, slug, logo_url, description, max_booking_price, commission_amount, onboarding_completed FROM entities WHERE slug = $1',
      [slug.toLowerCase()]
    );

    if (entityRes.rowCount === 0) {
      return res.status(404).json({ error: 'Collaboration slug not found' });
    }

    const entity = entityRes.rows[0];
    return res.json({ entity });
  } catch (err) {
    console.error('Get onboarding error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. COMPLETE ONBOARDING (Public - sets up the Entity Dashboard Administrator Account)
router.post('/onboarding/:slug', async (req, res) => {
  const { slug } = req.params;
  const { admin_name, admin_email, admin_password, admin_phone } = req.body;

  if (!admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Admin Name, Email, and Password are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve entity
    const entityRes = await client.query(
      'SELECT id, name, onboarding_completed FROM entities WHERE slug = $1 FOR UPDATE',
      [slug.toLowerCase()]
    );

    if (entityRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity slug not found' });
    }

    const entity = entityRes.rows[0];
    if (entity.onboarding_completed) {
      return res.status(400).json({ error: 'Onboarding already completed' });
    }

    // Check if email already taken in users
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [admin_email]);
    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ error: 'Admin email already registered' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(admin_password, salt);

    // Create user with COMPANY role (representing Entity Admin) linked to this entity
    const insertAdminSql = `
      INSERT INTO users (name, email, password_hash, role, phone_number, entity_id)
      VALUES ($1, $2, $3, 'COMPANY', $4, $5)
      RETURNING id, name, email
    `;
    await client.query(insertAdminSql, [
      admin_name,
      admin_email,
      passwordHash,
      admin_phone || null,
      entity.id
    ]);

    // Mark entity onboarding as complete
    await client.query(
      'UPDATE entities SET onboarding_completed = TRUE WHERE id = $1',
      [entity.id]
    );

    await client.query('COMMIT');

    // Notify all clients via WS that entity onboarding is completed
    notifyEntityUpdate({ id: entity.id });

    // Send real onboarding completed welcome email
    emailService.sendWelcomeEntityEmail(admin_email, entity.name)
      .catch(err => console.error('Error sending entity onboarding welcome email:', err));

    return res.json({ message: 'Onboarding completed successfully. You can now login to your dashboard.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Complete onboarding error:', err);
    return res.status(500).json({ error: 'Failed to complete onboarding' });
  } finally {
    client.release();
  }
});

// ==========================================
// SECURED ENDPOINTS FOR ENTITY ADMIN
// ==========================================

// 3. GET ENTITY PROFILE & SETTINGS
router.get('/settings', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;

  try {
    const settingsRes = await db.query(
      `SELECT e.*, 
              s.working_hours_start, s.working_hours_end, s.working_days, s.average_duration_minutes
       FROM entities e
       JOIN entity_settings s ON e.id = s.entity_id
       WHERE e.id = $1`,
      [entityId]
    );

    if (settingsRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity or settings not found' });
    }

    return res.json({ settings: settingsRes.rows[0] });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3.5 CHANGE OWN PASSWORD (COMPANY ADMIN)
router.post('/change-password', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }

  try {
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    return res.json({ message: 'Votre mot de passe a été modifié avec succès.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. UPDATE ENTITY SETTINGS
router.put('/settings', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { working_hours_start, working_hours_end, working_days, average_duration_minutes, description, logo_url } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Update entity profile
    if (description !== undefined || logo_url !== undefined) {
      await client.query(
        `UPDATE entities 
         SET description = COALESCE($1, description),
             logo_url = COALESCE($2, logo_url)
         WHERE id = $3`,
        [description, logo_url, entityId]
      );
    }

    // Update settings
    const updateSettingsSql = `
      UPDATE entity_settings
      SET working_hours_start = COALESCE($1, working_hours_start),
          working_hours_end = COALESCE($2, working_hours_end),
          working_days = COALESCE($3, working_days),
          average_duration_minutes = COALESCE($4, average_duration_minutes)
      WHERE entity_id = $5
      RETURNING *
    `;
    const settingsRes = await client.query(updateSettingsSql, [
      working_hours_start,
      working_hours_end,
      working_days,
      average_duration_minutes,
      entityId
    ]);

    await client.query('COMMIT');
    return res.json({ 
      message: 'Settings updated successfully',
      settings: settingsRes.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

// 5. GET ALL SERVICES (Public or Entity)
router.get('/services', async (req, res) => {
  // Can filter by entity_id if query parameter is provided (for clients)
  const { entity_id } = req.query;

  try {
    let servicesRes;
    if (entity_id) {
      servicesRes = await db.query(
        'SELECT * FROM services WHERE entity_id = $1 ORDER BY id ASC',
        [entity_id]
      );
    } else {
      // If called by authenticated entity dashboard, grab from token
      return res.status(400).json({ error: 'entity_id query parameter is required' });
    }

    return res.json({ services: servicesRes.rows });
  } catch (err) {
    console.error('List services error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Secured listing for active entity admin (no need to pass entity_id in query)
router.get('/my-services', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  try {
    const servicesRes = await db.query(
      'SELECT * FROM services WHERE entity_id = $1 ORDER BY id ASC',
      [entityId]
    );
    return res.json({ services: servicesRes.rows });
  } catch (err) {
    console.error('Get my-services error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. ADD SERVICE (Entity role only, checks price contract limits)
router.post('/services', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { name, description, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Service Name and Price are required' });
  }

  try {
    // 1. Fetch entity contract max_booking_price
    const entityRes = await db.query('SELECT max_booking_price FROM entities WHERE id = $1', [entityId]);
    if (entityRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const maxPrice = parseFloat(entityRes.rows[0].max_booking_price);
    if (parseFloat(price) > maxPrice) {
      return res.status(400).json({ 
        error: `Service price (${price} Ar) exceeds the maximum booking price of ${maxPrice} Ar agreed in the QueuePay contract. Please renegotiate with administrator.` 
      });
    }

    // 2. Insert service
    const insertSql = `
      INSERT INTO services (entity_id, name, description, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const serviceRes = await db.query(insertSql, [entityId, name, description || '', price]);

    return res.status(201).json({
      message: 'Service added successfully',
      service: serviceRes.rows[0]
    });

  } catch (err) {
    console.error('Add service error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. EDIT SERVICE (Entity role only, checks price contract limits)
router.put('/services/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;
  const { name, description, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Service Name and Price are required' });
  }

  try {
    // Verify service belongs to this entity
    const serviceCheck = await db.query('SELECT entity_id FROM services WHERE id = $1', [id]);
    if (serviceCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (serviceCheck.rows[0].entity_id !== entityId) {
      return res.status(403).json({ error: 'You do not have permission to modify this service' });
    }

    // Fetch contract max_booking_price
    const entityRes = await db.query('SELECT max_booking_price FROM entities WHERE id = $1', [entityId]);
    const maxPrice = parseFloat(entityRes.rows[0].max_booking_price);
    
    if (parseFloat(price) > maxPrice) {
      return res.status(400).json({ 
        error: `Service price (${price} Ar) exceeds the maximum booking price of ${maxPrice} Ar agreed in the QueuePay contract.` 
      });
    }

    // Update service
    const updateSql = `
      UPDATE services
      SET name = $1, description = $2, price = $3
      WHERE id = $4 AND entity_id = $5
      RETURNING *
    `;
    const updateRes = await db.query(updateSql, [name, description || '', price, id, entityId]);

    return res.json({
      message: 'Service updated successfully',
      service: updateRes.rows[0]
    });

  } catch (err) {
    console.error('Edit service error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7.5 DELETE SERVICE
router.delete('/services/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;

  try {
    // Verify service belongs to this entity
    const serviceCheck = await db.query('SELECT entity_id FROM services WHERE id = $1', [id]);
    if (serviceCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (serviceCheck.rows[0].entity_id !== entityId) {
      return res.status(403).json({ error: 'You do not have permission to modify this service' });
    }

    // Set service_id to NULL on desks before deleting
    await db.query('UPDATE desks SET service_id = NULL WHERE service_id = $1', [id]);

    // Delete associated bookings
    await db.query('DELETE FROM bookings WHERE service_id = $1', [id]);

    // Delete service
    await db.query('DELETE FROM services WHERE id = $1 AND entity_id = $2', [id, entityId]);

    return res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete service error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// DESKS (COUNTERS/GUICHETS) MANAGEMENT
// ==========================================

// 8. LIST DESKS (Counters)
router.get('/desks', verifyToken, requireRole(['COMPANY', 'AGENT']), async (req, res) => {
  const entityId = req.user.entityId;

  try {
    const desksRes = await db.query(
      `SELECT d.*, s.name as service_name, u.name as agent_name
       FROM desks d
       LEFT JOIN services s ON d.service_id = s.id
       LEFT JOIN users u ON d.assigned_agent_id = u.id
       WHERE d.entity_id = $1
       ORDER BY d.id ASC`,
      [entityId]
    );

    return res.json({ desks: desksRes.rows });
  } catch (err) {
    console.error('List desks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. CREATE A COUNTER/DESK
router.post('/desks', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { name, service_id, assigned_agent_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Desk Name is required' });
  }

  try {
    // If service_id is provided, verify it exists and belongs to the entity
    if (service_id) {
      const serviceCheck = await db.query('SELECT id FROM services WHERE id = $1 AND entity_id = $2', [service_id, entityId]);
      if (serviceCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid service selected for this counter' });
      }
    }

    // If agent is provided, verify they are an agent of this entity
    if (assigned_agent_id) {
      const agentCheck = await db.query('SELECT id FROM users WHERE id = $1 AND role = \'AGENT\' AND entity_id = $2', [assigned_agent_id, entityId]);
      if (agentCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid agent selected for this counter' });
      }
    }

    const insertSql = `
      INSERT INTO desks (entity_id, service_id, name, assigned_agent_id, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING *
    `;
    const resDesk = await db.query(insertSql, [
      entityId,
      service_id || null,
      name,
      assigned_agent_id || null
    ]);

    return res.status(201).json({
      message: 'Guichet Counter created successfully',
      desk: resDesk.rows[0]
    });

  } catch (err) {
    console.error('Create desk error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. ASSIGN AGENT & SERVICE TO DESK / UPDATE DESK DETAILS
router.put('/desks/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;
  const { name, service_id, assigned_agent_id, status } = req.body;

  try {
    // Verify desk belongs to this entity
    const deskCheck = await db.query('SELECT id FROM desks WHERE id = $1 AND entity_id = $2', [id, entityId]);
    if (deskCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Desk counter not found' });
    }

    // Verify service
    if (service_id) {
      const serviceCheck = await db.query('SELECT id FROM services WHERE id = $1 AND entity_id = $2', [service_id, entityId]);
      if (serviceCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid service' });
      }
    }

    // Verify agent
    if (assigned_agent_id) {
      const agentCheck = await db.query('SELECT id FROM users WHERE id = $1 AND role = \'AGENT\' AND entity_id = $2', [assigned_agent_id, entityId]);
      if (agentCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid agent' });
      }
    }

    const updateSql = `
      UPDATE desks
      SET name = COALESCE($1, name),
          service_id = $2,
          assigned_agent_id = $3,
          status = COALESCE($4, status)
      WHERE id = $5 AND entity_id = $6
      RETURNING *
    `;
    const resUpdate = await db.query(updateSql, [
      name, 
      service_id || null, 
      assigned_agent_id || null, 
      status, 
      id, 
      entityId
    ]);

    return res.json({
      message: 'Guichet Counter updated successfully',
      desk: resUpdate.rows[0]
    });

  } catch (err) {
    console.error('Update desk error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 10.5 DELETE DESK COUNTER
router.delete('/desks/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;

  try {
    // Verify desk belongs to this entity
    const deskCheck = await db.query('SELECT id FROM desks WHERE id = $1 AND entity_id = $2', [id, entityId]);
    if (deskCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Desk not found' });
    }

    await db.query('DELETE FROM desks WHERE id = $1 AND entity_id = $2', [id, entityId]);

    return res.json({ message: 'Guichet Counter deleted successfully' });
  } catch (err) {
    console.error('Delete desk error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// AGENTS MANAGEMENT
// ==========================================

// 11. CREATE AN AGENT FOR THIS ENTITY
router.post('/agents', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { name, email, password, phone_number } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email, and Password are required' });
  }

  try {
    // Check if email already taken
    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertAgentSql = `
      INSERT INTO users (name, email, password_hash, role, phone_number, entity_id)
      VALUES ($1, $2, $3, 'AGENT', $4, $5)
      RETURNING id, name, email, role, phone_number
    `;
    const agentRes = await db.query(insertAgentSql, [
      name,
      email,
      passwordHash,
      phone_number || null,
      entityId
    ]);

    return res.status(201).json({
      message: 'Agent account created successfully',
      agent: agentRes.rows[0]
    });

  } catch (err) {
    console.error('Create agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. LIST ALL AGENTS FOR THIS ENTITY
router.get('/agents', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;

  try {
    const agentsRes = await db.query(
      `SELECT id, name, email, phone_number, created_at
       FROM users
       WHERE entity_id = $1 AND role = 'AGENT'
       ORDER BY id DESC`,
      [entityId]
    );

    return res.json({ agents: agentsRes.rows });
  } catch (err) {
    console.error('List agents error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 13. GET BOOKINGS AND STATS FOR THIS ENTITY
router.get('/dashboard-stats', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;

  try {
    // 1. Fetch KPI stats
    const statsRes = await db.query(
      `SELECT 
        COUNT(id) as total_tickets,
        COALESCE(SUM(price), 0) as total_revenue,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_tickets,
        COUNT(CASE WHEN status = 'CALLING' THEN 1 END) as calling_tickets,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tickets,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_tickets
       FROM bookings
       WHERE entity_id = $1`,
      [entityId]
    );

    const stats = statsRes.rows[0];

    // 2. Fetch recent bookings list
    const bookingsRes = await db.query(
      `SELECT b.*, s.name as service_name, u.name as client_name, d.name as desk_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.client_id = u.id
       LEFT JOIN desks d ON b.desk_id = d.id
       WHERE b.entity_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [entityId]
    );

    return res.json({
      stats: {
        total_tickets: parseInt(stats.total_tickets || 0),
        total_revenue: parseFloat(stats.total_revenue || 0),
        pending_tickets: parseInt(stats.pending_tickets || 0),
        calling_tickets: parseInt(stats.calling_tickets || 0),
        completed_tickets: parseInt(stats.completed_tickets || 0),
        absent_tickets: parseInt(stats.absent_tickets || 0)
      },
      recentBookings: bookingsRes.rows
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 14. UPDATE AGENT ACCOUNT (Entity role only, can update password)
router.put('/agents/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;
  const { name, email, password, phone_number } = req.body;

  try {
    // Verify agent belongs to this entity
    const agentCheck = await db.query('SELECT id, password_hash FROM users WHERE id = $1 AND entity_id = $2 AND role = \'AGENT\'', [id, entityId]);
    if (agentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let passwordHash = agentCheck.rows[0].password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const updateSql = `
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          password_hash = $3,
          phone_number = COALESCE($4, phone_number)
      WHERE id = $5 AND entity_id = $6
      RETURNING id, name, email, role, phone_number
    `;
    const updateRes = await db.query(updateSql, [name, email, passwordHash, phone_number || null, id, entityId]);

    return res.json({
      message: 'Agent account updated successfully',
      agent: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Update agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 15. DELETE AGENT ACCOUNT
router.delete('/agents/:id', verifyToken, requireRole(['COMPANY']), async (req, res) => {
  const entityId = req.user.entityId;
  const { id } = req.params;

  try {
    // Verify agent belongs to this entity
    const agentCheck = await db.query('SELECT id FROM users WHERE id = $1 AND entity_id = $2 AND role = \'AGENT\'', [id, entityId]);
    if (agentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Set assigned_agent_id to NULL on desks before deleting the user
    await db.query('UPDATE desks SET assigned_agent_id = NULL WHERE assigned_agent_id = $1', [id]);

    // Delete user
    await db.query('DELETE FROM users WHERE id = $1 AND entity_id = $2 AND role = \'AGENT\'', [id]);

    return res.json({ message: 'Agent account deleted successfully' });
  } catch (err) {
    console.error('Delete agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


