const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'voice'], default: 'text' },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  messages: [messageSchema],
  title: { type: String, default: '' }, // e.g. "May 5, 2026 – 1:22 AM"
  dailyEmotionScore: { type: Number, default: 0 },
  dominantEmotion: { type: String, default: 'Neutral' },
  summary: { type: String, default: '' }
}, { timestamps: true });



module.exports = mongoose.model('Conversation', conversationSchema);
