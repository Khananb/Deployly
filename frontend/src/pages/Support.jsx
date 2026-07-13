import React from 'react';

export default function Support() {
  return (
    <div>
      <h1 className="title-glow">Support & Refunds</h1>
      
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Need Help?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          If you are experiencing issues with your deployments, billing, or want to request a refund, please reach out to us.
        </p>

        <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Email: <a href="mailto:host@aistack.fun" style={{ color: 'var(--primary)', textDecoration: 'none' }}>host@aistack.fun</a>
        </div>
        
        <p style={{ color: '#f59e0b' }}>
          Average response time: Within 24 Hours.
        </p>
      </div>
    </div>
  );
}
