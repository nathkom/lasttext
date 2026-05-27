import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [stats, setStats] = useState(null)
  const userName = session.user.user_metadata?.name || session.user.email.split('@')[0]

  useEffect(() => {
    const load = async () => {
      const { data: mine } = await supabase
        .from('messages')
        .select('user_name, sender')
        .eq('user_id', session.user.id)

      const { data: all } = await supabase
        .from('messages')
        .select('user_name')

      const byUser = {}
      ;(all || []).forEach(m => { byUser[m.user_name] = (byUser[m.user_name] || 0) + 1 })

      const senderSplit = { me: 0, them: 0 }
      ;(mine || []).forEach(m => { senderSplit[m.sender]++ })

      setStats({
        myCount: mine?.length || 0,
        totalCount: all?.length || 0,
        byUser,
        senderSplit,
      })
    }
    load()

    const ch = supabase.channel('messages-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [session.user.id])

  if (!stats) return <main><div className="empty"><p>Loading…</p></div></main>

  const target = 100 // rough per-person target
  const pct = Math.min(100, (stats.myCount / target) * 100)

  return (
    <main>
      <h1>Hello, <em>{userName}</em></h1>
      <div className="subtitle">last text archive · group dataset</div>

      <div className="dash-grid">
        <div className="stat-card">
          <div className="label">Your entries</div>
          <div className="number">{stats.myCount}</div>
          <div className="footnote">of ~{target} target</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="stat-card">
          <div className="label">Group total</div>
          <div className="number">{stats.totalCount}</div>
          <div className="footnote">across {Object.keys(stats.byUser).length || 0} contributor{Object.keys(stats.byUser).length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {stats.myCount > 0 && (
        <>
          <div className="section-label">Your last-message senders</div>
          <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 12 }}>
            <div style={{ flex: stats.senderSplit.them, background: 'var(--accent)', padding: '14px 16px', color: 'var(--paper)' }}>
              they sent · {stats.senderSplit.them}
            </div>
            <div style={{ flex: stats.senderSplit.me, background: 'var(--ink)', padding: '14px 16px', color: 'var(--paper)' }}>
              i sent · {stats.senderSplit.me}
            </div>
          </div>
        </>
      )}

      {Object.keys(stats.byUser).length > 1 && (
        <>
          <div className="section-label">Group contributors</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(stats.byUser).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-muted)' }}>{count} entries</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="btn-row">
        <Link to="/new" className="btn" style={{ display: 'inline-block', textDecoration: 'none' }}>+ Log a message</Link>
        <Link to="/entries" className="btn secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>View entries</Link>
      </div>
    </main>
  )
}
