import React from 'react';

export default function WhyDeployly() {
  return (
    <section id="why" className="why-section landing-section text-center fade-up">
      <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Eliminate the Complexity</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', lineHeight: '1.8', maxWidth: '800px', margin: '0 auto' }}>
        We built Deployly to eliminate the complexity of AWS, DigitalOcean, and traditional VPS setups. 
        By abstracting away PM2 configurations, Nginx reverse proxies, and database provisioning, 
        you can focus on what you do best: writing code. No DevOps degree required.
      </p>
    </section>
  );
}
