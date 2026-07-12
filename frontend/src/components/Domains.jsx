import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function Domains({ token }) {
  const [domains, setDomains] = useState([]);
  const [error, setError] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  const loadDomains = async () => {
    try {
      const data = await fetchApi('/domains', {}, token);
      setDomains(data.data.domains || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDomain) return;
    setAdding(true);
    setError('');
    try {
      await fetchApi('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: newDomain })
      }, token);
      setNewDomain('');
      loadDomains();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this domain?')) return;
    try {
      await fetchApi(`/domains/${id}`, { method: 'DELETE' }, token);
      loadDomains();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="title-glow" style={{ margin: 0 }}>My Domains</h1>
        
        <form onSubmit={handleAdd} className="flex gap-4">
          <input 
            type="text" 
            className="input-field" 
            placeholder="example.com" 
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
          />
          <button type="submit" disabled={adding} className="btn">
            {adding ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>DOMAIN NAME</th>
              <th>STATUS</th>
              <th>CREATED AT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr><td colSpan="4" className="text-center">No domains found.</td></tr>
            ) : (
              domains.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.domain}</td>
                  <td>
                    <span className={`badge badge-${d.status === 'active' ? 'active' : 'pending'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDelete(d.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Delete</button>
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
