import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { HelpCircle, Newspaper, FileText, PlusCircle, BookCopy, BarChart3, Clock, Timer, Activity, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './DashboardPage.module.css';

const StatBox = ({ title, value, icon, color, delay }) => (
    <motion.div 
        className={styles.bentoStatBox}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.4, type: 'spring' }}
        whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
    >
        <div className={styles.bentoIconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
            {icon}
        </div>
        <div className={styles.bentoStatDetails}>
            <h3>{value}</h3>
            <p>{title}</p>
        </div>
    </motion.div>
);

const formatSeconds = (totalSeconds) => {
    if (!totalSeconds) return "0h 0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const DashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [recentPosts, setRecentPosts] = useState([]);
    const [sessionStats, setSessionStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Logic Fix: Use allSettled so one failed API call doesn't crash the whole dashboard
                const results = await Promise.allSettled([
                    api.get('/questions/stats'),
                    api.get('/posts?limit=5'),
                    api.get('/admin/session/stats')
                ]);

                // Destructure results safely
                const statsRes = results[0];
                const postsRes = results[1];
                const sessionRes = results[2];

                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
                if (postsRes.status === 'fulfilled') setRecentPosts(postsRes.value.data);
                if (sessionRes.status === 'fulfilled') setSessionStats(sessionRes.value.data);

                // If ALL crucial endpoints failed, show a general error
                if (statsRes.status === 'rejected' && postsRes.status === 'rejected') {
                     setError("Unable to connect to server. Please check your connection.");
                }

            } catch (err) {
                console.error("Critical dashboard failure:", err);
                setError('A critical error occurred while loading the dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { greeting: "Good Morning", theme: "morning" };
        if (hour < 18) return { greeting: "Good Afternoon", theme: "afternoon" };
        return { greeting: "Good Evening", theme: "evening" };
    };

    const timeContext = getTimeOfDay();

    if (loading) return (
        <div className={styles.loadingScreen}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Activity size={40} color="#4f46e5" />
            </motion.div>
            <p>Loading your portal...</p>
        </div>
    );

    if (error) return (
        <div className={styles.errorScreen}>
            <div className={styles.errorBox}>
                <h2>Oops!</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
            </div>
        </div>
    );

    return (
        <div className={styles.dashboardContainer}>
            
            {/* Bento Box Layout Grid */}
            <div className={styles.bentoGrid}>

                {/* Main Hero Banner */}
                <motion.div 
                    className={`${styles.bentoBox} ${styles.heroBanner} ${styles[timeContext.theme]}`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.heroContent}>
                        <h1>{timeContext.greeting}, {user?.username || 'Admin'}!</h1>
                        <h2>Mathem Solvex Admin</h2>
                        <p>Welcome to the central command for Mathem Solvex. Your question bank is looking great today.</p>
                        
                        <div className={styles.heroQuickStats}>
                            <div className={styles.heroStat}>
                                <TrendingUp size={20} />
                                <span>{stats?.totalQuestions || 0} Questions Total</span>
                            </div>
                            <div className={styles.heroStat}>
                                <Activity size={20} />
                                <span>{formatSeconds(sessionStats?.today?.seconds)} Active Today</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroDecoration}>
                        <div className={styles.glassCircle1}></div>
                        <div className={styles.glassCircle2}></div>
                    </div>
                </motion.div>

                {/* Data Stats Cluster */}
                <div className={styles.statsCluster}>
                    <StatBox delay={0.1} title="Questions in Vault" value={stats?.totalQuestions || 0} icon={<HelpCircle size={28}/>} color="#4f46e5" />
                    <StatBox delay={0.2} title="Active Subjects" value={stats?.totalSubjects || 0} icon={<BookCopy size={28}/>} color="#10b981" />
                    <StatBox delay={0.3} title="Weekly Time Logged" value={formatSeconds(sessionStats?.weekly?.seconds)} icon={<Timer size={28}/>} color="#8b5cf6" />
                    <StatBox delay={0.4} title="Monthly Focus Time" value={formatSeconds(sessionStats?.monthly?.seconds)} icon={<Clock size={28}/>} color="#f43f5e" />
                </div>

                {/* Right Side Column: Quick Actions & Recent Activity */}
                <div className={styles.actionColumn}>
                    
                    {/* Quick Actions Bento */}
                    <motion.div 
                        className={`${styles.bentoBox} ${styles.actionBox}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <div className={styles.bentoHeader}>
                            <h2>Fast Actions</h2>
                            <span className={styles.bentoHeaderBadge}>Shortcuts</span>
                        </div>
                        <div className={styles.actionGrid}>
                            <Link to="/admin/questions/add" className={styles.actionLinkPrimary}>
                                <PlusCircle size={24} />
                                <span>Question</span>
                            </Link>
                            <Link to="/admin/posts/add" className={styles.actionLinkSecondary}>
                                <Newspaper size={24} />
                                <span>Article</span>
                            </Link>
                            <Link to="/admin/reports" className={styles.actionLinkTertiary}>
                                <FileText size={24} />
                                <span>Reports</span>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Recent Activity Bento */}
                    <motion.div 
                        className={`${styles.bentoBox} ${styles.activityBox}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <div className={styles.bentoHeader}>
                            <h2>Latest Articles</h2>
                            <Link to="/admin/posts" className={styles.viewAllBtn}>View All</Link>
                        </div>
                        
                        <div className={styles.activityFeed}>
                            {recentPosts.length > 0 ? (
                                recentPosts.map((post, index) => (
                                    <motion.div 
                                        key={post._id} 
                                        className={styles.feedItem}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + (index * 0.1) }}
                                    >
                                        <div className={styles.feedIcon}><Newspaper size={18} color="#6366f1"/></div>
                                        <div className={styles.feedContent}>
                                            <h4>{post.title}</h4>
                                            <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <Link to={`/admin/posts/edit/${post._id}`} className={styles.feedEditBtn}>Edit</Link>
                                    </motion.div>
                                ))
                            ) : (
                                <div className={styles.emptyFeed}>
                                    <FileText size={40} color="#cbd5e1" />
                                    <p>No recent articles published yet.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;