"""Local test CLI for the Ask Stance RAG module.

    python -m rag.cli build-index
    python -m rag.cli ask "Quels employés du service Sales sont à risque élevé ?"
"""
import argparse
import json
import sys

from . import pipeline


def main():
    # Windows consoles default stdout to the system code page (e.g. cp1252),
    # which mangles accented chars. Force UTF-8 so output is correct both
    # in a terminal and when redirected to a file.
    if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(prog="rag", description="Ask Stance RAG pipeline (local test CLI)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("build-index", help="Fetch Airtable data, chunk, embed, and store in Chroma")

    ask_p = sub.add_parser("ask", help="Ask a question against the indexed HR data")
    ask_p.add_argument("question")
    ask_p.add_argument("--k", type=int, default=5, help="Number of chunks to retrieve (default 5)")

    args = parser.parse_args()

    if args.command == "build-index":
        count = pipeline.build_index()
        print(f"Indexed {count} chunks into '{pipeline.config.CHROMA_COLLECTION}'.")
    elif args.command == "ask":
        result = pipeline.ask(args.question, k=args.k)
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
