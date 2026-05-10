const express = require('express');
const router = express.Router();
const { 
  sendMessage, 
  getHistory, 
  getActiveSession, 
  getSession, 
  deleteSession, 
  deleteMessage 
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.post('/message', protect, sendMessage);
router.get('/history', protect, getHistory);
router.get('/active', protect, getActiveSession);
router.get('/session/:id', protect, getSession);
router.delete('/session/:id', protect, deleteSession);
router.delete('/message/:sessionId/:messageId', protect, deleteMessage);

module.exports = router;
