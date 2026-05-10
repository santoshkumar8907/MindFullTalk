const express = require('express');
const router = express.Router();
const { generatePlan, getUserPlans, getPlanById, deletePlan } = require('../controllers/planController');
const { protect } = require('../middleware/auth');

router.post('/', protect, generatePlan);
router.get('/', protect, getUserPlans);
router.get('/:id', protect, getPlanById);
router.delete('/:id', protect, deletePlan);

module.exports = router;
