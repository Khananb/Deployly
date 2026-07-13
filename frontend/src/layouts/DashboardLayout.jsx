import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import '../index.css';

export default function DashboardLayout({ token, user, onLogout }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <nav className="sidebar">
        <h2 className="title-glow" style={{ marginBottom: '2rem', paddingLeft: '1rem' }}>Deployly</h2>
        <NavLink 
          to="/dashboard" 
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/dashboard/websites" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Websites
        </NavLink>

        <NavLink 
          to="/dashboard/billing" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Billing History
        </NavLink>
        <NavLink 
          to="/dashboard/support" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Support
        </NavLink>
        <NavLink 
          to="/dashboard/profile" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Profile
        </NavLink>
      </nav>
      <main className="main-content">
        <Outlet context={{ token, user, onLogout }} />
      </main>
    </div>
  );
}
