import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router basename="/nc-drive-tracker">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route 
  path="/login" 
  element={<Auth />} 
/>
          <Route 
            path="/" 
            element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/login" 
            element={<div className="p-4">Login / Onboarding UI Goes Here</div>} 
          />
          <Route 
            path="/dashboard" 
            element={<div className="p-4">Active Drive Tracking Dashboard</div>} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App