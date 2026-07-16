import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { RefreshCw, Activity, Database, Server, HardDrive, Cpu, Shield, Key, GitCommit, FileCode, Monitor } from 'lucide-react';

export default function Doctor({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchApi('/health/doctor', {}, token);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [token]);

  const getIcon = (key) => {
    switch (key) {
      case 'api': return <Activity size={24} />;
      case 'database': return <Database size={24} />;
      case 'pm2': return <Server size={24} />;
      case 'nginx': return <Monitor size={24} />;
      case 'disk': return <HardDrive size={24} />;
      case 'memory': return <Cpu size={24} />;
      case 'cpu': return <Cpu size={24} />;
      case 'storage': return <Shield size={24} />;
      case 'ssl': return <Key size={24} />;
      case 'ports': return <GitCommit size={24} />;
      case 'nodejs': return <FileCode size={24} />;
      case 'npm': return <FileCode size={24} />;
      default: return <Activity size={24} />;
    }
  };

  const getLabel = (key) => {
    switch (key) {
      case 'api': return 'Backend API';
      case 'database': return 'MariaDB';
      case 'pm2': return 'PM2';
      case 'nginx': return 'Nginx';
      case 'disk': return 'Disk';
      case 'memory': return 'Memory';
      case 'cpu': return 'CPU';
      case 'storage': return 'Permissions';
      case 'ssl': return 'Certbot';
      case 'ports': return 'Port Manager';
      case 'nodejs': return 'Node Version';
      case 'npm': return 'NPM Version';
      default: return key;
    }
  };

  const renderIndicator = (severity) => {
    if (severity === 'healthy') return <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>;
    if (severity === 'warning') return <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>;
    return <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>;
  };

  const renderHealthScore = () => {
    if (!data) return null;
    const score = data.healthScore;
    let label = 'Critical';
    let color = 'text-red-500';
    if (score >= 90) { label = 'Excellent'; color = 'text-green-500'; }
    else if (score >= 70) { label = 'Fair'; color = 'text-yellow-500'; }

    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between shadow-lg mb-8">
        <div>
          <h2 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Overall Health</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`text-4xl font-bold ${color}`}>{score}%</span>
            <span className="text-xl font-medium text-gray-300">{label}</span>
          </div>
        </div>
        <button 
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning...' : 'Run Diagnostics'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          🩺 Deployly Doctor
        </h1>
        <p className="text-gray-400 mt-2">Deep system diagnostics and infrastructure health check.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      {renderHealthScore()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.results && Object.entries(data.results).map(([key, info]) => (
          <div key={key} className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700 rounded-lg text-blue-400">
                  {getIcon(key)}
                </div>
                <h3 className="text-lg font-semibold text-gray-100">{getLabel(key)}</h3>
              </div>
              {renderIndicator(info.severity)}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${
                  info.severity === 'healthy' ? 'text-green-400' : 
                  info.severity === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {info.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-300 bg-gray-900/50 p-2 rounded border border-gray-700/50 min-h-[44px] flex items-center">
                {info.message}
              </div>

              {info.latency && (
                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-gray-700">
                  <span className="text-gray-500">Latency</span>
                  <span className="text-gray-400 font-mono">{info.latency}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!data && !loading && !error && (
        <div className="text-center text-gray-400 py-12">
          Click "Run Diagnostics" to scan the system.
        </div>
      )}
    </div>
  );
}
