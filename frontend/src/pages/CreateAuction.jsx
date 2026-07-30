import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import Mini3DLogo from '../components/Mini3DLogo';

const CreateAuction = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startBid, setStartBid] = useState('');
    const [duration, setDuration] = useState(''); // in minutes
    const [scheduledStartTime, setScheduledStartTime] = useState('');
    const [hideAfterHours, setHideAfterHours] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            let imageUrl = `https://picsum.photos/seed/${Date.now()}/800/600`; // fallback

            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const uploadRes = await axios.post('/api/upload', formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${user.token}`
                    }
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            let finalScheduledStartTime = null;
            if (scheduledStartTime) {
                const selectedDate = new Date(scheduledStartTime);
                if (selectedDate <= new Date()) {
                    toast.error('Scheduled start time must be in the future. (Check AM/PM)');
                    setLoading(false);
                    return;
                }
                finalScheduledStartTime = selectedDate.toISOString();
            }

            await axios.post('/api/auctions', {
                title,
                description,
                startBid: Number(startBid),
                duration: Number(duration),
                scheduledStartTime: finalScheduledStartTime,
                imageUrl,
                hideAfterHours
            }, config);

            toast.success('Auction launched successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create auction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 py-12">
            <div className="w-full max-w-2xl mb-4">
                <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted hover:text-base-text font-mono text-sm transition uppercase font-bold">
                    <ArrowLeft size={16} /> Cancel & Return
                </Link>
            </div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="brutal-card p-8 w-full max-w-2xl relative overflow-hidden"
            >
                <div className="absolute top-[-40px] right-[-40px] opacity-20 pointer-events-none">
                    <Mini3DLogo size="w-64 h-64" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-electric text-white p-3 border-2 border-black shadow-[4px_4px_0_0_#000]">
                            <Rocket size={28} />
                        </div>
                        <h2 className="text-4xl font-display font-extrabold uppercase">
                            Launch Auction
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 font-mono">
                        <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-muted">Item Title</label>
                            <input
                                type="text"
                                className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="ENTER TITLE"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-muted">Description</label>
                            <textarea
                                className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-sm focus:outline-none focus:border-electric transition-colors shadow-inner h-32 resize-none"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="DESCRIBE THE ASSET..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 uppercase text-muted">Starting Bid (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-extrabold text-xl text-acid focus:outline-none focus:border-electric transition-colors shadow-inner"
                                    value={startBid}
                                    onChange={(e) => setStartBid(e.target.value)}
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 uppercase text-muted">Duration (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="MINUTES"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-muted">Scheduled Start Time (Optional)</label>
                            <input
                                type="datetime-local"
                                className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                                value={scheduledStartTime}
                                onChange={(e) => setScheduledStartTime(e.target.value)}
                            />
                            <p className="text-xs text-muted mt-2 font-mono">Leave blank to start the auction immediately.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-muted">Hide from Dashboard After (Optional)</label>
                            <select
                                className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner appearance-none"
                                value={hideAfterHours}
                                onChange={(e) => setHideAfterHours(e.target.value)}
                            >
                                <option value="">Keep Visible Forever (Default)</option>
                                <option value="1">Hide 1 Hour after completion</option>
                                <option value="2">Hide 2 Hours after completion</option>
                                <option value="4">Hide 4 Hours after completion</option>
                                <option value="24">Hide 24 Hours after completion</option>
                            </select>
                            <p className="text-xs text-muted mt-2 font-mono">Automatically remove from main screen after it ends to prevent clutter.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 uppercase text-muted">Auction Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                                onChange={(e) => setImageFile(e.target.files[0])}
                            />
                            <p className="text-xs text-muted mt-2 font-mono">If left blank, a random image will be used.</p>
                        </div>
                        
                        <div className="pt-4 border-t-2 border-base-border mt-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full brutal-btn-primary py-4 text-xl flex items-center justify-center gap-3"
                            >
                                {loading ? 'INITIATING LAUNCH...' : (
                                    <>
                                        <Rocket size={24} /> INITIALIZE AUCTION
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateAuction;
