const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Attach Socket.IO to the http server
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.json());
app.use(cors());

// Routes
const authRoutes      = require('./routes/auth');
const chatRoutes      = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const planRoutes      = require('./routes/planRoutes');

app.use('/api/auth',      authRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/plans',     planRoutes);

// Health check
app.get('/', (req, res) => res.send('MindfulTalk API is running'));
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// ─── Socket.IO — Community Room ──────────────────────────────────
const CommunityMessage = require('./models/CommunityMessage');

// Palette of avatar colors assigned round-robin
const COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6'
];
let colorIndex = 0;

// Track online users: Map<socketId, { username, color }>
const onlineUsers = new Map();

io.on('connection', (socket) => {

  // ── Join ──────────────────────────────────────────────────────
  socket.on('community:join', async ({ username }) => {
    const color = COLORS[colorIndex++ % COLORS.length];
    onlineUsers.set(socket.id, { username, color });

    // Send message history (last 100)
    try {
      const history = await CommunityMessage.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      socket.emit('community:history', history.reverse());
    } catch (e) {
      console.error('History fetch error:', e.message);
      socket.emit('community:history', []);
    }

    // Broadcast join system message
    io.emit('community:system', {
      text: `${username} joined the room 🌿`,
      timestamp: new Date()
    });

    // Broadcast updated stats
    io.emit('community:stats', {
      online: onlineUsers.size,
    });
  });

  // ── New Message ───────────────────────────────────────────────
  socket.on('community:message', async ({ text }) => {
    const user = onlineUsers.get(socket.id);
    if (!user || !text?.trim()) return;

    try {
      const msg = await CommunityMessage.create({
        username: user.username,
        text:     text.trim(),
        color:    user.color,
      });

      io.emit('community:message', {
        _id:      msg._id,
        username: msg.username,
        text:     msg.text,
        color:    msg.color,
        createdAt: msg.createdAt,
      });
    } catch (e) {
      console.error('Message save error:', e.message);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit('community:system', {
        text: `${user.username} left the room`,
        timestamp: new Date()
      });
      io.emit('community:stats', { online: onlineUsers.size });
    }
  });
});

// ─── DB + Server start ────────────────────────────────────────────
const PORT     = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mindfultalk';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log('MongoDB connection error:', err));
