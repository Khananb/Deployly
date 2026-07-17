import React from 'react';
import { Rocket, Shield, Globe, Terminal, Server, Database, Folder, RotateCw } from 'lucide-react';

export default function Features() {
  const features = [
    { title: "One Click Deploy", desc: "Upload your ZIP file and go live instantly without configuring servers.", icon: <Rocket size={20} color="var(--accent)" /> },
    { title: "Coming Soon", desc: "Automated HTTPS provisioning for every custom domain you connect.", icon: <Shield size={20} color="var(--accent)" /> },
    { title: "Custom Domains", desc: "Easily point your own domain names to your deployed applications.", icon: <Globe size={20} color="var(--accent)" /> },
    { title: "Node.js Hosting", desc: "PM2-powered isolated environments for your modern JavaScript backends.", icon: <Terminal size={20} color="var(--accent)" /> },
    { title: "PHP Hosting", desc: "Optimized runtime for traditional PHP monoliths and CMS platforms.", icon: <Server size={20} color="var(--accent)" /> },
    { title: "MySQL Database", desc: "Provision dedicated databases with one click for dynamic applications.", icon: <Database size={20} color="var(--accent)" /> },
    { title: "File Manager", desc: "Manage your static assets and configurations directly from the dashboard.", icon: <Folder size={20} color="var(--accent)" /> },
    { title: "Restart Apps", desc: "Full control over your application lifecycle with one-click restarts.", icon: <RotateCw size={20} color="var(--accent)" /> }
  ];

  return (
    <section id="features" className="features-section fade-up">
      <div className="landing-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <h2 className="text-center text-gradient" style={{ fontSize: '3rem', marginBottom: '4rem' }}>Built for Production</h2>
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {features.map((feature, i) => (
            <div key={i} className="glass-panel premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {feature.icon}
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
