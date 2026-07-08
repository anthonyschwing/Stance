"""Environment/config for the Ask Stance RAG module.

Reuses the same .env file as server.js (repo root) so both the Node app
and this Python module share one source of truth for Airtable credentials.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

AIRTABLE_API_KEY = os.environ.get("AIRTABLE_API_KEY", "")
AIRTABLE_BASE_ID = os.environ.get("AIRTABLE_BASE_ID", "")
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

AIRTABLE_TABLES = {
    "employee": os.environ.get("AIRTABLE_EMPLOYEE_TABLE", "Employee Analytics"),
    "department": os.environ.get("AIRTABLE_DEPARTMENT_TABLE", "Department_rollups"),
    "executive": os.environ.get("AIRTABLE_EXECUTIVE_TABLE", "Executive_Summaries"),
    "stability": os.environ.get("AIRTABLE_STABILITY_TABLE", "Workforce_Stability_Snapshots"),
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

CHROMA_PERSIST_DIR = os.environ.get("RAG_CHROMA_DIR", str(ROOT_DIR / "rag" / "chroma_db"))
CHROMA_COLLECTION = os.environ.get("RAG_CHROMA_COLLECTION", "stance_hr_data")

CHUNK_MAX_CHARS = int(os.environ.get("RAG_CHUNK_MAX_CHARS", "1000"))
CHUNK_OVERLAP_CHARS = int(os.environ.get("RAG_CHUNK_OVERLAP_CHARS", "150"))
