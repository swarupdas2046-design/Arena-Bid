const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, getUserBids } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/bids', protect, getUserBids);

module.exports = router;
