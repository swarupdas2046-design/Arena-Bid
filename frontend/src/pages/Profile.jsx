import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Trophy, Gavel, Star } from 'lucide-react';
import Mini3DLogo from '../components/Mini3DLogo';

const StatCard = ({ icon, label, value }) => (
    <div className="brutal-card p-5 flex flex-col gap-2">
        <div className="flex items-center gap-3">
            <div className="text-electric">{icon}</div>
            <p className="text-xs font-mono font-bold uppercase text-muted">{label}</p>
        </div>
        <p className="text-3xl font-display font-extrabold">{value ?? 0}</p>
    </div>
);

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { id } = useParams();
    const isPublic = !!id && (!user || id !== user._id);

    const [profile, setProfile] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isPublic && !user) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                setLoading(true);
                if (isPublic) {
                    // Fetch public profile
                    const res = await axios.get(`/api/users/${id}`);
                    setProfile(res.data);
                    setBidHistory([]); // Hide private bid history for public view
                } else {
                    // Fetch own profile
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const [profileRes, bidsRes] = await Promise.all([
                        axios.get('/api/auth/profile', config),
                        axios.get('/api/auth/bids', config).catch(() => ({ data: [] }))
                    ]);
                    setProfile(profileRes.data);
                    setBidHistory(bidsRes.data);
                }
            } catch (err) {
                console.error(err);
                setError(isPublic ? 'User not found' : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, navigate, id, isPublic]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <Mini3DLogo size="w-32 h-32" />
        </div>
    );

    if (error) return (
        <div className="flex flex-col h-screen items-center justify-center gap-4 text-center px-4">
            <p className="text-electric font-mono font-bold uppercase text-xl">{error}</p>
            <Link to="/dashboard" className="text-acid hover:underline flex items-center gap-1 font-mono uppercase">
                <ArrowLeft size={16} /> Back to Arena
            </Link>
        </div>
    );

    const stats = profile?.stats || {};

    return (
        <div className="min-h-screen p-6 max-w-5xl mx-auto">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted hover:text-base-text font-mono text-sm mb-6 transition uppercase font-bold">
                <ArrowLeft size={16} /> Back to Arena
            </Link>

            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="brutal-card p-6 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left"
            >
                <div className="shrink-0 bg-base-bg border-2 border-base-border p-2 rounded-xl">
                    <Mini3DLogo size="w-24 h-24" />
                </div>
                <div className="flex-1 flex flex-col justify-center h-full pt-2">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                        <h1 className="text-4xl font-display font-extrabold uppercase">{profile?.name}</h1>
                        {isPublic && <span className="bg-electric text-white px-2 py-0.5 text-xs font-mono font-bold border-2 border-black">PUBLIC</span>}
                    </div>
                    {!isPublic && <p className="text-muted font-mono">{profile?.email}</p>}
                </div>
                
                {!isPublic && (
                    <div className="pt-2">
                        <button
                            onClick={logout}
                            className="brutal-btn-outline border-electric text-electric hover:bg-electric hover:text-white text-xs px-4 py-2"
                        >
                            Log Out
                        </button>
                    </div>
                )}
            </motion.div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<TrendingUp size={24} />} label="Created" value={stats.auctionsCreated} />
                <StatCard icon={<Trophy size={24} />}     label="Won"    value={stats.auctionsWon} />
                <StatCard icon={<Gavel size={24} />}      label="Bids"      value={stats.totalBidsPlaced} />
                <StatCard icon={<Star size={24} />}       label="Spent"     value={`₹${stats.totalAmountSpent ?? 0}`} />
            </div>

            {/* ── Recent Bid History ── */}
            {!isPublic && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="brutal-card overflow-hidden"
                >
                    <div className="p-5 border-b-2 border-base-border bg-base-bg font-display font-bold uppercase text-lg flex items-center gap-2">
                        <Gavel size={20} /> Your Activity Log
                    </div>
                    {bidHistory.length === 0 ? (
                        <p className="text-muted font-mono font-bold text-sm p-8 text-center uppercase">No activity logged. <Link to="/dashboard" className="text-electric hover:underline ml-2">Enter the Arena →</Link></p>
                    ) : (
                        <div className="divide-y-2 divide-base-border font-mono">
                            {bidHistory.map((bid, i) => (
                                <div key={i} className="flex justify-between items-center p-5 hover:bg-base-bg transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-base-text text-base-bg font-bold px-2 py-1 text-xs">
                                            {new Date(bid.receivedAt).toLocaleTimeString()}
                                        </div>
                                        <p className="font-bold text-base uppercase">{bid.auction?.title || 'Unknown Auction'}</p>
                                    </div>
                                    <span className="text-electric font-extrabold text-lg drop-shadow-md">₹{bid.amount}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Profile;
