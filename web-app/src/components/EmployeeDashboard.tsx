import { useState } from 'react';
import ChatView from './ChatView';
import CalendarView from './CalendarView';
import './Dashboard.css';

export default function EmployeeDashboard() {
    const [activeTab, setActiveTab] = useState('CHAT');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', background: 'var(--bg-main)' }}>
            {/* SIDEBAR */}
            <aside style={{ 
                width: '280px', 
                background: 'rgba(11, 10, 17, 0.8)', 
                backdropFilter: 'blur(30px)',
                borderRight: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '40px 20px'
            }}>
                <div style={{ marginBottom: '50px', padding: '0 10px' }}>
                    <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Smart HR</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Assistant Portal</p>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                        className={`sidebar-link ${activeTab === 'CHAT' ? 'active' : ''}`}
                        onClick={() => setActiveTab('CHAT')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        AI Assistant
                    </button>
                    <button 
                        className={`sidebar-link ${activeTab === 'CALENDAR' ? 'active' : ''}`}
                        onClick={() => setActiveTab('CALENDAR')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Calendar
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <div 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            background: isProfileOpen ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }}
                        onMouseEnter={(e) => !isProfileOpen && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={(e) => !isProfileOpen && (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
                            {user.name ? user.name[0] : 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Employee Account</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {isProfileOpen && (
                        <div style={{ 
                            marginTop: '10px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px',
                            animation: 'slideUp 0.2s ease-out'
                        }}>
                            <button 
                                className={`sidebar-link ${activeTab === 'SECURITY' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('SECURITY'); setIsProfileOpen(false); }}
                                style={{ paddingLeft: '16px', fontSize: '0.85rem' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Security Settings
                            </button>
                            <button 
                                className="sidebar-link" 
                                onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }} 
                                style={{ paddingLeft: '16px', fontSize: '0.85rem', color: '#f87171' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main style={{ flex: 1, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <section style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'CHAT' && <ChatView />}
                    {activeTab === 'CALENDAR' && <CalendarView />}
                    {activeTab === 'SECURITY' && <SecuritySettings />}
                </section>
            </main>
        </div>
    );
}

function SecuritySettings() {
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [msg, setMsg] = useState({ text: '', type: '' });
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleUpdate = async () => {
        const res = await fetch('http://localhost:8000/api/change-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        setMsg({ text: data.message, type: data.status === 'success' ? 'success' : 'error' });
        if(data.status === 'success') { setOldPass(''); setNewPass(''); }
    };

    return (
        <div className="slide-in" style={{ padding: '40px', maxWidth: '500px' }}>
            <h2 className="text-gradient" style={{ marginBottom: '20px' }}>Security Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                    <span style={{ width: '150px' }}>Current Password</span>
                    <input type="password" className="glass-input-small" value={oldPass} onChange={e=>setOldPass(e.target.value)} />
                </div>
                <div className="form-group">
                    <span style={{ width: '150px' }}>New Password</span>
                    <input type="password" className="glass-input-small" value={newPass} onChange={e=>setNewPass(e.target.value)} />
                </div>
                <button className="edit-btn" style={{ width: 'fit-content' }} onClick={handleUpdate}>Keep My Workspace Secure</button>
                {msg.text && (
                    <div style={{ color: msg.type === 'success' ? '#4ade80' : '#fca5a5', fontSize: '0.9rem', marginTop: '10px' }}>
                        {msg.text}
                    </div>
                )}
            </div>
        </div>
    );
}
