const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { notifyQueueUpdate, notifyTicketCall, notifyTicketApproaching, notifyTicketCompleted } = require('../socket');

const emailService = require('../email');

// Helper to check and notify the 3rd person in the queue
async function checkAndNotifyApproaching(entityId, serviceId) {
  try {
    // Fetch all PENDING tickets for this service and date in order
    const pendingRes = await db.query(
      `SELECT b.id, b.ticket_number, b.client_id, u.name as client_name, u.email, e.name as entity_name, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN entities e ON b.entity_id = e.id
       JOIN services s ON b.service_id = s.id
       WHERE b.entity_id = $1 AND b.service_id = $2 AND b.booking_date = CURRENT_DATE AND b.status = 'PENDING'
       ORDER BY b.ticket_number ASC`,
      [entityId, serviceId]
    );

    // If there is a ticket at index 2 (meaning it is 3rd in line, with exactly 2 pending ahead of it)
    if (pendingRes.rowCount > 2) {
      const targetTicket = pendingRes.rows[2];
      notifyTicketApproaching(targetTicket.client_id, {
        ticket_number: targetTicket.ticket_number,
        clientsAhead: 3,
        message: "Il reste 3 personnes avant votre tour !"
      });

      // Send real email notification
      emailService.sendApproachingEmail(
        targetTicket.email, 
        targetTicket.client_name, 
        targetTicket.ticket_number, 
        targetTicket.entity_name, 
        targetTicket.service_name,
        3
      ).catch(err => console.error('Error sending approaching email:', err));
    }
  } catch (err) {
    console.error('Error in checkAndNotifyApproaching:', err);
  }
}

// All endpoints in this file require AGENT role
router.use(verifyToken, requireRole(['AGENT']));

