import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    
    // This new state will control the login button's disabled status.
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTypingUsername, setIsTypingUsername] = useState(false);
    const [isTypingPassword, setIsTypingPassword] = useState(false);
    const [isDenyingPeek, setIsDenyingPeek] = useState(false);
    const [particles, setParticles] = useState([]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const typingTimeoutRef = useRef(null);
    const rightPanelRef = useRef(null);

    const recaptchaRef = useRef(null); 
    const auth = useAuth();
    const navigate = useNavigate();
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    // Simulate an initialization loading state (Skeleton Waiting)
    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (rightPanelRef.current) {
                const rect = rightPanelRef.current.getBoundingClientRect();
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const recaptchaToken = recaptchaRef.current.getValue();

        if (!recaptchaToken) {
            setError('CAPTCHA token expired. Please verify again.');
            setIsCaptchaVerified(false);
            return;
        }

        setLoading(true);
        try {
            const success = await auth.login(username, password, recaptchaToken);
            if (success) {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
            recaptchaRef.current.reset();
            setIsCaptchaVerified(false);
        } finally {
            setLoading(false);
        }
    };

    const handleCaptchaChange = useCallback((token) => {
        if (token) {
            setIsCaptchaVerified(true);
            setError(''); 
            triggerHappyParticles('🛡️');
            setTimeout(() => triggerHappyParticles('✅'), 300);
        }
    }, []);

    const handleCaptchaExpired = useCallback(() => {
        setIsCaptchaVerified(false);
    }, []);

    const handleTyping = (setter) => {
        setter(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setter(false), 1000);
    };

    const togglePasswordVisibility = () => {
        if (!showPassword) {
            setIsDenyingPeek(true);
            setTimeout(() => {
                setIsDenyingPeek(false);
                setShowPassword(true);
                // Burst happiness when revealed
                triggerHappyParticles('👁️');
                triggerHappyParticles('✨');
            }, 400); // Reduced delay from 600ms
        } else {
            setShowPassword(false);
        }
    };

    const triggerHappyParticles = (emoji = '🎉') => {
        const newParticles = Array.from({ length: 10 }).map((_, i) => ({
            id: Date.now() + i,
            emoji,
            dx: (Math.random() - 0.5) * 200,
            dy: (Math.random() - 0.5) * 200,
        }));
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.includes(p)));
        }, 1000);
    };

    const calculateProgress = () => {
        let progress = 0;
        if (username.length > 2) progress += 33;
        if (password.length > 5) progress += 33;
        if (isCaptchaVerified) progress += 34;
        return progress;
    };

    useEffect(() => {
        if (username.length > 2 && password.length > 5 && isCaptchaVerified) {
            triggerHappyParticles('🔥');
        }
    }, [username, password, isCaptchaVerified]);

    return (
        <div className={styles.pageWrapper}>
            <div className={`${styles.shape} ${styles.blob1}`}></div>
            <div className={`${styles.shape} ${styles.blob2}`}></div>

            <div className={styles.loginContainer}>
                <div className={styles.leftPanel}>
                    <img src="/maarulalogo.png" alt="Mathem Solvex Logo" className={styles.logo} />
                    <h2>Admin Portal</h2>
                    <h1>Control Center</h1>
                    <p>Enter your workspace to manage classes and students with lightning speed.</p>
                </div>
                
                <div className={styles.rightPanel} ref={rightPanelRef}>
                    <div className={styles.mouseGlow} style={{left: mousePos.x, top: mousePos.y}}></div>
                    <div className={styles.floatingDecor} style={{top: '10%', left: '10%', animationDelay: '0s'}}></div>
                    <div className={styles.floatingDecor} style={{bottom: '20%', right: '15%', animationDelay: '-5s', fontSize: '3rem'}}></div>
                    <div className={styles.floatingDecor} style={{top: '40%', right: '10%', animationDelay: '-10s'}}></div>
                    <div className={styles.floatingDecor} style={{bottom: '10%', left: '20%', animationDelay: '-15s', fontSize: '1.5rem'}}></div>

                    {particles.map(p => (
                        <span 
                            key={p.id} 
                            className={styles.happyParticle} 
                            style={{'--dx': `${p.dx}px`, '--dy': `${p.dy}px`, left: '50%', top: '50%'}}
                        >
                        </span>
                    ))}

                    {isInitializing ? (
                        <div className={styles.loginCard}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{width: '60%'}}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`} style={{height: '80px'}}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                        </div>
                    ) : (
                        <div className={styles.loginCard}>
                            <div className={styles.successMeter}>
                                <div className={styles.successMeterFill} style={{width: `${calculateProgress()}%`}}></div>
                            </div>
                            <h2 className={styles.title}>Welcome Back Admins!</h2>
                            
                            {error && (
                                <div className={styles.errorContainer}>
                                    <i className="fas fa-exclamation-circle"></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className={`${styles.inputGroup} ${isTypingUsername ? styles.isTyping : ''}`}>
                                    <label htmlFor="username">Username</label>
                                    <div className={styles.inputWrapper}>
                                        <i className="fas fa-user"></i>
                                        <input 
                                            type="text" 
                                            id="username" 
                                            value={username} 
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                handleTyping(setIsTypingUsername);
                                            }} 
                                            placeholder="Username" 
                                            required 
                                        />
                                        <div className={styles.typingSkeleton}></div>
                                        <span className={styles.interactiveEmoji}>
                                        </span>
                                    </div>
                                </div>
                                <div className={`${styles.inputGroup} ${isTypingPassword ? styles.isTyping : ''}`}>
                                    <label htmlFor="password">
                                        Password {showPassword && <span style={{color: '#0057FF', fontSize: '0.7rem', marginLeft: '5px'}}>(REVEALED 🔓)</span>}
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <i className="fas fa-lock"></i>
                                        <input 
                                            style={showPassword ? {letterSpacing: 'normal', fontWeight: '600'} : {}}
                                            type={showPassword ? 'text' : 'password'} 
                                            id="password" 
                                            value={password} 
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                handleTyping(setIsTypingPassword);
                                            }} 
                                            placeholder="••••••••" 
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            className={`${styles.passwordToggle} ${isDenyingPeek ? styles.denying : ''}`}
                                            onClick={togglePasswordVisibility}
                                            disabled={isDenyingPeek}
                                        >
                                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                        <div className={styles.typingSkeleton}></div>
                                        <span className={styles.interactiveEmoji}>
                                        </span>
                                    </div>
                                </div>
                                <div className={`${styles.recaptchaArea} ${isCaptchaVerified ? styles.verified : ''}`}>
                                     <div className={styles.robotAssistant}>
                                     </div>
                                     <div className={styles.securityLabel}>
                                         <i className={`fas ${isCaptchaVerified ? 'fa-shield-check' : 'fa-user-shield'}`}></i>
                                         {isCaptchaVerified ? 'Security Verified' : 'Confirm you are Human'}
                                     </div>
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={recaptchaSiteKey}
                                        onChange={handleCaptchaChange}
                                        onExpired={handleCaptchaExpired}
                                    />
                                </div>
                                <button type="submit" className={styles.loginButton} disabled={!isCaptchaVerified || loading}>
                                    {loading ? 'Verifying Identity...' : 'Access Admin Panel'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                     <p className={styles.goBackLink}>
                         <a href="https://questions.maarula.in">&larr; Student Portal</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
