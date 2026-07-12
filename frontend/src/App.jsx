import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Websites from './components/Websites'
import Domains from './components/Domains'
import Profile from './components/Profile'
import BillingHistory from './components/BillingHistory'
import Support from './components/Support'

function App() {
  const [page, setPage] = useState('login')
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setPage('login')
    }
  }, [token, user])

  const handleLogin = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    setPage('dashboard')
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
  }

  const renderContent = () => {
    switch (page) {
      case 'dashboard': return <Dashboard token={token} />
      case 'websites': return <Websites token={token} />
      case 'domains': return <Domains token={token} />
      case 'billing': return <BillingHistory token={token} />
      case 'support': return <Support />
      case 'profile': return <Profile token={token} user={user} onLogout={handleLogout} />
      default: return <Dashboard token={token} />
    }
  }

  if (!token) {
    if (page === 'register') return <Register setPage={setPage} />
    return <Login setPage={setPage} onLogin={handleLogin} />
  }

  return (
    <div className="app-container">
      <nav className="sidebar">
        <h2 className="title-glow" style={{ marginBottom: '2rem', paddingLeft: '1rem' }}>Deployly</h2>
        <div 
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </div>
        <div 
          className={`nav-item ${page === 'websites' ? 'active' : ''}`}
          onClick={() => setPage('websites')}
        >
          Websites
        </div>
        <div 
          className={`nav-item ${page === 'domains' ? 'active' : ''}`}
          onClick={() => setPage('domains')}
        >
          Domains
        </div>
        <div 
          className={`nav-item ${page === 'billing' ? 'active' : ''}`}
          onClick={() => setPage('billing')}
        >
          Billing History
        </div>
        <div 
          className={`nav-item ${page === 'support' ? 'active' : ''}`}
          onClick={() => setPage('support')}
        >
          Support
        </div>
        <div 
          className={`nav-item ${page === 'profile' ? 'active' : ''}`}
          onClick={() => setPage('profile')}
        >
          Profile
        </div>
      </nav>
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
