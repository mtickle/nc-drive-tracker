import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ActiveDrive() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [startTime, setStartTime] = useState(null)
  const [now, setNow] = useState(null)
  const [isFinished, setIsFinished] = useState(false)
  const [isNight, setIsNight] = useState(false)
  const [saving, setSaving] = useState(false)
  const [frozenEndTime, setFrozenEndTime] = useState(null)

  // Grab supervisor from router state, or fallback to unknown if recovering from a crash
  const supervisorName = location.state?.supervisorName || localStorage.getItem('activeSupervisor') || 'Unknown Supervisor'

  useEffect(() => {
    // Bulletproof Init: Check if there's already an active drive running
    const storedStart = localStorage.getItem('activeDriveStart')
    let startTimestamp
    
    if (storedStart) {
      startTimestamp = parseInt(storedStart, 10)
    } else {
      startTimestamp = Date.now()
      localStorage.setItem('activeDriveStart', startTimestamp.toString())
      localStorage.setItem('activeSupervisor', supervisorName)
    }
    
    setStartTime(startTimestamp)
    setNow(Date.now())

    // Update the UI every second. If this gets paused by the OS, it doesn't matter. 
    // It will recalculate the correct delta the moment it wakes up.
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [supervisorName])

  // Calculate elapsed time securely
 // const elapsedMs = startTime && now ? Math.max(0, now - startTime) : 0
  const elapsedMs = startTime ? Math.max(0, (frozenEndTime || now) - startTime) : 0
  const totalSeconds = Math.floor(elapsedMs / 1000)
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const formatTime = (num) => num.toString().padStart(2, '0')

const handleEndDrive = () => {
  setFrozenEndTime(Date.now())
  setIsFinished(true) 
}
const handleSaveDrive = async () => {
    setSaving(true)
    
    const endTime = Date.now()
    // const durationMinutes = Math.floor((endTime - startTime) / 60000)
    const durationMinutes = Math.floor((frozenEndTime - startTime) / 60000)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const drivePayload = {
        user_id: session?.user?.id,
        supervisor_name: supervisorName,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: durationMinutes,
        is_night: isNight,
        synced_at: new Date().toISOString() // Only used if successful
      }

      // Check if browser knows it is offline
      if (!navigator.onLine) {
        throw new Error('Offline')
      }

      // Attempt to save to cloud
      const { error } = await supabase.from('drives').insert(drivePayload)
      if (error) throw error

    } catch (err) {
      console.log('Network unavailable. Saving to local pending queue.')
      
      // Build an offline payload with a temporary local ID
      const offlinePayload = {
        id: crypto.randomUUID(),
        user_id: null, // Will attach actual user ID upon sync
        supervisor_name: supervisorName,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: durationMinutes,
        is_night: isNight,
        pending_sync: true
      }

      // Append to local storage queue
      const existingQueue = JSON.parse(localStorage.getItem('pending_drives') || '[]')
      existingQueue.push(offlinePayload)
      localStorage.setItem('pending_drives', JSON.stringify(existingQueue))
    } finally {
      // Clean up the active timer state regardless of cloud vs local save
      localStorage.removeItem('activeDriveStart')
      localStorage.removeItem('activeSupervisor')
      navigate('/dashboard')
    }
  }

  const handleCancelDrive = () => {
    if (window.confirm("Are you sure? This will delete the current drive completely.")) {
      localStorage.removeItem('activeDriveStart')
      localStorage.removeItem('activeSupervisor')
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 text-white">
      
      {!isFinished ? (
        <>
          <div className="mb-8 text-center">
            <div className="mb-2 inline-flex items-center rounded-full bg-slate-800 px-4 py-1 text-sm font-medium text-slate-300">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              Supervised by: {supervisorName}
            </div>
            <p className="text-sm text-slate-500 mt-2">Drive safely. Phone down.</p>
          </div>

          <div className="mb-12 font-mono text-[5rem] font-bold tracking-tight md:text-[7rem]">
            {formatTime(hours)}:{formatTime(minutes)}:<span className="text-blue-500">{formatTime(seconds)}</span>
          </div>

          <button 
            onClick={handleEndDrive}
            className="w-full max-w-xs cursor-pointer rounded-2xl bg-red-600 py-4 text-xl font-bold text-white shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] transition hover:bg-red-500 active:scale-95"
          >
            End Drive
          </button>
        </>
      ) : (
        /* Summary & Save Modal Overlay */
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Drive Complete</h2>
          
          <div className="mb-6 rounded-lg bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm text-slate-500">Total Duration</p>
            <p className="text-3xl font-mono font-bold text-slate-800">
              {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
            </p>
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Driving Conditions
            </label>
            <div className="flex rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setIsNight(false)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${!isNight ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ☀️ Day Time
              </button>
              <button
                onClick={() => setIsNight(true)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${isNight ? 'bg-indigo-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                🌙 Night Time
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              North Carolina requires at least 10 hours of night driving.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelDrive}
              disabled={saving}
              className="flex-1 cursor-pointer rounded-lg px-4 py-3 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSaveDrive}
              disabled={saving}
              className="flex-2 cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-medium text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Drive to Log'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}