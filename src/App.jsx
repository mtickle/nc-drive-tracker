import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ActiveDrive from './pages/ActiveDrive'

function App() {
  const [session, setSession] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // Check for an existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsInitializing(false)
    })

    // Listen for changes (like the OAuth redirect returning)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsInitializing(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Prevent routing until Supabase finishes reading the URL
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Checking credentials...</p>
      </div>
    )
  }

  return (
    <Router basename="/nc-drive-tracker">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route 
            path="/" 
            element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/login" 
            element={session ? <Navigate to="/dashboard" replace /> : <Auth />} 
          />
          <Route 
  path="/active-drive" 
  element={session ? <ActiveDrive /> : <Navigate to="/login" replace />} 
/>
          <Route 
            path="/dashboard" 
            element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} 
          />
          {/* Catch-all route for explosive OAuth hashes */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App