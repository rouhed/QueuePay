const socketIo = require('socket.io');

let io = null;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*', // Allow all origins for local dev/testing
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected to socket:', socket.id);

    // Join room for an entity (TV screens, Agent dashboards, etc.)
    socket.on('joinEntity', (entityId) => {
      socket.join(`entity:${entityId}`);
      console.log(`Socket ${socket.id} joined entity room: entity:${entityId}`);
    });

    // Join room for a specific client (real-time calls to user mobile app)
    socket.on('joinClient', (clientId) => {
      socket.join(`client:${clientId}`);
      console.log(`Socket ${socket.id} joined client room: client:${clientId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

// Helper to notify all screens in an entity that the queue state has changed
function notifyQueueUpdate(entityId) {
  if (io && entityId) {
    const eId = String(entityId);
    io.to(`entity:${eId}`).emit('queueUpdate', { entityId: eId });
    console.log(`Broadcasted queueUpdate for entity: ${eId}`);
  }
}

// Helper to notify a specific client and public TV screens that a ticket is being called
function notifyTicketCall(clientId, ticketData) {
  if (io) {
    if (clientId) {
      io.to(`client:${String(clientId)}`).emit('ticketCall', ticketData);
    }
    if (ticketData && ticketData.entityId) {
      const eId = String(ticketData.entityId);
      io.to(`entity:${eId}`).emit('ticketCall', ticketData);
      console.log(`Sent ticketCall to client ${clientId} and entity ${eId} for ticket ${ticketData?.ticket_number}`);
    }
  }
}

// Helper to notify a specific client that their turn is approaching (e.g. 3 clients ahead)
function notifyTicketApproaching(clientId, ticketData) {
  if (io) {
    io.to(`client:${clientId}`).emit('ticketApproaching', ticketData);
    console.log(`Sent ticketApproaching to client ${clientId} for ticket ${ticketData.ticket_number}. Clients ahead: ${ticketData.clientsAhead}`);
  }
}

// Helper to notify all clients that an entity was created or updated
function notifyEntityUpdate(entityData) {
  if (io) {
    io.emit('entityUpdate', entityData || {});
    console.log('Broadcasted entityUpdate event to all clients');
  }
}

// Helper to notify a specific client that their ticket has been completed
function notifyTicketCompleted(clientId, ticketData) {
  if (io) {
    const payload = { ...(ticketData || {}), clientId };
    if (clientId) {
      io.to(`client:${String(clientId)}`).emit('ticketCompleted', payload);
    }
    if (ticketData && ticketData.entityId) {
      io.to(`entity:${String(ticketData.entityId)}`).emit('ticketCompleted', payload);
    }
    // Also broadcast globally so mobile app gets it reliably
    io.emit('ticketCompleted', payload);
    console.log(`Sent ticketCompleted to client ${clientId}`);
  }
}

module.exports = {
  init,
  getIO,
  notifyQueueUpdate,
  notifyTicketCall,
  notifyTicketApproaching,
  notifyEntityUpdate,
  notifyTicketCompleted,
};
