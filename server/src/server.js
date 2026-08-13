const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const entityRoutes = require('./routes/entity');
const agentRoutes = require('./routes/agent');
const clientRoutes = require('./routes/client');
const socketModule = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
socketModule.init(server);

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for local testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/entity', entityRoutes);
app.use('/agent', agentRoutes);
app.use('/client', clientRoutes);

// Simple Health Check
app.get('/', (req, res) => {
  res.json({ message: 'QueuePay Central Server API is active.' });
});

// Start Server listening on 0.0.0.0 so mobile devices on Wi-Fi can connect
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; 

server.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`QueuePay Backend Server is running successfully.`);
  console.log(`API URL: http://0.0.0.0:${PORT}`);
  console.log(`WebSockets listening on all network interfaces.`);
  console.log(`==================================================`);
});
