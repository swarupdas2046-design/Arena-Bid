import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowLeft } from 'lucide-react';

const GithubIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const About = () => {
    const aboutRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.gsap-fade', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "power3.out"
            });
        }, aboutRef);

        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-base-bg pt-20 pb-20" ref={aboutRef}>
            <div className="max-w-5xl mx-auto px-6">
                
                <Link to="/" className="inline-flex items-center gap-2 opacity-70 hover:opacity-100 text-base-text font-mono text-sm transition uppercase font-bold mb-8">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <h1 className="gsap-fade text-5xl md:text-7xl font-display font-extrabold uppercase mb-12">
                    Team <span className="text-electric">Navotthan</span>
                </h1>

                <div className="gsap-fade mb-16">
                    <div className="bg-base-card border-2 border-base-border shadow-[8px_8px_0_0_var(--shadow-color)] p-8">
                        <h2 className="text-3xl font-display font-bold uppercase mb-4 text-electric">The Project</h2>
                        <p className="font-mono font-bold text-base-text leading-relaxed">
                            BidArena is a highly scalable, real-time auction platform engineered to handle concurrent high-frequency bidding environments. By leveraging WebSockets (Socket.io) and an event-driven architecture, it guarantees split-second state synchronization across all connected clients. Our Neo-Brutalist design language reflects the raw, uncompromising speed of the underlying technology stack.
                        </p>
                    </div>
                </div>

                <h2 className="gsap-fade text-4xl font-display font-extrabold uppercase mb-8">The Developers</h2>
                
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Swarup */}
                    <div className="gsap-fade">
                        <div className="brutal-card flex flex-col items-center p-8 text-center h-full">
                            <div className="w-48 h-48 rounded-full border-4 border-base-border overflow-hidden shadow-[6px_6px_0_0_var(--shadow-color)] mb-6">
                                <img src="/Swarup.png" alt="Swarup" className="w-full h-full object-cover" onError={e => e.target.src='https://via.placeholder.com/200?text=Swarup'} />
                            </div>
                            <h3 className="text-2xl font-display font-extrabold uppercase mb-2">Swarup</h3>
                            <p className="font-mono font-bold opacity-70 mb-6">Full Stack Developer</p>
                            
                            <a href="https://github.com/swarupdas2046-design" target="_blank" rel="noreferrer" className="mt-auto flex items-center gap-2 px-6 py-3 bg-base-text text-base-bg font-mono font-bold uppercase border-2 border-transparent hover:bg-transparent hover:text-base-text hover:border-base-text transition-colors">
                                <GithubIcon size={20} /> GitHub Profile
                            </a>
                        </div>
                    </div>

                    {/* Snehal */}
                    <div className="gsap-fade">
                        <div className="brutal-card flex flex-col items-center p-8 text-center h-full">
                            <div className="w-48 h-48 rounded-full border-4 border-base-border overflow-hidden shadow-[6px_6px_0_0_var(--shadow-color)] mb-6">
                                <img src="/Snehal.png" alt="Snehal" className="w-full h-full object-cover" onError={e => e.target.src='https://via.placeholder.com/200?text=Snehal'} />
                            </div>
                            <h3 className="text-2xl font-display font-extrabold uppercase mb-2">Snehal</h3>
                            <p className="font-mono font-bold opacity-70 mb-6">Full Stack Developer</p>
                            
                            <a href="https://github.com/ss-solanke96k" target="_blank" rel="noreferrer" className="mt-auto flex items-center gap-2 px-6 py-3 bg-base-text text-base-bg font-mono font-bold uppercase border-2 border-transparent hover:bg-transparent hover:text-base-text hover:border-base-text transition-colors">
                                <GithubIcon size={20} /> GitHub Profile
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default About;
