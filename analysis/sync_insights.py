"""
Publish the gallery charts to the web app's Insights page.

Copies the exported PNGs from figures/ into the app's public/insights/ folder
and writes insights.json (titles + takeaways) that the Insights page renders.

Run AFTER regenerating the charts:
    python build_notebook.py
    jupyter nbconvert --to notebook --execute --inplace gallery.ipynb
    python sync_insights.py

No database access — just copies local files.
"""

import json
import shutil
from datetime import date
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
FIG = HERE / "figures"
DATA = HERE / "data" / "lasttext_export.csv"
DEST = HERE.parent / "lasttext-app" / "public" / "insights"

# Single source of truth for the web page: title, plain takeaway, chart file, kind.
ANALYSES = [
    {
        "kind": "relational",
        "title": "Who actually gets a reply",
        "png": "1_reply_gap.png",
        "takeaway": "Each bar shows how often we plan NOT to reply to a text from that "
        "type of person. We leave almost everyone on read — even close friends about "
        "half the time — and the more distant the person, the less likely we answer.",
    },
    {
        "kind": "relational",
        "title": "Closer people, warmer texts",
        "png": "2_valence_gradient.png",
        "takeaway": "Average feeling about the last text (1 = bad, 5 = good) by who sent "
        "it. The closer the relationship, the better it tends to feel. Spam and "
        "strangers sit at the bottom.",
    },
    {
        "kind": "relational",
        "title": "Texts feel best in the evening",
        "png": "3_time_of_day.png",
        "takeaway": "Average feeling by time of day. Evening is the only stretch that "
        "feels better than neutral; mornings feel the worst.",
    },
    {
        "kind": "NLP",
        "title": "Can a computer tell how a text made us feel?",
        "png": "4_vader_vs_human.png",
        "takeaway": "We had a sentiment model guess each text's mood from its words "
        "alone, then compared that to how we actually felt. It barely matches either "
        "way (the trend lines are nearly flat) — the same words can mean very "
        "different things depending on who sent them and what came before. Words "
        "alone don't capture feeling.",
    },
    {
        "kind": "NLP",
        "title": "What unanswered texts say",
        "png": "5_reply_words.png",
        "takeaway": "The most common words across the 126 texts we received and don't "
        "plan to answer — mostly everyday logistics and small talk.",
    },
    {
        "kind": "reflective",
        "title": "Everyone feels differently",
        "png": "6_emotional_palette.png",
        "takeaway": "Each bar is one person, split by the feelings they logged. The "
        "mixes are clearly different — there's no single 'normal' way our last texts "
        "feel.",
    },
    {
        "kind": "relational",
        "title": "Long texts feel worse",
        "png": "7_wall_of_text.png",
        "takeaway": "Average feeling by message length. Short and medium texts feel "
        "fine; long (16+ word) last texts dip — they more often carry bad news, "
        "conflict, or over-explaining.",
    },
    {
        "kind": "reflective",
        "title": "Their tone rubs off on us",
        "png": "8_contagion.png",
        "takeaway": "When the other person's message feels warm, we feel good; when "
        "it's demanding, we feel worse. Their tone carries over to how we feel.",
    },
    {
        "kind": "relational",
        "title": "Who goes silent first?",
        "png": "9_silent_first.png",
        "takeaway": "For almost every type of person, it was THEY who sent the last "
        "text and we never replied — we're usually the ones who let the conversation "
        "drop. Only family and acquaintances are close to balanced.",
    },
    {
        "kind": "relational",
        "title": "Closeness tracks feeling",
        "png": "10_closeness_feeling.png",
        "takeaway": "Each dot is one text. The closer we are to someone, the better "
        "their last text tends to make us feel — a real, moderate link (r = 0.40). "
        "Unlike the word-based model, this signal is clearly there.",
    },
    {
        "kind": "relational",
        "title": "What our last texts are about",
        "png": "11_topics.png",
        "takeaway": "Bar length is how many; color is how good they feel (red = bad, "
        "green = good). Most conversations end mid-logistics or in small talk. Spam is "
        "both common and the clear low point.",
    },
    {
        "kind": "reflective",
        "title": "When conversations die",
        "png": "12_when_die.png",
        "takeaway": "A grid of when our last texts were sent — day of week vs time of "
        "day. Conversations mostly fizzle in the afternoons, peaking Monday afternoon, "
        "not late at night.",
    },
    {
        "kind": "reflective",
        "title": "How long our conversations have been dead",
        "png": "13_dead_recency.png",
        "takeaway": "Median time since the last text, by relationship. Our closest "
        "silences are recent (friends ~4 months, still recoverable); distant, "
        "transactional ones have been dead close to a year.",
    },
    {
        "kind": "relational",
        "title": "How we know the people we last texted",
        "png": "14_how_known.png",
        "takeaway": "Where our contacts come from (bar length) and how their last "
        "texts feel (color). Overwhelmingly school. People met through mutual friends "
        "feel warmest; strangers the coldest.",
    },
]


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    published = []
    for a in ANALYSES:
        src = FIG / a["png"]
        if not src.exists():
            print(f"  skip (missing): {a['png']} — run the notebook first")
            continue
        shutil.copy2(src, DEST / a["png"])
        published.append(a)

    meta = {"generated": date.today().isoformat(), "analyses": published}
    if DATA.exists():
        df = pd.read_csv(DATA)
        meta["n_entries"] = int(len(df))
        meta["n_people"] = int(df["user_name"].nunique())

    (DEST / "insights.json").write_text(json.dumps(meta, indent=2))
    print(f"Published {len(published)} charts -> {DEST.relative_to(HERE.parent)}")
    print(f"Manifest: {meta.get('n_entries','?')} entries, {meta.get('n_people','?')} people")


if __name__ == "__main__":
    main()
