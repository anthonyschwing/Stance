"""High-level entry points: build_index() for ingestion, ask() for a full
retrieve-then-generate turn. This is the surface a future Vercel
integration (or the existing /api/ask route) would call into.
"""
from . import airtable_source, chunking, config, generate, vectorstore


def build_index(reset: bool = True) -> int:
    sources = airtable_source.fetch_all_sources()
    chunks = chunking.chunk_all_sources(sources, config.CHUNK_MAX_CHARS, config.CHUNK_OVERLAP_CHARS)
    if reset:
        vectorstore.get_collection(reset=True)
    return vectorstore.upsert_chunks(chunks)


def ask(question: str, k: int = 5, where: dict | None = None) -> dict:
    retrieved = vectorstore.query(question, n_results=k, where=where)
    answer = generate.generate_answer(question, retrieved)
    answer["_sources"] = [
        {
            "source_table": r["metadata"].get("source_table"),
            "record_id": r["metadata"].get("record_id"),
        }
        for r in retrieved
    ]
    return answer
