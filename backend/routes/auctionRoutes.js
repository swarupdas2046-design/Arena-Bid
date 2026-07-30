const express = require('express');
const router = express.Router();
const { createAuction, getAuctions, getAuctionById } = require('../controllers/auctionController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .get(getAuctions)
    .post(protect, createAuction);

router.route('/:id')
    .get(getAuctionById);

module.exports = router;
