import React from 'react';

export default function TrustedBy() {
  return (
    <section className="landing-section text-center fade-up delay-200" style={{ paddingTop: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
        Trusted by Innovative Teams (Coming Soon)
      </p>
      <div className="flex justify-center gap-8 flex-wrap opacity-50 grayscale">
        {/* Placeholders for logos */}
        <div style={{ height: '30px', width: '120px', background: 'var(--border)', borderRadius: '4px' }}></div>
        <div style={{ height: '30px', width: '120px', background: 'var(--border)', borderRadius: '4px' }}></div>
        <div style={{ height: '30px', width: '120px', background: 'var(--border)', borderRadius: '4px' }}></div>
        <div style={{ height: '30px', width: '120px', background: 'var(--border)', borderRadius: '4px' }}></div>
      </div>
    </section>
  );
}
