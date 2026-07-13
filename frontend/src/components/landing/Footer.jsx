import React from 'react';

export default function Footer() {
  return (
    <footer className="glass-panel" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', padding: '3rem 2rem', marginTop: 'auto' }}>
      <div className="flex justify-between items-center" style={{ maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', gap: '2rem' }}>
        <div className="title-glow" style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Deployly</div>
        
        <div className="flex gap-6 flex-wrap" style={{ fontSize: '0.9rem' }}>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Fair Usage Policy</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>GitHub</a>
        </div>
        
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          © 2026 Deployly
        </div>
      </div>
    </footer>
  );
}
