import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Websites from './pages/Websites'
import Profile from './pages/Profile'
import BillingHistory from './pages/BillingHistory'
import Support from './pages/Support'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }, [token, user])

  const handleLogin = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        
        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={token ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} 
        />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout token={token} user={user} onLogout={handleLogout} />}>
          <Route index element={<Dashboard token={token} />} />
          <Route path="websites" element={<Websites token={token} />} />
          <Route path="billing" element={<BillingHistory token={token} />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile token={token} user={user} onLogout={handleLogout} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
