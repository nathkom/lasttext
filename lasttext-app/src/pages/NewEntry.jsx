import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, PLATFORMS, MESSAGE_TYPES, TIME_OF_DAY, AGE_RELATIVE, CONTACT_FREQUENCY, dayOfWeekFromDate, daysSince } from '../lib/supabase'
import TagPicker from '../components/TagPicker'
import PillSelect from '../components/PillSelect'
import Scale from '../components/Scale'

const today = () => new Date().toISOString().slice(0, 10)

const blank = {
  message_text: '',
  sender: 'them',
  sent_at: today(),
  sent_time_of_day: null,
  platform: 'imessage',
  message_type: 'text',
  relation_tag_id: null,
  closeness: null,
  how_you_know_tag_id: null,
  their_age_relative: null,
  contact_frequency: null,
  relationship_status_tag_id: null,
  your_feeling_valence: null,
  your_feeling_tag_id: null,
  their_apparent_tone_tag_id: null,
  intent_to_reply_tag_id: null,
  life_domain_tag_id: null,
  conversation_topic_tag_id: null,
}

export default function NewEntry({ session }) {
  const nav = useNavigate()
  const [form, setForm] = useState(blank)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [lastEntry, setLastEntry] = useState(null)

  // Load last entry for "same as last" feature
  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data && data[0]) setLastEntry(data[0]) })
  }, [session.user.id])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const updateSender = (v) => {
    if (!v) return
    setForm(prev => ({
      ...prev,
      sender: v,
      ...(v === 'me' && { their_apparent_tone_tag_id: null, intent_to_reply_tag_id: null }),
    }))
  }

  const fillFromLast = () => {
    if (!lastEntry) return
    setForm(prev => ({
      ...prev,
      relation_tag_id: lastEntry.relation_tag_id,
      closeness: lastEntry.closeness,
      how_you_know_tag_id: lastEntry.how_you_know_tag_id,
      their_age_relative: lastEntry.their_age_relative,
      contact_frequency: lastEntry.contact_frequency,
      relationship_status_tag_id: lastEntry.relationship_status_tag_id,
    }))
    setToast('Relationship fields filled from last entry')
    setTimeout(() => setToast(null), 2000)
  }

  const valid = form.message_text.trim() && form.sent_at && form.sender

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    const userName = session.user.user_metadata?.name || session.user.email.split('@')[0]
    const word_count = form.message_text.trim().split(/\s+/).length
    const payload = {
      ...form,
      user_id: session.user.id,
      user_name: userName,
      word_count,
      days_since_sent: daysSince(form.sent_at),
      sent_day_of_week: dayOfWeekFromDate(form.sent_at),
    }
    const { error, data } = await supabase.from('messages').insert(payload).select().single()
    setSubmitting(false)
    if (error) {
      setToast(`Error: ${error.message}`)
      setTimeout(() => setToast(null), 3500)
      return
    }
    setLastEntry(data)
    setForm({ ...blank, sent_at: today() })
    setToast('Entry saved')
    setTimeout(() => setToast(null), 1800)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main>
      <h1>Log a <em>last message</em></h1>
      <div className="subtitle">single pass · all fields are optional except the message itself</div>

      <form onSubmit={submit}>
        {lastEntry && (
          <button type="button" className="btn secondary" onClick={fillFromLast} style={{ marginBottom: 24 }}>
            ⟲ Same relationship fields as last entry
          </button>
        )}

        <div className="section-label">The message</div>

        <div className="field">
          <label className="field-label">Message text <span style={{ color: 'var(--accent)' }}>*</span></label>
          <textarea
            className="textarea"
            value={form.message_text}
            onChange={(e) => update('message_text', e.target.value)}
            placeholder="Type or paste the message. Redact names → [name], places → [place]."
            required
          />
          <div className="field-hint">Lightly redact identifying details to protect the sender.</div>
        </div>

        <PillSelect
          label="Sender"
          options={[{ value: 'me', label: 'I sent it' }, { value: 'them', label: 'They sent it' }]}
          value={form.sender}
          onChange={updateSender}
          allowClear={false}
        />

        <div className="field">
          <label className="field-label">Sent on</label>
          <input
            type="date"
            className="date-input"
            value={form.sent_at}
            onChange={(e) => update('sent_at', e.target.value)}
            max={today()}
          />
        </div>

        <PillSelect label="Time of day" options={TIME_OF_DAY} value={form.sent_time_of_day} onChange={(v) => update('sent_time_of_day', v)} />
        <PillSelect label="Platform" options={PLATFORMS} value={form.platform} onChange={(v) => v && update('platform', v)} allowClear={false} />
        <PillSelect label="Message type" options={MESSAGE_TYPES} value={form.message_type} onChange={(v) => v && update('message_type', v)} allowClear={false} />

        <div className="section-label">The relationship</div>

        <TagPicker table="relation_tags" label="Relation" value={form.relation_tag_id} onChange={(v) => update('relation_tag_id', v)} />
        <Scale label="Closeness" value={form.closeness} onChange={(v) => update('closeness', v)} leftLabel="distant" rightLabel="very close" />
        <TagPicker table="how_you_know_tags" label="How you know them" value={form.how_you_know_tag_id} onChange={(v) => update('how_you_know_tag_id', v)} />
        <PillSelect label="Their age, relative to you" options={AGE_RELATIVE} value={form.their_age_relative} onChange={(v) => update('their_age_relative', v)} />
        <PillSelect label="Typical contact frequency" options={CONTACT_FREQUENCY} value={form.contact_frequency} onChange={(v) => update('contact_frequency', v)} />
        <TagPicker table="relationship_status_tags" label="Relationship status" value={form.relationship_status_tag_id} onChange={(v) => update('relationship_status_tag_id', v)} />

        <div className="section-label">Feeling & context</div>

        <Scale label="How does this message make you feel?" value={form.your_feeling_valence} onChange={(v) => update('your_feeling_valence', v)} leftLabel="negative" rightLabel="positive" />
        <TagPicker table="feeling_tags" label="Your feeling" value={form.your_feeling_tag_id} onChange={(v) => update('your_feeling_tag_id', v)} />
        {form.sender === 'them' && (
          <TagPicker table="feeling_tags" label="Their apparent tone" value={form.their_apparent_tone_tag_id} onChange={(v) => update('their_apparent_tone_tag_id', v)} hint="What the message itself conveys, separate from how you feel." />
        )}
        {form.sender === 'them' && (
          <TagPicker table="intent_to_reply_tags" label="Do you intend to reply?" value={form.intent_to_reply_tag_id} onChange={(v) => update('intent_to_reply_tag_id', v)} />
        )}
        <TagPicker table="life_domain_tags" label="Life domain" value={form.life_domain_tag_id} onChange={(v) => update('life_domain_tag_id', v)} />
        <TagPicker table="conversation_topic_tags" label="Conversation topic" value={form.conversation_topic_tag_id} onChange={(v) => update('conversation_topic_tag_id', v)} />

        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => nav('/')}>Cancel</button>
          <button type="submit" className="btn" disabled={!valid || submitting} style={{ flex: 1 }}>
            {submitting ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </form>

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
