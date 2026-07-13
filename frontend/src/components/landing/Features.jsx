import React from 'react';

export default function Features() {
  const features = [
    { title: "One Click Deploy", desc: "Upload your ZIP file and go live instantly without configuring servers." },
    { title: "Free SSL", desc: "Automated HTTPS provisioning for every custom domain you connect." },
    { title: "Custom Domains", desc: "Easily point your own domain names to your deployed applications." },
    { title: "Node.js Hosting", desc: "PM2-powered isolated environments for your modern JavaScript backends." },
    { title: "PHP Hosting", desc: "Optimized runtime for traditional PHP monoliths and CMS platforms." },
    { title: "MySQL Database", desc: "Provision dedicated databases with one click for dynamic applications." },
    { title: "File Manager", desc: "Manage your static assets and configurations directly from the dashboard." },
    { title: "Restart Apps", desc: "Full control over your application lifecycle with one-click restarts." }
  ];

  return (
    <section id="features" className="features-section fade-up">
      <div className="landing-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <h2 className="text-center text-gradient" style={{ fontSize: '3rem', marginBottom: '4rem' }}>Built for Production</h2>
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {features.map((feature, i) => (
            <div key={i} className="glass-panel premium-card" style={{ padding: '2rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '20px', height: '20px', background: 'var(--accent)', borderRadius: '4px' }}></div>
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
