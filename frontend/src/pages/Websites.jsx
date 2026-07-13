import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import WebsiteDetails from './WebsiteDetails';
import { useToast } from '../context/ToastContext';
import { Search, Filter, Plus, Globe, ExternalLink, Settings, Trash2 } from 'lucide-react';

export default function Websites({ token }) {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');
  const [newWebsiteType, setNewWebsiteType] = useState('node');
  const [adding, setAdding] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const { addToast } = useToast();

  const loadWebsites = async () => {
    try {
      const data = await fetchApi('/websites', {}, token);
      setWebsites(data.data.websites || []);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
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
    try {
      await fetchApi('/websites', {
        method: 'POST',
        body: JSON.stringify({ name: newWebsiteName, domain: newWebsiteDomain, type: newWebsiteType })
      }, token);
      setNewWebsiteName('');
      setNewWebsiteDomain('');
      setNewWebsiteType('node');
      setShowCreate(false);
      loadWebsites();
      addToast('Project created successfully!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await fetchApi(`/websites/${id}`, { method: 'DELETE' }, token);
      loadWebsites();
      addToast('Project deleted', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredWebsites = websites.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          w.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const mappedStatus = w.status === 'running' ? 'deployed' : w.status;
    const matchesStatus = statusFilter === 'All' || mappedStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (selectedWebsiteId) {
    return <WebsiteDetails token={token} websiteId={selectedWebsiteId} onBack={() => setSelectedWebsiteId(null)} />;
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
            <div className="skeleton skeleton-title" style={{ width: '200px', margin: 0 }}></div>
            <div className="skeleton" style={{ width: '120px', height: '40px' }}></div>
        </div>
        <div className="grid-cards">
            {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '2.5rem' }}>
        <h1 className="title-glow" style={{ margin: 0, fontSize: '2rem' }}>Projects</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn">
          <Plus size={18} /> New Project
        </button>
      </div>

      {showCreate && (
        <div className="vercel-card" style={{ marginBottom: '2rem', animation: 'toast-slide-up 0.2s ease-out' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Create a New Project</h2>
            <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                    <label>Project Name</label>
                    <input type="text" className="input-field" placeholder="my-awesome-app" value={newWebsiteName} onChange={e => setNewWebsiteName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                    <label>Domain</label>
                    <input type="text" className="input-field" placeholder="example.com" value={newWebsiteDomain} onChange={e => setNewWebsiteDomain(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                    <label>Engine</label>
                    <select className="input-field" value={newWebsiteType} onChange={e => setNewWebsiteType(e.target.value)}>
                        <option value="node">Node.js App</option>
                        <option value="php">PHP App</option>
                    </select>
                </div>
                <button type="submit" disabled={adding} className="btn" style={{ minWidth: '150px' }}>
                    {adding ? <span className="spinner spinner-sm"></span> : 'Deploy Now'}
                </button>
            </form>
        </div>
      )}

      {websites.length === 0 && !showCreate ? (
        <div className="vercel-card flex flex-col items-center justify-center" style={{ padding: '6rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Github size={48} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Let's build something new.</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>You haven't deployed any projects yet. Create a new project to get started with your first deployment.</p>
          <button onClick={() => setShowCreate(true)} className="btn">
            <Plus size={18} /> Create Project
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-4 items-center" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div className="input-field flex items-center gap-2" style={{ flex: 1, minWidth: '250px', background: 'var(--bg-secondary)', padding: '0.5rem 1rem' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                  type="text" 
                  placeholder="Search projects or domains..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
                />
            </div>
            <div className="input-field flex items-center gap-2" style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem' }}>
                <Filter size={18} color="var(--text-secondary)" />
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="All">All Environments</option>
                  <option value="Deployed">Production (Live)</option>
                  <option value="Deploying">Building</option>
                  <option value="Failed">Failed</option>
                </select>
            </div>
          </div>

          <div className="grid-cards">
            {filteredWebsites.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No projects match your search criteria.
                </div>
            ) : (
                filteredWebsites.map(w => (
                    <div key={w.id} className="vercel-card hover:bg-glass" onClick={() => setSelectedWebsiteId(w.id)} style={{ cursor: 'pointer', padding: '1.25rem' }}>
                        <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                            <div className="flex items-center gap-3">
                                <div style={{ 
                                    width: '40px', height: '40px', borderRadius: '8px', 
                                    background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid var(--border)'
                                }}>
                                    <Globe size={20} color="var(--text-secondary)" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{w.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{w.domain}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Framework</span>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{w.framework || 'Generic'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Updated</span>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{w.last_deployed_at ? new Date(w.last_deployed_at).toLocaleDateString() : 'Never'}</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2">
                                <div style={{ 
                                    width: '8px', height: '8px', borderRadius: '50%', 
                                    background: w.status === 'running' || w.status === 'deployed' ? 'var(--success)' : 
                                               w.status === 'failed' ? 'var(--danger)' : '#f59e0b',
                                    boxShadow: w.status === 'running' || w.status === 'deployed' ? '0 0 8px var(--success)' : 'none'
                                }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {w.status === 'running' ? 'Live' : w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                                </span>
                            </div>
                            
                            <div className="flex gap-2">
                                {w.live_url && (
                                    <button onClick={(e) => { e.stopPropagation(); window.open(w.live_url, '_blank'); }} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Visit Website">
                                        <ExternalLink size={16} />
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setSelectedWebsiteId(w.id); }} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Settings">
                                    <Settings size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
