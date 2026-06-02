import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Live export: pulls current data with tag labels resolved, builds a clean CSV.
// Mirrors the columns the analysis notebook expects.
const EXPORT_SELECT = `
  id, user_id, user_name, created_at, message_text, sender, sent_at,
  sent_time_of_day, sent_day_of_week, platform, message_type, word_count,
  days_since_sent, closeness, their_age_relative, contact_frequency,
  your_feeling_valence,
  relation_tags(label),
  how_you_know_tags(label),
  relationship_status_tags(label),
  your_feeling:feeling_tags!your_feeling_tag_id(label),
  their_tone:feeling_tags!their_apparent_tone_tag_id(label),
  intent_to_reply_tags(label),
  life_domain_tags(label),
  conversation_topic_tags(label)
`

const COLUMNS = [
  'id', 'user_name', 'created_at', 'message_text', 'sender', 'sent_at',
  'sent_time_of_day', 'sent_day_of_week', 'platform', 'message_type', 'word_count',
  'days_since_sent', 'closeness', 'their_age_relative', 'contact_frequency',
  'your_feeling_valence', 'relation', 'how_you_know', 'relationship_status',
  'intent_to_reply', 'life_domain', 'conversation_topic', 'your_feeling', 'their_tone',
]

const NESTED = {
  relation_tags: 'relation',
  how_you_know_tags: 'how_you_know',
  relationship_status_tags: 'relationship_status',
  your_feeling: 'your_feeling',
  their_tone: 'their_tone',
  intent_to_reply_tags: 'intent_to_reply',
  life_domain_tags: 'life_domain',
  conversation_topic_tags: 'conversation_topic',
}

function flatten(row) {
  const out = { ...row }
  for (const [nested, flat] of Object.entries(NESTED)) {
    out[flat] = row[nested]?.label ?? ''
    delete out[nested]
  }
  return out
}

function toCsv(rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const header = COLUMNS.join(',')
  const body = rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(',')).join('\n')
  return header + '\n' + body
}

export default function Insights() {
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch('/insights/insights.json')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setMeta)
      .catch(() => setError(true))
  }, [])

  const downloadCsv = async () => {
    setDownloading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(EXPORT_SELECT)
      .order('sent_at', { ascending: false })
    setDownloading(false)
    if (error) { alert('Export failed: ' + error.message); return }

    const csv = toCsv(data.map(flatten))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `lasttext_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const DownloadBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
      <button className="btn" onClick={downloadCsv} disabled={downloading}>
        {downloading ? 'Preparing…' : '↓ Download current data (CSV)'}
      </button>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-muted)' }}>
        live export · all entries with tag labels · opens in Excel / pandas / R
      </span>
    </div>
  )

  if (error) return (
    <main>
      <h1>Insights</h1>
      <DownloadBar />
      <div className="empty"><p>No charts published yet.</p></div>
    </main>
  )

  if (!meta) return <main><div className="empty"><p>Loading…</p></div></main>

  return (
    <main>
      <h1>Insights</h1>
      <div className="subtitle">{meta.n_entries} entries · {meta.n_people} people · charts as of {meta.generated}</div>

      <DownloadBar />

      {meta.analyses.map((a) => (
        <section key={a.png} style={{ margin: '32px 0' }}>
          <h2 style={{ marginBottom: 10, fontSize: 22 }}>{a.title}</h2>
          <div style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)', borderRadius: 2, padding: 14, marginBottom: 10 }}>
            <img src={`/insights/${a.png}`} alt={a.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-soft)', margin: 0 }}>{a.takeaway}</p>
        </section>
      ))}
    </main>
  )
}
