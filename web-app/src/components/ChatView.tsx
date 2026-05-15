import { useState, useRef, useEffect } from 'react';
import '../App.css';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  dataPayload?: any;
  explanation?: string;
  policy?: string;
  loading?: boolean;
}

const DataViewer = ({ data }: { data: any }) => {
  if (!data || typeof data !== 'object') return null;
  if (Object.keys(data).length === 0) return null;

  return (
    <div className="beautiful-data-card">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ marginBottom: '6px', lineHeight: '1.4' }}>
          <span className="data-key" style={{ textTransform: 'capitalize', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.85rem' }}>{k.replace(/_/g, ' ')}:</span>
          {typeof v === 'object' && v !== null && !Array.isArray(v) ? (
            <div style={{ paddingLeft: '12px', marginTop: '4px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
              <DataViewer data={v} />
            </div>
          ) : (
            <strong className="data-val" style={{ marginLeft: '6px', color: 'var(--secondary-accent, #c084fc)', fontWeight: 600 }}>
              {Array.isArray(v) ? v.join(", ") : typeof v === 'boolean' ? (v ? "Yes" : "No") : String(v)}
            </strong>
          )}
        </div>
      ))}
    </div>
  );
};

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: 'Hello. I am your HR Assistant. How can I help you today?'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionId = "SESS-" + Math.floor(Math.random() * 100000);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const checkStatus = () => {
      fetch('http://localhost:8000/api/chat/status')
        .then(res => res.json())
        .then(data => setIsProcessing(data.is_processing))
        .catch(() => { });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const generateSalarySlip = async (data: any) => {
    let branding = { company_name: 'DUK CORP', theme_color: '#4338ca', logo_url: '', custom_html: '' };
    try {
      const res = await fetch('http://localhost:8000/api/branding/1/');
      const config = await res.json();
      if (config && !config.detail) branding = config;
    } catch (e) { }

    const findVal = (obj: any, keys: string[]): any => {
      if (!obj || typeof obj !== 'object') return null;
      for (let key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
      }
      // Check common nested structures
      const nested = obj.earnings || obj.deductions || {};
      for (let key of keys) {
        if (nested[key] !== undefined && nested[key] !== null) return nested[key];
      }
      // Recursive deep search
      for (let k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null && k !== 'earnings' && k !== 'deductions') {
          const res = findVal(obj[k], keys);
          if (res !== null) return res;
        }
      }
      return null;
    };

    const findMonth = (obj: any): string => {
      const val = findVal(obj, ['month', 'Month', 'period', 'Period']);
      if (!val) return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = val.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      }
      return val;
    };

    const slipMonth = findMonth(data);

    const cEarnings = findVal(data, ['earnings', 'Earnings']) || {};
    const cDeductions = findVal(data, ['deductions', 'Deductions']) || {};

    const cBase = findVal(data, ['base_salary', 'base salary', 'base']) || findVal(cEarnings, ['base_salary', 'base salary', 'base']) || 'N/A';
    const cNet = findVal(data, ['net_salary', 'net salary']) || 'N/A';

    const renderRows = (obj: any, priorityKeys: string[] = []) => {
      if (!obj || typeof obj !== 'object') return '<tr><td colspan="2">No data</td></tr>';
      
      const formatKey = (k: string) => {
        const lower = k.toLowerCase().replace(/_/g, ' ');
        if (lower === 'hra') return 'HRA';
        if (lower === 'pf') return 'PF';
        return lower.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };

      const allKeys = Object.keys(obj);
      const foundPriority = priorityKeys.filter(pk => allKeys.some(ak => ak.toLowerCase().replace(/_/g, ' ') === pk.toLowerCase().replace(/_/g, ' ')));
      const actualPriority = foundPriority.map(pk => allKeys.find(ak => ak.toLowerCase().replace(/_/g, ' ') === pk.toLowerCase().replace(/_/g, ' '))!);
      
      const remainingKeys = allKeys.filter(k => !actualPriority.includes(k));
      const sortedKeys = [...actualPriority, ...remainingKeys];

      return sortedKeys.map(k => `
        <tr>
          <td>${formatKey(k)}</td>
          <td>${obj[k]}</td>
        </tr>
      `).join('');
    };

    const cGross = findVal(data, ['total_earnings', 'total earnings', 'gross_earnings', 'gross', 'gross_salary']) || 'N/A';
    const cTotalDed = findVal(data, ['total_deductions', 'total deductions']) || 'N/A';

    let html = '';
    if (branding.custom_html && branding.custom_html.trim() !== '') {
      html = branding.custom_html.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_: string, key: string) => {
        if (key === 'month') return slipMonth;
        return findVal(data, [key, key.replace('_', ' ')]) || '';
      });
    } else {
      html = `
          <html>
            <head>
              <title>Salary Slip - ${slipMonth}</title>
              <style>
                 body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #111; }
                 .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 8px; }
                 .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${branding.theme_color}; padding-bottom: 20px; margin-bottom: 20px; }
                 .logo { font-size: 28px; font-weight: 800; color: ${branding.theme_color}; letter-spacing: 1px; }
                 .title { font-size: 18px; color: #666; margin-top: 5px; }
                 .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                 table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                 th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                 th { background-color: #f8fafc; font-weight: 600; color: #333; }
                 .total-row { font-weight: bold; background-color: #eef2ff; }
                 .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                   <div>
                      ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" style="max-height:50px; margin-bottom:10px;"/>` : ''}
                      <div class="logo">${branding.company_name}</div>
                      <div class="title">Official Payroll Slip</div>
                   </div>
                   <div style="text-align:right">
                      <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
                      <strong>Period:</strong> ${slipMonth}<br/>
                      <strong>Employee ID:</strong> EMP001
                   </div>
                </div>
                
                <div class="details-grid">
                   <div>
                      <h3>Earnings</h3>
                      <table>
                         ${renderRows(cEarnings, ['base_salary', 'bonus'])}
                         <tr class="total-row"><td>Gross Earnings</td><td>${cGross}</td></tr>
                      </table>
                   </div>
                   <div>
                      <h3>Deductions</h3>
                      <table>
                         ${renderRows(cDeductions, [])}
                         <tr class="total-row"><td>Total Deductions</td><td>${cTotalDed}</td></tr>
                      </table>
                   </div>
                </div>
                
                <div style="text-align:right; margin-top:20px; padding:20px; background:${branding.theme_color}; color:white; border-radius:6px;">
                   <h2 style="margin:0; font-size:24px;">NET SALARY: ${cNet} INR</h2>
                </div>
                
                <div class="footer">
                   This is a system generated, explicitly mapped payroll abstract generated by the HR Management.
                </div>
              </div>
            </body>
          </html>
          `;
    }

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
  };

  const handleSend = async () => {
    if (!inputVal.trim() && !selectedFile) return;

    const queryText = inputVal.trim() || (selectedFile ? `Analyzing document: ${selectedFile.name}` : "");
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('employee_id', "EMP001");
      formData.append('organization_id', "ORG001");
      formData.append('session_id', sessionId);
      formData.append('query_text', queryText);
      if (selectedFile) {
        formData.append('attachment', selectedFile);
      }

      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: formData
      });
      setSelectedFile(null);
      const result = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: result.data.answer || result.message || "An error occurred.",
        dataPayload: result.data.data,
        explanation: result.data.explanation,
        policy: result.data.policy_reference
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'err', sender: 'assistant', text: 'Error connecting to the backend.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="chat-container glass-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h2 className="text-gradient">SYSTEM LOCKED</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '600px', marginTop: '1rem' }}>
          The Administrator is currently employing an LLM processor to extract logic parameters from a newly uploaded PDF Document. The AI Chatbot is locked until the knowledge base is updated deterministically to absolutely prevent hallucination.
        </p>
        <div className="typing-indicator" style={{ marginTop: '2rem' }}>
          <span className="dot"></span><span className="dot"></span><span className="dot"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">

      <div className="chat-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
            <div className="message-content">{msg.text}</div>
            {msg.explanation && <div className="message-explanation">{msg.explanation}</div>}
            {msg.policy && (
              <div
                className="message-policy"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  const textContent = `HR Restricted Document\n\nPolicy Reference: ${msg.policy}\n\nPlease consult the employee portal for the complete compliance matrices.`;
                  const blob = new Blob([textContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${msg.policy?.replace(/[^a-zA-Z0-9]/g, '_')}_document.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                title="Download Policy Document"
              >
                📜 <span style={{ textDecoration: 'underline' }}>{msg.policy}</span> ▼
              </div>
            )}
            {msg.dataPayload && (
              <>
                <DataViewer data={msg.dataPayload} />
                {(msg.dataPayload.net_salary || msg.dataPayload['net salary'] || msg.dataPayload.total_earnings || msg.dataPayload['total earnings']) && (
                  <button className="edit-btn" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => generateSalarySlip(msg.dataPayload)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    Download PDF Slip
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="message-bubble assistant-bubble typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <footer className="chat-footer-wrapper">
        {selectedFile && (
          <div className="file-preview-bar">
            <div className="file-info">
              <span className="file-icon">📎</span>
              <span className="file-name">{selectedFile.name}</span>
            </div>
            <button className="remove-file" onClick={() => setSelectedFile(null)}>×</button>
          </div>
        )}
        <div className="chat-footer">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask or upload documents for analysis..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={isTyping} className="send-btn">
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

// Removed export default App; (now inline export)
