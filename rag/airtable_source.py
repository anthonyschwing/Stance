"""Ingestion: pull raw records straight from Airtable (mirrors server.js's
airtableFetch pagination behaviour) for every table the RAG index needs.
"""
from urllib.parse import quote

import requests

from . import config


def airtable_fetch(table_name, max_records=None, view=None, sort=None, filter_by_formula=None):
    if not config.AIRTABLE_API_KEY or not config.AIRTABLE_BASE_ID:
        raise RuntimeError("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in .env")

    url = f"{config.AIRTABLE_BASE_URL}/{config.AIRTABLE_BASE_ID}/{quote(table_name, safe='')}"
    base_params = {}
    if max_records:
        base_params["maxRecords"] = max_records
    if view:
        base_params["view"] = view
    if filter_by_formula:
        base_params["filterByFormula"] = filter_by_formula
    if sort:
        for i, s in enumerate(sort):
            base_params[f"sort[{i}][field]"] = s["field"]
            base_params[f"sort[{i}][direction]"] = s.get("direction", "desc")

    records = []
    offset = None
    while True:
        params = dict(base_params)
        if offset:
            params["offset"] = offset

        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {config.AIRTABLE_API_KEY}"},
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        for r in data.get("records", []):
            records.append({"id": r["id"], **r.get("fields", {})})

        offset = data.get("offset")
        if not offset or max_records:
            break

    return records


def fetch_all_sources():
    """Fetch every configured HR table. Returns {source_key: [records]}.

    A single table failure (missing table, bad name) doesn't abort the
    whole ingestion — it's logged and that source comes back empty.
    """
    out = {}
    for key, table_name in config.AIRTABLE_TABLES.items():
        try:
            out[key] = airtable_fetch(table_name)
        except Exception as exc:  # noqa: BLE001 - want to keep ingesting other tables
            print(f"[airtable_source] '{key}' ({table_name}) failed: {exc}")
            out[key] = []
    return out
