import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi('/dashboard', {}, token);
        setStats(data.data.statistics);
      } catch (err) {
        setError(err.message);
      }
    };
    loadStats();
  }, [token]);

  if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="title-glow">Dashboard Overview</h1>
      
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
