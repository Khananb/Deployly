import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function Profile({ token, user, onLogout }) {
  const [profile, setProfile] = useState(user);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchApi('/profile', {}, token);
        setProfile(data.data.user);
      } catch (err) {
        setError(err.message);
      }
    };
    loadProfile();
  }, [token]);

  return (
    <div>
      <h1 className="title-glow">User Profile</h1>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" className="input-field" value={profile?.name || ''} readOnly />
        </div>
        
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" className="input-field" value={profile?.email || ''} readOnly />
        </div>

        <div className="form-group">
          <label>Account Created</label>
          <input type="text" className="input-field" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''} readOnly />
        </div>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <button className="btn btn-danger" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
