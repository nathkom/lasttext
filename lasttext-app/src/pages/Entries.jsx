import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CLOSENESS = ['', 'very distant', 'distant', 'neutral', 'close', 'very close']
const VALENCE = ['', 'very negative', 'negative', 'neutral', 'positive', 'very positive']

function DetailGrid({ r }) {
  const items = [
    r.sent_time_of_day             && ['time of day',        r.sent_time_of_day.replace(/_/g, ' ')],
    r.message_type                 && ['message type',       r.message_type.replace(/_/g, ' ')],
    r.relation_tags?.label         && ['relation',           r.relation_tags.label],
    r.closeness                    && ['closeness',          `${r.closeness}/5 · ${CLOSENESS[r.closeness]}`],
    r.how_you_know_tags?.label     && ['how you know them',  r.how_you_know_tags.label],
    r.their_age_relative           && ['their age',          r.their_age_relative],
    r.contact_frequency            && ['contact frequency',  r.contact_frequency.replace(/_/g, ' ')],
    r.relationship_status_tags?.label && ['relationship status', r.relationship_status_tags.label],
    r.your_feeling_valence         && ['feeling valence',    `${r.your_feeling_valence}/5 · ${VALENCE[r.your_feeling_valence]}`],
    r.your_feeling?.label          && ['your feeling',       r.your_feeling.label],
    r.their_tone?.label            && ['their tone',         r.their_tone.label],
    r.intent_to_reply_tags?.label  && ['intent to reply',    r.intent_to_reply_tags.label],
    r.life_domain_tags?.label      && ['life domain',        r.life_domain_tags.label],
    r.conversation_topic_tags?.label && ['conversation topic', r.conversation_topic_tags.label],
    ['days since sent', r.days_since_sent === 0 ? 'same day' : `${r.days_since_sent} days ago`],
  ].filter(Boolean)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Entries({ session }) {
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('mine')
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    let q = supabase.from('messages').select(`
      *,
      relation_tags(label),
      how_you_know_tags(label),
      relationship_status_tags(label),
      your_feeling:feeling_tags!your_feeling_tag_id(label),
      their_tone:feeling_tags!their_apparent_tone_tag_id(label),
      intent_to_reply_tags(label),
      life_domain_tags(label),
      conversation_topic_tags(label)
    `).order('sent_at', { ascending: false })
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
    setExpanded(null)
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
          {rows.map(r => {
            const isOpen = expanded === r.id
            const isOwn = r.user_id === session.user.id
            return (
              <div key={r.id} style={{ borderBottom: '1px solid var(--line-soft)', padding: '18px 0' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'start', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <div className="date">
                    {new Date(r.sent_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div>
                    <div className="text">
                      <span className="sender-arrow">{r.sender === 'me' ? '→' : '←'}</span>
                      {r.message_text}
                    </div>
                    <div className="meta">
                      {filter === 'all' && <>{r.user_name} · </>}{r.platform} · {r.word_count} {r.word_count === 1 ? 'word' : 'words'}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-muted)', paddingTop: 3, userSelect: 'none' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
                    <DetailGrid r={r} />
                    {isOwn && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <Link
                          to={`/entries/${r.id}/edit`}
                          className="btn secondary"
                          style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none', display: 'inline-block' }}
                          onClick={e => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                        <button
                          className="btn"
                          style={{ fontSize: 13, padding: '8px 16px', background: 'var(--accent)' }}
                          onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
