/**
 * BidArena — models/index.js
 * Central export for all Mongoose models.
 * Import from here to avoid circular dependency issues.
 */

const User    = require('./User');
const Auction = require('./Auction');
const Bid     = require('./Bid');
const { Timeline, TIMELINE_EVENTS } = require('./Timeline');

module.exports = {
    User,
    Auction,
    Bid,
    Timeline,
    TIMELINE_EVENTS
};
