import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function WebsiteDetails({ token, websiteId, onBack }) {
  const [website, setWebsite] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const webRes = await fetchApi(`/websites/${websiteId}`, {}, token);
      setWebsite(webRes.data.website);
      
      const depRes = await fetchApi(`/websites/${websiteId}/deployments`, {}, token);
      setDeployments(depRes.data.deployments || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [websiteId, token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.zipFile.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('zipFile', file);

    try {
      const response = await fetch(`http://localhost:4000/api/websites/${websiteId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      loadData();
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadLogs = async (deploymentId) => {
    setSelectedDeployment(deploymentId);
    try {
      const res = await fetchApi(`/deployments/${deploymentId}/logs`, {}, token);
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!website) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={onBack} className="btn" style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border)' }}>
        &larr; Back to Websites
      </button>

      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="title-glow" style={{ margin: 0 }}>{website.name}</h1>
        <span className={`badge badge-${website.status === 'running' ? 'active' : website.status === 'failed' ? 'danger' : website.status === 'ready' ? 'accent' : 'pending'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
          {website.status.toUpperCase()}
        </span>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Upload ZIP</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <input type="file" name="zipFile" accept=".zip" required className="input-field" style={{ padding: '0.5rem' }} />
            <button type="submit" disabled={uploading} className="btn" style={{ width: '100%' }}>
              {uploading ? 'Uploading...' : 'Upload & Deploy'}
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Deployment Queue</h2>
          {deployments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No deployments yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deployments.map(dep => (
                <li key={dep.id} onClick={() => loadLogs(dep.id)} style={{ padding: '1rem', background: 'var(--glass)', borderRadius: '0.5rem', cursor: 'pointer', border: selectedDeployment === dep.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                  <div className="flex justify-between">
                    <span>Deploy #{dep.id}</span>
                    <span className="badge">{dep.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {new Date(dep.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedDeployment && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Deployment Logs (Deploy #{selectedDeployment})</h2>
          {logs.length === 0 ? (
            <p>No logs found.</p>
          ) : (
            <div style={{ background: '#000', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', color: '#0f0', overflowY: 'auto', maxHeight: '300px' }}>
              {logs.map(log => (
                <div key={log.id} style={{ marginBottom: '0.25rem' }}>
                  <span style={{ color: '#888' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span> 
                  <span style={{ margin: '0 0.5rem', color: log.status === 'error' ? 'var(--danger)' : '#fff' }}>[{log.action}]</span> 
                  {log.status.toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
