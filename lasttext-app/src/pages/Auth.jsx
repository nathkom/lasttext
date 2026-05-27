import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSignUp = mode === 'signup'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  const switchMode = (next) => {
    setMode(next)
    setError(null)
  }

  return (
    <main>
      <div className="auth-card">
        <h1>Last Text <em>Archive</em></h1>
        <div className="subtitle">A small data project</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => switchMode('signin')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: !isSignUp ? 'var(--ink)' : 'var(--paper-deep)',
              color: !isSignUp ? 'var(--paper)' : 'var(--ink-muted)',
              fontWeight: 500, fontSize: 14,
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isSignUp ? 'var(--ink)' : 'var(--paper-deep)',
              color: isSignUp ? 'var(--paper)' : 'var(--ink-muted)',
              fontWeight: 500, fontSize: 14,
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="field">
              <label className="field-label">Your first name</label>
              <input
                className="text-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nathan"
                required
              />
              <div className="field-hint">Used in the dataset for per-person analysis.</div>
            </div>
          )}
          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="··········"
              required
              minLength={6}
            />
          </div>
          {error && <div style={{ color: 'var(--accent)', marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
