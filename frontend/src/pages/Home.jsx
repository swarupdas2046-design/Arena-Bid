import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ArrowRight, Gavel, Zap, Shield, Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, TorusKnot, MeshDistortMaterial } from '@react-three/drei';

const SpinningShape = () => {
    const meshRef = useRef(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 0.8;
        }
    });
    return (
        <TorusKnot ref={meshRef} args={[1, 0.3, 128, 32]}>
            <MeshDistortMaterial color="#FF3B00" distort={0.4} speed={2} wireframe={true} />
        </TorusKnot>
    );
};

const Home = () => {
    const heroRef = useRef(null);
    const { theme, toggleTheme } = React.useContext(ThemeContext);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.gsap-stagger', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "power3.out",
                delay: 0.2
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-base-bg overflow-x-hidden pt-20 pb-20" ref={heroRef}>
            {/* Top Navigation */}
            <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                <div className="text-3xl font-display font-extrabold uppercase tracking-tighter">
                    Bid<span className="text-electric">Arena</span>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={toggleTheme}
                        className="p-2 border-2 border-base-border bg-base-card shadow-[2px_2px_0_0_var(--shadow-color)] transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <Link to="/about" className="font-mono font-bold uppercase hover:text-electric transition-colors mr-4">About Team</Link>
                    <Link to="/dashboard" className="brutal-btn-outline px-4 py-2 text-sm hidden md:block">Dashboard</Link>
                    <Link to="/login" className="brutal-btn-primary px-4 py-2 text-sm">Login / Register</Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center min-h-[75vh]">
                <div className="flex flex-col gap-6">
                    <h1 className="gsap-stagger text-5xl md:text-7xl font-display font-extrabold uppercase leading-tight">
                        The Next-Gen <br/>
                        <span className="text-electric block mt-2 border-b-8 border-electric w-fit">Live Bidding</span>
                        Platform
                    </h1>
                    <p className="gsap-stagger text-lg font-mono font-bold text-muted max-w-lg mt-4">
                        Experience ultra-fast, real-time auctions with a brutalist interface. No lag, no delays—just pure adrenaline.
                    </p>
                    <div className="gsap-stagger flex flex-wrap gap-4 mt-8">
                        <Link to="/dashboard" className="brutal-btn-primary flex items-center gap-2">
                            Enter Arena <ArrowRight size={20} />
                        </Link>
                        <Link to="/about" className="brutal-btn-outline">
                            Meet Team Navotthan
                        </Link>
                    </div>

                    <div className="gsap-stagger grid grid-cols-2 gap-6 mt-12 pt-12 border-t-2 border-base-border">
                        <div className="flex flex-col gap-2">
                            <Zap size={32} className="text-electric" />
                            <h3 className="font-display font-bold uppercase text-xl">Real-Time Sync</h3>
                            <p className="text-xs font-mono text-muted">Socket.io powered instant bid updates.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Shield size={32} className="text-acid" />
                            <h3 className="font-display font-bold uppercase text-xl">Anti-Sniping</h3>
                            <p className="text-xs font-mono text-muted">Automatic 60s extensions on late bids.</p>
                        </div>
                    </div>
                </div>

                <div className="gsap-stagger relative w-full h-[400px] md:h-[600px] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-electric translate-x-4 translate-y-4 border-2 border-base-border hidden md:block"></div>
                    <div className="brutal-card w-full h-full relative z-10 p-2 bg-base-card overflow-hidden group">
                        <div className="absolute inset-0 bg-base-bg flex flex-col items-center justify-center border-4 border-base-border transition-transform duration-500 cursor-pointer">
                            <Canvas camera={{ position: [0, 0, 4] }}>
                                <ambientLight intensity={0.5} />
                                <directionalLight position={[10, 10, 5]} intensity={1} />
                                <SpinningShape />
                                <OrbitControls enableZoom={false} autoRotate={true} autoRotateSpeed={2} />
                            </Canvas>
                            <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
                                <p className="text-xl font-display font-extrabold uppercase tracking-widest text-base-text bg-base-card inline-block px-4 py-2 border-2 border-base-border shadow-[4px_4px_0_0_var(--shadow-color)]">
                                    3D INTERACTIVE AREA
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-electric text-white py-20 border-y-4 border-base-border mt-20">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                    <div>
                        <h2 className="text-3xl font-display font-extrabold uppercase mb-4 shadow-sm text-black">What is BidArena?</h2>
                        <p className="font-mono font-bold text-sm leading-relaxed">BidArena is a modern, neo-brutalist web application designed to handle high-frequency concurrent bidding. It prevents race conditions and snipe-bidding by enforcing strict real-time server validations.</p>
                    </div>
                    <div>
                        <h2 className="text-3xl font-display font-extrabold uppercase mb-4 shadow-sm text-black">Tech Stack</h2>
                        <ul className="font-mono font-bold text-sm space-y-2">
                            <li>- React (Frontend)</li>
                            <li>- Node.js & Express (Backend)</li>
                            <li>- MongoDB (Database)</li>
                            <li>- Socket.io (Real-Time)</li>
                            <li>- Razorpay (Payments)</li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-3xl font-display font-extrabold uppercase mb-4 shadow-sm text-black">Get Started</h2>
                        <p className="font-mono font-bold text-sm mb-4">Create an account, fund your wallet, and dive straight into the live auctions happening right now.</p>
                        <Link to="/register" className="inline-block bg-white text-electric px-6 py-3 font-display font-bold uppercase border-2 border-black hover:-translate-y-1 transition-transform shadow-[4px_4px_0_0_#000]">Create Account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
