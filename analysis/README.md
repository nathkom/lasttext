# Last Text Archive — Analysis

A Python workspace for exploring the group's last-text dataset. The centerpiece
is **`gallery.ipynb`**: a browsable menu of analyses (relational patterns, NLP
sentiment, and a few reflective ones) where each section is one question, one
chart, and a plain-language takeaway. Scroll through and pick the ones worth
presenting.

## Setup (once per person)

```bash
cd analysis
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Get the data

The dataset is readable only by signed-in accounts, so the fetch logs in with
**your own** Last Text Archive login to pull a fresh snapshot. Your password is
entered at a hidden prompt and never stored or committed.

```bash
python fetch_data.py
# prompts for your email + password, then writes data/lasttext_export.csv
```

Re-run this any time to refresh. It is **read-only** — it never changes the
database. The CSV is git-ignored (it contains real message text), so it stays on
your machine only.

## Run the gallery

```bash
jupyter notebook gallery.ipynb
```

Run all cells. Each chart also saves to `figures/` as a PNG ready to drop into
slides.

## Files

| File | What it is |
|---|---|
| `fetch_data.py` | Pulls a flat, label-resolved CSV snapshot from Supabase (read-only) |
| `build_notebook.py` | Generates `gallery.ipynb` — edit analyses here, re-run to regenerate |
| `gallery.ipynb` | The analysis gallery (generated) |
| `sync_insights.py` | Publishes the charts + takeaways to the web app's Insights page |
| `requirements.txt` | Python dependencies |
| `data/` | The CSV snapshot (git-ignored) |
| `figures/` | Exported chart PNGs |

> Editing analyses: change a cell in `build_notebook.py` and run
> `python build_notebook.py` to regenerate the notebook. Keeping the notebook in
> a builder script keeps git diffs readable.

## Publishing charts to the website

The app's **Insights** tab shows these charts so teammates don't have to run any
code. To refresh it after new data:

```bash
python fetch_data.py                                              # fresh data
python build_notebook.py                                          # rebuild notebook
jupyter nbconvert --to notebook --execute --inplace gallery.ipynb # run it -> figures/
python sync_insights.py                                           # copy charts + takeaways into the app
```

Then commit and push — Vercel redeploys. Chart titles and takeaways for the web
page live in `sync_insights.py` (the `ANALYSES` list). The CSV download button on
that page pulls **live** data straight from Supabase, so it's always current
regardless of when the charts were last refreshed.

## The analyses (current gallery)

1. **The reply gap** — who actually gets a response, by relationship
2. **Distance & feeling** — emotional valence gradient across relationship types
3. **Evening warmth** — feeling by time of day
4. **NLP: model vs. lived feeling** — VADER sentiment vs. self-reported feeling
5. **NLP: words of "I'll reply" vs "I won't"** — log-odds on incoming texts
6. **Emotional palette** — each person's distinct mix of feelings
7. **The wall-of-text penalty** — feeling by message length
8. **Tone is contagious** — their apparent tone vs. how we ended up feeling

## Notes on the data

- **`days_since_sent`** in the raw table is computed at log-time (stale, with one
  broken value). The notebook ignores it and recomputes `recency_days` from
  `sent_at`. Use that.
- **Redaction tokens** like `[name]`/`[place]` are stripped into `message_clean`
  before any text analysis.
- **Nulls are real** — e.g. `intent_to_reply` is only set for incoming texts.
  Filter on `.notna()` rather than treating nulls as a category.
- Small-n groups are labeled `(n=...)` on the charts — treat those as
  suggestive, not conclusive.
