import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import '../index.css';

export default function DashboardLayout({ token, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2 className="title-glow" style={{ margin: 0, fontSize: '1.5rem' }}>Deployly</h2>
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} color="var(--text-primary)" />
        </button>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="title-glow" style={{ margin: 0 }}>Deployly</h2>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={24} color="var(--text-secondary)" />
          </button>
        </div>
        <div className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/dashboard/websites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Websites</NavLink>
          <NavLink to="/dashboard/billing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Billing History</NavLink>
          <NavLink to="/dashboard/support" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Support</NavLink>
          <NavLink to="/dashboard/doctor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>🩺 Deployly Doctor</NavLink>
          <NavLink to="/dashboard/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Profile</NavLink>
          <button onClick={onLogout} className="nav-item" style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontSize: 'inherit', fontFamily: 'inherit' }}>Logout</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet context={{ token, user, onLogout }} />
      </main>
    </div>
  );
}
