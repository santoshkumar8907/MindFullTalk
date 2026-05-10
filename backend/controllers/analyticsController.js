const Conversation = require('../models/Conversation');

const EMOTION_SCORE = {
  Joy: 9, Calm: 7, Neutral: 5, Anxiety: 3, Sadness: 2
};

exports.getEmotionData = async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // All sessions in last 30 days, sorted date ascending
    const conversations = await Conversation.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ date: 1, createdAt: 1 });

    // --- 1. Day-wise aggregation ---
    const dayMap = {};
    conversations.forEach(c => {
      const d = c.date; // YYYY-MM-DD
      if (!dayMap[d]) {
        dayMap[d] = { date: d, sessions: [], scores: [], emotions: {} };
      }
      dayMap[d].sessions.push({ title: c.title, score: c.dailyEmotionScore, emotion: c.dominantEmotion });
      dayMap[d].scores.push(c.dailyEmotionScore);

      const emo = c.dominantEmotion || 'Neutral';
      dayMap[d].emotions[emo] = (dayMap[d].emotions[emo] || 0) + 1;
    });

    const dailyData = Object.values(dayMap).map(day => {
      const avgScore = Math.round(day.scores.reduce((s, v) => s + v, 0) / day.scores.length * 10) / 10;
      // Most frequent emotion of that day
      const dominant = Object.entries(day.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';

      return {
        date: day.date,
        avgScore,
        sessionCount: day.sessions.length,
        dominant,
        emotions: day.emotions,   // { Joy: 2, Calm: 1 }
        sessions: day.sessions    // individual session data
      };
    });

    // --- 2. Overall emotion distribution ---
    const totals = {};
    conversations.forEach(c => {
      const e = c.dominantEmotion || 'Neutral';
      totals[e] = (totals[e] || 0) + 1;
    });
    const emotionDistribution = Object.entries(totals).map(([emotion, count]) => ({ emotion, count }));

    // --- 3. Summary stats ---
    const totalSessions = conversations.length;
    const bestScore = conversations.length ? Math.max(...conversations.map(c => c.dailyEmotionScore)) : 0;
    const mostCommon = emotionDistribution.sort((a, b) => b.count - a.count)[0]?.emotion || 'N/A';

    res.json({
      dailyData,
      sessionWiseData: conversations.map(c => ({
        date: c.createdAt,
        score: c.dailyEmotionScore,
        emotion: c.dominantEmotion,
        title: c.title
      })),
      emotionDistribution,
      summary: {
        totalSessions,
        bestScore,
        mostCommon,
        activeDays: dailyData.length
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
