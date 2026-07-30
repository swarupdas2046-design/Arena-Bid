import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NumberTicker = ({ value, className = "" }) => {
    const stringValue = String(value);

    return (
        <span className={`inline-flex overflow-hidden ${className}`}>
            <AnimatePresence mode="popLayout">
                {stringValue.split('').map((char, i) => (
                    <motion.span
                        key={`${i}-${char}`}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0, position: 'absolute' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="inline-block"
                    >
                        {char}
                    </motion.span>
                ))}
            </AnimatePresence>
        </span>
    );
};

export default NumberTicker;
