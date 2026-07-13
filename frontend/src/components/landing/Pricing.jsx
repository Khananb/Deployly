import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function Pricing() {
  return (
    <section id="pricing" className="pricing-section landing-section fade-up delay-100">
      <h2 className="text-center text-gradient" style={{ fontSize: '3rem', marginBottom: '3rem' }}>Simple Pricing</h2>
      
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="glass-panel pricing-founder-card flex flex-col items-center text-center" style={{ padding: '3rem 2.5rem', borderRadius: '16px' }}>
          <div className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
            Founder Edition
          </div>
          <div className="price text-gradient" style={{ fontSize: '3.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>
            ₹79<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/month</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Limited Founder Offer. Only the first 20 customers can purchase this plan.
          </p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', textAlign: 'left', width: '100%' }}>
            {['1 Website', '1 Domain', '1.5 GB SSD Storage', '1 MySQL Database', '1 Node.js App', '1 PHP Website', 'Free SSL', 'File Manager', 'Basic File Upload', 'Restart App', '1000 GB Monthly Bandwidth', 'Email Support', '99.9% Uptime'].map((item, i) => (
              <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}>
                <CheckCircle size={16} color="var(--success)" />
                {item}
              </li>
            ))}
          </ul>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', opacity: 0.8 }}>
            (Fair Usage Policy applies)
          </p>
          
          <Link to="/register" className="btn" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>Get Started</Link>
        </div>
      </div>
    </section>
  );
}
