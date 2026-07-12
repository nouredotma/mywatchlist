'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/lib/actions'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await loginAction(username, password)
      if (res.success) {
        router.push('/my-dashboard')
        router.refresh()
      } else {
        setError(res.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-center items-center px-4 font-sans select-none">
      <div className="w-full max-w-[340px] flex flex-col space-y-7">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <h1 className="text-4xl font-medium tracking-tight text-[#ff0000]">
            MyWatchlist
          </h1>
          <p className="text-zinc-400 text-xs tracking-wider font-normal mt-1.5">
            Track shows, movies, & anime
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-full px-5 py-3 flex items-center gap-2.5 text-red-600 text-xs font-normal mb-3 animate-shake">
              <AlertCircle className="w-4 h-4 text-[#ff0000] flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={loading}
              autoComplete="username"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full px-5 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#ff0000] focus:text-zinc-900 transition-all duration-200 shadow-none font-normal"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              autoComplete="current-password"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full px-5 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#ff0000] focus:text-zinc-900 transition-all duration-200 shadow-none font-normal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff0000] hover:bg-[#d60000] disabled:opacity-80 disabled:cursor-not-allowed text-white py-3 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] shadow-none font-medium h-[46px] mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Entering...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Clean minimal footer */}
        <p className="text-center text-zinc-350 text-[10px] tracking-widest pt-1 font-normal">
          MyWatchlist &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
