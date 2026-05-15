import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import EmployeeDashboard from './components/EmployeeDashboard.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<EmployeeDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
