/**
 * BidArena — Auction Scheduler
 *
 * Runs a background interval to find and close expired auctions.
 * This is the authoritative timer system (FR18, FR19, S8, S15).
 *
 * On server restart, this will immediately close any auctions that
 * expired during downtime — satisfying S-15 (server restart recovery).
 */

const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const ChatMessage = require('../models/ChatMessage');
const { Timeline, TIMELINE_EVENTS } = require('../models/Timeline');

let io = null; // Socket.io reference set at startup

const POLL_INTERVAL_MS = 5000; // Check every 5 seconds

const closeExpiredAuctions = async () => {
    try {
        // Find all auctions that have passed their endTime but are still 'active'
        const expiredAuctions = await Auction.find({
            status:  'active',
            endTime: { $lte: new Date() }
        }).populate('highestBidder', 'name');

        for (const auction of expiredAuctions) {
            // Atomically set status to 'completed' — prevents double-close on concurrent calls
            const closed = await Auction.findOneAndUpdate(
                { _id: auction._id, status: 'active' }, // guard: only close if still active
                {
                    $set: {
                        status:  'completed',
                        payment: auction.highestBidder ? {
                            winner:   auction.highestBidder._id,
                            finalBid: auction.currentHighestBid,
                            status:   'pending',
                            gateway:  'stripe'
                        } : null
                    }
                },
                { new: true }
            ).populate('highestBidder', 'name');

            if (!closed) continue; // Already closed by another process

            console.log(`[Scheduler] Closed auction: "${closed.title}" | Winner: ${closed.highestBidder?.name || 'No winner'}`);

            // Log AUCTION_ENDED to Timeline
            await Timeline.create({
                auction:    closed._id,
                actor:      null, // System event
                event:      TIMELINE_EVENTS.AUCTION_ENDED,
                occurredAt: closed.endTime,
                metadata:   { finalBid: closed.currentHighestBid }
            });

            // Log WINNER_DECLARED if there was a bidder
            if (closed.highestBidder) {
                await Timeline.create({
                    auction:    closed._id,
                    actor:      closed.highestBidder._id,
                    event:      TIMELINE_EVENTS.WINNER_DECLARED,
                    occurredAt: new Date(),
                    metadata: {
                        winnerId:  closed.highestBidder._id,
                        winnerName:closed.highestBidder.name,
                        finalBid:  closed.currentHighestBid
                    }
                });

                // Increment winner's auctionsWon stat
                await require('../models/User').findByIdAndUpdate(
                    closed.highestBidder._id,
                    { $inc: { 'stats.auctionsWon': 1 } }
                );
            }

            // Broadcast auction_ended to all clients in this room
            if (io) {
                io.to(closed._id.toString()).emit('auction_ended', {
                    auctionId: closed._id,
                    status:    'completed',
                    winner:    closed.highestBidder,
                    finalBid:  closed.currentHighestBid
                });
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error closing expired auctions:', err.message);
    }
};

const startUpcomingAuctions = async () => {
    try {
        const upcomingAuctions = await Auction.find({
            status: 'upcoming',
            startTime: { $lte: new Date() }
        });

        for (const auction of upcomingAuctions) {
            const started = await Auction.findOneAndUpdate(
                { _id: auction._id, status: 'upcoming' },
                { $set: { status: 'active' } },
                { new: true }
            );

            if (!started) continue;

            console.log(`[Scheduler] Started upcoming auction: "${started.title}"`);

            await Timeline.create({
                auction: started._id,
                actor: null,
                event: TIMELINE_EVENTS.AUCTION_STARTED,
                occurredAt: new Date(),
                metadata: { title: started.title }
            });

            if (io) {
                io.to(started._id.toString()).emit('auction_started', {
                    auctionId: started._id,
                    status: 'active'
                });
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error starting upcoming auctions:', err.message);
    }
};

const calculateHeatScores = async () => {
    try {
        const activeAuctions = await Auction.find({ status: 'active' });
        const oneMinuteAgo = new Date(Date.now() - 60000);

        for (const auction of activeAuctions) {
            // Count bids in last 60s
            const bidFrequency = await Bid.countDocuments({
                auction: auction._id,
                receivedAt: { $gte: oneMinuteAgo }
            });

            // Count unique bidders
            const uniqueBidders = await Bid.distinct('bidder', { auction: auction._id });
            const activeBidderCount = uniqueBidders.length;

            // Count chat messages in last 60s
            const chatIntensity = await ChatMessage.countDocuments({
                auctionId: auction._id,
                createdAt: { $gte: oneMinuteAgo }
            });

            const spectatorCount = auction.heat?.spectatorCount || 0;

            // Calculate score (0-100 heuristic)
            // Example weights: bids(x3), bidders(x5), chat(x1), spectators(x0.5)
            let score = (bidFrequency * 3) + (activeBidderCount * 5) + (chatIntensity * 1) + (spectatorCount * 0.5);
            score = Math.min(100, Math.floor(score));

            await Auction.findByIdAndUpdate(auction._id, {
                'heat.score': score,
                'heat.activeBidderCount': activeBidderCount,
                'heat.bidFrequency': bidFrequency,
                'heat.chatIntensity': chatIntensity,
                'heat.lastUpdated': new Date()
            });

            // Optionally emit a 'heat_update' event to the room
            if (io) {
                io.to(auction._id.toString()).emit('heat_update', { score, activeBidderCount });
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error calculating heat scores:', err.message);
    }
};

const hideOldAuctions = async () => {
    try {
        const completedAuctionsToHide = await Auction.find({
            status: { $in: ['completed', 'paid'] },
            isHidden: false,
            hideAfterHours: { $ne: null }
        });
        
        for (const auction of completedAuctionsToHide) {
            const hideTime = new Date(auction.endTime.getTime() + auction.hideAfterHours * 3600000);
            if (Date.now() >= hideTime.getTime()) {
                await Auction.findByIdAndUpdate(auction._id, { isHidden: true });
                console.log(`[Scheduler] Hid auction: "${auction.title}" from dashboard`);
            }
        }
    } catch(err) {
        console.error('[Scheduler] Error hiding old auctions:', err.message);
    }
};

const startScheduler = (socketIo) => {
    io = socketIo;
    console.log(`[Scheduler] Started — checking every ${POLL_INTERVAL_MS / 1000}s`);

    // Run immediately on startup to handle auctions that expired during downtime (S-15)
    closeExpiredAuctions();
    startUpcomingAuctions();
    calculateHeatScores();
    hideOldAuctions();

    // Then poll at regular intervals
    setInterval(() => {
        closeExpiredAuctions();
        startUpcomingAuctions();
        calculateHeatScores();
        hideOldAuctions();
    }, POLL_INTERVAL_MS);
};

module.exports = { startScheduler };
