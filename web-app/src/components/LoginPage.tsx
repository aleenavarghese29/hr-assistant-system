import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(data));
                if (data.role === 'ADMIN') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.message || 'Check your credentials and try again.');
            }
        } catch (err) {
            setError('Connection failed. Please ensure the backend is running.');
        }
    };

    return (
        <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <div className="glass-panel" style={{ 
                width: '100%', 
                maxWidth: '1000px', 
                height: '600px', 
                display: 'grid', 
                gridTemplateColumns: '1.2fr 1fr', 
                overflow: 'hidden',
                borderRadius: '32px'
            }}>
                {/* LEFT SIDE: BRANDING & INFO */}
                <div style={{ 
                    background: 'linear-gradient(180deg, #9b6dff 0%, #6d28d9 45%, #0B0A11 100%)',
                    padding: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: 'white',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '250px', height: '250px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '100%', background: 'url("https://www.transparenttextures.com/patterns/stardust.png")', opacity: 0.1, pointerEvents: 'none' }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#7c3aed" style={{ margin: 'auto' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.5px' }}>HR Workspace</span>
                        </div>
                        
                        <h1 style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '20px' }}>
                            Smart HR <br/>Assistant
                        </h1>
                        <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, maxWidth: '340px' }}>
                            An AI-powered HR assistant designed to streamline employee queries, simplify leave management, and provide instant access to company information.
                        </p>
                    </div>
                </div>

                {/* RIGHT SIDE: LOGIN FORM */}
                <div style={{ 
                    padding: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'rgba(11, 10, 17, 0.4)',
                    backdropFilter: 'blur(40px)'
                }}>
                    <div style={{ marginBottom: '40px', textAlign: 'left' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '8px' }}>Welcome Back</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Enter your credentials to access your dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>Email</label>
                            <input 
                                type="email" 
                                className="glass-input-small" 
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ 
                                    padding: '14px 20px', 
                                    borderRadius: '16px', 
                                    fontSize: '1rem',
                                    background: 'rgba(255,255,255,0.03)'
                                }} 
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>Password</label>
                                <button type="button" onClick={() => alert('Password reset link sent to your company email.')} className="nav-link" style={{ fontSize: '0.8rem' }}>Forgot Password?</button>
                            </div>
                            <input 
                                type="password" 
                                className="glass-input-small" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ 
                                    padding: '14px 20px', 
                                    borderRadius: '16px', 
                                    fontSize: '1rem',
                                    background: 'rgba(255,255,255,0.03)'
                                }} 
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="edit-btn" 
                            style={{ 
                                padding: '16px', 
                                fontSize: '1rem', 
                                fontWeight: '700', 
                                borderRadius: '16px',
                                marginTop: '10px'
                            }}
                        >
                            Log In
                        </button>
                    </form>

                    <div style={{ marginTop: '40px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Use your company email to sign in
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
