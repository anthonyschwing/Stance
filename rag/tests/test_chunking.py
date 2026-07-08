import unittest

from rag import chunking


class TestSplitText(unittest.TestCase):
    def test_short_text_not_split(self):
        text = "short line"
        self.assertEqual(chunking.split_text(text, max_chars=100, overlap=10), [text])

    def test_long_text_split_with_overlap(self):
        text = "\n".join(f"line {i}" for i in range(200))
        pieces = chunking.split_text(text, max_chars=200, overlap=20)
        self.assertGreater(len(pieces), 1)
        rejoined_has_all_lines = all(f"line {i}" in "\n".join(pieces) for i in range(200))
        self.assertTrue(rejoined_has_all_lines)


class TestRenderers(unittest.TestCase):
    def test_render_employee_includes_key_fields(self):
        record = {
            "id": "rec123",
            "First Name": "Alice",
            "Last Name": "Dupont",
            "ID": 42,
            "Department": "Sales",
            "JobRole": "Account Manager",
            "Risk Score": 72,
            "Risk Level": "High",
            "OverTime": "Yes",
        }
        text = chunking.render_employee(record)
        self.assertIn("Alice Dupont", text)
        self.assertIn("Sales", text)
        self.assertIn("High", text)

    def test_render_employee_keeps_unknown_fields(self):
        record = {"id": "rec1", "First Name": "Bob", "Last Name": "Martin", "CustomField": "xyz"}
        text = chunking.render_employee(record)
        self.assertIn("CustomField=xyz", text)

    def test_chunk_records_sets_employee_metadata(self):
        records = [
            {
                "id": "rec1",
                "First Name": "Bob",
                "Last Name": "Martin",
                "Department": "Engineering",
                "Risk Level": "Low",
            }
        ]
        chunks = chunking.chunk_records("employee", records, max_chars=1000, overlap=100)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].metadata["department"], "Engineering")
        self.assertEqual(chunks[0].metadata["risk_level"], "Low")
        self.assertEqual(chunks[0].id, "employee:rec1:0")

    def test_chunk_all_sources_covers_every_table(self):
        sources = {
            "employee": [{"id": "e1", "First Name": "A", "Last Name": "B"}],
            "department": [{"id": "d1", "Department": "Sales"}],
            "executive": [{"id": "x1", "Date": "2026-07-01"}],
            "stability": [{"id": "s1", "Date": "2026-07-01", "Total": 100}],
        }
        chunks = chunking.chunk_all_sources(sources, max_chars=1000, overlap=100)
        table_keys = {c.metadata["source_table"] for c in chunks}
        self.assertEqual(table_keys, {"employee", "department", "executive", "stability"})

    def test_unknown_source_key_raises(self):
        with self.assertRaises(ValueError):
            chunking.chunk_records("unknown_table", [{"id": "z"}], max_chars=100, overlap=10)


if __name__ == "__main__":
    unittest.main()
