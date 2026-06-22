import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('driver')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        })
        if (error) throw error
        setMessage('Registration successful! Check your email to verify your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle OAuth provider login
  const handleSocialLogin = async (provider) => {
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Redirect back to your app after successful OAuth handshake
          redirectTo: window.location.origin + '/nc-drive-tracker',
          // Pass the role option for new users who sign up via OAuth
          queryParams: isSignUp ? { role } : undefined
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-800">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">I am a:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="driver"
                    checked={role === 'driver'}
                    onChange={(e) => setRole(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Teen Driver</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="supervisor"
                    checked={role === 'supervisor'}
                    onChange={(e) => setRole(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Supervisor</span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* --- Social Login Section --- */}
        <div className="mt-6">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute w-full border-t border-slate-200"></div>
            <span className="relative bg-white px-3 text-xs uppercase text-slate-400">Or continue with</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              className="flex justify-center rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition cursor-pointer text-sm font-medium text-slate-600"
              title="Sign in with Google"
            >
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('facebook')}
              className="flex justify-center rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition cursor-pointer text-sm font-medium text-slate-600"
              title="Sign in with Facebook"
            >
              Facebook
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              className="flex justify-center rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition cursor-pointer text-sm font-medium text-slate-600"
              title="Sign in with Apple"
            >
              Apple
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-blue-600 hover:underline cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}