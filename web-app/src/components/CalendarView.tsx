import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CalendarView() {
    const navigate = useNavigate();
    const [holidays, setHolidays] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [balance, setBalance] = useState<any>(null);
    const [availableLeaveTypes, setAvailableLeaveTypes] = useState<any[]>([]);
    
    // Modal State
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [leaveType, setLeaveType] = useState('SICK');
    const [leaveReason, setLeaveReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetch('http://localhost:8000/api/calendar?employee_id=EMP001')
            .then(res => res.json())
            .then(data => {
                if(data.holidays) setHolidays(data.holidays);
                if(data.leaves) setLeaves(data.leaves);
                if(data.balance) setBalance(data.balance);
                if(data.available_leave_types && data.available_leave_types.length > 0) {
                    setAvailableLeaveTypes(data.available_leave_types);
                    setLeaveType(data.available_leave_types[0].type);
                } else {
                    // Fallback if no policy uploaded yet
                    setAvailableLeaveTypes([
                        { type: 'SICK', label: 'Sick Leave' },
                        { type: 'CASUAL', label: 'Casual Leave' },
                        { type: 'WFH', label: 'Work From Home' },
                    ]);
                }
            })
            .catch(err => console.error("Failed to load calendar", err));
    }, []);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const isDateInLeave = (d: number, m: number, y: number) => {
        const cur = new Date(y, m, d);
        for(let l of leaves) {
            const start = new Date(l.from_date);
            const end = new Date(l.to_date);
            // Ignore time bounds
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            if(cur >= start && cur <= end) {
                return l;
            }
        }
        return null;
    };

    const isHoliday = (d: number, m: number, y: number) => {
        const curStr = `${y}-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return holidays.find(h => h.date === curStr);
    };

    const submitLeave = async () => {
        if(!selectedDate) return;
        setIsSubmitting(true);
        const curStr = `${year}-${String(month+1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
        
        try {
            const res = await fetch('http://localhost:8000/api/leave-history/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee: "EMP001",
                    from_date: curStr,
                    to_date: curStr,
                    days: 1,
                    leave_type: leaveType,
                    reason: leaveReason,
                    status: "PENDING"
                })
            });
            if (res.ok) {
                // Optimistically update
                setLeaves([...leaves, {
                    from_date: curStr,
                    to_date: curStr,
                    days: 1,
                    leave_type: leaveType,
                    reason: leaveReason,
                    status: "PENDING"
                }]);
                setSelectedDate(null);
                setLeaveReason('');
            } else {
                const msg = leaveType === 'LWP' ? "Failed to submit request." : "Failed to submit leave. Ensure you have balance remaining.";
                alert(msg);
            }
        } catch(e) { }
        setIsSubmitting(false);
    };

    const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

    const renderGrid = () => {
        let grid = [];
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        
        days.forEach(d => grid.push(<div key={`h-${d}`} style={{ fontWeight:'bold', textAlign:'center', padding:'10px', color:'var(--secondary-accent)'}}>{d}</div>));

        for(let i=0; i<firstDay; i++) {
            grid.push(<div key={`e-${i}`} style={{ padding:'20px', border:'1px solid rgba(255,255,255,0.05)' }}></div>);
        }

        for(let d=1; d<=daysInMonth; d++) {
            const currentDayOfWeek = new Date(year, month, d).getDay();
            const hol = isHoliday(d, month, year);
            const leave = isDateInLeave(d, month, year);
            const weekend = isWeekend(currentDayOfWeek);

            let bg = 'rgba(0,0,0,0.2)';
            let color = '#fff';
            let label = '';

            let isActionable = false;

            if (hol) {
                bg = 'rgba(67, 56, 202, 0.4)'; // Primary brand color
                color = '#fff';
                label = hol.name;
            } else if (leave) {
                if (leave.status === 'PENDING') {
                    bg = 'rgba(245, 158, 11, 0.3)';
                    color = '#fcd34d';
                    label = `[PENDING] ${leave.leave_type}`;
                } else if (leave.status === 'REJECTED') {
                    bg = 'rgba(100, 100, 100, 0.3)';
                    color = '#a1a1aa';
                    label = `[REJECTED] ${leave.leave_type}`;
                } else {
                    // Color palette for all leave types
                    const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
                        SICK:        { bg: 'rgba(239,68,68,0.3)',    color: '#fca5a5' },
                        CASUAL:      { bg: 'rgba(74,222,128,0.2)',   color: '#4ade80' },
                        WFH:         { bg: 'rgba(20,184,166,0.25)',  color: '#2dd4bf' },
                        WEDDING:     { bg: 'rgba(236,72,153,0.25)',  color: '#f9a8d4' },
                        BEREAVEMENT: { bg: 'rgba(100,116,139,0.3)',  color: '#94a3b8' },
                        MATERNITY:   { bg: 'rgba(168,85,247,0.25)',  color: '#d8b4fe' },
                        PATERNITY:   { bg: 'rgba(59,130,246,0.25)', color: '#93c5fd' },
                        EARNED:      { bg: 'rgba(234,179,8,0.25)',   color: '#fde047' },
                        LWP:         { bg: 'rgba(244,63,94,0.3)',    color: '#fb7185' },
                        RH:          { bg: 'rgba(249,115,22,0.3)',   color: '#fdba74' },
                    };
                    const palette = [
                        { bg: 'rgba(249,115,22,0.25)',  color: '#fdba74' },
                        { bg: 'rgba(16,185,129,0.25)',  color: '#6ee7b7' },
                        { bg: 'rgba(99,102,241,0.25)',  color: '#c7d2fe' },
                        { bg: 'rgba(244,63,94,0.25)',   color: '#fda4af' },
                    ];
                    const tc = TYPE_COLORS[leave.leave_type] || palette[availableLeaveTypes.findIndex(t => t.type === leave.leave_type) % palette.length] || palette[0];
                    bg = tc.bg; color = tc.color;
                    label = leave.leave_type;
                }
            } else if (weekend) {
                bg = 'rgba(255,255,255,0.02)';
                color = 'var(--text-muted)';
            } else {
                isActionable = true; // Clickable working day
            }

            // Determine if date is in the past
            const isPast = new Date(year, month, d) < new Date(new Date().setHours(0,0,0,0));
            if (isActionable && isPast) isActionable = false;

            grid.push(
                <div key={d} 
                     onClick={() => isActionable && setSelectedDate(d)}
                     style={{ 
                        padding:'15px', 
                        border:'1px solid rgba(255,255,255,0.05)', 
                        background: bg,
                        color: color,
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '4px',
                        cursor: isActionable ? 'pointer' : 'default',
                        transition: 'background 0.2s',
                        position: 'relative'
                     }}
                     className={isActionable ? 'calendar-cell-hover' : ''}
                >
                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{d}</span>
                    {label && <span style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: '1.2', wordBreak: 'break-word', fontWeight: 600 }}>{label}</span>}
                    {isActionable && <span className="hover-text" style={{ fontSize: '0.65rem', position: 'absolute', bottom: '10px', right: '10px', opacity: 0.5 }}>+ Request</span>}
                </div>
            );
        }

        const totalCells = firstDay + daysInMonth;
        const trailingCells = 42 - totalCells;
        for(let i=0; i<trailingCells; i++) {
            grid.push(<div key={`t-${i}`} style={{ padding:'15px', border:'1px solid rgba(255,255,255,0.05)', minHeight: '100px' }}></div>);
        }
        
        return grid;
    };

    return (
        <div style={{ padding: '20px 0 60px 0', width: '100%', boxSizing: 'border-box', color: 'white', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 280px', 
                gap: '40px', 
                alignItems: 'start',
                maxWidth: '1300px',
                margin: '0 auto',
                padding: '0 40px'
            }}>
                
                {/* CALENDAR BLOCK */}
                <div className="glass-panel" style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{monthNames[month]} {year}</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="nav-link" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }} onClick={prevMonth}>Previous</button>
                            <button className="nav-link" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }} onClick={nextMonth}>Next</button>
                        </div>
                    </div>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)', 
                        gap: '8px' 
                    }}>
                        {renderGrid()}
                    </div>

                    {/* CALENDAR LEGEND */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Policy Leaves</h4>
                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                    {[{ color: '#fca5a5', label: 'Sick' }, { color: '#4ade80', label: 'Casual' }, { color: '#fde047', label: 'Earned' }].map(({ color, label }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />{label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Work & Special</h4>
                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                    {[{ color: '#2dd4bf', label: 'WFH' }, { color: '#fdba74', label: 'Restricted' }, { color: '#fb7185', label: 'Unpaid' }].map(({ color, label }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />{label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--secondary-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</h4>
                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                    {[{ color: '#a78bfa', label: 'Holiday' }, { color: '#fcd34d', label: 'Pending' }, { color: '#a1a1aa', label: 'Rejected' }].map(({ color, label }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />{label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: BALANCES & HOLIDAYS */}
                <div className="glass-panel" style={{ padding: '30px' }}>
                    
                    {balance && balance.leave_balances && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Available Quotas</h3>
                            {Object.entries(balance.leave_balances).map(([type, metrics]: any) => {
                                const rem = (metrics.total || 0) - (metrics.used || 0) - (metrics.pending || 0);
                                return (
                                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{type.toLowerCase()}</span>
                                        <strong style={{ color: rem > 0 ? '#4ade80' : '#f87171' }}>{rem} / {metrics.total || 0} Days</strong>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>Yearly Holiday List</h3>
                    
                    {holidays.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No holidays indexed.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* MANDATORY SECTION */}
                            <div>
                                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Mandatory</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {holidays.filter(h => h.type === 'MANDATORY').map((h, i) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', opacity: new Date(h.date) < new Date() ? 0.5 : 1 }}>
                                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{h.name}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                                {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short'})}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* OPTIONAL SECTION */}
                            {holidays.some(h => h.type === 'OPTIONAL') && (
                                <div style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h4 style={{ fontSize: '0.75rem', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Restricted / Optional</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {holidays.filter(h => h.type === 'OPTIONAL').map((h, i) => (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', opacity: new Date(h.date) < new Date() ? 0.5 : 1 }}>
                                                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{h.name}</strong>
                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short'})}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* REQUEST LEAVE MODAL */}
            {selectedDate && (
                <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ padding: '30px', width: '420px' }}>
                        <h2 className="text-gradient" style={{ marginTop: 0 }}>Request Leave / On-Duty</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>For: <strong>{monthNames[month]} {selectedDate}, {year}</strong></p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Request Type</label>
                            <select className="glass-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
                                {(() => {
                                    const options = [...availableLeaveTypes];
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                                    const hol = holidays.find(h => h.date === dateStr);
                                    if (hol && hol.type === 'OPTIONAL') {
                                        options.push({ type: 'RH', label: `Restricted Holiday (${hol.name})` });
                                    }
                                    return options.map(lt => {
                                        const suffix = lt.max_per_year ? ` (${lt.max_per_year} days/yr)` : '';
                                        return <option key={lt.type} value={lt.type} style={{ background: '#121214', color: 'white' }}>{lt.label}{suffix}</option>;
                                    });
                                })()}
                            </select>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Reason (Optional)</label>
                            <textarea className="glass-input" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', resize: 'none' }} placeholder="Brief reason for your request..." />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="nav-link" onClick={() => setSelectedDate(null)} style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Cancel</button>
                            <button className="edit-btn" onClick={submitLeave} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
