import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [drives, setDrives] = useState([])
  const [pendingDrives, setPendingDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [supervisorName, setSupervisorName] = useState('')
  const navigate = useNavigate()

  // 1. Initial Data Load
  useEffect(() => {
    async function fetchData() {
      if (!session?.user?.id) return

      // Fetch Profile
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Fetch Cloud Drives
      const drivesPromise = supabase
        .from('drives')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_time', { ascending: false })

      const [profileRes, drivesRes] = await Promise.all([profilePromise, drivesPromise])
      
      if (!profileRes.error && profileRes.data) {
        setProfile(profileRes.data)
      }
      if (!drivesRes.error && drivesRes.data) {
        setDrives(drivesRes.data)
      }

      // Load pending drives into state right away
      setPendingDrives(JSON.parse(localStorage.getItem('pending_drives') || '[]'))
      
      setLoading(false)
    }

    fetchData()
  }, [session])

  // 2. Offline Sync Engine
  useEffect(() => {
    const syncPendingDrives = async () => {
      if (!session?.user?.id || !navigator.onLine) return

      const currentPending = JSON.parse(localStorage.getItem('pending_drives') || '[]')
      if (currentPending.length === 0) return

      console.log(`Attempting to sync ${currentPending.length} pending drives...`)
      let syncCount = 0

      for (const drive of currentPending) {
        const { id, pending_sync, ...dbPayload } = drive
        dbPayload.user_id = session.user.id
        dbPayload.synced_at = new Date().toISOString()

        const { error } = await supabase.from('drives').insert(dbPayload)
        
        if (!error) {
          syncCount++
        }
      }

      if (syncCount === currentPending.length) {
        localStorage.removeItem('pending_drives')
        setPendingDrives([]) // Clear the local UI state
        
        // Quick re-fetch to update the cloud list
        const { data } = await supabase
          .from('drives')
          .select('*')
          .eq('user_id', session.user.id)
          .order('start_time', { ascending: false })
        
        if (data) setDrives(data)
      }
    }

    syncPendingDrives()
    window.addEventListener('online', syncPendingDrives)
    
    return () => {
      window.removeEventListener('online', syncPendingDrives)
    }
  }, [session])

  // 3. Mathematical Calculations (Must remain outside hooks)
  const allDrives = [...pendingDrives, ...drives].sort((a, b) => 
    new Date(b.start_time) - new Date(a.start_time)
  )

  const totalMinutes = allDrives.reduce((sum, drive) => sum + drive.duration_minutes, 0)
  const nightMinutes = allDrives.filter(d => d.is_night).reduce((sum, drive) => sum + drive.duration_minutes, 0)
  
  const totalHours = (totalMinutes / 60).toFixed(1)
  const nightHours = (nightMinutes / 60).toFixed(1)
  const progressPercent = Math.min((totalMinutes / 3600) * 100, 100)

  // 4. Action Handlers
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleStartDrive = (e) => {
    e.preventDefault()
    if (!supervisorName.trim()) return
    navigate('/active-drive', { state: { supervisorName } })
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your garage...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <header className="mb-8 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">NC Drive Tracker</h1>
          <p className="text-sm text-slate-500">
            Welcome back, {profile?.full_name || session?.user?.email}
          </p>
        </div>
        <button 
          onClick={handleSignOut}
          className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Sign Out
        </button>
      </header>

      <main className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Dynamic Progress Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Drive Progress</h2>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600">Total Hours</span>
            <span className="font-medium text-slate-800">{totalHours} / 60.0</span>
          </div>
          <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-full bg-blue-600 transition-all duration-1000" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Night Hours (10 required)</span>
            <span className="font-medium text-slate-800">{nightHours}</span>
          </div>
        </div>

        {/* Action Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Log a Drive</h2>
          <p className="mb-4 text-sm text-slate-600">
            Ready to hit the road? Ensure your supervisor is present before starting the timer.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer w-full rounded-lg bg-green-600 py-3 font-bold text-white shadow-md transition hover:bg-green-700"
          >
            Start Driving Session
          </button>
        </div>
      </main>
{/* Chronological Drive Feed */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent Drives</h2>
          <button 
            onClick={() => navigate('/print-log')}
            className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export DMV Log
          </button>
        </div>
        
        {allDrives.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No drives logged yet. Time to hit the road!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {allDrives.map((drive) => (
              <div key={drive.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">
                      {new Date(drive.start_time).toLocaleDateString()}
                    </p>
                    {/* Sync Status Badge */}
                    {drive.pending_sync ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200" title="Waiting for network connection">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200" title="Safely backed up to cloud">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Synced
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Supervisor: {drive.supervisor_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">
                    {drive.duration_minutes} min
                  </p>
                  <p className="text-xs text-slate-500">
                    {drive.is_night ? '🌙 Night' : '☀️ Day'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Supervisor Verification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-xl font-bold text-slate-800">Supervisor Verification</h3>
            <p className="mb-6 text-sm text-slate-600">
              A certified adult must be in the passenger seat before you put the vehicle in drive.
            </p>
            
            <form onSubmit={handleStartDrive}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700">Supervisor Name</label>
                <input
                  type="text"
                  required
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Mom, Dad, Grandma"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Confirm & Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}