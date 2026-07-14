import React, { useState, useRef } from 'react';
import { UploadCloud, XCircle } from 'lucide-react';

export default function UploadZip({ websiteId, token, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setError('Only .zip files are allowed.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('zipFile', file);

    try {
      // In a real app we'd use XMLHttpRequest for progress, but fetch is what we have unless we implement XHR.
      // Since fetch doesn't support upload progress natively in browser, we fake a progress bar visually 
      // or just show an indeterminate loading state. For real progress we use XHR.
      
      const API_BASE = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${API_BASE}/websites/${websiteId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Upload failed');

      if (onUploadSuccess) {
        onUploadSuccess(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`dropzone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current.click()}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".zip" 
        onChange={handleChange} 
        style={{ display: 'none' }} 
      />

      <div style={{ pointerEvents: 'none' }}>
        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <span className="spinner spinner-lg"></span>
            <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Uploading & Validating...</p>
            <div className="upload-progress-container">
              <div className="upload-progress-bar" style={{ width: '100%', animation: 'skeleton-loading 1.5s infinite' }}></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <UploadCloud size={48} color="var(--accent)" />
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>Click or drag a ZIP file to upload</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Maximum file size: 50MB</p>
            </div>
            {error && (
              <div className="flex items-center gap-2" style={{ color: 'var(--danger)', marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                <XCircle size={16} />
                <span style={{ fontSize: '0.9rem' }}>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
