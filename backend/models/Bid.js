/**
 * BidArena — Bid Model
 *
 * Stored as a SEPARATE collection (not embedded in Auction) to enable:
 *  - Atomic `findOneAndUpdate` with `$push` without document size limitations
 *  - Independent querying of bid history per user or per auction
 *  - Deterministic sequential numbering (bidSequence) for race-condition auditing
 */

const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
    {
        auction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Auction',
            required: true,
            index: true
        },
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: [true, 'Bid amount is required'],
            min:   [0, 'Bid amount cannot be negative']
        },
        /**
         * bidSequence: A monotonically-increasing integer per auction.
         * Set atomically by the AuctionEngine using MongoDB's $inc counter.
         * This is the key field for DETERMINISTIC ORDERING of concurrent bids (FR12 / S-2).
         */
        bidSequence: {
            type: Number,
            required: true
        },
        /**
         * receivedAt: UTC timestamp the server received the bid event.
         * Client timestamps are ignored. This is set inside the socket handler
         * before any async DB work, serving as the official bid arrival time.
         */
        receivedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        /**
         * status helps distinguish between:
         *  - 'accepted': Valid bid; became the new highest bid at this moment.
         *  - 'rejected': Failed validation (e.g. amount too low, room closed).
         *  Only accepted bids are persisted in this collection; rejection
         *  feedback is sent back to the socket client only.
         */
        status: {
            type: String,
            enum: ['accepted'],
            default: 'accepted'
        }
    },
    {
        timestamps: false // We manage timing explicitly via `receivedAt`
    }
);

// ─── Compound Index ────────────────────────────────────────────────────────────
// Fast lookup for "all bids on this auction in order" — used for history replay
bidSchema.index({ auction: 1, bidSequence: 1 });
// Fast lookup for "all bids by this user" — used for User Profile page
bidSchema.index({ bidder: 1, receivedAt: -1 });

module.exports = mongoose.model('Bid', bidSchema);
