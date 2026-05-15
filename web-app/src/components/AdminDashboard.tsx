import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const JsonTreeEditor = ({ data, level = 0 }: any) => {
  if (!data) return null;
  return (
    <div style={{ marginLeft: `${level * 15}px`, marginTop: '8px', borderLeft: level > 0 ? '1px solid var(--glass-border)' : 'none', paddingLeft: level > 0 ? '10px' : '0' }}>
      {Object.keys(data).map(key => {
         const val = data[key];
         if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            return (
               <div key={key} style={{ marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--secondary-accent)', fontSize: '0.85rem', letterSpacing: '1px' }}>
                     {key.replace(/_/g, ' ').toUpperCase()}
                  </strong>
                  <JsonTreeEditor data={val} level={level + 1} />
               </div>
            )
         }
         return (
            <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '6px 0' }}>
               <span style={{ color: 'var(--text-muted)', width: '170px', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}:
               </span>
               {typeof val === 'boolean' ? (
                  <input type="checkbox" className="glass-checkbox" defaultChecked={val} />
               ) : (
                  <input className="glass-input-small" type="text" defaultValue={String(val)} />
               )}
            </div>
         )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('EMPLOYEES');
  const [isUploading, setIsUploading] = useState(false);
  
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [modalTab, setModalTab] = useState('BASIC');

  const [activeLeaveEditId, setActiveLeaveEditId] = useState<number | null>(null);
  const [leaveDraft, setLeaveDraft] = useState<any>({});
  const [salaryPage, setSalaryPage] = useState(1);
  const [showAdvancedJson, setShowAdvancedJson] = useState<Record<number, boolean>>({});
  
  const [branding, setBranding] = useState<any>({ company_name: 'ALLUS CORP', theme_color: '#4338ca', logo_url: '', custom_html: '' });

  const fetchPolicies = () => {
      fetch('http://localhost:8000/api/policies/')
        .then(res => res.json())
        .then(data => setPolicies(data))
        .catch(err => console.log(err));
  };
  
  const fetchHolidays = () => {
      fetch('http://localhost:8000/api/holidays/')
        .then(res => res.json())
        .then(data => setHolidays(data));
  };
  
  const fetchLeaveHistory = () => {
      fetch('http://localhost:8000/api/leave-history/')
        .then(res => res.json())
        .then(data => setLeaveHistory(data));
  };

  const fetchAvailableLeaveTypes = () => {
      fetch('http://localhost:8000/api/calendar?employee_id=EMP001')
        .then(res => res.json())
        .then(data => {
            if (data.available_leave_types && data.available_leave_types.length > 0) {
                setAvailableLeaveTypes(data.available_leave_types);
            } else {
                setAvailableLeaveTypes([
                    { type: 'SICK', label: 'Sick Leave' },
                    { type: 'CASUAL', label: 'Casual Leave' },
                    { type: 'WFH', label: 'Work From Home' },
                ]);
            }
        })
        .catch(() => setAvailableLeaveTypes([
            { type: 'SICK', label: 'Sick Leave' },
            { type: 'CASUAL', label: 'Casual Leave' },
        ]));
  };
  
  const fetchBranding = () => {
      fetch('http://localhost:8000/api/branding/1/')
        .then(res => res.json())
        .then(data => { if (data && !data.detail) setBranding(data); })
        .catch(err => console.log(err));
  };

  const saveBranding = async () => {
      await fetch('http://localhost:8000/api/branding/1/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branding)
      });
      alert('Branding updated successfully!');
  };

  const fetchEmployees = () => {
      fetch('http://localhost:8000/api/employees/')
      .then(res => res.json())
      .then(data => setEmployees(data));
  }

  useEffect(() => {
    fetchEmployees();
    fetchPolicies();
    fetchBranding();
    fetchHolidays();
    fetchLeaveHistory();
    fetchAvailableLeaveTypes();
  }, []);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        await fetch('http://localhost:8000/api/policies/upload', {
            method: 'POST',
            body: formData
        });
        fetchPolicies();
    } catch(err) {
        console.error(err);
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddEmployee = () => {
      setEditingEmp({
          employee_id: `EMP${Math.floor(Math.random()*1000)}`, 
          organization_id: "ORG001", name: "", gender: "Decline to answer", date_of_birth: "", blood_group: "", marital_status: "", nationality: "", profile_picture: "",
          phone_number: "", personal_email: "", address: "", postal_code: "", country: "", state: "", district_county: "", emergency_contact_name: "", emergency_contact_number: "",
          date_of_joining: "", department: "", role: "", professional_email: "", job_title: "", office_location: "", employment_type: "FULL_TIME", probation_start_date: "", probation_end_date: "", work_status: "ACTIVE",
          salary_structure: { base_salary: 0, bonus: 0, allowances: { "hra": 0, "transport": 0 }, deductions: { "tax": 0, "pf": 0 }, pay_cycle: "MONTHLY", currency: "INR" },
          leave_records: { leave_balances: { SICK: {total:10, used:0, pending:0}, CASUAL: {total:12, used:0, pending:0} } },
          leave_history: []
      });
      setModalTab('BASIC');
      setShowEmpModal(true);
  };

  const handleEditEmployee = (emp: any) => {
      const robustEmp = {
          ...emp,
          salary_structure: emp.salary_structure || { allowances: {}, deductions: {} },
          leave_records: emp.leave_records || { leave_balances: { SICK: {}, CASUAL: {} } },
          leave_history: emp.leave_history || []
      };
      setEditingEmp(robustEmp);
      setModalTab('BASIC');
      setSalaryPage(1);
      setShowEmpModal(true);
  };

  const saveEmployee = async () => {
      const isNew = !employees.find((e: any) => e.employee_id === editingEmp.employee_id);
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? 'http://localhost:8000/api/employees/' : `http://localhost:8000/api/employees/${editingEmp.employee_id}/`;
      
      try {
          console.log("[DEBUG] Committing employee data:", editingEmp);
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingEmp)
          });
          if (res.ok) {
              const savedData = await res.json();
              alert(`Success: Changes committed for ${savedData.name} (${savedData.employee_id})!`);
              setShowEmpModal(false);
              await fetchEmployees(); 
          } else {
              const errData = await res.json();
              console.error("[DEBUG] Save failed:", errData);
              alert(`FAILED to commit changes: ${JSON.stringify(errData)}`);
          }
      } catch (err) {
          console.error("[DEBUG] Network error:", err);
          alert('Network error or server unavailable. Please check backend logs.');
      }
  };

  const archiveSalary = async () => {
      const defaultMonth = new Date().toISOString().slice(0, 7);
      const month = prompt("Enter month to archive (Format: YYYY-MM):", defaultMonth);
      if (!month) return;

      // Basic YYYY-MM validation
      const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
      if (!monthRegex.test(month)) {
          alert("Invalid format! Please use YYYY-MM (e.g., 2026-05).");
          return;
      }

      try {
          const res = await fetch(`http://localhost:8000/api/employees/${editingEmp.employee_id}/archive_salary/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  month,
                  salary_structure: editingEmp.salary_structure 
              })
          });
          const data = await res.json();
          if (res.ok) {
              alert(data.message);
              await syncEditingEmp();
          } else {
              alert(`Error: ${data.error || 'Failed to archive salary.'}`);
          }
      } catch (err) {
          alert('Failed to connect to server.');
      }
  };

  const deleteSalary = async (id: number) => {
      if (!window.confirm("Permanently delete this salary record?")) return;
      try {
          const res = await fetch(`http://localhost:8000/api/salaries/${id}/`, { method: 'DELETE' });
          if (res.ok) {
              alert('Salary record removed.');
              await syncEditingEmp();
          } else {
              alert('Failed to remove record.');
          }
      } catch (err) {
          alert('Failed to connect to server.');
      }
  };

  const deleteEmployee = async (id: string) => {
      if(!window.confirm(`Permanently delete employee ${id}?`)) return;
      try {
          await fetch(`http://localhost:8000/api/employees/${id}/`, { method: 'DELETE' });
          fetchEmployees();
      } catch (err) { console.error(err); }
  };

  const syncEditingEmp = async () => {
      const res = await fetch(`http://localhost:8000/api/employees/${editingEmp.employee_id}/`);
      const updated = await res.json();
      setEditingEmp(updated);
      fetchEmployees();
  };

  const addLeave = async () => {
      const payload = {
          employee: editingEmp.employee_id,
          from_date: (document.getElementById('new_leave_from') as HTMLInputElement).value,
          to_date: (document.getElementById('new_leave_to') as HTMLInputElement).value,
          days: Number((document.getElementById('new_leave_days') as HTMLInputElement).value),
          leave_type: (document.getElementById('new_leave_type') as HTMLInputElement).value,
          reason: "Admin Override",
          status: "APPROVED"
      };
      await fetch('http://localhost:8000/api/leave-history/', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
      await syncEditingEmp();
  };

  const deleteLeave = async (id: number) => {
      await fetch(`http://localhost:8000/api/leave-history/${id}/`, { method: 'DELETE' });
      await syncEditingEmp();
  };

  const startLeaveEdit = (lh: any) => {
      setActiveLeaveEditId(lh.id);
      setLeaveDraft({...lh});
  };

  const saveLeaveEdit = async () => {
      await fetch(`http://localhost:8000/api/leave-history/${activeLeaveEditId}/`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...leaveDraft, employee: editingEmp.employee_id})
      });
      setActiveLeaveEditId(null);
      await syncEditingEmp();
  };

  return (
    <div className="dashboard-container glass-panel">
      {/* Massive Tabbed Profile Modal */}
      {showEmpModal && (
          <div className="modal-overlay">
              <div className="modal-content glass-panel" style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <h2 className="text-gradient">
                          {employees.find((e: any) => e.employee_id === editingEmp.employee_id) ? "Modify" : "Provision"} Profile Data
                      </h2>
                      <div className="dashboard-tabs" style={{ borderBottom: 'none', padding: 0 }}>
                          <button className={modalTab === 'BASIC' ? 'tab active' : 'tab'} onClick={() => setModalTab('BASIC')}>Basic</button>
                          <button className={modalTab === 'CONTACT' ? 'tab active' : 'tab'} onClick={() => setModalTab('CONTACT')}>Contact</button>
                          <button className={modalTab === 'JOB' ? 'tab active' : 'tab'} onClick={() => setModalTab('JOB')}>Job</button>
                          <button className={modalTab === 'SALARY' ? 'tab active' : 'tab'} onClick={() => setModalTab('SALARY')}>Salary</button>
                          <button className={modalTab === 'LEAVE' ? 'tab active' : 'tab'} onClick={() => setModalTab('LEAVE')}>Leave State</button>
                      </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', minHeight: '350px' }}>
                      
                      {/* BASIC TAB */}
                      {modalTab === 'BASIC' && (
                         <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Full Name</span><input className="glass-input-small" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} /></div>
                              <div className="form-group"><span>Gender</span><input className="glass-input-small" value={editingEmp.gender} onChange={e => setEditingEmp({...editingEmp, gender: e.target.value})} /></div>
                              <div className="form-group"><span>D.O.B</span><input className="glass-input-small" type="date" value={editingEmp.date_of_birth || ''} onChange={e => setEditingEmp({...editingEmp, date_of_birth: e.target.value})} /></div>
                              <div className="form-group"><span>Blood Grp</span><input className="glass-input-small" value={editingEmp.blood_group} onChange={e => setEditingEmp({...editingEmp, blood_group: e.target.value})} /></div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Marital Status</span><input className="glass-input-small" value={editingEmp.marital_status} onChange={e => setEditingEmp({...editingEmp, marital_status: e.target.value})} /></div>
                              <div className="form-group"><span>Nationality</span><input className="glass-input-small" value={editingEmp.nationality} onChange={e => setEditingEmp({...editingEmp, nationality: e.target.value})} /></div>
                              <div className="form-group"><span>Avatar URL</span><input className="glass-input-small" value={editingEmp.profile_picture || ''} onChange={e => setEditingEmp({...editingEmp, profile_picture: e.target.value})} /></div>
                              <div className="form-group"><span>EID</span><input className="glass-input-small" value={editingEmp.employee_id} disabled={true} /></div>
                          </div>
                         </>
                      )}

                      {/* CONTACT TAB */}
                      {modalTab === 'CONTACT' && (
                         <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Phone No.</span><input className="glass-input-small" value={editingEmp.phone_number} onChange={e => setEditingEmp({...editingEmp, phone_number: e.target.value})} /></div>
                              <div className="form-group"><span>Personal Email</span><input className="glass-input-small" value={editingEmp.personal_email} onChange={e => setEditingEmp({...editingEmp, personal_email: e.target.value})} /></div>
                              <div className="form-group"><span>Address</span><input className="glass-input-small" value={editingEmp.address} onChange={e => setEditingEmp({...editingEmp, address: e.target.value})} /></div>
                              <div className="form-group"><span>Postal Code</span><input className="glass-input-small" value={editingEmp.postal_code} onChange={e => setEditingEmp({...editingEmp, postal_code: e.target.value})} /></div>
                              <div className="form-group"><span>Emergency Name</span><input className="glass-input-small" value={editingEmp.emergency_contact_name} onChange={e => setEditingEmp({...editingEmp, emergency_contact_name: e.target.value})} /></div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Country</span><input className="glass-input-small" value={editingEmp.country} onChange={e => setEditingEmp({...editingEmp, country: e.target.value})} /></div>
                              <div className="form-group"><span>State</span><input className="glass-input-small" value={editingEmp.state} onChange={e => setEditingEmp({...editingEmp, state: e.target.value})} /></div>
                              <div className="form-group"><span>District/County</span><input className="glass-input-small" value={editingEmp.district_county} onChange={e => setEditingEmp({...editingEmp, district_county: e.target.value})} /></div>
                              <div className="form-group"><span>Emergency No.</span><input className="glass-input-small" value={editingEmp.emergency_contact_number} onChange={e => setEditingEmp({...editingEmp, emergency_contact_number: e.target.value})} /></div>
                          </div>
                         </>
                      )}

                      {/* JOB TAB */}
                      {modalTab === 'JOB' && (
                         <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Job Title</span><input className="glass-input-small" value={editingEmp.job_title} onChange={e => setEditingEmp({...editingEmp, job_title: e.target.value})} /></div>
                              <div className="form-group"><span>Role</span><input className="glass-input-small" value={editingEmp.role} onChange={e => setEditingEmp({...editingEmp, role: e.target.value})} /></div>
                              <div className="form-group"><span>Department</span><input className="glass-input-small" value={editingEmp.department} onChange={e => setEditingEmp({...editingEmp, department: e.target.value})} /></div>
                              <div className="form-group"><span>Email</span><input className="glass-input-small" value={editingEmp.professional_email} onChange={e => setEditingEmp({...editingEmp, professional_email: e.target.value})} /></div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Office Local</span><input className="glass-input-small" value={editingEmp.office_location} onChange={e => setEditingEmp({...editingEmp, office_location: e.target.value})} /></div>
                              <div className="form-group"><span>Joined Date</span><input className="glass-input-small" type="date" value={editingEmp.date_of_joining || ''} onChange={e => setEditingEmp({...editingEmp, date_of_joining: e.target.value})} /></div>
                              <div className="form-group"><span>Work Status</span>
                                 <select className="glass-input-small" style={{ backgroundColor: 'transparent' }} value={editingEmp.work_status} onChange={e => setEditingEmp({...editingEmp, work_status: e.target.value})}>
                                    <option value="ACTIVE" style={{ backgroundColor: '#1e1b4b' }}>ACTIVE</option>
                                    <option value="INACTIVE" style={{ backgroundColor: '#1e1b4b' }}>INACTIVE</option>
                                 </select>
                              </div>
                          </div>
                         </>
                      )}

                      {/* SALARY TAB */}
                      {modalTab === 'SALARY' && (
                         <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group"><span>Base Salary</span><input className="glass-input-small" type="number" value={editingEmp.salary_structure?.base_salary || 0} onChange={e => setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, base_salary: Number(e.target.value)}})} /></div>
                              <div className="form-group"><span>Bonus</span><input className="glass-input-small" type="number" value={editingEmp.salary_structure?.bonus || 0} onChange={e => setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, bonus: Number(e.target.value)}})} /></div>
                              
                              <h4 style={{ color: 'var(--secondary-accent)', margin: '10px 0 5px 0', fontSize: '0.9rem' }}>Allowances</h4>
                              {Object.keys(editingEmp.salary_structure?.allowances || {}).map(key => {
                                  const label = key.toLowerCase() === 'hra' ? 'HRA' : key.replace(/_/g, ' ');
                                  return (
                                  <div className="form-group" key={key}>
                                      <span style={{ textTransform: 'capitalize' }}>{label}</span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                          <input className="glass-input-small" type="number" value={editingEmp.salary_structure.allowances[key]} onChange={e => {
                                              const newAllow = {...editingEmp.salary_structure.allowances, [key]: Number(e.target.value)};
                                              setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, allowances: newAllow}});
                                          }} />
                                          <button className="danger-btn" style={{padding: '2px 8px'}} onClick={() => {
                                              const newAllow = {...editingEmp.salary_structure.allowances};
                                              delete newAllow[key];
                                              setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, allowances: newAllow}});
                                          }}>X</button>
                                      </div>
                                  </div>
                                  );
                              })}
                              <button className="edit-btn" style={{ fontSize: '0.75rem', padding: '4px' }} onClick={() => {
                                  const key = prompt("Enter allowance name:");
                                  if (key) {
                                      const newAllow = {...(editingEmp.salary_structure?.allowances || {}), [key.toLowerCase().replace(/ /g, '_')]: 0};
                                      setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, allowances: newAllow}});
                                  }
                              }}>+ Add Allowance</button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <h4 style={{ color: 'var(--secondary-accent)', margin: '0 0 5px 0', fontSize: '0.9rem' }}>Deductions</h4>
                              {Object.keys(editingEmp.salary_structure?.deductions || {}).map(key => {
                                  const label = key.toLowerCase() === 'pf' ? 'PF' : key.replace(/_/g, ' ');
                                  return (
                                  <div className="form-group" key={key}>
                                      <span style={{ textTransform: 'capitalize' }}>{label}</span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                          <input className="glass-input-small" type="number" value={editingEmp.salary_structure.deductions[key]} onChange={e => {
                                              const newDed = {...editingEmp.salary_structure.deductions, [key]: Number(e.target.value)};
                                              setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, deductions: newDed}});
                                          }} />
                                          <button className="danger-btn" style={{padding: '2px 8px'}} onClick={() => {
                                              const newDed = {...editingEmp.salary_structure.deductions};
                                              delete newDed[key];
                                              setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, deductions: newDed}});
                                          }}>X</button>
                                      </div>
                                  </div>
                                  );
                              })}
                              <button className="edit-btn" style={{ fontSize: '0.75rem', padding: '4px' }} onClick={() => {
                                  const key = prompt("Enter deduction name:");
                                  if (key) {
                                      const newDed = {...(editingEmp.salary_structure?.deductions || {}), [key.toLowerCase().replace(/ /g, '_')]: 0};
                                      setEditingEmp({...editingEmp, salary_structure: {...editingEmp.salary_structure, deductions: newDed}});
                                  }
                              }}>+ Add Deduction</button>
                          </div>
                      
                          <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <h3 style={{ color: 'var(--secondary-accent)', margin: 0, fontSize: '1rem' }}>Salary Archival Manifest</h3>
                                  <button className="edit-btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={archiveSalary}>+ Archive Current Month</button>
                              </div>
                                  {editingEmp.monthly_salaries && editingEmp.monthly_salaries.length > 0 ? (
                                      <>
                                      <table className="glass-table" style={{ fontSize: '0.8rem' }}>
                                          <thead><tr><th>Month</th><th>Earnings</th><th>Deductions</th><th>Net Salary</th><th>Act</th></tr></thead>
                                          <tbody>
                                              {[...editingEmp.monthly_salaries]
                                                  .sort((a: any, b: any) => b.month.localeCompare(a.month))
                                                  .slice((salaryPage - 1) * 5, salaryPage * 5)
                                                  .map((s: any) => (
                                                  <tr key={s.id}><td>{s.month}</td>
                                                  <td>{Object.entries(s.earnings||{}).map(([k,v])=>`${k}:${v}`).join(', ')}</td>
                                                  <td>{Object.entries(s.deductions||{}).map(([k,v])=>`${k}:${v}`).join(', ')}</td>
                                                  <td>{s.net_salary} INR</td>
                                                  <td>
                                                      <button className="danger-btn" style={{padding: '2px 6px', fontSize:'0.75rem'}} onClick={() => deleteSalary(s.id)} title="Delete Record">X</button>
                                                  </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                      {Math.ceil(editingEmp.monthly_salaries.length / 5) > 1 && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                              <button className="nav-link" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '4px' }} disabled={salaryPage === 1} onClick={() => setSalaryPage(p => p - 1)}>← Previous</button>
                                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {salaryPage} of {Math.ceil(editingEmp.monthly_salaries.length / 5)}</span>
                                              <button className="nav-link" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '4px' }} disabled={salaryPage === Math.ceil(editingEmp.monthly_salaries.length / 5)} onClick={() => setSalaryPage(p => p + 1)}>Next →</button>
                                          </div>
                                      )}
                                      </>
                                  ) : (
                                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No historical payroll data recorded.</p>
                                  )}
                          </div>
                         </>
                      )}

                      {/* LEAVE & HISTORY TAB */}
                      {modalTab === 'LEAVE' && (
                         <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                              <div>
                                  <h3 style={{ color: 'var(--secondary-accent)', marginBottom: '1rem', fontSize: '1rem' }}>Annual Allocations</h3>
                                  {availableLeaveTypes.filter(lt => lt.type !== 'WFH' && lt.type !== 'LWP').map(lt => {
                                      const currentTotal = editingEmp?.leave_records?.leave_balances?.[lt.type]?.total ?? lt.max_per_year ?? 0;
                                      return (
                                          <div key={lt.type} className="form-group" style={{ marginBottom: '10px' }}>
                                              <span>{lt.label} Quota</span>
                                              <input className="glass-input-small" type="number" value={currentTotal}
                                                  onChange={e => setEditingEmp({...editingEmp, leave_records: {...editingEmp.leave_records, leave_balances: {
                                                      ...editingEmp.leave_records?.leave_balances,
                                                      [lt.type]: {...(editingEmp.leave_records?.leave_balances?.[lt.type] || {used:0,pending:0}), total: Number(e.target.value)}
                                                  }}})}
                                              />
                                          </div>
                                      );
                                  })}
                              </div>
                              <div>
                                  <h3 style={{ color: 'var(--secondary-accent)', marginBottom: '1rem', fontSize: '1rem' }}>Leave History Manifest</h3>
                                  {editingEmp.leave_history && editingEmp.leave_history.length > 0 ? (
                                      <table className="glass-table" style={{ fontSize: '0.8rem' }}>
                                          <thead><tr><th>From</th><th>To</th><th>Days</th><th>Type</th><th>Act</th></tr></thead>
                                          <tbody>
                                              {editingEmp.leave_history.map((lh: any) => (
                                                  <tr key={lh.id}>
                                                      {activeLeaveEditId === lh.id ? (
                                                          <>
                                                              <td><input type="date" className="glass-input-small" style={{width:'100px', padding:'2px', fontSize:'0.75rem'}} value={leaveDraft.from_date} onChange={e => setLeaveDraft({...leaveDraft, from_date: e.target.value})} /></td>
                                                              <td><input type="date" className="glass-input-small" style={{width:'100px', padding:'2px', fontSize:'0.75rem'}} value={leaveDraft.to_date} onChange={e => setLeaveDraft({...leaveDraft, to_date: e.target.value})} /></td>
                                                              <td><input type="number" className="glass-input-small" style={{width:'50px', padding:'2px', fontSize:'0.75rem'}} value={leaveDraft.days} onChange={e => setLeaveDraft({...leaveDraft, days: Number(e.target.value)})} /></td>
                                                              <td><input type="text" className="glass-input-small" style={{width:'70px', padding:'2px', fontSize:'0.75rem'}} value={leaveDraft.leave_type} onChange={e => setLeaveDraft({...leaveDraft, leave_type: e.target.value})} /></td>
                                                              <td>
                                                                  <div style={{display:'flex', gap:'4px'}}>
                                                                     <button className="edit-btn" style={{padding: '2px 6px', fontSize:'0.75rem'}} onClick={saveLeaveEdit} title="Save Edit">S</button>
                                                                     <button className="danger-btn" style={{padding: '2px 6px', fontSize:'0.75rem', background:'transparent'}} onClick={() => setActiveLeaveEditId(null)} title="Cancel">C</button>
                                                                  </div>
                                                              </td>
                                                          </>
                                                      ) : (
                                                          <>
                                                              <td>{lh.from_date}</td><td>{lh.to_date}</td><td>{lh.days}</td><td>{lh.leave_type}</td>
                                                              <td>
                                                                  <div style={{display:'flex', gap:'4px'}}>
                                                                      <button className="edit-btn" style={{padding: '2px 6px', fontSize:'0.75rem'}} onClick={() => startLeaveEdit(lh)} title="Edit Row">E</button>
                                                                      <button className="danger-btn" style={{padding: '2px 6px', fontSize:'0.75rem'}} onClick={() => deleteLeave(lh.id)} title="Delete Row">X</button>
                                                                  </div>
                                                              </td>
                                                          </>
                                                      )}
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  ) : (
                                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No historical leaves explicitly recorded for this unit.</p>
                                  )}
                                  
                                  <div style={{ marginTop: '1rem', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                      <input type="date" className="glass-input-small" id="new_leave_from" title="From Date" />
                                      <input type="date" className="glass-input-small" id="new_leave_to" title="To Date" />
                                      <input type="number" className="glass-input-small" placeholder="Days" id="new_leave_days" style={{width: '60px'}}/>
                                      <select className="glass-input-small" id="new_leave_type" style={{background:'rgba(0,0,0,0.4)', color:'white'}}>
                                          {availableLeaveTypes.map(lt => <option key={lt.type} value={lt.type}>{lt.label}</option>)}
                                      </select>
                                      <button className="edit-btn" onClick={addLeave}>Log</button>
                                  </div>
                              </div>
                            </div>
                         </div>
                      )}

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                      <button className="nav-link" onClick={() => setShowEmpModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Discard Edits</button>
                      <button className="edit-btn" onClick={saveEmployee}>Commit Pipeline Changes</button>
                  </div>
              </div>
          </div>
      )}


      <header className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
            <h1 className="text-gradient">HR Admin Data Master</h1>
            <p className="subtitle">Database Engine & Live Policy Control</p>
         </div>
         <Link to="/" className="nav-link">← Return to Workspace</Link>
      </header>
      
      <div className="dashboard-tabs">
           <button className={`tab ${activeTab === 'EMPLOYEES' ? 'active' : ''}`} onClick={() => setActiveTab('EMPLOYEES')}>Employee Roster</button>
           <button className={`tab ${activeTab === 'POLICIES' ? 'active' : ''}`} onClick={() => setActiveTab('POLICIES')}>Global Policies</button>
           <button className={`tab ${activeTab === 'BRANDING' ? 'active' : ''}`} onClick={() => setActiveTab('BRANDING')}>Templates & Branding</button>
           <button className={`tab ${activeTab === 'HOLIDAYS' ? 'active' : ''}`} onClick={() => setActiveTab('HOLIDAYS')}>Corporate Holidays</button>
           <button className={`tab ${activeTab === 'LEAVES' ? 'active' : ''}`} onClick={() => setActiveTab('LEAVES')}>Approvals: Leave & WFH</button>
      </div>

      <div className="dashboard-body">
        {activeTab === 'EMPLOYEES' && (
        <section className="dashboard-section slide-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <h2>Employees Managed</h2>
             <button className="edit-btn" onClick={handleAddEmployee}>+ Provision Employee</button>
          </div>
          <table className="glass-table">
            <thead>
               <tr><th>ID</th><th>Organization</th><th>Name</th><th>Email</th><th>Title</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
               {employees.map((emp: any) => (
                  <tr key={emp.employee_id}>
                     <td><strong>{emp.employee_id}</strong></td>
                     <td>{emp.organization_id}</td>
                     <td>{emp.name}</td>
                     <td>{emp.professional_email}</td>
                     <td>{emp.job_title}</td>
                     <td><span className={`status-badge ${String(emp.work_status || 'active').toLowerCase()}`}>{emp.work_status}</span></td>
                     <td>
                         <div style={{ display: 'flex', gap: '8px' }}>
                             <button className="edit-btn" onClick={() => handleEditEmployee(emp)}>Modify / Evaluate</button>
                             <button className="danger-btn" onClick={() => deleteEmployee(emp.employee_id)}>Archive</button>
                         </div>
                     </td>
                  </tr>
               ))}
               {employees.length === 0 && <tr><td colSpan={7}>No employees found in active matrix.</td></tr>}
            </tbody>
          </table>
        </section>
        )}

        {activeTab === 'POLICIES' && (
        <section className="dashboard-section slide-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Active Deterministic Policies</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                 {isUploading && <span style={{ color: 'var(--primary-accent)', alignSelf: 'center' }}>Extracting Logic...</span>}
                 <label className="edit-btn" style={{ cursor: 'pointer', opacity: isUploading ? 0.5 : 1 }}>
                    {isUploading ? "Uploading..." : "Upload Policy PDF (RAG)"}
                    <input type="file" accept=".txt,.pdf,.md" style={{ display: 'none' }} disabled={isUploading} onChange={handleFileUpload} />
                 </label>
              </div>
          </div>
          
          <div className="policy-grid">
             {policies.map((pol: any) => {
                 let humanReadable = "";
                 if (pol.rules?.types?.SICK) {
                     humanReadable += `Sick Leave max allowance: ${pol.rules.types.SICK.max_per_year} days. `;
                     humanReadable += `Carry forward: ${pol.rules.types.SICK.carry_forward ? 'Yes' : 'No'}. `;
                 }
                 if (pol.rules?.types?.CASUAL) {
                     humanReadable += `Casual Leave max allowance: ${pol.rules.types.CASUAL.max_per_year} days. `;
                 }
                 if (pol.rules?.lwp_deduction) {
                     humanReadable += `Unpaid Leave Penalty algorithm natively maps to [${pol.rules.lwp_deduction.formula}]. `;
                 }
                 if (pol.rules?.bonus) {
                     humanReadable += `Strict Performance Review needed for Bonus gating: ${pol.rules.bonus.requires_performance_review ? 'Yes' : 'No'}. `; 
                 }
                 if (pol.rules?.constraints?.notice_period_days) {
                     humanReadable += `Mandatory Notice Period: ${pol.rules.constraints.notice_period_days} days. `;
                 }
                 if (pol.rules?.constraints?.max_continuous_wfh_days) {
                     humanReadable += `Max Continuous Remote WFH: ${pol.rules.constraints.max_continuous_wfh_days} days. `;
                 }
                 if (pol.rules?.types?.disciplinary_actions) {
                     humanReadable += `Monitored Conduct Rules enabled. `;
                 }
                 if (!humanReadable) humanReadable = "No simple mapping detected. Toggle Advanced Mode to traverse JSON tree.";
                 
                 return (
                 <div key={pol.id} className="policy-card">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 className="text-gradient" style={{fontSize: '1.2rem', marginBottom:'5px'}}>{pol.policy_name.replace(/_/g, ' ').toUpperCase()}</h3>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>{pol.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="nav-link" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} onClick={() => setShowAdvancedJson({...showAdvancedJson, [pol.id]: !showAdvancedJson[pol.id]})}>
                                 {showAdvancedJson[pol.id] ? "View Simple Summary" : "Edit JSON Syntax"}
                            </button>
                            <button className="danger-btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} title="Delete Policy" onClick={async () => {
                                if(!window.confirm(`Permanently delete ${pol.policy_name}?`)) return;
                                await fetch(`http://localhost:8000/api/policies/${pol.id}/`, { method: 'DELETE' });
                                fetchPolicies();
                            }}>X</button>
                        </div>
                     </div>
                     
                     <div className="policy-tree-container" style={{ background: 'rgba(0,0,0,0.2)', padding:'15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {showAdvancedJson[pol.id] ? (
                            <>
                                <JsonTreeEditor data={pol.rules} />
                                <div style={{textAlign:'right', marginTop:'10px'}}>
                                    <button className="edit-btn" style={{ padding: '0.2rem 0.8rem', fontSize: '0.8.5rem' }}>Save Rules</button>
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                                <strong style={{ color: 'var(--secondary-accent)' }}>Live Operating Principles:</strong><br/>
                                {humanReadable}
                            </div>
                        )}
                     </div>
                 </div>
                 );
             })}
              {policies.length === 0 && <p className="nav-link" style={{ textAlign: 'center' }}>No active policies explicitly synced.</p>}
           </div>
         </section>
        )}

        {activeTab === 'BRANDING' && (
           <section className="dashboard-section slide-in">
               <h2 className="text-gradient" style={{marginBottom:'0.5rem'}}>Brand Configuration</h2>
               <p style={{color:'var(--text-muted)', marginBottom:'20px'}}>These values govern the natively mapped style parameters spanning internal forms implicitly.</p>
               
               <div style={{display:'grid', gap:'20px', gridTemplateColumns:'1fr 1fr'}}>
                  <div>
                      <label style={{display:'block', marginBottom:'8px', color:'var(--text-muted)', fontSize:'0.95rem'}}>Company Name</label>
                      <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={branding.company_name} onChange={e=>setBranding({...branding, company_name: e.target.value})} />
                  </div>
                  <div>
                      <label style={{display:'block', marginBottom:'8px', color:'var(--text-muted)', fontSize:'0.95rem'}}>Theme Hex Color</label>
                      <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={branding.theme_color} onChange={e=>setBranding({...branding, theme_color: e.target.value})} />
                  </div>
                  <div style={{gridColumn:'span 2'}}>
                      <label style={{display:'block', marginBottom:'8px', color:'var(--text-muted)', fontSize:'0.95rem'}}>Logo Asset URL</label>
                      <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={branding.logo_url || ''} onChange={e=>setBranding({...branding, logo_url: e.target.value})} />
                  </div>
                  <div style={{gridColumn:'span 2'}}>
                      <label style={{display:'block', marginBottom:'8px', color:'var(--text-muted)', fontSize:'0.95rem'}}>Custom HTML Template String Override (Use {'{{variable}}'} matching explicit payload variables)</label>
                      <textarea className="glass-input" style={{width: '100%', height:'350px', padding: '15px', fontFamily:'monospace', resize:'vertical', fontSize:'0.9rem'}} value={branding.custom_html || ''} onChange={e=>setBranding({...branding, custom_html: e.target.value})} placeholder="<html>&#10; ... <td>{{net_salary}}</td> ... &#10;</html>" />
                  </div>
                  <div style={{gridColumn:'span 2', textAlign:'right', marginTop:'10px'}}>
                      <button className="edit-btn" style={{ padding: '12px 24px', fontSize: '1rem' }} onClick={saveBranding}>Deploy Active Brand Params</button>
                  </div>
               </div>
           </section>
        )}
        {activeTab === 'HOLIDAYS' && (
           <section className="dashboard-section slide-in">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2>Corporate Holidays Master</h2>
               </div>
               
               <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                   <div>
                       <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom:'5px' }}>Date</label>
                       <input type="date" id="new_hol_date" className="glass-input" style={{ padding: '8px' }} />
                   </div>
                   <div>
                       <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom:'5px' }}>Holiday Name</label>
                       <input type="text" id="new_hol_name" className="glass-input" style={{ padding: '8px', width: '250px' }} placeholder="e.g. Christmas Day" />
                   </div>
                   <div>
                       <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom:'5px' }}>Type</label>
                       <select id="new_hol_type" className="glass-input" style={{ padding: '8px', background:'rgba(0,0,0,0.5)', color:'white' }}>
                           <option value="MANDATORY">MANDATORY</option>
                           <option value="OPTIONAL">OPTIONAL</option>
                       </select>
                   </div>
                   <button className="edit-btn" style={{ padding: '8px 20px' }} onClick={async () => {
                       const payload = {
                           date: (document.getElementById('new_hol_date') as HTMLInputElement).value,
                           name: (document.getElementById('new_hol_name') as HTMLInputElement).value,
                           type: (document.getElementById('new_hol_type') as HTMLInputElement).value
                       };
                       if (!payload.date || !payload.name) return alert("Fill all fields");
                       await fetch('http://localhost:8000/api/holidays/', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                       fetchHolidays();
                   }}>+ Push Holiday</button>
               </div>

               <table className="glass-table">
                 <thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
                 <tbody>
                    {holidays.map((h: any) => (
                       <tr key={h.id}>
                          <td>{h.date}</td>
                          <td><strong>{h.name}</strong></td>
                          <td><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{h.type}</span></td>
                          <td><button className="danger-btn" onClick={async () => {
                              if(!window.confirm(`Delete ${h.name}?`)) return;
                              await fetch(`http://localhost:8000/api/holidays/${h.id}/`, { method: 'DELETE' });
                              fetchHolidays();
                          }}>Delete</button></td>
                       </tr>
                    ))}
                    {holidays.length === 0 && <tr><td colSpan={4}>No corporate holidays tracked.</td></tr>}
                 </tbody>
               </table>
           </section>
        )}

        {activeTab === 'LEAVES' && (
           <section className="dashboard-section slide-in">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2>Global Pending Approvals Queue</h2>
               </div>

               <table className="glass-table">
                 <thead><tr><th>ID</th><th>Employee</th><th>Dates</th><th>Days</th><th>Type / Reason</th><th>Status</th><th>Actions</th></tr></thead>
                 <tbody>
                    {leaveHistory.filter((lh:any)=>lh.status === 'PENDING').map((l: any) => (
                       <tr key={l.id}>
                          <td>#{l.id}</td>
                          <td><strong>{l.employee}</strong></td>
                          <td>{l.from_date} <br/> <span style={{fontSize:'10px', color:'var(--text-muted)'}}>to</span> <br/> {l.to_date}</td>
                          <td>{l.days} Day(s)</td>
                           <td>
                               {(() => {
                                   const typeColors: Record<string, {bg: string, color: string}> = {
                                       SICK:    { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5' },
                                       CASUAL:  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
                                       WFH:     { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf' },
                                       LWP:     { bg: 'rgba(244,63,94,0.15)',    color: '#fb7185' },
                                       WEDDING: { bg: 'rgba(236,72,153,0.15)',  color: '#f9a8d4' },
                                   };
                                   const tc = typeColors[l.leave_type] || { bg: 'rgba(255,255,255,0.1)', color: '#e2e8f0' };
                                   return (
                                       <>
                                           <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: tc.bg, color: tc.color, marginBottom: '4px' }}>
                                               {l.leave_type.replace(/_/g, ' ')}
                                           </span><br/>
                                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.reason}</span>
                                       </>
                                   );
                               })()}
                           </td>
                          <td><span className="status-badge" style={{color:'#fcd34d', borderColor:'#fcd34d', background:'rgba(245, 158, 11, 0.1)'}}>PENDING</span></td>
                          <td>
                             <div style={{ display: 'flex', gap: '8px' }}>
                                 <button className="edit-btn" style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', borderColor: '#4ade80' }} onClick={async () => {
                                     await fetch(`http://localhost:8000/api/leave-history/${l.id}/`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'APPROVED'}) });
                                     fetchLeaveHistory(); // Reload queue
                                 }}>Approve</button>
                                 <button className="danger-btn" onClick={async () => {
                                     await fetch(`http://localhost:8000/api/leave-history/${l.id}/`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'REJECTED'}) });
                                     fetchLeaveHistory(); // Reload queue
                                 }}>Reject</button>
                             </div>
                          </td>
                       </tr>
                    ))}
                    {leaveHistory.filter((lh:any)=>lh.status === 'PENDING').length === 0 && (
                        <tr><td colSpan={7} style={{textAlign:'center', color:'var(--text-muted)'}}>No pending leave approvals detected in the queue.</td></tr>
                    )}
                 </tbody>
               </table>
           </section>
        )}

      </div>
    </div>
  );
}
