import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import UploadZip from '../components/UploadZip';
import { ExternalLink, Terminal, Trash2, ArrowLeft, RefreshCw, GitBranch, Server, Globe } from 'lucide-react';

export default function WebsiteDetails({ token, websiteId, onBack }) {
  const [website, setWebsite] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  
  const { addToast } = useToast();
  const pollInterval = useRef(null);

  const loadData = React.useCallback(async () => {
    try {
      const webRes = await fetchApi(`/websites/${websiteId}`, {}, token);
      setWebsite(webRes.data.website);
      
      const depRes = await fetchApi(`/websites/${websiteId}/deployments`, {}, token);
      setDeployments(depRes.data.deployments || []);
      
      const domRes = await fetchApi(`/domains?websiteId=${websiteId}`, {}, token);
      setDomains(domRes.data.domains || []);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [websiteId, token, addToast]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, token, addToast]);

  const loadLogs = React.useCallback(async (deploymentId) => {
    try {
      const res = await fetchApi(`/deployments/${deploymentId}/logs`, {}, token);
      const sortedLogs = (res.data.logs || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setLogs(sortedLogs);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (selectedDeployment) {
      loadLogs(selectedDeployment);
      
      const dep = deployments.find(d => d.id === selectedDeployment);
      const isActive = dep && ['deploying', 'pending', 'uploaded', 'validating', 'PENDING', 'PREPARING', 'BUILDING', 'DEPLOYING', 'VERIFYING'].includes(dep.status);
      
      if (isActive) {
        if (!pollInterval.current) {
          pollInterval.current = setInterval(() => {
            loadLogs(selectedDeployment);
            loadData();
          }, 3000);
        }
      } else {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      }
    }
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [selectedDeployment, deployments, loadLogs, loadData]);

  const handleDeploy = async (deploymentId) => {
    setDeploying(true);
    try {
      await fetchApi(`/websites/${websiteId}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ deploymentId })
      }, token);
      setSelectedDeployment(deploymentId);
      loadData();
      addToast('Website deployment initiated!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This action cannot be undone and will immediately destroy the application.")) return;
    try {
      await fetchApi(`/websites/${websiteId}`, { method: 'DELETE' }, token);
      addToast('Website deleted successfully.', 'success');
      onBack();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUploadSuccess = (data) => {
    if (data && data.status === 'failed') {
        addToast(data.message || 'Deployment couldn\'t start.', 'error');
        if (data.deploymentId) {
            setSelectedDeployment(data.deploymentId);
        }
    } else {
        addToast('ZIP uploaded successfully. Deploying...', 'success');
        if (data && data.deploymentId) {
            setSelectedDeployment(data.deploymentId);
        }
    }
    loadData();
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) return;
    setAddingDomain(true);
    try {
      await fetchApi('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: newDomain, websiteId })
      }, token);
      setNewDomain('');
      addToast('Domain added successfully!', 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!window.confirm("Are you sure you want to remove this domain?")) return;
    try {
      await fetchApi(`/domains/${id}`, { method: 'DELETE' }, token);
      addToast('Domain removed', 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="skeleton skeleton-title" style={{ height: '2.5rem', width: '300px' }}></div>
        <div className="grid details-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
            <div className="flex flex-col gap-4">
                <div className="skeleton skeleton-card"></div>
                <div className="skeleton skeleton-card" style={{ height: '300px' }}></div>
            </div>
            <div className="skeleton skeleton-card" style={{ height: '600px' }}></div>
        </div>
      </div>
    );
  }

  if (!website) return <div>Failed to load website.</div>;

  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    let badgeClass = 'pending';
    if (s === 'running' || s === 'deployed' || s === 'success') badgeClass = 'active';
    else if (s === 'failed') badgeClass = 'danger';
    else if (s === 'ready' || s === 'verifying') badgeClass = 'accent';
    else if (s === 'deploying' || s === 'building' || s === 'preparing') badgeClass = 'warning';
    
    return <span className={`badge badge-${badgeClass}`}>{status.toUpperCase()}</span>;
  };

  const activeDep = deployments.find(d => d.id === selectedDeployment);
  const isAnyDeploying = deployments.some(d => ['pending', 'uploaded', 'validating', 'deploying', 'PENDING', 'PREPARING', 'BUILDING', 'DEPLOYING', 'VERIFYING'].includes(d.status));

  return (
    <div>
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', padding: 0 }}>
        <ArrowLeft size={18} /> <span style={{ marginLeft: '0.5rem' }}>Back to Projects</span>
      </button>

      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {website.name}
              {renderStatusBadge(website.status)}
          </h1>
          <a href={website.live_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }} className="hover:text-primary">
              <ExternalLink size={16} /> {website.live_url ? website.live_url.replace('https://', '') : 'Not deployed yet'}
          </a>
        </div>
        
        <div className="flex gap-3">
            <button onClick={() => {
                const lastDep = deployments.find(d => d.status === 'deployed' || d.status === 'failed');
                if (lastDep) handleDeploy(lastDep.id);
            }} className="btn btn-secondary" disabled={deploying || isAnyDeploying}>
                <RefreshCw size={16} className={deploying ? 'spinner-sm' : ''} /> Redeploy
            </button>
            {website.live_url && (
                <a href={website.live_url} target="_blank" rel="noopener noreferrer" className="btn">
                    Visit
                </a>
            )}
        </div>
      </div>



      <div className="grid details-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Left Column: Metadata & Upload */}
        <div className="flex flex-col gap-6">
          <div className="vercel-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} /> Project Settings
            </h3>
            
            <div className="flex flex-col gap-4">
                <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Framework</span>
                    <div style={{ marginTop: '0.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <GitBranch size={16} color="var(--accent)" />
                        {website.framework || 'Unknown'}
                    </div>
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engine Type</span>
                    <div style={{ marginTop: '0.25rem', fontWeight: 500 }}>
                        {website.project_type || website.type}
                    </div>
                </div>
                <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</span>
                    <div style={{ marginTop: '0.25rem' }}>
                        {new Date(website.created_at).toLocaleDateString()}
                    </div>
                </div>
            </div>
          </div>

          <div className="vercel-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Upload Source</h3>
            <UploadZip websiteId={websiteId} token={token} onUploadSuccess={handleUploadSuccess} />
          </div>

          <div className="vercel-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} /> Custom Domains
            </h3>
            
            <form onSubmit={handleAddDomain} className="flex gap-2" style={{ marginBottom: '1.5rem' }}>
                <input 
                    type="text" 
                    className="input-field" 
                    placeholder="www.example.com" 
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    style={{ flex: 1, margin: 0 }}
                    required
                />
                <button type="submit" disabled={addingDomain} className="btn" style={{ whiteSpace: 'nowrap' }}>
                    {addingDomain ? 'Adding...' : 'Add Domain'}
                </button>
            </form>

            <div className="flex flex-col gap-3">
                {domains.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                        No custom domains attached.
                    </div>
                ) : (
                    domains.map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{d.domain}</div>
                                <div className="flex gap-2 text-xs">
                                    <span style={{ color: d.dns_status === 'verified' ? 'var(--success)' : d.dns_status === 'failed' ? 'var(--danger)' : 'var(--warning)' }}>
                                        DNS: {d.dns_status}
                                    </span>
                                    <span>|</span>
                                    <span style={{ color: d.ssl_status === 'issued' ? 'var(--success)' : d.ssl_status === 'failed' ? 'var(--danger)' : d.ssl_status === 'pending' ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                        SSL: {d.ssl_status || 'disabled'}
                                    </span>                                </div>
                            </div>
                            <button onClick={() => handleDeleteDomain(d.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
          </div>

          <div className="vercel-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={18} /> Danger Zone
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Permanently remove your application and all its data. This cannot be undone.</p>
            <button onClick={handleDelete} className="btn btn-danger" style={{ width: '100%' }}>Delete Project</button>
          </div>
        </div>

        {/* Right Column: Deployments & Logs */}
        <div className="flex flex-col gap-6">
            <div className="vercel-card" style={{ padding: 0 }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Deployment History</h3>
                </div>
                {deployments.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No deployments found. Upload a ZIP to begin.
                    </div>
                ) : (
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {deployments.map(dep => (
                            <div 
                                key={dep.id} 
                                onClick={() => { setSelectedDeployment(dep.id); loadLogs(dep.id); }}
                                className="hover:bg-glass"
                                style={{ 
                                    padding: '1rem 1.5rem', 
                                    borderBottom: '1px solid var(--border)', 
                                    cursor: 'pointer',
                                    background: selectedDeployment === dep.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                    borderLeft: selectedDeployment === dep.id ? '3px solid var(--accent)' : '3px solid transparent'
                                }}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span style={{ fontWeight: 600 }}>Deployment #{dep.id}</span>
                                    {renderStatusBadge(dep.status)}
                                </div>
                                <div className="flex justify-between items-center text-sm text-secondary">
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(dep.created_at).toLocaleString()}</span>
                                    {dep.status === 'ready' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeploy(dep.id); }} disabled={deploying || isAnyDeploying} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                                            Deploy
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="vercel-card" style={{ padding: 0, flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Terminal size={18} /> Build Logs {selectedDeployment ? `(#${selectedDeployment})` : ''}
                    </h3>
                    <div className="flex gap-2 items-center">
                        {activeDep && ['pending', 'uploaded', 'validating', 'deploying', 'PENDING', 'PREPARING', 'BUILDING', 'DEPLOYING', 'VERIFYING'].includes(activeDep.status) && (
                            <span className="spinner spinner-sm"></span>
                        )}
                        {selectedDeployment && logs.length > 0 && (
                            <button 
                                onClick={() => {
                                    const logText = logs.map(l => `[${new Date(l.created_at || l.timestamp).toISOString()}] [${l.action}] ${l.message || l.status}`).join('\n');
                                    const blob = new Blob([logText], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `deployment-${selectedDeployment}-logs.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            >
                                Download Logs
                            </button>
                        )}
                    </div>
                </div>
                
                <div style={{ 
                    background: '#000', 
                    padding: '1.5rem', 
                    fontFamily: 'monospace', 
                    fontSize: '0.9rem', 
                    color: '#e2e8f0', 
                    overflowY: 'auto', 
                    overflowX: 'auto',
                    flex: 1,
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px'
                }}>
                    {!selectedDeployment ? (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4rem' }}>
                            Select a deployment to view logs
                        </div>
                    ) : logs.length === 0 ? (
                        <p style={{ color: '#666' }}>Waiting for logs to stream...</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={log.id || i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '1rem' }}>
                                <span style={{ color: '#64748b', minWidth: '75px' }}>
                                    {new Date(log.created_at || log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                </span> 
                                <span style={{ 
                                    minWidth: '120px', 
                                    color: log.status === 'error' || log.status === 'failed' ? '#ef4444' : 
                                           log.status === 'success' ? '#10b981' : '#3b82f6'
                                }}>
                                    [{log.action}]
                                </span> 
                                <span style={{ 
                                    color: log.status === 'error' || log.status === 'failed' ? '#fca5a5' : '#e2e8f0', 
                                    whiteSpace: 'nowrap'
                                }}>
                                    {log.message || log.status.toUpperCase()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
