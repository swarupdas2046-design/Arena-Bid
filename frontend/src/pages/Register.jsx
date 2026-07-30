import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(name, email, password);
            toast.success('Registration successful!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 py-12">
            <div className="w-full max-w-md mb-4">
                <Link to="/" className="inline-flex items-center gap-2 opacity-70 text-base-text hover:text-base-text font-mono text-sm transition uppercase font-bold">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="brutal-card p-8 w-full max-w-md bg-base-card"
            >
                <h2 className="text-4xl font-display font-extrabold uppercase text-center mb-8">
                    Create <br/><span className="text-electric">Account</span>
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6 font-mono">
                    <div>
                        <label className="block text-sm font-bold mb-2 uppercase opacity-70 text-base-text">Name</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="JOHN DOE"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 uppercase opacity-70 text-base-text">Email</label>
                        <input 
                            type="email" 
                            className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="HELLO@EXAMPLE.COM"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 uppercase opacity-70 text-base-text">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-5 py-4 bg-base-bg border-2 border-base-border font-bold text-lg focus:outline-none focus:border-electric transition-colors shadow-inner"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full brutal-btn-primary py-4 text-xl mt-4">
                        REGISTER
                    </button>
                </form>
                
                <p className="mt-8 text-center text-sm font-mono font-bold uppercase text-muted">
                    Already in the arena? <Link to="/login" className="text-electric hover:underline">Login here</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;
