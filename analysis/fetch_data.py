"""
Fetch a flat snapshot of the Last Text Archive into data/lasttext_export.csv

Read-only. Pulls every message from Supabase, resolves all tag IDs to readable
labels, and writes a single CSV the notebook can load.

The dataset is readable only by signed-in users, so this logs in with your own
Last Text Archive account to get a token, then reads. Your password is never
stored or written anywhere — it's used once to sign in and discarded.

Re-run any time to refresh the snapshot — it never writes back to the database.

Usage:
    python fetch_data.py
        ...prompts for your email + password

    # or non-interactively (e.g. for a teammate's scripted run):
    LASTTEXT_EMAIL=you@uw.edu LASTTEXT_PASSWORD=... python fetch_data.py
"""

import getpass
import os
import sys
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE.parent / "lasttext-app" / ".env"
OUT_PATH = HERE / "data" / "lasttext_export.csv"

# Embedded joins for every tag table with a single foreign key — PostgREST
# resolves each to the related row's label. We deliberately leave OUT the two
# feeling_tags links (your_feeling, their_apparent_tone): they both point at the
# same table, and aliased self-joins don't survive the REST round-trip. Instead
# we keep their *_tag_id columns and map them locally against a feeling lookup.
SELECT = (
    "*,"
    "relation_tags(label),"
    "how_you_know_tags(label),"
    "relationship_status_tags(label),"
    "intent_to_reply_tags(label),"
    "life_domain_tags(label),"
    "conversation_topic_tags(label)"
)

# nested-object column  ->  flat label column
NESTED = {
    "relation_tags": "relation",
    "how_you_know_tags": "how_you_know",
    "relationship_status_tags": "relationship_status",
    "intent_to_reply_tags": "intent_to_reply",
    "life_domain_tags": "life_domain",
    "conversation_topic_tags": "conversation_topic",
}

# the two feeling references, mapped locally:  *_tag_id column -> flat label
FEELING_MAP = {
    "your_feeling_tag_id": "your_feeling",
    "their_apparent_tone_tag_id": "their_tone",
}


def load_credentials():
    load_dotenv(ENV_PATH)
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        sys.exit(
            f"Could not find Supabase credentials.\n"
            f"Expected them in {ENV_PATH} as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
        )
    return url.rstrip("/"), key


def sign_in(url, key):
    """Sign in with email + password, return an access token. Password is not stored."""
    email = os.environ.get("LASTTEXT_EMAIL") or input("Last Text Archive email: ").strip()
    password = os.environ.get("LASTTEXT_PASSWORD") or getpass.getpass("Password (hidden): ")
    resp = requests.post(
        f"{url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=30,
    )
    if resp.status_code != 200:
        sys.exit(f"Sign-in failed ({resp.status_code}): {resp.text[:200]}")
    return resp.json()["access_token"]


def _get(url, path, key, token, **params):
    resp = requests.get(
        f"{url}/rest/v1/{path}",
        headers={"apikey": key, "Authorization": f"Bearer {token}"},
        params=params, timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_rows(url, key, token):
    return _get(url, "messages", key, token, select=SELECT, order="sent_at.desc")


def fetch_feeling_lookup(url, key, token):
    rows = _get(url, "feeling_tags", key, token, select="id,label")
    return {r["id"]: r["label"] for r in rows}


def flatten(rows, feeling_lookup):
    df = pd.DataFrame(rows)
    # single-FK embeds: pull the nested label up into a flat column
    for nested_col, flat_col in NESTED.items():
        if nested_col in df.columns:
            df[flat_col] = df[nested_col].apply(
                lambda v: v.get("label") if isinstance(v, dict) else None
            )
            df = df.drop(columns=[nested_col])
    # the two feeling references: map ids -> labels locally
    for id_col, flat_col in FEELING_MAP.items():
        if id_col in df.columns:
            df[flat_col] = df[id_col].map(feeling_lookup)
    # drop the raw tag-id columns; labels have replaced them
    df = df.drop(columns=[c for c in df.columns if c.endswith("_tag_id")])
    return df


def main():
    url, key = load_credentials()
    token = sign_in(url, key)
    print(f"Fetching from {url} ...")
    rows = fetch_rows(url, key, token)
    feeling_lookup = fetch_feeling_lookup(url, key, token)
    df = flatten(rows, feeling_lookup)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(df)} rows x {len(df.columns)} cols -> {OUT_PATH.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
