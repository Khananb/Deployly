import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await fetchApi('/dashboard', {}, token);
        setStats(statsData.data.statistics);
        
        const billingData = await fetchApi('/billing/status', {}, token);
        setBilling(billingData.data);
      } catch (err) {
        setError(err.message);
      }
    };
    loadData();
  }, [token]);

  if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!stats || !billing) return <div>Loading...</div>;

  const handleUpgrade = async () => {
      try {
          const res = await fetchApi('/billing/upgrade', { method: 'POST' }, token);
          if (res.data && res.data.short_url) {
              window.location.href = res.data.short_url;
          }
      } catch(err) {
          alert('Failed to initiate upgrade: ' + err.message);
      }
  };

  return (
    <div>
      <h1 className="title-glow">Dashboard Overview</h1>
      
      {/* Billing Banner */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', background: billing.status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)', border: billing.status === 'suspended' ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Billing Status: <span style={{ textTransform: 'capitalize', color: billing.status === 'active' ? 'var(--success)' : billing.status === 'paid' ? '#3b82f6' : 'var(--danger)' }}>{billing.status}</span></h3>
                  {billing.status === 'active' && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Trial ends in {Math.ceil(billing.trialRemainingDays * 24)} hours.</p>}
                  {billing.status === 'grace' && <p style={{ margin: 0, color: '#f59e0b' }}>Trial expired! Grace period ends in {Math.ceil(billing.graceRemainingMs / 60000)} minutes.</p>}
                  {billing.status === 'suspended' && <p style={{ margin: 0, color: 'var(--danger)' }}>Account suspended. Upgrade to restore your websites.</p>}
                  {billing.status === 'paid' && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Pro Plan active. {Math.ceil(billing.paidRemainingDays)} days remaining.</p>}
              </div>
              {billing.status !== 'paid' && (
                  <button onClick={handleUpgrade} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Upgrade Now
                  </button>
              )}
          </div>
      </div>
      
      <div className="grid-cards">
        <div className="glass-panel stat-card">
          <span className="label">Total Websites</span>
          <span className="value">{stats.totalWebsites}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="label">Active Websites</span>
          <span className="value" style={{ color: 'var(--success)' }}>{stats.activeWebsites}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="label">Pending Deployments</span>
          <span className="value" style={{ color: '#f59e0b' }}>{stats.pendingWebsites}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="label">Failed Deployments</span>
          <span className="value" style={{ color: 'var(--danger)' }}>{stats.failedWebsites}</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Recent Activity</h2>
        {stats.lastDeploymentTime ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Last Deployment: {new Date(stats.lastDeploymentTime).toLocaleString()}
          </p>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No recent activity to show.</p>
        )}
      </div>
    </div>
  );
}
