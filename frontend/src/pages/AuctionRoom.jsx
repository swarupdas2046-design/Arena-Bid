import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, Clock, Gavel, Trophy, ArrowLeft, Activity } from 'lucide-react';

import Timer from '../components/Timer';
import NumberTicker from '../components/NumberTicker';

// ─── Main Component ───────────────────────────────────────────────────────────
const AuctionRoom = () => {
    const { id }       = useParams();
    const navigate     = useNavigate();
    const { user }     = useContext(AuthContext);

    const [auction,   setAuction]   = useState(null);
    const [bids,      setBids]      = useState([]);
    const [timeline,  setTimeline]  = useState([]);
    const [chat,      setChat]      = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [message,   setMessage]   = useState('');
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [submitting,setSubmitting]= useState(false);
    const [isBiddingWar, setIsBiddingWar] = useState(false);
    const [bidFlash, setBidFlash] = useState(false);
    const [isCritical, setIsCritical] = useState(false);
    const [spectators, setSpectators] = useState(0);

    const socketRef  = useRef(null);
    const chatEndRef = useRef(null);

    // ── Scroll chat to bottom on new messages ────────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    // ── Socket setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        const socket = io({ 
            transports: ['websocket', 'polling'],
            auth: { token: user?.token }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
            // Emit join after connection is confirmed
            socket.emit('join_room', { auctionId: id, userId: user?._id || null });
        });

        socket.on('connect_error', (err) => {
            setError('Cannot connect to auction server. Make sure the backend is running.');
            setLoading(false);
        });

        // S1/S5/S6/S15: Full state sync on join or reconnect
        socket.on('initial_state', (data) => {
            setAuction(data);
            setBids(data.bids   || []);
            setTimeline(data.timeline || []);
            setLoading(false);
            setError('');
        });

        // FR14: Broadcast valid bid to all clients
        socket.on('bid_update', (data) => {
            setAuction(prev => prev ? ({
                ...prev,
                currentHighestBid: data.currentHighestBid,
                highestBidder:     data.highestBidder,
                totalBids:         data.totalBids,
                endTime:           data.timerExtended ? data.newEndTime : prev.endTime
            }) : prev);

            if (data.timerExtended) {
                toast.success('Sniping detected! Timer extended by 60s.', { icon: '⏱️' });
            }

            // Prepend new bid to the top of the list
            if (data.newBid) {
                setBids(prev => {
                    const newBids = [data.newBid, ...prev];
                    // Check for bidding war (e.g., 3 bids in last 30 seconds)
                    if (newBids.length >= 3) {
                        const latest = new Date(newBids[0].createdAt || Date.now()).getTime();
                        const thirdLatest = new Date(newBids[2].createdAt || Date.now()).getTime();
                        if (latest - thirdLatest < 30000) {
                            setIsBiddingWar(true);
                            setTimeout(() => setIsBiddingWar(false), 20000); // turns off after 20s if no new bids keep it alive
                        }
                    }
                    return newBids;
                });
                
                // Trigger flash animation
                setBidFlash(true);
                setTimeout(() => setBidFlash(false), 500);

                toast.success(`🔨 New highest bid: ₹${data.currentHighestBid}`, { duration: 2000 });
            }
        });

        socket.on('bid_error',   ({ message: msg }) => toast.error(msg));
        socket.on('room_error',  ({ message: msg }) => { setError(msg); setLoading(false); });
        socket.on('auction_ended', (data) => {
            setAuction(prev => prev ? { ...prev, status: 'completed', highestBidder: data.winner ?? prev.highestBidder } : prev);
            toast('🛑 Auction has ended!', { icon: '🏆', duration: 5000 });
        });
        socket.on('receive_message', (msg) => {
            setChat(prev => [...prev, msg]);
        });

        // FR17: Initial Chat History on Rejoin
        socket.on('chat_history', (history) => {
            setChat(history);
        });

        socket.on('spectator_update', (count) => {
            setSpectators(count);
        });

        socket.on('heat_update', (data) => {
            setAuction(prev => prev ? {
                ...prev,
                heat: {
                    ...prev.heat,
                    score: data.score,
                    activeBidderCount: data.activeBidderCount
                }
            } : prev);
        });

        socket.on('timeline_update', (event) => {
            setTimeline(prev => [...prev, event]);
        });

        return () => socket.disconnect();
    }, [id, user, navigate]);

    // ── Bid submission ────────────────────────────────────────────────────────
    const handleBid = useCallback((e) => {
        e.preventDefault();
        const amount = Number(bidAmount);
        const minRequired = (auction?.currentHighestBid ?? 0) + (auction?.minIncrement ?? 1);
        if (amount < minRequired) {
            toast.error(`Bid must be at least ₹${minRequired}`);
            return;
        }
        setSubmitting(true);
        socketRef.current?.emit('place_bid', { auctionId: id, userId: user._id, amount });
        setBidAmount('');
        setTimeout(() => setSubmitting(false), 1000);
    }, [bidAmount, auction, id, user]);

    // ── Chat send ─────────────────────────────────────────────────────────────
    const handleSendMessage = useCallback((e) => {
        e.preventDefault();
        if (!message.trim()) return;
        socketRef.current?.emit('send_message', { auctionId: id, userName: user.name, message });
        setMessage('');
    }, [message, id, user]);

    // ── Payment handler ───────────────────────────────────────────────────────
    const handlePayment = async () => {
        try {
            setSubmitting(true);
            const token = user?.token; // assuming AuthContext exposes token, or axios interceptor is set
            
            // 1. Create Order
            const { data: order } = await axios.post('/api/payment/create-order', 
                { auctionId: id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 2. Load Razorpay script dynamically
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                toast.error('Razorpay SDK failed to load. Are you online?');
                setSubmitting(false);
                return;
            }

            // 3. Configure Razorpay options
            const options = {
                key: 'rzp_test_TJU0iER5rrcUme', // Hardcoded for hackathon deployment
                amount: order.amount,
                currency: order.currency,
                name: 'BidArena',
                description: `Payment for ${auction.title}`,
                order_id: order.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await axios.post('/api/payment/verify', {
                            auctionId: id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        
                        toast.success('Payment Successful!');
                        setAuction(prev => ({ ...prev, status: 'paid' }));
                    } catch (err) {
                        toast.error(err.response?.data?.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#3b82f6'
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', function (response) {
                toast.error('Payment failed: ' + response.error.description);
            });
            paymentObject.open();

        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to initiate payment');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to dynamically load script
    const loadScript = (src) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // ── Render states ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col h-screen items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Connecting to auction room…</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col h-screen items-center justify-center gap-4 text-center px-4">
            <p className="text-red-400 text-lg">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-blue-400 hover:underline flex items-center gap-1">
                <ArrowLeft size={16} /> Back to Dashboard
            </button>
        </div>
    );

    if (!auction) return null;

    const isHighestBidder   = user && String(auction.highestBidder?._id ?? auction.highestBidder) === String(user._id);
    const minRequired       = (auction.currentHighestBid ?? 0) + (auction.minIncrement ?? 1);
    const isSeller          = user && String(auction.seller?._id ?? auction.seller) === String(user._id);

    return (
        <div className={`min-h-screen p-4 md:p-6 relative ${isCritical ? 'critical-vignette' : ''}`}>
            {/* ── Back ── */}
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">

                {/* ════════════════════════════════════════════
                    LEFT: Auction Details + Bid Form
                ════════════════════════════════════════════ */}
                <div className="lg:w-[60%] flex flex-col gap-5">

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`brutal-card flex flex-col transition-all duration-300 ${bidFlash ? 'scale-[1.02] border-electric shadow-[0_0_30px_rgba(255,59,0,0.6)]' : ''}`}
                    >
                        <div className="relative border-b-2 border-base-border">
                            <img
                                src={auction.imageUrl}
                                alt={auction.title}
                                className="w-full h-64 object-cover"
                                onError={e => { e.target.src = 'https://via.placeholder.com/800x300?text=BidArena'; }}
                            />
                            <span className={`absolute top-3 right-3 px-3 py-1 font-mono text-xs font-bold uppercase text-white border-2 border-black shadow-[2px_2px_0_0_#000]
                                ${auction.status === 'active' ? 'bg-green-500' : auction.status === 'completed' ? 'bg-red-500' : 'bg-gray-500'}`}>
                                {auction.status}
                            </span>
                        </div>

                        <div className="p-6">
                            <h1 className="text-3xl font-display font-extrabold mb-2 uppercase">{auction.title}</h1>
                            <p className="text-muted text-sm mb-4 font-medium">{auction.description}</p>

                            {/* Creator Link */}
                            <p className="text-sm font-mono text-muted mb-6">
                                Created By: {auction.seller ? (
                                    <Link to={`/profile/${auction.seller._id}`} target="_blank" rel="noopener noreferrer" className="text-electric font-bold uppercase hover:underline transition-colors">
                                        {auction.seller.name || 'Anonymous'}
                                    </Link>
                                ) : (
                                    <span className="text-electric font-bold uppercase">System</span>
                                )}
                            </p>

                            <div className="flex flex-wrap gap-4 items-center mb-6">
                                <Timer 
                                    targetTime={auction.status === 'upcoming' ? auction.startTime : auction.endTime} 
                                    status={auction.status} 
                                    onZero={() => socketRef.current?.emit('force_close_check', id)} 
                                    onUrgent={() => setIsCritical(true)}
                                    onNormal={() => setIsCritical(false)}
                                />
                                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-muted border-2 border-base-border px-3 py-2 bg-base-bg">
                                    <Activity size={16} /> {auction.totalBids ?? 0} BIDS
                                </div>
                                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-white border-2 border-black shadow-[2px_2px_0_0_#000] px-3 py-2 bg-electric">
                                    <Users size={16} /> {spectators} Live Viewers
                                </div>
                            </div>

                            {/* Current Bid */}
                            <div className="border-t-2 border-base-border pt-6 mt-2">
                                <p className="text-xs font-mono font-bold uppercase text-muted mb-1">Current Highest Bid</p>
                                <p className="text-5xl font-mono font-extrabold text-acid drop-shadow-md flex items-center">
                                    <span>₹</span>
                                    <NumberTicker value={auction.currentHighestBid ?? auction.startBid} />
                                </p>
                                <p className="text-sm mt-3 font-mono text-muted flex items-center">
                                    By: <span className="ml-2 mr-3">
                                    {auction.highestBidder ? (
                                        <Link to={`/profile/${auction.highestBidder._id}`} target="_blank" rel="noopener noreferrer" className="text-base-text font-bold uppercase hover:text-electric hover:underline transition-colors">
                                            {auction.highestBidder.name}
                                        </Link>
                                    ) : (
                                        <span className="text-base-text font-bold uppercase">No bids yet</span>
                                    )}
                                    </span>
                                    {isHighestBidder && auction.status === 'active' && <span className="text-electric font-bold">← YOU'RE LEADING</span>}
                                </p>
                            </div>

                            {/* WINNER BANNER */}
                            {auction.status === 'completed' && auction.highestBidder && (
                                <div className="mt-6 p-4 bg-electric text-white border-2 border-black flex items-center justify-between shadow-[4px_4px_0_0_#000]">
                                    <div>
                                        <p className="font-mono font-bold uppercase text-xs mb-1">🏆 WINNER DECLARED</p>
                                        <p className="text-2xl font-display font-extrabold uppercase">
                                            {auction.highestBidder.name}
                                        </p>
                                    </div>
                                    {isHighestBidder ? (
                                        <span className="font-mono font-bold uppercase px-3 py-1 bg-white text-electric text-sm">IT'S YOU! 🎉</span>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Timeline Panel (FR-13) ── */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg mt-6">
                        <h3 className="font-bold text-xl mb-4 border-b border-gray-800 pb-2">📜 Auction Timeline</h3>
                        {timeline.length === 0 ? (
                            <p className="text-gray-500 text-sm">No timeline events yet.</p>
                        ) : (
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-start border-l-2 border-gray-700 pl-4 relative">
                                        <div className="absolute -left-[9px] top-1 w-4 h-4 bg-gray-800 border-2 border-blue-500 rounded-full" />
                                        <div className="text-xs text-gray-400 w-16 pt-1 flex-shrink-0">
                                            {new Date(item.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-300 font-medium">
                                                {item.event.replace(/_/g, ' ')}
                                            </p>
                                            {item.actor && <p className="text-xs text-gray-500">By: {item.actor.name}</p>}
                                            {item.metadata && (
                                                <pre className="text-[10px] text-gray-500 mt-1 bg-gray-800 p-1 rounded overflow-x-auto">
                                                    {JSON.stringify(item.metadata, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Bid Form or seller message ── */}
                    {auction.status === 'active' && isSeller && (
                        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                            ℹ️ You are the seller — you cannot bid on your own auction.
                        </div>
                    )}

                    {auction.status === 'active' && !user && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="brutal-card p-6 text-center border-4 border-yellow-500 shadow-[8px_8px_0_0_#eab308]"
                        >
                            <h3 className="text-xl font-display font-extrabold uppercase mb-2">👀 Spectator Mode</h3>
                            <p className="text-muted mb-4 font-medium">You are viewing this auction as a spectator. Create an account to participate and place bids.</p>
                            <Link to="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition inline-flex shadow-[4px_4px_0_0_#000] border-2 border-black">Login to Bid</Link>
                        </motion.div>
                    )}

                    {auction.status === 'active' && user && !isSeller && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`brutal-card p-6 transition-all duration-100 ${bidFlash ? 'translate-x-2 -translate-y-1' : ''}`}
                        >
                            <h3 className="font-display font-bold text-xl mb-4 uppercase flex justify-between items-center">
                                <span className="flex items-center gap-2"><Gavel size={20} /> Place Your Bid</span>
                                {isBiddingWar && <span className="text-electric text-sm font-mono font-bold animate-pulse">🔥 WAR IS ON</span>}
                            </h3>
                            <form onSubmit={handleBid} className="flex gap-3">
                                <input
                                    type="number"
                                    className="flex-1 px-4 py-3 bg-base-bg border-2 border-base-border font-mono font-bold text-lg focus:outline-none focus:border-electric transition-colors"
                                    placeholder={`MIN ₹${minRequired}`}
                                    value={bidAmount}
                                    onChange={e => setBidAmount(e.target.value)}
                                    min={minRequired}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="brutal-btn-primary"
                                >
                                    {submitting ? 'Placing…' : 'Submit Bid'}
                                </button>
                            </form>
                            <div className="flex gap-2 mt-4">
                                {[100, 500, 1000].map(amt => (
                                    <button 
                                        key={amt}
                                        type="button"
                                        onClick={() => setBidAmount(String(minRequired + amt))}
                                        className="flex-1 bg-base-bg border-2 border-base-border text-xs font-mono font-bold py-2 hover:bg-electric hover:text-white transition-colors"
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs font-mono font-bold uppercase text-muted mt-4">Minimum bid: ₹{minRequired}</p>
                        </motion.div>
                    )}

                    {/* ── Winner Banner ── */}
                    {(auction.status === 'completed' || auction.status === 'paid') && isHighestBidder && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="brutal-card p-6 text-center border-4 border-electric shadow-[8px_8px_0_0_#FF3B00]"
                        >
                            <h2 className="text-3xl font-display font-extrabold text-base-text uppercase mb-2">You Won the Auction! 🎉</h2>
                            <p className="text-muted font-mono font-bold mb-6">Congratulations! You secured the asset for <strong>₹{auction.currentHighestBid}</strong></p>
                            
                            {auction.status === 'paid' ? (
                                <div className="px-8 py-4 bg-acid border-4 border-black text-black font-bold uppercase shadow-[4px_4px_0_0_#000] inline-flex items-center gap-2">
                                    ✅ Payment Successful
                                </div>
                            ) : (
                                <button 
                                    onClick={handlePayment}
                                    disabled={submitting}
                                    className="w-full py-4 text-xl font-display font-extrabold uppercase bg-[#3388ff] text-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] active:translate-y-0 active:shadow-[0_0_0_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Loading...' : 'Proceed to Payment (Razorpay)'}
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* ── Bid History ── */}
                    <div className="brutal-card overflow-hidden">
                        <div className="p-4 border-b-2 border-base-border bg-base-bg flex items-center gap-2 font-display font-bold uppercase text-base-text">
                            <Gavel size={18} /> Terminal Log ({bids.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y-2 divide-base-border bg-base-card font-mono">
                            <AnimatePresence initial={false}>
                                {bids.length === 0 ? (
                                    <p className="text-muted text-sm p-4 text-center font-bold uppercase">No server events</p>
                                ) : (
                                    bids.map((bid, i) => (
                                        <motion.div
                                            key={bid._id || i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex justify-between items-center p-3 text-sm hover:bg-base-bg transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-muted">[{new Date(bid.createdAt || Date.now()).toLocaleTimeString()}]</span>
                                                <span className="text-electric font-bold text-xs uppercase">BID_ACCEPTED:</span>
                                                {bid.bidder ? (
                                                    <Link to={`/profile/${bid.bidder._id}`} target="_blank" rel="noopener noreferrer" className="font-bold uppercase text-base-text hover:text-electric hover:underline transition-colors">
                                                        {bid.bidder.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-bold uppercase text-base-text">USER</span>
                                                )}
                                            </div>
                                            <span className="text-acid font-extrabold shadow-sm text-base">₹{bid.amount}</span>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    RIGHT: Live Chat
                ════════════════════════════════════════════ */}
                <div className="lg:w-[40%] flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col brutal-card h-[70vh] lg:sticky lg:top-6"
                        style={{ willChange: 'transform, opacity' }}
                    >
                        <div className="p-4 border-b-2 border-base-border bg-base-bg flex items-center gap-2 font-display font-bold uppercase text-base-text">
                            <Users size={18} /> Live Comms
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-base-card font-mono">
                            {chat.length === 0 && (
                                <p className="text-muted text-sm text-center mt-4 font-bold uppercase">Room is quiet</p>
                            )}
                            {chat.map((msg, i) => {
                                const isMe = user && msg.userName === user.name;
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-xs font-bold text-muted mb-1 uppercase">{msg.userName}</span>
                                        <div className={`px-4 py-2 text-sm font-bold border-2 border-base-border shadow-[2px_2px_0_0_#000] break-words
                                            ${isMe ? 'bg-electric text-white' : 'bg-base-bg text-base-text'}`}>
                                            {msg.message}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {user ? (
                            <form
                                onSubmit={handleSendMessage}
                                className="p-4 border-t-2 border-base-border flex gap-2 bg-base-bg"
                            >
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-3 bg-base-card border-2 border-base-border font-mono font-bold text-sm focus:outline-none focus:border-electric transition-colors"
                                    placeholder="TRANSMIT MESSAGE..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    maxLength={300}
                                />
                                <button
                                    type="submit"
                                    className="brutal-btn-primary px-4 py-3"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        ) : (
                            <div className="p-5 border-t-2 border-base-border text-center bg-base-bg text-sm font-mono font-bold uppercase text-muted">
                                <Link to="/login" className="text-electric hover:underline mx-1">Login</Link> to transmit
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

export default AuctionRoom;
