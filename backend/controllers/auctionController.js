const Auction = require('../models/Auction');
const { Timeline, TIMELINE_EVENTS } = require('../models/Timeline');

// @desc    Create a new auction
// @route   POST /api/auctions
// @access  Private
const createAuction = async (req, res) => {
    try {
        const { title, description, imageUrl, startBid, duration, scheduledStartTime, hideAfterHours } = req.body;

        // `duration` from the frontend is in MINUTES, convert to seconds
        const durationSeconds = Number(duration) * 60;
        
        let startTime = new Date();
        let status = 'active';
        
        if (scheduledStartTime) {
            const scheduledDate = new Date(scheduledStartTime);
            if (scheduledDate > new Date()) {
                startTime = scheduledDate;
                status = 'upcoming';
            } else {
                return res.status(400).json({ message: 'Scheduled start time must be in the future. Please check AM/PM settings.' });
            }
        }

        const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

        const auction = await Auction.create({
            title,
            description,
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800',
            startBid:          Number(startBid),
            currentHighestBid: Number(startBid),
            durationSeconds,
            startTime,
            endTime,
            status,
            hideAfterHours: hideAfterHours ? Number(hideAfterHours) : null,
            seller: req.user._id
        });

        // Log the creation event to the Timeline
        await Timeline.create({
            auction:    auction._id,
            actor:      req.user._id,
            event:      TIMELINE_EVENTS.AUCTION_CREATED,
            occurredAt: startTime,
            metadata:   { title, startBid: Number(startBid), durationSeconds }
        });

        // Increment the seller's auctionsCreated counter
        await require('../models/User').findByIdAndUpdate(
            req.user._id,
            { $inc: { 'stats.auctionsCreated': 1 } }
        );

        res.status(201).json(auction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all auctions (with optional status filter)
// @route   GET /api/auctions?status=active
// @access  Public
const getAuctions = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { isHidden: { $ne: true } };
        if (status && status !== 'all') {
            query.status = status;
        }

        const auctions = await Auction.find(query)
            .populate('seller', 'name')
            .populate('highestBidder', 'name')
            .sort({ createdAt: -1 })
            .lean({ virtuals: true }); // include timeRemaining/isExpired virtuals

        res.json(auctions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single auction with bids and timeline
// @route   GET /api/auctions/:id
// @access  Public
const getAuctionById = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id)
            .populate('seller', 'name')
            .populate('highestBidder', 'name')
            .lean({ virtuals: true });

        if (!auction) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        // Fetch last 50 bids separately (Bid is its own collection now)
        const Bid = require('../models/Bid');
        const bids = await Bid.find({ auction: req.params.id })
            .populate('bidder', 'name')
            .sort({ bidSequence: -1 })
            .limit(50)
            .lean();

        // Fetch timeline events
        const timeline = await Timeline.find({ auction: req.params.id })
            .populate('actor', 'name')
            .sort({ occurredAt: 1 })
            .lean();

        res.json({ ...auction, bids, timeline });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createAuction, getAuctions, getAuctionById };
