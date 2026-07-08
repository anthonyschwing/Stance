"""Chroma-backed vector store: embed chunks locally (no external embedding
API needed — uses Chroma's bundled ONNX MiniLM model) and retrieve by
semantic similarity, optionally filtered by metadata.
"""
import chromadb
from chromadb.utils import embedding_functions

from . import config
from .chunking import Chunk

_client = None


def get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
    return _client


def get_collection(reset: bool = False):
    client = get_client()
    ef = embedding_functions.DefaultEmbeddingFunction()

    if reset:
        try:
            client.delete_collection(config.CHROMA_COLLECTION)
        except Exception:
            pass

    return client.get_or_create_collection(
        name=config.CHROMA_COLLECTION,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )


def upsert_chunks(chunks: list[Chunk], batch_size: int = 100) -> int:
    if not chunks:
        return 0
    collection = get_collection()
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        collection.upsert(
            ids=[c.id for c in batch],
            documents=[c.text for c in batch],
            metadatas=[c.metadata for c in batch],
        )
    return len(chunks)


def query(question: str, n_results: int = 5, where: dict | None = None) -> list[dict]:
    collection = get_collection()
    result = collection.query(
        query_texts=[question],
        n_results=n_results,
        where=where,
    )
    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]
    return [
        {"text": d, "metadata": m, "distance": dist}
        for d, m, dist in zip(docs, metas, dists)
    ]
