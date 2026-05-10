const express = require('express');
const router = express.Router();
const { getEmotionData } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/emotions', protect, getEmotionData);

module.exports = router;
