import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import 'mathlive'; // This registers the <math-field> custom element

const MathLiveModal = ({ isOpen, onClose, onInsert }) => {
    const mathFieldRef = useRef(null);
    const [mathValue, setMathValue] = useState('');

    useEffect(() => {
        if (isOpen && mathFieldRef.current) {
            // Focus mathematical field when opened
            setTimeout(() => {
                mathFieldRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInsert = () => {
        if (mathFieldRef.current) {
            // Get LaTeX from the math-field
            const latex = mathFieldRef.current.value;
            onInsert(latex); // Return raw LaTeX
        }
        setMathValue('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        style={{
                            background: 'white', padding: '2rem', borderRadius: '1rem',
                            width: '90%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Visual Math Editor</h2>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            Use the visual keyboard to type your equation. It will be converted to LaTeX automatically.
                        </p>

                        <div style={{ border: '2px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb' }}>
                            <math-field 
                                ref={mathFieldRef} 
                                style={{ fontSize: '1.5rem', width: '100%', outline: 'none', background: 'transparent' }}
                                onInput={(e) => setMathValue(e.target.value)}
                            >
                                {mathValue}
                            </math-field>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button 
                                onClick={onClose}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleInsert}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#4f46e5', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Insert into Editor
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MathLiveModal;
