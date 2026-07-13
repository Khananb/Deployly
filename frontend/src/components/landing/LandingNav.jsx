import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingNav() {
  return (
    <nav className="landing-nav glass-panel fade-up">
      <div className="nav-container flex justify-between items-center">
        <div className="nav-logo title-glow" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          Deployly
        </div>
        <div className="nav-links flex gap-4">
          <a href="#home" className="nav-link">Home</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <div className="nav-actions flex gap-4 items-center">
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
          <Link to="/register" className="btn" style={{ padding: '0.5rem 1rem' }}>Register</Link>
        </div>
      </div>
    </nav>
  );
}
