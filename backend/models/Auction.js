/**
 * BidArena — Auction Model
 *
 * The central document. Designed for:
 *  - Atomic bid updates (findOneAndUpdate with $inc and $set)
 *  - Server-restart recovery (S-15): all state needed to restore timers is here
 *  - Auction Heat computation from live metrics
 *  - Payment state transitions (Pending -> Success/Failed)
 */

const mongoose = require('mongoose');

// ─── Payment Sub-Schema ────────────────────────────────────────────────────────
// Embedded inside the Auction document to keep winner & payment atomic.
const paymentSchema = new mongoose.Schema(
    {
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        finalBid: {
            type: Number,
            required: true
        },
        /**
         * Payment status follows the SRS transition:
         *   pending -> successful | failed
         */
        status: {
            type: String,
            enum: ['pending', 'successful', 'failed'],
            default: 'pending'
        },
        /**
         * Gateway reference ID from Stripe/Razorpay.
         * Stored so we can verify payment server-side (FR20).
         */
        gatewayOrderId:   { type: String, default: null },
        gatewayPaymentId: { type: String, default: null },
        gateway:          { type: String, enum: ['stripe', 'razorpay', 'mock'], default: 'stripe' },
        paidAt:           { type: Date, default: null }
    },
    { _id: false }  // No separate _id; it's embedded in Auction
);

// ─── Heat Metrics Sub-Schema ───────────────────────────────────────────────────
// Stored on the Auction so the Engine can update it atomically (FR16).
const heatSchema = new mongoose.Schema(
    {
        score:             { type: Number, default: 0 },    // Overall computed heat (0-100)
        activeBidderCount: { type: Number, default: 0 },    // Unique users who bid
        spectatorCount:    { type: Number, default: 0 },    // Real-time socket count
        bidFrequency:      { type: Number, default: 0 },    // Bids in last 60 seconds
        chatIntensity:     { type: Number, default: 0 },    // Chat messages in last 60s
        lastUpdated:       { type: Date,   default: Date.now }
    },
    { _id: false }
);

// ─── Main Auction Schema ───────────────────────────────────────────────────────
const auctionSchema = new mongoose.Schema(
    {
        // ── Basic Listing Info ─────────────────────────────────────────────────
        title: {
            type: String,
            required: [true, 'Auction title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [120, 'Title cannot exceed 120 characters']
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            maxlength: [2000, 'Description cannot exceed 2000 characters']
        },
        imageUrl: {
            type: String,
            required: [true, 'Product image is required']
        },
        category: {
            type: String,
            default: 'General'
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        // ── Bidding Configuration ──────────────────────────────────────────────
        startBid: {
            type: Number,
            required: [true, 'Starting bid is required'],
            min: [1, 'Starting bid must be at least 1']
        },
        /**
         * minIncrement: The minimum amount a new bid must exceed the current
         * highest bid by. Default = 1. This is the authoritative value used
         * during bid validation on the server (FR10).
         */
        minIncrement: {
            type: Number,
            default: 1,
            min: [1, 'Minimum increment must be at least 1']
        },

        // ── Timing ────────────────────────────────────────────────────────────
        /**
         * durationSeconds: Original duration set by the seller (in seconds).
         * Preserved even if endTime is extended (anti-sniping SG1).
         */
        durationSeconds: {
            type: Number,
            required: [true, 'Duration is required'],
            min: [60, 'Auction must run for at least 60 seconds']
        },
        /**
         * startTime: When the auction officially opened for bidding.
         * Set by the Engine when the auction goes live (not at creation time).
         * CRITICAL for S-15 (server restart timer recovery).
         */
        startTime: {
            type: Date,
            default: null
        },
        /**
         * endTime: The authoritative server-side deadline.
         * The backend timer checks against this. Clients display
         * a countdown based on this value — they do NOT run their own timer.
         */
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
            index: true
        },

        // ── Live State (Atomic Updates) ───────────────────────────────────────
        /**
         * status lifecycle:
         *   upcoming  → active → completed → paid
         *
         * 'upcoming' is for scheduled auctions (SG8).
         * Transitions are managed only by the Engine; clients cannot change this.
         */
        status: {
            type: String,
            enum: ['upcoming', 'active', 'completed', 'paid'],
            default: 'upcoming',
            index: true
        },
        /**
         * Visibility controls (SG10): Automatically hide from main dashboard
         * after a specified number of hours post-completion.
         */
        hideAfterHours: {
            type: Number,
            default: null
        },
        isHidden: {
            type: Boolean,
            default: false,
            index: true
        },
        /**
         * currentHighestBid: Updated atomically via $max or $set.
         * Initialized to startBid so the first valid bid must exceed it.
         */
        currentHighestBid: {
            type: Number,
            default: function () { return this.startBid; }
        },
        highestBidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        /**
         * totalBids: Incremented atomically ($inc) on each accepted bid.
         * Used as the bid sequence counter source for FR12 (deterministic ordering).
         * i.e., the Nth accepted bid gets bidSequence = N.
         */
        totalBids: {
            type: Number,
            default: 0
        },

        // ── Auction Heat ──────────────────────────────────────────────────────
        heat: {
            type: heatSchema,
            default: () => ({})
        },

        // ── Payment ───────────────────────────────────────────────────────────
        payment: {
            type: paymentSchema,
            default: null
        }
    },
    {
        timestamps: true, // createdAt, updatedAt
        // Prevent adding arbitrary fields on the document
        strict: true
    }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
/**
 * timeRemaining: Computed in milliseconds.
 * Useful in API responses to give clients an accurate snapshot without a round-trip.
 */
auctionSchema.virtual('timeRemaining').get(function () {
    if (!this.endTime || this.status !== 'active') return 0;
    return Math.max(0, new Date(this.endTime).getTime() - Date.now());
});

/**
 * isExpired: True if the server time has passed the endTime.
 * The Engine checks this before accepting any bid (FR10, S-9).
 */
auctionSchema.virtual('isExpired').get(function () {
    return this.endTime && Date.now() >= new Date(this.endTime).getTime();
});

// Include virtuals when converting to JSON (for API responses)
auctionSchema.set('toJSON', { virtuals: true });
auctionSchema.set('toObject', { virtuals: true });

// ─── Indexes ───────────────────────────────────────────────────────────────────
auctionSchema.index({ status: 1, endTime: 1 });   // Query active/expired auctions efficiently
auctionSchema.index({ seller: 1, createdAt: -1 }); // Seller's auctions list

module.exports = mongoose.model('Auction', auctionSchema);
