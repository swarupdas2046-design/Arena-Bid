import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const Timer = ({ targetTime, status, onZero, onUrgent, onNormal, compact = false }) => {
    const [display, setDisplay] = useState('');
    const [urgent, setUrgent] = useState(false);

    useEffect(() => {
        if (urgent) {
            onUrgent?.();
        } else {
            onNormal?.();
        }
    }, [urgent, onUrgent, onNormal]);

    useEffect(() => {
        if (status !== 'active' && status !== 'upcoming') {
            setDisplay(status === 'completed' ? '⏹ Ended' : status);
            return;
        }
        
        const tick = () => {
            if (!targetTime) return;
            const diff = new Date(targetTime).getTime() - Date.now();
            
            if (diff <= 0) {
                if (status === 'upcoming') {
                    setDisplay('Starting soon...');
                } else {
                    setDisplay('Verifying...');
                    if (onZero) onZero();
                }
                return;
            }
            
            // 10-Second Transition Trigger
            setUrgent(status === 'active' && diff <= 10000);
            
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            const timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
            setDisplay(status === 'upcoming' ? `Starts in: ${timeStr}` : timeStr);
        };
        
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [targetTime, status]);

    if (compact) {
        return (
            <div className={`flex items-center gap-1 font-mono text-xs font-bold uppercase ${urgent ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                <Clock size={12} /> {display}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 font-mono text-xl px-4 py-2 border-2 shadow-[2px_2px_0_0_#000] w-fit font-bold uppercase
            ${urgent ? 'text-white bg-electric border-black animate-pulse' : 'text-base-bg bg-base-text border-black'}`}>
            <Clock size={20} /> {display}
        </div>
    );
};

export default Timer;
