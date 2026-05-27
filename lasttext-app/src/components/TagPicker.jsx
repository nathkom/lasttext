import { useEffect, useRef, useState } from 'react'
import { supabase, toValue } from '../lib/supabase'

let _channelCounter = 0

/**
 * Pill-button tag selector with:
 *  - real-time updates when other users add tags
 *  - inline "+ add new" that inserts and selects immediately
 *  - duplicate detection (case-insensitive on value)
 */
export default function TagPicker({ table, value, onChange, label, hint }) {
  const [tags, setTags] = useState([])
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const channelName = useRef(`tags:${table}:${++_channelCounter}`)

  useEffect(() => {
    supabase
      .from(table)
      .select('*')
      .order('is_default', { ascending: false })
      .order('label', { ascending: true })
      .then(({ data }) => setTags(data || []))

    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => {
          setTags(prev => {
            if (prev.find(t => t.id === payload.new.id)) return prev
            return [...prev, payload.new].sort((a, b) => {
              if (a.is_default !== b.is_default) return b.is_default - a.is_default
              return a.label.localeCompare(b.label)
            })
          })
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table])

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  const addTag = async () => {
    const labelTrim = newLabel.trim()
    if (!labelTrim) return
    const newValue = toValue(labelTrim)
    if (!newValue) { setError('Use letters or numbers'); return }
    const dupe = tags.find(t => t.value === newValue)
    if (dupe) {
      onChange(dupe.id)
      setAdding(false); setNewLabel(''); setError(null)
      return
    }
    const { data, error } = await supabase
      .from(table)
      .insert({ value: newValue, label: labelTrim, is_default: false })
      .select()
      .single()
    if (error) { setError(error.message); return }
    setTags(prev => prev.find(t => t.id === data.id) ? prev : [...prev, data])
    onChange(data.id)
    setAdding(false); setNewLabel(''); setError(null)
  }

  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="pill-group">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            className={`pill ${value === tag.id ? 'selected' : ''}`}
            onClick={() => onChange(value === tag.id ? null : tag.id)}
          >
            {tag.label}
            {!tag.is_default && <span className="badge">new</span>}
          </button>
        ))}
        {!adding && (
          <button type="button" className="pill add-new" onClick={() => setAdding(true)}>
            + add tag
          </button>
        )}
      </div>
      {adding && (
        <div className="new-tag-inline">
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. on and off"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTag() }
              if (e.key === 'Escape') { setAdding(false); setNewLabel(''); setError(null) }
            }}
          />
          <button type="button" onClick={addTag}>Add</button>
          <button type="button" className="btn ghost" onClick={() => { setAdding(false); setNewLabel('') }}>cancel</button>
        </div>
      )}
      {error && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 6 }}>{error}</div>}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}
