import { useEffect, useState, Component } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import NewEntry from './pages/NewEntry'
import Entries from './pages/Entries'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <main>
        <h2 style={{ color: 'var(--accent)', marginBottom: 12 }}>Something went wrong</h2>
        <pre style={{ fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--ink-soft)' }}>
          {this.state.error.message}
        </pre>
      </main>
    )
    return this.props.children
  }
}

function Header({ session, onSignOut }) {
  const location = useLocation()
  if (!session) return null
  const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0]
  return (
    <header className="app-header">
      <Link to="/" className="brand">last text<span className="dot">.</span></Link>
      <nav>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link>
        <Link to="/new" className={location.pathname === '/new' ? 'active' : ''}>New</Link>
        <Link to="/entries" className={location.pathname === '/entries' ? 'active' : ''}>Entries</Link>
      </nav>
      <span className="user-chip">
        {userName}
        <button onClick={onSignOut}>sign out</button>
      </span>
    </header>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return null

  return (
    <div className="app-shell">
      <Header session={session} onSignOut={handleSignOut} />
      <ErrorBoundary>
        <Routes>
          <Route path="/auth" element={session ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />} />
          <Route path="/new" element={session ? <NewEntry session={session} /> : <Navigate to="/auth" />} />
          <Route path="/entries" element={session ? <Entries session={session} /> : <Navigate to="/auth" />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}
