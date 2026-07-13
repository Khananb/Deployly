import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code } from 'lucide-react';

export default function Hero() {
  return (
    <header id="home" className="hero-section mesh-gradient flex flex-col items-center text-center fade-up delay-100" style={{ minHeight: '80vh', justifyContent: 'center' }}>
      <div className="badge badge-active mb-6 fade-up delay-200" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Code size={14} /> Deployly 1.0 is now live
      </div>
      <h1 className="text-gradient fade-up delay-300" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: '1.5rem', lineHeight: '1.2', maxWidth: '800px', fontWeight: '700', letterSpacing: '-0.04em', padding: '0.1em 0' }}>
        Deploy Websites in Minutes.
      </h1>
      <p className="fade-up delay-400" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '2.5rem', lineHeight: '1.6' }}>
        Fast, Secure and Affordable Cloud Hosting for Developers, Students and Small Businesses. Skip the server configuration and just push code.
      </p>
      <div className="flex gap-4 fade-up delay-500">
        <Link to="/register" className="btn" style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem' }}>
          Start Deploying <ArrowRight size={18} />
        </Link>
        <a href="#pricing" className="btn btn-secondary" style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem' }}>View Pricing</a>
      </div>
    </header>
  );
}
