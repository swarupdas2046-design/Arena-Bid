/**
 * BidArena — Timeline Model
 *
 * A chronological, append-only log of every significant event in an auction's
 * lifecycle. Designed for:
 *  - Auction Replay (SG2)
 *  - Audit trails (for defense Q&A)
 *  - Populating the "Live Timeline" UI panel (FR13)
 */

const mongoose = require('mongoose');

/**
 * TIMELINE_EVENTS: All possible event types.
 * Keeping them in a constant avoids magic strings scattered across the codebase.
 */
const TIMELINE_EVENTS = {
    AUCTION_CREATED:   'AUCTION_CREATED',
    AUCTION_STARTED:   'AUCTION_STARTED',
    BID_PLACED:        'BID_PLACED',
    BID_REJECTED:      'BID_REJECTED',
    TIMER_EXTENDED:    'TIMER_EXTENDED',      // Anti-sniping (SG1)
    AUCTION_ENDED:     'AUCTION_ENDED',
    WINNER_DECLARED:   'WINNER_DECLARED',
    PAYMENT_INITIATED: 'PAYMENT_INITIATED',
    PAYMENT_SUCCESS:   'PAYMENT_SUCCESS',
    PAYMENT_FAILED:    'PAYMENT_FAILED',
    USER_JOINED:       'USER_JOINED',
    USER_LEFT:         'USER_LEFT',
};

const timelineSchema = new mongoose.Schema(
    {
        auction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Auction',
            required: true,
            index: true
        },
        /**
         * actor: the user who triggered this event.
         * null for system-generated events like AUCTION_ENDED.
         */
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        event: {
            type: String,
            enum: Object.values(TIMELINE_EVENTS),
            required: true
        },
        /**
         * metadata: flexible Mixed field for any event-specific data.
         * Examples:
         *   BID_PLACED:      { amount: 1500, bidSequence: 5 }
         *   WINNER_DECLARED: { winnerId: '...', finalBid: 1500 }
         *   PAYMENT_SUCCESS: { transactionId: 'pi_xxx', gateway: 'stripe' }
         *   BID_REJECTED:    { reason: 'Amount too low', submittedAmount: 100 }
         */
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        /**
         * occurredAt: The authoritative server time for this event.
         * This is set at write-time and never changed.
         */
        occurredAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    },
    {
        // No automatic timestamps — we manage `occurredAt` manually for precision
        timestamps: false,
        // Tell Mongoose not to add __v version key to save space on high-volume logs
        versionKey: false
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// Primary query: "Give me all events for auction X in chronological order"
timelineSchema.index({ auction: 1, occurredAt: 1 });

// Export both the model and the events constants for use across the codebase
module.exports = {
    Timeline: mongoose.model('Timeline', timelineSchema),
    TIMELINE_EVENTS
};
