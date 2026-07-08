"""Smoke test for embedding + retrieval, using an ephemeral (non-persisted)
Chroma client so it never touches rag/chroma_db/. Downloads the default
ONNX MiniLM embedding model on first run (network required once, then
cached locally by chromadb).
"""
import unittest

import chromadb
from chromadb.utils import embedding_functions

from rag.chunking import Chunk


class TestVectorstoreSmoke(unittest.TestCase):
    def setUp(self):
        self.client = chromadb.EphemeralClient()
        self.ef = embedding_functions.DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection("test", embedding_function=self.ef)

    def test_upsert_and_query_returns_relevant_chunk(self):
        chunks = [
            Chunk(
                id="a",
                text="Alice Dupont works in Sales and has high burnout risk due to overtime.",
                metadata={"source_table": "employee"},
            ),
            Chunk(
                id="b",
                text="Workforce stability snapshot for March: attrition rate 4.2 percent.",
                metadata={"source_table": "stability"},
            ),
        ]
        self.collection.upsert(
            ids=[c.id for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[c.metadata for c in chunks],
        )
        result = self.collection.query(
            query_texts=["Which sales employee is at risk of burnout?"], n_results=1
        )
        self.assertEqual(result["ids"][0][0], "a")


if __name__ == "__main__":
    unittest.main()