// 1. CHOOSE/BIND DESK ON SESSION LOAD
router.post('/bind-desk', async (req, res) => {
  const agentId = req.user.id;
  const entityId = req.user.entityId;
  const { desk_id } = req.body;

  if (!desk_id) {
    return res.status(400).json({ error: 'Desk ID is required' });
  }

  try {
    // Verify desk belongs to the agent's entity
    const deskCheck = await db.query(
      'SELECT id, service_id, name FROM desks WHERE id = $1 AND entity_id = $2',
      [desk_id, entityId]
    );

    if (deskCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Desk counter not found for your organization' });
    }

    // Set this agent to the desk (and unset the agent from other desks first)
    await db.query('UPDATE desks SET assigned_agent_id = NULL WHERE assigned_agent_id = $1', [agentId]);
    await db.query('UPDATE desks SET assigned_agent_id = $1, status = \'ACTIVE\' WHERE id = $2', [agentId, desk_id]);

    return res.json({
      message: `Guichet ${deskCheck.rows[0].name} successfully bound to you`,
      desk: deskCheck.rows[0]
    });

  } catch (err) {
    console.error('Bind desk error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: Get active desk for agent
async function getAgentDesk(agentId, entityId) {
  const deskRes = await db.query(
    'SELECT id, service_id, name FROM desks WHERE assigned_agent_id = $1 AND entity_id = $2 AND status = \'ACTIVE\'',
    [agentId, entityId]
  );
  if (deskRes.rowCount === 0) return null;
  return deskRes.rows[0];
}

// Helper to check if any client has 3 clients ahead (position 3) and send alert notification
async function checkAndNotifyApproaching(entityId, serviceId) {
  try {
    const { notifyTicketApproaching } = require('../socket');
    const thirdRes = await db.query(
      `SELECT b.id, b.client_id, b.ticket_number, s.name as service_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.entity_id = $1 AND b.service_id = $2 AND b.booking_date >= CURRENT_DATE AND b.status = 'PENDING'
       ORDER BY b.time_slot ASC, b.created_at ASC, b.id ASC
       LIMIT 1 OFFSET 2`,
      [entityId, serviceId]
    );

    if (thirdRes.rowCount > 0) {
      const t = thirdRes.rows[0];
      notifyTicketApproaching(t.client_id, {
        ticket_number: t.ticket_number,
        service_name: t.service_name,
        clientsAhead: 2
      });
    }
  } catch (err) {
    console.error('Check approaching error:', err);
  }
}

// 2. GET KANBAN QUEUE FOR TODAY
router.get('/queue', async (req, res) => {
  const agentId = req.user.id;
  const entityId = req.user.entityId;

  try {
    const desk = await getAgentDesk(agentId, entityId);
    if (!desk) {
      return res.status(400).json({ error: 'You are not active on any counter. Please bind a counter first.' });
    }

    if (!desk.service_id) {
      return res.status(400).json({ error: 'Your counter is not assigned to any service.' });
    }

    // Fetch all tickets for this counter's service across dates & statuses for complete filtering
    const queueRes = await db.query(
      `SELECT b.id, b.ticket_number, b.booking_date, b.time_slot, b.price, b.status, b.qr_code_token, b.called_at, b.completed_at, b.created_at,
              u.name as client_name, u.phone_number as client_phone, u.email as client_email, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.entity_id = $1 AND b.service_id = $2
       ORDER BY b.booking_date DESC, b.time_slot ASC, b.created_at ASC, b.id ASC`,
      [entityId, desk.service_id]
    );

    return res.json({
      desk,
      queue: queueRes.rows
    });

  } catch (err) {
    console.error('Get agent queue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. CALL TICKET (Call Next Client in Queue)
router.post('/call-next', async (req, res) => {
  const agentId = req.user.id;
  const entityId = req.user.entityId;

  const clientDb = await db.pool.connect();
  try {
    await clientDb.query('BEGIN');

    const desk = await getAgentDesk(agentId, entityId);
    if (!desk) {
      return res.status(400).json({ error: 'Please bind a counter first.' });
    }

    if (!desk.service_id) {
      return res.status(400).json({ error: 'Your counter is not assigned to any service.' });
    }

    // If there is already a ticket in 'CALLING' status for this desk, skip calling a new one
    // or we can allow calling it again. Let's find the first PENDING ticket for today.
    const findNextSql = `
      SELECT b.id, b.ticket_number, b.client_id, s.name as service_name,
             u.name as client_name, u.email as client_email, e.name as entity_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.client_id = u.id
      JOIN entities e ON b.entity_id = e.id
      WHERE b.entity_id = $1 AND b.service_id = $2 
        AND b.booking_date = CURRENT_DATE AND b.status = 'PENDING'
      ORDER BY b.time_slot ASC, b.created_at ASC, b.id ASC
      LIMIT 1
      FOR UPDATE
    `;
    const nextRes = await clientDb.query(findNextSql, [entityId, desk.service_id]);

    if (nextRes.rowCount === 0) {
      await clientDb.query('COMMIT');
      return res.json({ message: 'No clients waiting in the queue for today.' });
    }

    const ticket = nextRes.rows[0];

    // Update status to CALLING, bind to desk
    const updateTicketSql = `
      UPDATE bookings
      SET status = 'CALLING',
          desk_id = $1,
          called_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const updatedRes = await clientDb.query(updateTicketSql, [desk.id, ticket.id]);
    const updatedTicket = updatedRes.rows[0];
    updatedTicket.service_name = ticket.service_name;

    await clientDb.query('COMMIT');

    // Notify WebSocket listeners
    notifyQueueUpdate(entityId);
    notifyTicketCall(ticket.client_id, {
      ticket_number: updatedTicket.ticket_number,
      service_name: ticket.service_name,
      desk_name: desk.name,
      entityId: entityId,
      clientId: ticket.client_id
    });

    // Send real-time Email notification for Called ticket
    emailService.sendTicketCalledEmail(
      ticket.client_email,
      ticket.client_name,
      updatedTicket.ticket_number,
      ticket.entity_name,
      ticket.service_name,
      desk.name
    ).catch(err => console.error('Error sending ticket called email:', err));

    // Check if any client is now 3rd in queue and alert them
    checkAndNotifyApproaching(entityId, desk.service_id).catch(err => console.error(err));

    return res.json({
      message: `Calling ticket ${updatedTicket.ticket_number}`,
      ticket: updatedTicket
    });

  } catch (err) {
    await clientDb.query('ROLLBACK');
    console.error('Call next ticket error:', err);
    return res.status(500).json({ error: 'Failed to call next ticket' });
  } finally {
    clientDb.release();
  }
});

// 4. TERMINATE & PASS (Mark complete, then call next ticket)
router.post('/complete/:ticketId', async (req, res) => {
  const agentId = req.user.id;
  const entityId = req.user.entityId;
  const { ticketId } = req.params;

  const clientDb = await db.pool.connect();
  try {
    await clientDb.query('BEGIN');

    const desk = await getAgentDesk(agentId, entityId);
    if (!desk) {
      return res.status(400).json({ error: 'Please bind a counter first.' });
    }

    // Verify ticket ownership and status with full details for completion email
    const ticketCheck = await clientDb.query(
      `SELECT b.id, b.ticket_number, b.client_id, b.entity_id,
              u.name as client_name, u.email as client_email,
              e.name as entity_name, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN entities e ON b.entity_id = e.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1 FOR UPDATE`,
      [ticketId]
    );

    if (ticketCheck.rowCount === 0) {
      await clientDb.query('COMMIT');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const completedTicket = ticketCheck.rows[0];

    if (completedTicket.entity_id !== entityId) {
      await clientDb.query('COMMIT');
      return res.status(403).json({ error: 'Unauthorized ticket operation' });
    }

    // Mark current ticket as COMPLETED
    await clientDb.query(
      `UPDATE bookings
       SET status = 'COMPLETED',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [ticketId]
    );

    // Notify client via WebSocket and send thank-you email
    notifyTicketCompleted(completedTicket.client_id, {
      ticket_number: completedTicket.ticket_number,
      entity_name: completedTicket.entity_name,
      service_name: completedTicket.service_name,
      entityId: completedTicket.entity_id,
      clientId: completedTicket.client_id
    });

    emailService.sendTicketCompletedEmail(
      completedTicket.client_email,
      completedTicket.client_name,
      completedTicket.ticket_number,
      completedTicket.entity_name,
      completedTicket.service_name
    ).catch(err => console.error('Error sending ticket completed email:', err));

    // Call Next Ticket (if any)
    const findNextSql = `
      SELECT b.id, b.ticket_number, b.client_id, s.name as service_name,
             u.name as client_name, u.email as client_email, e.name as entity_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.client_id = u.id
      JOIN entities e ON b.entity_id = e.id
      WHERE b.entity_id = $1 AND b.service_id = $2 
        AND b.booking_date = CURRENT_DATE AND b.status = 'PENDING'
      ORDER BY b.time_slot ASC, b.created_at ASC, b.id ASC
      LIMIT 1
      FOR UPDATE
    `;
    const nextRes = await clientDb.query(findNextSql, [entityId, desk.service_id]);

    let nextTicket = null;
    if (nextRes.rowCount > 0) {
      const ticketInfo = nextRes.rows[0];
      const updateTicketSql = `
        UPDATE bookings
        SET status = 'CALLING',
            desk_id = $1,
            called_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const updatedRes = await clientDb.query(updateTicketSql, [desk.id, ticketInfo.id]);
      nextTicket = updatedRes.rows[0];
      nextTicket.service_name = ticketInfo.service_name;

      notifyTicketCall(ticketInfo.client_id, {
        ticket_number: nextTicket.ticket_number,
        service_name: ticketInfo.service_name,
        desk_name: desk.name,
        entityId: entityId,
        clientId: ticketInfo.client_id
      });

      // Send real-time Email notification for Called ticket
      emailService.sendTicketCalledEmail(
        ticketInfo.client_email,
        ticketInfo.client_name,
        nextTicket.ticket_number,
        ticketInfo.entity_name,
        ticketInfo.service_name,
        desk.name
      ).catch(err => console.error('Error sending ticket called email:', err));
    }

    await clientDb.query('COMMIT');

    // Notify WebSocket listeners
    notifyQueueUpdate(entityId);

    // Check if any client is now 3rd in queue and alert them
    checkAndNotifyApproaching(entityId, desk.service_id).catch(err => console.error(err));

    return res.json({
      message: 'Ticket completed and queue advanced',
      nextTicket
    });

  } catch (err) {
    await clientDb.query('ROLLBACK');
    console.error('Complete ticket error:', err);
    return res.status(500).json({ error: 'Failed to complete ticket' });
  } finally {
    clientDb.release();
  }
});

// 5. ABSENT / SKIP CLIENT ("Absent/Faire Passer")
router.post('/skip/:ticketId', async (req, res) => {
  const entityId = req.user.entityId;
  const { ticketId } = req.params;

  try {
    const resUpdate = await db.query(
      `UPDATE bookings
       SET status = 'ABSENT'
       WHERE id = $1 AND entity_id = $2 AND status = 'CALLING'
       RETURNING *`,
      [ticketId, entityId]
    );

    if (resUpdate.rowCount === 0) {
      return res.status(404).json({ error: 'Calling ticket not found or already processed' });
    }

    const ticket = resUpdate.rows[0];

    // Fetch user and service details for email notification
    const detailRes = await db.query(
      `SELECT u.name as client_name, u.email, e.name as entity_name, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN entities e ON b.entity_id = e.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1`,
      [ticket.id]
    );

    if (detailRes.rowCount > 0) {
      const details = detailRes.rows[0];
      emailService.sendAbsentEmail(
        details.email, 
        details.client_name, 
        ticket.ticket_number, 
        details.entity_name, 
        details.service_name
      ).catch(err => console.error('Error sending absent email:', err));
    }

    // Notify WebSocket listeners
    notifyQueueUpdate(entityId);

    // Check if any client is now 3rd in queue and alert them
    checkAndNotifyApproaching(entityId, ticket.service_id).catch(err => console.error(err));

    return res.json({
      message: 'Client marqué comme absent. Un e-mail lui a été envoyé.',
      ticket
    });
  } catch (err) {
    console.error('Skip ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. VALIDATE TICKET BY SCANNING QR CODE or Entering Ticket Number/QR Code Token
router.post('/verify-ticket', async (req, res) => {
  const entityId = req.user.entityId;
  const { token_or_number, mark_completed } = req.body;

  if (!token_or_number) {
    return res.status(400).json({ error: 'Ticket number or QR code token is required' });
  }

  // Format candidate ticket number (e.g., "2" -> "002")
  const rawStr = token_or_number.trim();
  const paddedNum = rawStr.padStart(3, '0');

  try {
    // Search ticket by qr_code_token or ticket_number
    const ticketRes = await db.query(
      `SELECT b.*, u.name as client_name, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.entity_id = $1 AND (
         b.qr_code_token = $2 OR 
         b.ticket_number = $2 OR 
         b.ticket_number = $3
       ) AND b.booking_date >= CURRENT_DATE
       ORDER BY b.id DESC LIMIT 1`,
      [entityId, rawStr, paddedNum]
    );

    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ error: `Aucun ticket trouvé pour '${rawStr}' aujourd'hui.` });
    }

    let ticket = ticketRes.rows[0];

    // If mark_completed is explicitly true, mark as COMPLETED
    if (mark_completed === true && (ticket.status === 'PENDING' || ticket.status === 'CALLING')) {
      const updateRes = await db.query(
        `UPDATE bookings
         SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [ticket.id]
      );
      ticket = { ...ticket, ...updateRes.rows[0] };

      // Broadcast WebSocket update so Public TV & Client Apps update live!
      notifyQueueUpdate(entityId);
      notifyTicketCompleted(ticket.client_id, {
        ticket_number: ticket.ticket_number,
        entity_name: ticket.entity_name,
        service_name: ticket.service_name,
        entityId: entityId
      });

      emailService.sendTicketCompletedEmail(
        ticket.client_email,
        ticket.client_name,
        ticket.ticket_number,
        ticket.entity_name,
        ticket.service_name
      ).catch(err => console.error('Error sending ticket completed email:', err));
    }

    return res.json({
      message: `Ticket N°${ticket.ticket_number} validé avec succès !`,
      ticket
    });
  } catch (err) {
    console.error('Verify ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. GET THE CURRENTLY ASSIGNED DESK FOR LOGGED-IN AGENT
router.get('/assigned-desk', async (req, res) => {
  const agentId = req.user.id;
  const entityId = req.user.entityId;

  try {
    const deskRes = await db.query(
      `SELECT d.id, d.name, d.service_id, s.name as service_name
       FROM desks d
       LEFT JOIN services s ON d.service_id = s.id
       WHERE d.assigned_agent_id = $1 AND d.entity_id = $2`,
      [agentId, entityId]
    );

    if (deskRes.rowCount === 0) {
      return res.json({ desk: null });
    }

    return res.json({ desk: deskRes.rows[0] });
  } catch (err) {
    console.error('Get assigned desk error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. GET ALL ABSENT TICKETS (PERMANENT UNTIL REACTIVATED OR DELETED)
router.get('/absent-tickets', async (req, res) => {
  const entityId = req.user.entityId;

  try {
    const absentRes = await db.query(
      `SELECT b.*, u.name as client_name, u.email as client_email, u.phone_number as client_phone, s.name as service_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.entity_id = $1 AND b.status = 'ABSENT'
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [entityId]
    );

    return res.json({ tickets: absentRes.rows });
  } catch (err) {
    console.error('Get absent tickets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. REACTIVATE ABSENT TICKET (Put back in queue)
router.post('/reactivate/:ticketId', async (req, res) => {
  const entityId = req.user.entityId;
  const { ticketId } = req.params;

  try {
    const reactivateRes = await db.query(
      `UPDATE bookings
       SET status = 'PENDING',
           called_at = NULL,
           desk_id = NULL
       WHERE id = $1 AND entity_id = $2 AND status = 'ABSENT'
       RETURNING *`,
      [ticketId, entityId]
    );

    if (reactivateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket absent introuvable ou déjà traité.' });
    }

    // Broadcast update via websockets
    notifyQueueUpdate(entityId);

    return res.json({ 
      message: 'Ticket réactivé avec succès et remis en attente.', 
      ticket: reactivateRes.rows[0] 
    });
  } catch (err) {
    console.error('Reactivate ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. DELETE / EXPIRE ABSENT TICKET PERMANENTLY (Cancel)
router.post('/delete-absent/:ticketId', async (req, res) => {
  const entityId = req.user.entityId;
  const { ticketId } = req.params;

  try {
    const cancelRes = await db.query(
      `UPDATE bookings
       SET status = 'CANCELLED'
       WHERE id = $1 AND entity_id = $2 AND status = 'ABSENT'
       RETURNING *`,
      [ticketId, entityId]
    );

    if (cancelRes.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket absent introuvable ou déjà traité.' });
    }

    notifyQueueUpdate(entityId);

    return res.json({ 
      message: 'Ticket absent supprimé définitivement de la file d\'attente.',
      ticket: cancelRes.rows[0] 
    });
  } catch (err) {
    console.error('Delete absent ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

