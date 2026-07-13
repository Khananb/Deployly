import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function BillingHistory({ token }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetchApi('/billing/history', {}, token);
        setHistory(res.data.history);
      } catch (err) {
        setError(err.message);
      }
    };
    loadHistory();
  }, [token]);

  if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!history) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="title-glow">Billing History</h1>
      
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        {history.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No payment history found.</p>
        ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Plan</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Amount</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Valid Until</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem' }}>{row.plan_name}</td>
                            <td style={{ padding: '1rem' }}>{row.currency} {row.amount}</td>
                            <td style={{ padding: '1rem', color: row.payment_status === 'paid' ? 'var(--success)' : 'inherit' }}>{row.payment_status}</td>
                            <td style={{ padding: '1rem' }}>{new Date(row.valid_until).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}
