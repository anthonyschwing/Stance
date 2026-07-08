"""Full live pipeline test — hits real Airtable + real Claude API, so it's
gated behind an explicit opt-in env var to avoid accidental API costs on
every test run.

    RAG_RUN_LIVE_TESTS=1 python -m unittest rag.tests.test_pipeline_live
"""
import os
import unittest

from rag import pipeline


@unittest.skipUnless(
    os.environ.get("RAG_RUN_LIVE_TESTS") == "1",
    "set RAG_RUN_LIVE_TESTS=1 to run the live Airtable + Claude integration test",
)
class TestPipelineLive(unittest.TestCase):
    def test_build_index_and_ask(self):
        count = pipeline.build_index()
        self.assertGreater(count, 0)

        result = pipeline.ask("What is the overall attrition risk right now?")
        self.assertIn("summary", result)
        self.assertIn("risk_level", result)
        self.assertIn("recommendations", result)
        self.assertIn("confidence_score", result)


if __name__ == "__main__":
    unittest.main()
