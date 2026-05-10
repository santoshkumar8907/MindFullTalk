const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');

// AI-based emotion detection will be handled inside sendMessage using Gemini
const fallbackEmotion = { score: 5, emotion: 'Neutral' };

exports.sendMessage = async (req, res) => {
  try {
    const { content, type = 'text', language = 'en-US', sessionId } = req.body;
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    let conversation = null;

    // Only query if sessionId is a valid MongoDB ObjectId
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      try {
        conversation = await Conversation.findOne({ _id: sessionId, userId });
      } catch (e) {
        console.warn('Invalid sessionId lookup:', e.message);
        conversation = null;
      }
    }

    // No valid session found → create a fresh one
    if (!conversation) {
      const now = new Date();
      const sessionTitle = now.toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      conversation = new Conversation({ userId, date: today, title: sessionTitle, messages: [] });
    }

    // Push user message
    conversation.messages.push({ role: 'user', content, type });

    // Build conversation history for Gemini context
    const historyText = conversation.messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    let aiResponseText;
    let emotionScore = 5;
    let dominantEmotion = "Neutral";

    // Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10;

    if (!hasValidKey) {
      aiResponseText = "Thank you for sharing that with me. I'm here to listen and support you. Could you tell me more about how you're feeling?";
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey });
        // Request structured response from Gemini
        const prompt = `You are MindfulTalk, an empathetic AI mental wellness companion. 
The user's current preferred response language is: ${language}.
The user said: "${content}"
Conversation history:
${historyText}

CRITICAL CRISIS INSTRUCTION: If the user expresses severe distress, hopelessness, or suicidal thoughts, you MUST immediately express deep empathy and provide these specific Indian Emergency Helplines in your response: 
- Toll-Free Mental Health Rehabilitation Helpline (Kiran): 1800-599-0019
- iCALL: 9152987821
- National Emergency: 112

Please respond in ${language} and provide a wellness assessment.
Return ONLY a valid JSON object in this format:
{
  "reply": "Your empathetic response here",
  "score": 1-10 (1=very stressed, 10=very peaceful),
  "emotion": "EmotionName"
}`;

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        const responseText = result.text;

        // Robust JSON extraction
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
        const parsed = JSON.parse(cleanJson);

        aiResponseText = parsed.reply;
        emotionScore = parsed.score;
        dominantEmotion = parsed.emotion;
      } catch (err) {
        console.error('Gemini API Error:', err.message);
        aiResponseText = "I'm here with you and I'm listening. Could you share more about what's on your mind?";
        emotionScore = 5;
        dominantEmotion = "Neutral";
      }
    }

    // Push AI response
    conversation.messages.push({ role: 'model', content: aiResponseText, type });
    conversation.dailyEmotionScore = emotionScore;
    conversation.dominantEmotion = dominantEmotion;

    await conversation.save();

    // --- UPDATED: Gamification (Streak + Points) ---
    const user = await User.findById(userId);
    if (user) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const lastLogin = user.gamification.lastLoginDate;
      const lastLoginStr = lastLogin ? lastLogin.toISOString().split('T')[0] : null;

      let updateNeeded = false;

      // Award points for every message
      user.gamification.points += 10;
      updateNeeded = true;

      if (!lastLoginStr) {
        user.gamification.streak = 1;
        user.gamification.lastLoginDate = now;
      } else if (todayStr !== lastLoginStr) {
        const lastDate = new Date(lastLoginStr);
        const todayDate = new Date(todayStr);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          user.gamification.streak += 1;
          user.gamification.points += 50; // Bonus for streak
        } else {
          user.gamification.streak = 1;
        }
        user.gamification.lastLoginDate = now;
      } else if (user.gamification.streak === 0) {
        user.gamification.streak = 1;
      }

      if (updateNeeded) await user.save();
    }

    res.json({
      sessionId: conversation._id,
      reply: aiResponseText,
      emotionScore,
      dominantEmotion,
      messages: conversation.messages
    });

  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns a specific session by ID — used when frontend stores sessionId in sessionStorage
exports.getSession = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// No longer used (replaced by sessionStorage on frontend) but kept for backward compatibility
exports.getActiveSession = async (req, res) => {
  try {
    const activeSession = await Conversation.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(activeSession || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await Conversation.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.messages = session.messages.filter(msg => msg._id.toString() !== messageId);

    if (session.messages.length === 0) {
      await Conversation.findByIdAndDelete(sessionId);
      return res.json({ deletedSession: true });
    }

    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
