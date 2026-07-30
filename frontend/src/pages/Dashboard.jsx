import React, { useEffect, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, PlusCircle, LogOut, RefreshCw, Moon, Sun } from 'lucide-react';
import Hero3D from '../components/Hero3D';
import Timer from '../components/Timer';

const STATUS_TABS = ['all', 'active', 'upcoming', 'completed'];

const statusColor = (status) => {
    switch (status) {
        case 'active':    return 'bg-green-500';
        case 'upcoming':  return 'bg-yellow-500';
        case 'completed': return 'bg-red-500';
        case 'paid':      return 'bg-purple-500';
        default:          return 'bg-gray-500';
    }
};

const Dashboard = () => {
    const [auctions, setAuctions] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const fetchAuctions = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        setError('');
        try {
            const url = activeTab === 'all'
                ? `/api/auctions`
                : `/api/auctions?status=${activeTab}`;
            const { data } = await axios.get(url);
            // API returns array directly OR {bids, timeline,...} — handle both
            setAuctions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Could not load auctions. Make sure the backend is running.');
            console.error(err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchAuctions();
        const intervalId = setInterval(() => fetchAuctions(true), 5000);
        return () => clearInterval(intervalId);
    }, [fetchAuctions]);

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* ── Header ────────────────────────────────────────────── */}
            <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">
                    BidArena
                </h1>
                <div className="flex gap-3 items-center flex-wrap">
                    <button
                        onClick={toggleTheme}
                        className="p-2 border-2 border-base-border bg-base-card shadow-[2px_2px_0_0_var(--shadow-color)] transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {user ? (
                        <>
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-4 py-2 border-2 border-base-border text-base-text font-bold uppercase text-sm transition hover:bg-base-text hover:text-base-bg"
                            >
                                👤 {user.name}
                            </Link>
                            <Link
                                to="/create"
                                className="brutal-btn-primary px-4 py-2 text-sm flex items-center gap-2"
                            >
                                <PlusCircle size={16} /> Create
                            </Link>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-base-border text-base-text font-bold uppercase text-sm transition hover:bg-electric hover:text-white hover:border-electric"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm font-bold uppercase text-base-text hover:text-electric transition"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="brutal-btn-primary px-4 py-2 text-sm"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </header>

            <Hero3D />

            {/* ── Filter Tabs ───────────────────────────────────────── */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 text-sm font-mono font-bold uppercase transition border-2 border-base-border ${
                            activeTab === tab
                                ? 'bg-electric text-white shadow-[3px_3px_0_0_var(--shadow-color)] -translate-y-0.5'
                                : 'bg-base-card text-base-text hover:bg-zinc-border'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
                <button
                    onClick={fetchAuctions}
                    className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-white transition"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* ── States ───────────────────────────────────────────── */}
            {loading && (
                <div className="text-center text-gray-500 mt-20">Loading auctions…</div>
            )}
            {error && !loading && (
                <div className="text-center text-red-400 mt-20">
                    <p>{error}</p>
                    <button onClick={fetchAuctions} className="mt-4 underline text-sm">Try again</button>
                </div>
            )}

            {/* ── Auction Grid ──────────────────────────────────────── */}
            {!loading && !error && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {auctions.map((auction, idx) => (
                            <motion.div
                                key={auction._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className="relative brutal-card overflow-hidden group flex flex-col"
                            >
                                {/* Status Badge */}
                                <div className={`absolute top-3 right-3 z-10 px-3 py-1 font-mono text-xs font-bold uppercase text-white border-2 border-black shadow-[2px_2px_0_0_#000] ${statusColor(auction.status)}`}>
                                    {auction.status}
                                </div>

                                {/* Image */}
                                <img
                                    src={auction.imageUrl}
                                    alt={auction.title}
                                    className="w-full h-44 object-cover group-hover:scale-105 transition duration-500"
                                    onError={e => { e.target.src = 'https://via.placeholder.com/400x200?text=BidArena'; }}
                                />

                                {/* Body */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h2 className="text-xl font-display font-bold mb-2 truncate">{auction.title}</h2>
                                    <p className="text-muted text-sm mb-4 line-clamp-2 flex-1">{auction.description}</p>

                                    <div className="flex justify-between items-end border-t-2 border-base-border pt-4">
                                        <div>
                                            <p className="text-xs font-mono font-bold text-muted mb-1 uppercase">Current Bid</p>
                                            <p className="text-2xl font-mono font-extrabold text-acid mb-1">₹{auction.currentHighestBid ?? auction.startBid}</p>
                                            <Timer compact={true} targetTime={auction.status === 'upcoming' ? auction.startTime : auction.endTime} status={auction.status} />
                                        </div>
                                        <div className="flex flex-col items-end gap-2 text-xs font-mono font-bold text-muted">
                                            <span className="flex items-center gap-1"><TrendingUp size={14}/> {auction.totalBids ?? 0} BIDS</span>
                                            {/* Velocity Micro-Chart */}
                                            <div className="w-full h-12 mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,59,0,0.6)]">
                                                    <path d="M0,25 Q15,10 30,25 T60,15 T100,5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-electric" />
                                                </svg>
                                            </div>
                                            <Link
                                                to={`/auction/${auction._id}`}
                                                className="brutal-btn-primary px-4 py-2 text-xs mt-1"
                                            >
                                                {auction.status === 'active' ? 'JOIN LIVE' : 'VIEW'}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {auctions.length === 0 && (
                        <div className="text-center text-gray-500 mt-24">
                            <p className="text-lg mb-2">No {activeTab !== 'all' ? activeTab : ''} auctions found.</p>
                            <Link to="/create" className="text-blue-400 hover:underline text-sm">
                                Be the first to create one →
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
