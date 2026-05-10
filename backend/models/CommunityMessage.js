const mongoose = require('mongoose');

const communityMessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text:     { type: String, required: true },
  color:    { type: String, default: '#6366f1' }, // avatar color
}, { timestamps: true });

module.exports = mongoose.model('CommunityMessage', communityMessageSchema);
