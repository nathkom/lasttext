# Last Text Archive

A small data-collection web app for our group's last-text-message project. Built with React + Vite + Supabase.

## What's done

- **Supabase database** (`lasttext` project, ID `ywxjvefylvggqmosvhkp`) — fully set up with:
  - 7 user-extensible tag tables (relation, how-you-know, relationship-status, feeling, intent-to-reply, life-domain, conversation-topic) seeded with 50 starter tags
  - `messages` table with closed enums for non-extensible fields (sender, platform, time-of-day, etc.)
  - Row-Level Security: everyone reads everything (shared dataset); users can only modify their own messages
  - Real-time subscriptions enabled on all tag tables + messages
- **Web app**:
  - Magic-link auth via Supabase
  - Dashboard with live group + individual stats
  - Single-pass entry form, mobile-friendly, pill-button selectors
  - Live-syncing tag picker — when one teammate adds a new tag (e.g. "on_and_off"), it appears in everyone else's dropdown within a second
  - "Same relationship fields as last entry" shortcut to cut repeated taps
  - Entries list with filter (mine / everyone) and delete
  - Auto-computed `word_count`, `sent_day_of_week`, `days_since_sent` on insert

## Running locally

1. Get the anon key from the Supabase dashboard → Project Settings → API → `anon public` key.

2. Create `.env` in the project root:
   ```
   VITE_SUPABASE_URL=https://ywxjvefylvggqmosvhkp.supabase.co
   VITE_SUPABASE_ANON_KEY=<paste anon key here>
   ```

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

   Visit http://localhost:5173. Sign up with your school email — Supabase will email you a magic link.

## Before the team meeting

A couple of things to flag for the group:

1. **Magic links require email config in Supabase.** Email auth is enabled by default with Supabase's built-in mailer, which has a low rate limit but works fine for 5 people. If you want, you can plug in a custom SMTP provider later.

2. **The "+ add tag" pattern is live.** Try this in the demo: have two people open the new-entry form side by side, one adds a tag, watch it appear instantly in the other's dropdown. This is the feature you specifically asked for and it's worth showing off.

3. **Things deliberately not built yet** (good discussion topics for the meeting):
   - CSV export. Trivial to add once schema is locked. Supabase has it built into the dashboard too.
   - Edit-existing-entry. Right now you can delete and re-add. Worth doing if entries take long enough that losing one hurts.
   - Tag merge / cleanup UI. Probably do this in SQL during the analysis-prep pass rather than in the app.
   - Real-time "X is logging an entry now" presence. Cute but not necessary.

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

## CSV export when ready

In the Supabase dashboard: Table Editor → `messages` → "..." menu → Export as CSV. For joined data with tag labels instead of IDs, run this SQL in the SQL editor:

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

Hit "Download CSV" on the result. Reads cleanly into pandas (`pd.read_csv`) or readr (`read_csv`).
