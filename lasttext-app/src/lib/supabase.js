import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Schema constants — keep in sync with the database enums
export const PLATFORMS = [
  { value: 'imessage', label: 'iMessage' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'other', label: 'Other' },
]

export const MESSAGE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'emoji_only', label: 'Emoji only' },
  { value: 'image_or_reaction', label: 'Image / reaction' },
  { value: 'link', label: 'Link' },
  { value: 'voice_note', label: 'Voice note' },
  { value: 'mixed', label: 'Mixed' },
]

export const TIME_OF_DAY = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'late_night', label: 'Late night' },
]

export const AGE_RELATIVE = [
  { value: 'older', label: 'Older' },
  { value: 'similar', label: 'Similar' },
  { value: 'younger', label: 'Younger' },
  { value: 'unknown', label: 'Unknown' },
]

export const CONTACT_FREQUENCY = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'first_time', label: 'First time' },
]

export const TAG_TABLES = {
  relation: 'relation_tags',
  how_you_know: 'how_you_know_tags',
  relationship_status: 'relationship_status_tags',
  feeling: 'feeling_tags',
  intent_to_reply: 'intent_to_reply_tags',
  life_domain: 'life_domain_tags',
  conversation_topic: 'conversation_topic_tags',
}

// Normalize a user-entered label into a snake_case value
export function toValue(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Map JS date to day_of_week enum
const DOW = ['sun','mon','tue','wed','thu','fri','sat']
export function dayOfWeekFromDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  return DOW[d.getDay()]
}

export function daysSince(isoDate) {
  const then = new Date(isoDate + 'T12:00:00')
  const now = new Date()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}
