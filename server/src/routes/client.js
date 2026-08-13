const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { notifyQueueUpdate } = require('../socket');
const emailService = require('../email');

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// 1. LIST ALL ENTITIES (with services and availability)
router.get('/entities', async (req, res) => {
  try {
    const entitiesRes = await db.query(
      `SELECT e.*, 
              s.working_hours_start, s.working_hours_end, s.working_days, s.average_duration_minutes
       FROM entities e
       LEFT JOIN entity_settings s ON e.id = s.entity_id
       ORDER BY e.name ASC`
    );

    return res.json({ entities: entitiesRes.rows });
  } catch (err) {
    console.error('Client list entities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET ENTITY DETAILS AND SERVICES
router.get('/entities/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const entityRes = await db.query(
      'SELECT id, name, logo_url, description FROM entities WHERE id = $1',
      [id]
    );

    if (entityRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const servicesRes = await db.query(
      'SELECT id, name, description, price FROM services WHERE entity_id = $1 ORDER BY id ASC',
      [id]
    );

    const settingsRes = await db.query(
      'SELECT working_hours_start, working_hours_end, working_days, average_duration_minutes FROM entity_settings WHERE entity_id = $1',
      [id]
    );

    return res.json({
      entity: entityRes.rows[0],
      services: servicesRes.rows,
      settings: settingsRes.rowCount > 0 ? settingsRes.rows[0] : null
    });

  } catch (err) {
    console.error('Client get entity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2.5 GET PUBLIC TV QUEUE DETAILS (Today's calling and pending tickets)
router.get('/entities/:id/tv-queue', async (req, res) => {
  const { id } = req.params;

  try {
    const queueRes = await db.query(
      `SELECT b.id, b.ticket_number, b.status, b.time_slot, s.name as service_name, d.name as desk_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN desks d ON b.desk_id = d.id
       WHERE b.entity_id = $1 AND b.booking_date = CURRENT_DATE 
         AND b.status IN ('PENDING', 'CALLING')
       ORDER BY b.status DESC, b.time_slot ASC, b.created_at ASC, b.id ASC`,
      [id]
    );

    return res.json({ queue: queueRes.rows });
  } catch (err) {
    console.error('Get public TV queue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// SECURED ENDPOINTS FOR CLIENTS
// ==========================================

// 3. DEPOSIT CREDIT (Simulating Orange Money, Mvola, Airtel Money)
router.post('/deposit', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const { amount, payment_method, phone_number, pin_code } = req.body;

  if (!amount || !payment_method || !phone_number || !pin_code) {
    return res.status(400).json({ error: 'amount, payment_method, phone_number, and pin_code are required' });
  }

  const depositAmount = parseFloat(amount);

  // Constraints: Min 1,000 Ar, Max 20,000 Ar
  if (depositAmount < 1000) {
    return res.status(400).json({ error: 'Minimum deposit is 1 000 Ariary (Ar).' });
  }
  if (depositAmount > 20000) {
    return res.status(400).json({ error: 'Maximum daily deposit is 20 000 Ariary (Ar).' });
  }

  // Validate payment method
  const method = payment_method.toUpperCase();
  if (!['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(method)) {
    return res.status(400).json({ error: 'Invalid payment method. Supported: MVOLA, ORANGE_MONEY, AIRTEL_MONEY' });
  }

  // Simulate PIN validation (e.g. must be numeric and 4 or 6 digits)
  if (!/^\d{4}$|^\d{6}$/.test(pin_code)) {
    return res.status(400).json({ error: 'Invalid secret PIN code format. Must be 4 or 6 digits.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Generate unique txn reference
    const refNum = `TXN-DEP-${method}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert transaction record
    await client.query(
      `INSERT INTO transactions (user_id, amount, transaction_type, payment_method, reference_number, status)
       VALUES ($1, $2, 'DEPOSIT', $3, $4, 'SUCCESS')`,
      [userId, depositAmount, method, refNum]
    );

    // Update client wallet balance
    const walletRes = await client.query(
      `UPDATE wallets 
       SET balance = balance + $1 
       WHERE user_id = $2 
       RETURNING balance`,
      [depositAmount, userId]
    );

    // Fetch client email & name for receipt
    const userRes = await client.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const userObj = userRes.rows[0];

    await client.query('COMMIT');

    const newBalance = walletRes.rowCount > 0 ? parseFloat(walletRes.rows[0].balance) : 0;

    // Send real email receipt (asynchronously)
    if (userObj) {
      emailService.sendDepositReceiptEmail(userObj.email, userObj.name, depositAmount, method, refNum, newBalance)
        .catch(err => console.error('Error sending deposit email:', err));
    }

    // Simulated email confirmation logged to console
    console.log('\n====================================');
    console.log(`[SIMULATED EMAIL DEPOSIT RECEIPT]`);
    console.log(`To User ID: ${userId}`);
    console.log(`Amount Credited: ${depositAmount} Ar`);
    console.log(`Method: ${method} (${phone_number})`);
    console.log(`Reference: ${refNum}`);
    console.log(`New Wallet Balance: ${newBalance} Ar`);
    console.log('====================================\n');

    return res.json({
      message: `Successfully deposited ${depositAmount} Ar using ${method}`,
      balance: newBalance,
      reference: refNum
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Wallet deposit error:', err);
    return res.status(500).json({ error: 'Failed to process deposit simulation' });
  } finally {
    client.release();
  }
});

// 4. BOOK A TICKET (Buy queue reservation)
router.post('/book', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const { entity_id, service_id, booking_date, time_slot } = req.body;
  const wallet_pin = req.body.wallet_pin || req.body.pin || req.body.pin_code;

  if (!entity_id || !service_id || !booking_date || !time_slot || !wallet_pin) {
    return res.status(400).json({ error: 'All parameters (entity_id, service_id, booking_date, time_slot, wallet_pin) are required' });
  }

  // Validate wallet PIN (simulation, must match 4 or 6 digits)
  if (!/^\d{4}$|^\d{6}$/.test(wallet_pin)) {
    return res.status(400).json({ error: 'Invalid Wallet PIN code' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch service details
    const serviceRes = await client.query(
      'SELECT id, name, price, entity_id FROM services WHERE id = $1 AND entity_id = $2',
      [service_id, entity_id]
    );

    if (serviceRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Service not found in selected entity' });
    }

    const service = serviceRes.rows[0];
    const ticketPrice = parseFloat(service.price);

    // 2. Fetch entity settings to check availability
    const settingsRes = await client.query(
      'SELECT working_hours_start, working_hours_end, working_days FROM entity_settings WHERE entity_id = $1',
      [entity_id]
    );

    if (settingsRes.rowCount > 0) {
      const settings = settingsRes.rows[0];
      // Check if slot falls in hours
      if (time_slot < settings.working_hours_start || time_slot > settings.working_hours_end) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Selected slot ${time_slot} is outside the working hours (${settings.working_hours_start} - ${settings.working_hours_end})` });
      }

      // Check if day matches
      const dateObj = new Date(booking_date);
      let dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday...
      if (dayOfWeek === 0) dayOfWeek = 7; // Map Sunday to 7
      
      const allowedDays = settings.working_days.split(',').map(Number);
      if (!allowedDays.includes(dayOfWeek)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `The entity is closed on this day of the week.` });
      }
    }

    // 3. Fetch client wallet balance
    const walletRes = await client.query(
      'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No wallet found. Please register properly.' });
    }

    const currentBalance = parseFloat(walletRes.rows[0].balance);
    if (currentBalance < ticketPrice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient wallet balance. Ticket costs ${ticketPrice} Ar, you have ${currentBalance} Ar.` });
    }

    // 4. Calculate next ticket number for this service and date
    const countRes = await client.query(
      `SELECT COUNT(*) as count 
       FROM bookings 
       WHERE entity_id = $1 AND service_id = $2 AND booking_date = $3`,
      [entity_id, service_id, booking_date]
    );
    const nextNumInt = parseInt(countRes.rows[0].count) + 1;
    const ticketNumber = nextNumInt.toString().padStart(3, '0'); // e.g. '001', '002'

    // 5. Generate random token for QR code
    const qrToken = `TKT-${entity_id}-${service_id}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 6. Debit client wallet
    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2',
      [ticketPrice, userId]
    );

    // 7. Insert booking
    const insertBookingSql = `
      INSERT INTO bookings (ticket_number, client_id, entity_id, service_id, booking_date, time_slot, price, status, qr_code_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)
      RETURNING *
    `;
    const bookingRes = await client.query(insertBookingSql, [
      ticketNumber,
      userId,
      entity_id,
      service_id,
      booking_date,
      time_slot,
      ticketPrice,
      qrToken
    ]);

    const booking = bookingRes.rows[0];

    // 8. Log Client Payment Transaction
    const refNum = `TXN-PAY-${booking.id}-${Date.now()}`;
    await client.query(
      `INSERT INTO transactions (user_id, amount, transaction_type, reference_number, status)
       VALUES ($1, $2, 'PAYMENT', $3, 'SUCCESS')`,
      [userId, ticketPrice, refNum]
    );

    // 9. Process Commission Contract Split (QueuePay Super Admin vs Enterprise Admin)
    const entityCommissionRes = await client.query('SELECT name, commission_amount FROM entities WHERE id = $1', [entity_id]);
    const entityObj = entityCommissionRes.rows[0];
    const entityName = entityObj.name;
    const platformCommission = parseFloat(entityObj.commission_amount || 0);
    const companyNetRevenue = Math.max(0, ticketPrice - platformCommission);

    // Credit QueuePay Super Admin platform commission
    if (platformCommission > 0) {
      const adminUserRes = await client.query("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1");
      if (adminUserRes.rowCount > 0) {
        const superAdminId = adminUserRes.rows[0].id;
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [platformCommission, superAdminId]);
        await client.query(
          `INSERT INTO transactions (user_id, amount, transaction_type, reference_number, status)
           VALUES ($1, $2, 'COMMISSION', $3, 'SUCCESS')`,
          [superAdminId, platformCommission, `TXN-COM-${booking.id}-${Date.now()}`]
        );
      }
    }

    // Credit Enterprise Admin (Company) remaining net revenue
    if (companyNetRevenue > 0) {
      const companyUserRes = await client.query("SELECT id FROM users WHERE entity_id = $1 AND role = 'COMPANY' LIMIT 1", [entity_id]);
      if (companyUserRes.rowCount > 0) {
        const companyAdminId = companyUserRes.rows[0].id;
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [companyNetRevenue, companyAdminId]);
        await client.query(
          `INSERT INTO transactions (user_id, amount, transaction_type, reference_number, status)
           VALUES ($1, $2, 'PAYMENT', $3, 'SUCCESS')`,
          [companyAdminId, companyNetRevenue, `TXN-REV-${booking.id}-${Date.now()}`]
        );
      }
    }

    // Fetch client user profile details for email receipt
    const clientUserRes = await client.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const clientUserObj = clientUserRes.rows[0];

    await client.query('COMMIT');

    // Notify websocket clients of this company room that queue updated
    notifyQueueUpdate(entity_id);

    // Send real ticket receipt email (asynchronously)
    if (clientUserObj) {
      emailService.sendTicketReceiptEmail(
        clientUserObj.email,
        clientUserObj.name,
        ticketNumber,
        entityName,
        service.name,
        booking_date,
        time_slot,
        ticketPrice,
        qrToken
      ).catch(err => console.error('Error sending ticket receipt email:', err));
    }

    // Simulated email confirmation logged to console
    console.log('\n====================================');
    console.log(`[SIMULATED EMAIL TICKET PURCHASE RECEIPT]`);
    console.log(`To User ID: ${userId}`);
    console.log(`Entity: ${entityName}`);
    console.log(`Service: ${service.name}`);
    console.log(`Ticket Number: ${ticketNumber}`);
    console.log(`Date: ${booking_date} | Time: ${time_slot}`);
    console.log(`QR Code Validation Token: ${qrToken}`);
    console.log(`Price Paid: ${ticketPrice} Ar`);
    console.log('====================================\n');

    return res.status(201).json({
      message: 'Booking ticket purchased successfully!',
      ticket: {
        ...booking,
        entity_name: entityName,
        service_name: service.name
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase ticket error:', err);
    return res.status(500).json({ error: 'Failed to process ticket booking' });
  } finally {
    client.release();
  }
});

// Helper to get active queue details and list of tickets ahead of a given ticket
async function getTicketQueueDetails(ticket) {
  if (ticket.status !== 'PENDING' && ticket.status !== 'CALLING') {
    return { position: 0, clientsAhead: 0, ahead_tickets: [] };
  }

  if (ticket.status === 'CALLING') {
    return { position: 0, clientsAhead: 0, ahead_tickets: [] };
  }

  // Fetch all active PENDING and CALLING tickets for the same entity, service and booking_date
  // Ordered by CALLING first, then time_slot ASC, created_at ASC, id ASC (same order as agent queue)
  const queueRes = await db.query(
    `SELECT b.id, b.ticket_number, b.time_slot, b.status, b.created_at,
            u.name as client_name, d.name as desk_name
     FROM bookings b
     JOIN users u ON b.client_id = u.id
     LEFT JOIN desks d ON b.desk_id = d.id
     WHERE b.entity_id = $1 AND b.service_id = $2 AND b.booking_date = $3
       AND b.status IN ('PENDING', 'CALLING')
     ORDER BY CASE WHEN b.status = 'CALLING' THEN 0 ELSE 1 END, b.time_slot ASC, b.created_at ASC, b.id ASC`,
    [ticket.entity_id, ticket.service_id, ticket.booking_date]
  );

  const activeQueue = queueRes.rows;
  const ticketIndex = activeQueue.findIndex(t => t.id === ticket.id);

  if (ticketIndex === -1) {
    return { position: 0, clientsAhead: 0, ahead_tickets: [] };
  }

  const aheadTickets = activeQueue.slice(0, ticketIndex).map(t => {
    let nameToDisplay = 'Client';
    if (t.client_name) {
      const parts = t.client_name.trim().split(/\s+/);
      if (parts.length > 1) {
        nameToDisplay = `${parts[0]} ${parts[1][0]}.`;
      } else {
        nameToDisplay = parts[0];
      }
    }
    return {
      id: t.id,
      ticket_number: t.ticket_number,
      time_slot: t.time_slot,
      status: t.status,
      client_name: nameToDisplay,
      desk_name: t.desk_name
    };
  });

  const clientsAhead = ticketIndex;
  const position = clientsAhead + 1;

  return {
    position,
    clientsAhead,
    ahead_tickets: aheadTickets
  };
}

// 5. GET CLIENT TICKET HISTORY (Active and past tickets)
router.get('/tickets', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;

  try {
    const ticketsRes = await db.query(
      `SELECT b.id, b.ticket_number, b.booking_date, b.time_slot, b.price, b.status, b.qr_code_token, b.called_at, b.completed_at,
              b.entity_id, b.service_id,
              e.name as entity_name, e.logo_url as entity_logo, s.name as service_name, d.name as desk_name
       FROM bookings b
       JOIN entities e ON b.entity_id = e.id
       JOIN services s ON b.service_id = s.id
       LEFT JOIN desks d ON b.desk_id = d.id
       WHERE b.client_id = $1
       ORDER BY CASE WHEN b.status IN ('CALLING', 'PENDING') THEN 0 ELSE 1 END, b.id DESC`,
      [userId]
    );

    const tickets = ticketsRes.rows;

    // Dynamically calculate people_ahead, position and ahead_tickets list for each ticket
    for (let t of tickets) {
      if (t.status === 'PENDING') {
        const details = await getTicketQueueDetails(t);
        t.people_ahead = details.clientsAhead;
        t.position = details.position;
        t.ahead_tickets = details.ahead_tickets;
      } else if (t.status === 'CALLING') {
        t.people_ahead = 0;
        t.position = 0;
        t.ahead_tickets = [];
      } else {
        t.people_ahead = 0;
        t.position = 0;
        t.ahead_tickets = [];
      }
    }

    return res.json({ tickets });
  } catch (err) {
    console.error('Get client tickets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. GET TICKET LIVE STATUS (Queue Position)
router.get('/tickets/:id/position', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // 1. Fetch the ticket details
    const ticketRes = await db.query(
      `SELECT id, ticket_number, service_id, entity_id, booking_date, time_slot, status
       FROM bookings 
       WHERE id = $1 AND client_id = $2`,
      [id, userId]
    );

    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found or unauthorized access' });
    }

    const ticket = ticketRes.rows[0];

    if (ticket.status === 'COMPLETED') {
      return res.json({ position: 0, status: 'COMPLETED', message: 'Your turn is completed.' });
    }
    if (ticket.status === 'ABSENT') {
      return res.json({ position: 0, status: 'ABSENT', message: 'You were marked as absent.' });
    }
    if (ticket.status === 'CANCELLED') {
      return res.json({ position: 0, status: 'CANCELLED', message: 'This ticket was cancelled.' });
    }
    if (ticket.status === 'CALLING') {
      return res.json({ position: 0, status: 'CALLING', message: 'It is your turn! Please go to your counter.' });
    }

    const details = await getTicketQueueDetails(ticket);

    return res.json({
      position: details.position,
      clientsAhead: details.clientsAhead,
      ahead_tickets: details.ahead_tickets,
      status: 'PENDING',
      message: details.clientsAhead === 0 ? 'You are next in line!' : `There are ${details.clientsAhead} clients ahead of you.`
    });

  } catch (err) {
    console.error('Get ticket position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. GET CLIENT TRANSACTIONS LIST
router.get('/transactions', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;

  try {
    const transactionsRes = await db.query(
      `SELECT * FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ transactions: transactionsRes.rows });
  } catch (err) {
    console.error('Get client transactions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. GET SINGLE TICKET COMPLETE DETAILS WITH POSITION
router.get('/tickets/:id/detail', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const ticketRes = await db.query(
      `SELECT b.id, b.ticket_number, b.booking_date, b.time_slot, b.price, b.status, b.qr_code_token, b.called_at, b.completed_at,
              b.service_id, b.entity_id,
              e.name as entity_name, e.logo_url as entity_logo, s.name as service_name, d.name as desk_name
       FROM bookings b
       JOIN entities e ON b.entity_id = e.id
       JOIN services s ON b.service_id = s.id
       LEFT JOIN desks d ON b.desk_id = d.id
       WHERE b.id = $1 AND b.client_id = $2`,
      [id, userId]
    );

    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket introuvable.' });
    }

    const ticket = ticketRes.rows[0];

    const details = await getTicketQueueDetails(ticket);
    let message = '';

    if (ticket.status === 'PENDING') {
      message = details.clientsAhead === 0 ? 'Vous êtes le prochain !' : `Il y a ${details.clientsAhead} personnes devant vous.`;
    } else if (ticket.status === 'CALLING') {
      message = `C'est votre tour ! Veuillez vous rendre au ${ticket.desk_name || 'guichet'}.`;
    } else if (ticket.status === 'COMPLETED') {
      message = 'Service terminé.';
    } else if (ticket.status === 'ABSENT') {
      message = 'Vous avez été marqué absent.';
    } else if (ticket.status === 'CANCELLED') {
      message = 'Ticket annulé.';
    }

    return res.json({
      ticket,
      position: details.position,
      clientsAhead: details.clientsAhead,
      ahead_tickets: details.ahead_tickets,
      message
    });

  } catch (err) {
    console.error('Get single ticket detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. REACTIVATE AN ABSENT TICKET (BY CLIENT)
router.post('/tickets/:id/reactivate', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const ticketId = req.params.id;

  try {
    // 1. Check ticket ownership and status
    const ticketCheck = await db.query(
      `SELECT id, entity_id, service_id, booking_date, status, ticket_number FROM bookings WHERE id = $1 AND client_id = $2`,
      [ticketId, userId]
    );

    if (ticketCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket introuvable.' });
    }

    const ticket = ticketCheck.rows[0];
    if (ticket.status !== 'ABSENT') {
      return res.status(400).json({ error: 'Seuls les tickets marqués absents peuvent être réactivés.' });
    }

    // 2. Find the last active/pending ticket for the same service today to place reactivated ticket at the end of the line
    const lastRes = await db.query(
      `SELECT time_slot
       FROM bookings
       WHERE entity_id = $1 AND service_id = $2 AND booking_date = $3
         AND status IN ('CALLING', 'PENDING')
       ORDER BY time_slot DESC, created_at DESC, id DESC
       LIMIT 1`,
      [ticket.entity_id, ticket.service_id, ticket.booking_date]
    );

    let newTimeSlot = '08:00:00';
    if (lastRes.rowCount > 0 && lastRes.rows[0].time_slot) {
      // Add 10 minutes to the last waiting person's time_slot so it is placed at the end of the queue
      const parts = lastRes.rows[0].time_slot.split(':').map(Number);
      let totalMins = parts[0] * 60 + parts[1] + 10;
      const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
      const mm = String(totalMins % 60).padStart(2, '0');
      newTimeSlot = `${hh}:${mm}:00`;
    } else {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      newTimeSlot = `${hh}:${mm}:00`;
    }

    // 3. Reactivate ticket: status = PENDING, update time_slot & created_at to place at the end of queue
    const updateRes = await db.query(
      `UPDATE bookings
       SET status = 'PENDING',
           time_slot = $1,
           created_at = CURRENT_TIMESTAMP,
           called_at = NULL,
           desk_id = NULL
       WHERE id = $2 AND client_id = $3
       RETURNING *`,
      [newTimeSlot, ticketId, userId]
    );

    const updatedTicket = updateRes.rows[0];

    // Broadcast queue update to all listeners
    notifyQueueUpdate(ticket.entity_id);

    return res.json({
      message: `Votre ticket N°${updatedTicket.ticket_number} a été réactivé avec succès ! Vous avez été replacé(e) à la fin de la file d'attente.`,
      ticket: updatedTicket
    });

  } catch (err) {
    console.error('Client reactivate ticket error:', err);
    return res.status(500).json({ error: 'Erreur lors de la réactivation du ticket.' });
  }
});

// 9. CANCEL A TICKET (BY CLIENT)
router.post('/tickets/:id/cancel', verifyToken, requireRole(['CLIENT']), async (req, res) => {
  const userId = req.user.id;
  const ticketId = req.params.id;

  try {
    const updateRes = await db.query(
      `UPDATE bookings
       SET status = 'CANCELLED'
       WHERE id = $1 AND client_id = $2 AND status IN ('ABSENT', 'PENDING', 'CALLING')
       RETURNING *`,
      [ticketId, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket introuvable ou déjà annulé/terminé.' });
    }

    const cancelledTicket = updateRes.rows[0];

    // Broadcast queue update to all listeners
    notifyQueueUpdate(cancelledTicket.entity_id);

    return res.json({
      message: `Ticket N°${cancelledTicket.ticket_number} annulé avec succès.`,
      ticket: cancelledTicket
    });

  } catch (err) {
    console.error('Client cancel ticket error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'annulation du ticket.' });
  }
});

module.exports = router;
