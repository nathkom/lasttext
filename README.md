# Last Text Archive

A small data-collection web app for our group's last-text-message project. Built with React + Vite + Supabase.

## What's done

- **Supabase database** (`lasttext` project, ID `ywxjvefylvggqmosvhkp`) — fully set up with:
  - 7 user-extensible tag tables (relation, how-you-know, relationship-status, feeling, intent-to-reply, life-domain, conversation-topic) seeded with 50 starter tags
  - `messages` table with closed enums for non-extensible fields (sender, platform, time-of-day, etc.)
  - Row-Level Security: everyone reads everything (shared dataset); users can only modify their own messages
  - Real-time subscriptions enabled on all tag tables + messages
- **Web app**:
  - Email + password auth — no magic links, no email required after sign-up
  - Dashboard with live group + individual stats and per-person contributor breakdown
  - Single-pass entry form, mobile-friendly, pill-button selectors
  - Sender-aware form: "Their apparent tone" and "Do you intend to reply?" hidden when you are the sender
  - Live-syncing tag picker — when one teammate adds a new tag it appears in everyone else's dropdown within a second
  - "Same relationship fields as last entry" shortcut to cut repeated taps
  - Entries list with mine/everyone filter, date sort, click-to-expand detail view, inline edit, and delete
  - Edit existing entries — full form pre-populated, saves changes back in place
  - Auto-computed `word_count`, `sent_day_of_week`, `days_since_sent` on insert and edit
  - **Insights** dashboard — a gallery of charts from the data, plus a one-click live CSV export (current data, tag labels resolved) for anyone who wants to analyze it themselves
- **Analysis workspace** (`analysis/`):
  - Python notebook gallery of 8 analyses (relationship patterns, NLP sentiment, reflective views)
  - `fetch_data.py` pulls a clean labeled CSV; `build_notebook.py` regenerates the notebook; `sync_insights.py` publishes the charts to the web app's Insights page
  - See [analysis/README.md](analysis/README.md)

## Running locally

1. The `.env` file in `lasttext-app/` already has the Supabase URL and anon key — no setup needed.

2. Install and run:
   ```bash
   cd lasttext-app
   npm install
   npm run dev
   ```

   Visit http://localhost:5173.

## For new teammates signing up

Use the **Sign up** tab on first use. Enter your first name, email, and a password. You're in immediately — no email confirmation. After that, use **Sign in**.

## Field reference

| Field | What it means |
|---|---|
| `sender` | Who sent the last message — you or them |
| `life_domain` | Area of life the conversation belongs to (school, work, family, romance, etc.) |
| `their_apparent_tone` | The emotional tone of their message, separate from how it makes you feel. Only shown when they sent it. |
| `intent_to_reply` | Whether you plan to reply. Only shown when they sent it. |
| `closeness` | 1–5 scale, distant → very close |
| `your_feeling_valence` | 1–5 scale, negative → positive |
| `days_since_sent` | Auto-computed from `sent_at` at time of save |

## Things not built yet

- CSV export — trivial to add once schema is locked; Supabase dashboard has it built in too (Table Editor → messages → Export as CSV)
- Tag merge / cleanup UI — easier to do in SQL during the analysis-prep pass
- Real-time presence ("X is logging now") — nice to have, not necessary

## CSV export with labels

Run this in the Supabase SQL editor for a fully-joined export (tag IDs resolved to readable labels):

```sql
select
  m.user_name,
  m.message_text,
  m.sender,
  m.sent_at,
  m.sent_day_of_week,
  m.sent_time_of_day,
  m.platform,
  m.message_type,
  m.word_count,
  m.days_since_sent,
  rt.label  as relation,
  m.closeness,
  hyk.label as how_you_know,
  m.their_age_relative,
  m.contact_frequency,
  rst.label as relationship_status,
  m.your_feeling_valence,
  ft.label  as your_feeling,
  tt.label  as their_tone,
  irt.label as intent_to_reply,
  ldt.label as life_domain,
  ctt.label as conversation_topic
from messages m
left join relation_tags rt              on rt.id  = m.relation_tag_id
left join how_you_know_tags hyk         on hyk.id = m.how_you_know_tag_id
left join relationship_status_tags rst  on rst.id = m.relationship_status_tag_id
left join feeling_tags ft               on ft.id  = m.your_feeling_tag_id
left join feeling_tags tt               on tt.id  = m.their_apparent_tone_tag_id
left join intent_to_reply_tags irt      on irt.id = m.intent_to_reply_tag_id
left join life_domain_tags ldt          on ldt.id = m.life_domain_tag_id
left join conversation_topic_tags ctt   on ctt.id = m.conversation_topic_tag_id
order by m.user_name, m.sent_at desc;
```

Hit "Download CSV". Reads cleanly into pandas (`pd.read_csv`) or readr (`read_csv`).

## Schema cheatsheet

`messages` columns, grouped:

**Identity & timing**
`id`, `user_id`, `user_name`, `created_at`

**The message**
`message_text`, `sender`, `sent_at`, `sent_time_of_day`, `sent_day_of_week`, `platform`, `message_type`, `word_count`, `days_since_sent`

**The relationship** (tag-based, extensible)
`relation_tag_id`, `closeness`, `how_you_know_tag_id`, `their_age_relative`, `contact_frequency`, `relationship_status_tag_id`

**Feeling & context** (tag-based, extensible)
`your_feeling_valence`, `your_feeling_tag_id`, `their_apparent_tone_tag_id`, `intent_to_reply_tag_id`, `life_domain_tag_id`, `conversation_topic_tag_id`

Note: `their_apparent_tone_tag_id` and `intent_to_reply_tag_id` will be null for entries where `sender = 'me'`.
