const mongoose = require('mongoose');

const wellnessPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issue: {
    type: String,
    required: true
  },
  planData: {
    title: String,
    dailyTasks: [String],
    recommendations: [String],
    mindsetShift: String
  }
}, { timestamps: true });

module.exports = mongoose.model('WellnessPlan', wellnessPlanSchema);
