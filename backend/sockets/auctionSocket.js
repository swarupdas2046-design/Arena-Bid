/**
 * BidArena — Auction Socket Engine (Domain B)
 *
 * Handles: room joining, deterministic bid processing, live chat, reconnection sync.
 * Uses the new separate Bid + Timeline collections from the updated schemas.
 */

const { Server } = require('socket.io');
const Auction = require('../models/Auction');
const Bid     = require('../models/Bid');
const { Timeline, TIMELINE_EVENTS } = require('../models/Timeline');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const socketHandler = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // ── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = await User.findById(decoded.id).select('-password');
            }
        } catch (error) {
            console.error('[Socket] Auth error:', error.message);
        }
        next(); // allow connection even without token (spectators), but restrict actions later
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ── JOIN ROOM ──────────────────────────────────────────────────────────
        // FR7: Sync new joiners with authoritative server state before allowing bids.
        // S1: Instantly sync current highest bid, timer, and stats on join.
        socket.on('join_room', async ({ auctionId, userId }) => {
            try {
                socket.join(auctionId);
                console.log(`[Socket] ${userId || 'spectator'} joined room: ${auctionId}`);

                // Fetch the latest auction state from DB (reconnection recovery - S5/S6/S15)
                const auction = await Auction.findById(auctionId)
                    .populate('seller', 'name')
                    .populate('highestBidder', 'name')
                    .lean({ virtuals: true });

                if (!auction) {
                    socket.emit('room_error', { message: 'Auction not found.' });
                    return;
                }

                // Fetch last 20 bids for this room
                const bids = await Bid.find({ auction: auctionId })
                    .populate('bidder', 'name')
                    .sort({ bidSequence: -1 })
                    .limit(20)
                    .lean();

                // Fetch timeline events
                const timeline = await Timeline.find({ auction: auctionId })
                    .populate('actor', 'name')
                    .sort({ occurredAt: 1 })
                    .lean();

                // Update spectator count
                const spectatorCount = io.sockets.adapter.rooms.get(auctionId)?.size || 0;
                await Auction.findByIdAndUpdate(auctionId, {
                    'heat.spectatorCount': spectatorCount
                });

                // Send full authoritative state to this socket only
                socket.emit('initial_state', { ...auction, bids, timeline });

                // Fetch chat history from DB
                const chatHistory = await ChatMessage.find({ auctionId })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean();
                
                if (chatHistory.length > 0) {
                    socket.emit('chat_history', chatHistory.reverse());
                }

                // Notify others in the room of the new joiner
                socket.to(auctionId).emit('user_joined', { userId, spectatorCount });
                io.to(auctionId).emit('spectator_update', spectatorCount);

            } catch (err) {
                console.error('[Socket] join_room error:', err.message);
                socket.emit('room_error', { message: 'Failed to join room.' });
            }
        });

        // ── PLACE BID ──────────────────────────────────────────────────────────
        // FR9-12: Deterministic, validated, atomic bid processing.
        socket.on('place_bid', async ({ auctionId, userId, amount }) => {
            if (!socket.user || socket.user._id.toString() !== userId) {
                return socket.emit('bid_error', { message: 'Unauthorized: Please log in to place a bid.' });
            }
            
            const receivedAt = new Date(); // Server-side arrival time — not client time

            try {
                // ── Validation ─────────────────────────────────────────────────
                // Atomic findOneAndUpdate:
                //   1. Check status === 'active' (FR10 - no bids on closed rooms)
                //   2. Check endTime > now (FR18 - server-side timer authority, S9)
                //   3. Check amount > currentHighestBid + minIncrement (FR10)
                //   4. Atomically increment totalBids to get the bid sequence number (FR12)
                const updated = await Auction.findOneAndUpdate(
                    {
                        _id:               auctionId,
                        status:            'active',
                        endTime:           { $gt: receivedAt },         // S-9: reject late bids
                        $expr: {
                            $gt: [
                                amount,
                                { $add: ['$currentHighestBid', '$minIncrement'] }
                            ]
                        }
                    },
                    {
                        $set: {
                            currentHighestBid: amount,
                            highestBidder:     userId
                        },
                        $inc: { totalBids: 1 }   // Atomic sequence counter for FR12
                    },
                    { new: true }  // return the updated doc
                ).populate('highestBidder', 'name');

                if (!updated) {
                    // Determine why validation failed for a clear error message
                    const auction = await Auction.findById(auctionId);
                    let errorMsg = 'Invalid bid.';
                    
                    if (!auction) errorMsg = 'Auction not found.';
                    else if (auction.status !== 'active') errorMsg = 'Auction is not active.';
                    else if (new Date() >= new Date(auction.endTime)) errorMsg = 'Auction has already ended. No more bids accepted.';
                    else errorMsg = `Bid must be at least ₹${auction.currentHighestBid + auction.minIncrement}`;
                    
                    // Log BID_REJECTED
                    await Timeline.create({
                        auction: auctionId,
                        actor: userId,
                        event: TIMELINE_EVENTS.BID_REJECTED,
                        occurredAt: new Date(),
                        metadata: { amount, reason: errorMsg }
                    });
                    
                    return socket.emit('bid_error', { message: errorMsg });
                }

                // ── Anti-Sniping Logic (FR-15 / SG-1) ──────────────────────────
                // If the bid is placed within the last 60 seconds, extend the timer by 60s
                let timerExtended = false;
                let newEndTime = updated.endTime;
                
                const timeRemainingMs = new Date(updated.endTime).getTime() - Date.now();
                if (timeRemainingMs < 60000 && timeRemainingMs > 0) {
                    newEndTime = new Date(Date.now() + 60000);
                    await Auction.findByIdAndUpdate(auctionId, { endTime: newEndTime });
                    timerExtended = true;
                    
                    await Timeline.create({
                        auction: auctionId,
                        actor: userId,
                        event: TIMELINE_EVENTS.TIMER_EXTENDED,
                        occurredAt: new Date(),
                        metadata: { newEndTime, extendedBySeconds: 60 }
                    });
                }

                // ── Persist Bid Record ─────────────────────────────────────────
                // updated.totalBids is the new sequence number (atomic, no duplicates)
                const bid = await Bid.create({
                    auction:     auctionId,
                    bidder:      userId,
                    amount,
                    bidSequence: updated.totalBids,
                    receivedAt
                });

                // Populate bidder name for broadcast
                await bid.populate('bidder', 'name');

                // ── Log Timeline Event ─────────────────────────────────────────
                await Timeline.create({
                    auction:    auctionId,
                    actor:      userId,
                    event:      TIMELINE_EVENTS.BID_PLACED,
                    occurredAt: receivedAt,
                    metadata:   { amount, bidSequence: updated.totalBids }
                });

                // ── Increment User Stats ───────────────────────────────────────
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'stats.totalBidsPlaced': 1 }
                });

                // ── Broadcast to all clients in the room ───────────────────────
                io.to(auctionId).emit('bid_update', {
                    currentHighestBid: updated.currentHighestBid,
                    highestBidder:     updated.highestBidder,
                    totalBids:         updated.totalBids,
                    timerExtended,
                    newEndTime,
                    newBid: {
                        _id:         bid._id,
                        bidder:      bid.bidder,
                        amount:      bid.amount,
                        bidSequence: bid.bidSequence,
                        receivedAt:  bid.receivedAt
                    }
                });

            } catch (err) {
                console.error('[Socket] place_bid error:', err.message);
                socket.emit('bid_error', { message: 'Server error processing bid. Please try again.' });
            }
        });

        // ── LIVE CHAT ──────────────────────────────────────────────────────────
        // FR17: Chat must be decoupled and never block the bid engine.
        // We now persist chat history in DB.
        socket.on('send_message', async ({ auctionId, userName, message }) => {
            if (!auctionId || !message?.trim()) return;
            
            try {
                const chatMsg = await ChatMessage.create({
                    auctionId,
                    userName,
                    message: message.trim()
                });

                io.to(auctionId).emit('receive_message', chatMsg);
            } catch (err) {
                console.error('[Socket] send_message error:', err.message);
            }
        });

        // ── FORCE CLOSE CHECK ──────────────────────────────────────────────────
        // Clients call this when local timer hits 0 to ensure immediate real-time closure
        socket.on('force_close_check', async (auctionId) => {
            try {
                const auction = await Auction.findById(auctionId).populate('highestBidder', 'name email');
                if (auction && auction.status === 'active' && new Date() >= new Date(auction.endTime)) {
                    auction.status = 'completed';
                    await auction.save();
                    
                    // Log AUCTION_ENDED
                    await Timeline.create({
                        auction: auction._id,
                        event: TIMELINE_EVENTS.AUCTION_ENDED,
                        occurredAt: new Date(),
                        metadata: { finalBid: auction.currentHighestBid }
                    });

                    io.to(auctionId).emit('auction_ended', {
                        auctionId: auction._id,
                        status: 'completed',
                        winner: auction.highestBidder,
                        finalBid: auction.currentHighestBid
                    });
                }
            } catch (err) {
                console.error('[Socket] force_close_check error:', err);
            }
        });

        // ── DISCONNECT ─────────────────────────────────────────────────────────
        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    // socket is leaving this room
                    const spectatorCount = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
                    Auction.findByIdAndUpdate(room, {
                        'heat.spectatorCount': Math.max(0, spectatorCount)
                    }).catch(err => console.error(err));
                    
                    socket.to(room).emit('user_left', { userId: socket.user?._id?.toString(), spectatorCount: Math.max(0, spectatorCount) });
                    socket.to(room).emit('spectator_update', Math.max(0, spectatorCount));
                }
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = socketHandler;
