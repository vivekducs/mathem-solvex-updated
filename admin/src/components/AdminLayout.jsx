import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, HelpCircle, FileText, Newspaper, LogOut, Menu, X, Tags } from 'lucide-react';
import styles from './AdminLayout.module.css';

const AdminLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        auth.logout();
        navigate('/login');
    };

    const navLinks = [
        { to: "/admin/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
        { to: "/admin/questions", icon: <HelpCircle size={20} />, label: "Questions" },
        { to: "/admin/posts", icon: <Newspaper size={20} />, label: "Posts" },
        { to: "/admin/reports", icon: <FileText size={20} />, label: "Reports" },
        { to: "/admin/taxonomy", icon: <Tags size={20} />, label: "Taxonomy" }
    ];

    return (
        <div className={styles.layout}>
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarTop}>
                    <h2 className={styles.sidebarHeader}>Mathem Solvex Admin</h2>
                    <nav className={styles.sidebarNav}>
                        {navLinks.map(link => (
                            <NavLink 
                                to={link.to} 
                                key={link.to}
                                className={({ isActive }) => isActive ? styles.active : ''}
                                onClick={() => setSidebarOpen(false)}
                            >
                                {link.icon}
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className={styles.userProfile}>
                    <span className={styles.userEmail}>{auth.user?.email}</span>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <a href="https://vivekducs.is-a.dev/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            Developer Portfolio
                        </a>
                    </div>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.mobileHeader}>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className={styles.menuToggle}>
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <h2 className={styles.mobileHeaderTitle}>Mathem Solvex Admin</h2>
                </header>
                <div className={styles.contentWrapper}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;