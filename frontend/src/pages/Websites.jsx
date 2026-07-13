import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import WebsiteDetails from './WebsiteDetails';

export default function Websites({ token }) {
  const [websites, setWebsites] = useState([]);
  const [error, setError] = useState('');
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');
  const [newWebsiteType, setNewWebsiteType] = useState('node');
  const [adding, setAdding] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null);

  const loadWebsites = async () => {
    try {
      const data = await fetchApi('/websites', {}, token);
      setWebsites(data.data.websites || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!selectedWebsiteId) {
      loadWebsites();
    }
  }, [token, selectedWebsiteId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newWebsiteName || !newWebsiteDomain) return;
    setAdding(true);
    setError('');
    try {
      await fetchApi('/websites', {
        method: 'POST',
        body: JSON.stringify({ name: newWebsiteName, domain: newWebsiteDomain, type: newWebsiteType })
      }, token);
      setNewWebsiteName('');
      setNewWebsiteDomain('');
      setNewWebsiteType('node');
      loadWebsites();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this website?')) return;
    try {
      await fetchApi(`/websites/${id}`, { method: 'DELETE' }, token);
      loadWebsites();
    } catch (err) {
      setError(err.message);
    }
  };

  if (selectedWebsiteId) {
    return <WebsiteDetails token={token} websiteId={selectedWebsiteId} onBack={() => setSelectedWebsiteId(null)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="title-glow" style={{ margin: 0 }}>My Websites</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Create New Website</h2>
        <form onSubmit={handleAdd} className="flex gap-4 items-center">
          <input 
            type="text" 
            className="input-field" 
            placeholder="App Name" 
            value={newWebsiteName}
            onChange={e => setNewWebsiteName(e.target.value)}
            required
          />
          <input 
            type="text" 
            className="input-field" 
            placeholder="example.com" 
            value={newWebsiteDomain}
            onChange={e => setNewWebsiteDomain(e.target.value)}
            required
          />
          <select 
            className="input-field" 
            value={newWebsiteType} 
            onChange={e => setNewWebsiteType(e.target.value)}
          >
            <option value="node">Node.js</option>
            <option value="php">PHP</option>
          </select>
          <button type="submit" disabled={adding} className="btn">
            {adding ? 'Creating...' : 'Create Website'}
          </button>
        </form>
        {error && <div style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>DOMAIN</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>CREATED AT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {websites.length === 0 ? (
              <tr><td colSpan="6" className="text-center">No websites found.</td></tr>
            ) : (
              websites.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td style={{ color: 'var(--accent)' }}>{w.domain}</td>
                  <td><span className="badge" style={{ background: 'var(--glass)' }}>{w.type}</span></td>
                  <td>
                    <span className={`badge badge-${w.status === 'running' ? 'active' : w.status === 'failed' ? 'danger' : w.status === 'ready' ? 'accent' : 'pending'}`}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="flex gap-2">
                    <button onClick={() => setSelectedWebsiteId(w.id)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Manage</button>
                    <button onClick={() => handleDelete(w.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
