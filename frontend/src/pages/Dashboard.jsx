import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Globe, Server, HardDrive, Activity, Zap, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ token }) {
  const [_stats, setStats] = useState(null);
  const [billing, setBilling] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await fetchApi('/dashboard', {}, token);
        setStats(statsData.data.statistics);
        
        const billingData = await fetchApi('/billing/status', {}, token);
        setBilling(billingData.data);

        // Fetch websites to aggregate remaining metrics
        const websitesData = await fetchApi('/websites', {}, token);
        setWebsites(websitesData.data.websites || []);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, addToast]);

  const handleUpgrade = async () => {
      try {
          const res = await fetchApi('/billing/upgrade', { method: 'POST' }, token);
          if (res.data && res.data.short_url) {
              window.location.href = res.data.short_url;
          }
      } catch(err) {
          addToast('Failed to initiate upgrade: ' + err.message, 'error');
      }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-card" style={{ marginBottom: '1.5rem' }}></div>
        <div className="grid-cards">
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      </div>
    );
  }

  // Aggregations
  const totalWebsites = websites.length;
  const runningWebsites = websites.filter(w => w.status === 'running' || w.status === 'deployed').length;
  const nodeWebsites = websites.filter(w => w.type === 'node' || w.project_type === 'node').length;
  const staticWebsites = websites.filter(w => w.type === 'static' || w.project_type === 'static' || w.project_type === 'unknown').length;
  const recentlyDeployed = [...websites].sort((a, b) => new Date(b.last_deployed_at || 0) - new Date(a.last_deployed_at || 0)).slice(0, 3);
  const storageUsedStr = billing?.usedStorageMb ? `${billing.usedStorageMb} MB` : '0 MB'; // Mocking storage if backend doesn't provide detailed breakdown

  return (
    <div>
      <h1 className="title-glow" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Overview</h1>
      
      {/* Billing Banner */}
      <div className="vercel-card" style={{ 
          marginBottom: '2rem', 
          background: billing.status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)', 
          borderColor: billing.status === 'suspended' ? 'var(--danger)' : 'var(--border)' 
      }}>
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div className="flex items-center gap-4">
                  <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                      <Zap size={24} color="var(--accent)" />
                  </div>
                  <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>
                          Plan: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{billing.status === 'paid' ? 'Founder Edition' : 'Free Trial'}</span>
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                          {billing.status === 'active' && `Your trial ends in ${Math.ceil(billing.trialRemainingDays * 24)} hours.`}
                          {billing.status === 'grace' && <span style={{ color: '#f59e0b' }}>Trial expired! Grace period ends in {Math.ceil(billing.graceRemainingMs / 60000)} minutes.</span>}
                          {billing.status === 'suspended' && <span style={{ color: 'var(--danger)' }}>Account suspended. Upgrade to restore your websites.</span>}
                          {billing.status === 'paid' && `Thank you for being a Founder! Enjoy premium limits.`}
                      </p>
                  </div>
              </div>
              {billing.status !== 'paid' && (
                  <button onClick={handleUpgrade} className="btn" style={{ padding: '0.75rem 1.5rem' }}>
                      Upgrade to Founder
                  </button>
              )}
          </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid-cards">
        <div className="vercel-card">
          <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
            <Globe size={20} color="var(--text-secondary)" />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Websites</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalWebsites}</span>
        </div>
        
        <div className="vercel-card">
          <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
            <Activity size={20} color="var(--success)" />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Running Websites</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{runningWebsites}</span>
        </div>

        <div className="vercel-card">
          <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
            <Server size={20} color="var(--accent)" />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Infrastructure</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Node.js Apps</span>
                <span style={{ fontWeight: 600 }}>{nodeWebsites}</span>
            </div>
            <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Static Sites</span>
                <span style={{ fontWeight: 600 }}>{staticWebsites}</span>
            </div>
          </div>
        </div>

        <div className="vercel-card">
          <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
            <HardDrive size={20} color="#f59e0b" />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Storage Used</span>
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{storageUsedStr}</span>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="vercel-card" style={{ marginTop: '1rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} color="var(--text-secondary)" />
                Recent Deployments
            </h2>
        </div>
        
        {recentlyDeployed.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No recent deployments found.
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentlyDeployed.map((site, idx) => (
                    <Link to={`/dashboard/websites/${site.id}`} key={site.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ 
                            padding: '1.5rem', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: idx === recentlyDeployed.length - 1 ? 'none' : '1px solid var(--border)',
                            transition: 'background 0.2s',
                        }} className="hover:bg-glass">
                            <div className="flex items-center gap-4">
                                <div style={{ 
                                    width: '10px', height: '10px', borderRadius: '50%', 
                                    background: site.status === 'running' || site.status === 'deployed' ? 'var(--success)' : 
                                               site.status === 'failed' ? 'var(--danger)' : '#f59e0b' 
                                }}></div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{site.name}</h4>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{site.live_url || site.domain}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <span className={`badge badge-${site.status === 'running' || site.status === 'deployed' ? 'active' : site.status === 'failed' ? 'danger' : 'pending'}`}>
                                    {site.status.toUpperCase()}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', width: '120px' }}>
                                    {site.last_deployed_at ? new Date(site.last_deployed_at).toLocaleDateString() : 'Never'}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
