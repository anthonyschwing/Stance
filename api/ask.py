"""Vercel Python serverless function exposing the Ask Stance RAG pipeline
(rag/pipeline.py, unchanged) over HTTP. Called internally by server.js's
POST /api/ask — not meant to be hit directly by the frontend.

Vercel's deployment filesystem is read-only; only /tmp is writable and
it isn't shared across invocations. The Chroma index is rebuilt from
Airtable in ~50s, too slow to redo on every cold start, so instead this
copies the pre-built rag/chroma_db/ (shipped read-only with the function
bundle) into /tmp/chroma_db once per cold start — a fast file copy, no
re-embedding — and points the pipeline at that writable copy.
"""
import json
import os
import shutil
import sys
import threading
from http.server import BaseHTTPRequestHandler
from pathlib import Path

if os.environ.get("VERCEL"):
    _bundled_db = Path(__file__).resolve().parent.parent / "rag" / "chroma_db"
    _tmp_db = Path("/tmp/chroma_db")
    if not _tmp_db.exists() and _bundled_db.exists():
        shutil.copytree(_bundled_db, _tmp_db)
    os.environ.setdefault("RAG_CHROMA_DIR", str(_tmp_db))

from rag import pipeline  # noqa: E402 (must follow the RAG_CHROMA_DIR setup above)

_warm_lock = threading.Lock()
_warm = False


def _ensure_warm():
    """Touch the collection once per cold start so the first real request
    doesn't also pay Chroma's lazy collection-open cost."""
    global _warm
    if _warm:
        return
    with _warm_lock:
        if _warm:
            return
        pipeline.vectorstore.get_collection()
        _warm = True


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b"{}"

        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return self._send_json(400, {"error": "Invalid JSON body"})

        question = (data or {}).get("question")
        if not question or not isinstance(question, str):
            return self._send_json(400, {"error": "question is required"})

        k = data.get("k") or 5

        try:
            _ensure_warm()
            result = pipeline.ask(question, k=k)
            self._send_json(200, result)
        except Exception as exc:  # noqa: BLE001 - report any pipeline failure as JSON, not a raw 500
            print(f"[api/ask] error: {exc}", file=sys.stderr)
            self._send_json(500, {"error": str(exc)})

    def do_GET(self):
        self._send_json(200, {"ok": True, "service": "ask-stance-rag"})
