import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Entries({ session }) {
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('mine')

  const load = async () => {
    let q = supabase.from('messages').select('*').order('sent_at', { ascending: false })
    if (filter === 'mine') q = q.eq('user_id', session.user.id)
    const { data } = await q
    setRows(data || [])
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('entries-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [filter, session.user.id])

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    await supabase.from('messages').delete().eq('id', id)
  }

  if (!rows) return <main><div className="empty"><p>Loading…</p></div></main>

  return (
    <main>
      <h1>Entries</h1>
      <div className="subtitle">{filter === 'mine' ? 'your entries' : 'all entries (group)'}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className={`pill ${filter === 'mine' ? 'selected' : ''}`} onClick={() => setFilter('mine')}>Mine</button>
        <button className={`pill ${filter === 'all' ? 'selected' : ''}`} onClick={() => setFilter('all')}>Everyone</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <p>No entries yet.</p>
          <Link to="/new" className="btn" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Log your first one</Link>
        </div>
      ) : (
        <div>
          {rows.map(r => (
            <div key={r.id} className="entry-row">
              <div className="date">
                {new Date(r.sent_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div>
                <div className="text">
                  <span className="sender-arrow">{r.sender === 'me' ? '→' : '←'}</span>
                  {r.message_text}
                </div>
                <div className="meta">
                  {filter === 'all' && r.user_name} · {r.platform} · {r.word_count} {r.word_count === 1 ? 'word' : 'words'}
                </div>
              </div>
              <div className="actions">
                {r.user_id === session.user.id && (
                  <button onClick={() => handleDelete(r.id)}>delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
