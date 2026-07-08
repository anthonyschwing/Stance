"""Generation step: feed retrieved chunks + question to Claude, forced
through a tool call so the output matches the JSON shape the existing
Ask Stance frontend already expects from the Make webhook:
{ summary, risk_level, recommendations[], confidence_score }
"""
import re

from anthropic import Anthropic

from . import config

# Claude occasionally leaks stray tool-call-like markup (e.g.
# "<recommendations>[...]</recommendations></invoke>") into the `summary`
# text on low-confidence answers, even under forced tool_choice. Truncate
# at the first such tag — legitimate prose summaries never contain one.
_STRAY_TAG_RE = re.compile(r"</?[a-zA-Z_][\w:-]*>")


def _sanitize_text(value: str) -> str:
    match = _STRAY_TAG_RE.search(value)
    return (value[: match.start()] if match else value).strip()

_client = None


def get_client() -> Anthropic:
    global _client
    if _client is None:
        if not config.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY must be set in .env")
        _client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


ANSWER_TOOL = {
    "name": "answer_hr_question",
    "description": "Structured answer to an HR analytics question, grounded only in the provided context.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "2-4 sentence answer to the question, in the question's language.",
            },
            "risk_level": {
                "type": "string",
                "description": (
                    "Overall risk level implied by the context for this question "
                    "(e.g. Low, Medium, Moderate, High, Critical, or N/A if not applicable)."
                ),
            },
            "recommendations": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 5,
            },
            "confidence_score": {
                "type": "number",
                "description": "0-100: how well the retrieved context supports this answer.",
            },
        },
        "required": ["summary", "risk_level", "recommendations", "confidence_score"],
    },
}

SYSTEM_PROMPT = (
    "You are Ask Stance, an HR analytics assistant for the Stance platform. "
    "Answer strictly using the CONTEXT excerpts below, drawn from the company's live "
    "Airtable HR data (employee records, department rollups, executive summaries, "
    "workforce stability snapshots). Never invent employees, numbers, or dates that are "
    "not present in the context. If the context doesn't contain enough information to "
    "answer confidently, say so in `summary` and give a low confidence_score."
)


def build_context_block(chunks: list[dict]) -> str:
    lines = []
    for i, c in enumerate(chunks, 1):
        tag = c["metadata"].get("source_table", "data")
        lines.append(f"[{i}] ({tag}) {c['text']}")
    return "\n\n".join(lines)


def generate_answer(question: str, chunks: list[dict]) -> dict:
    client = get_client()
    context = build_context_block(chunks)

    message = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=[ANSWER_TOOL],
        tool_choice={"type": "tool", "name": "answer_hr_question"},
        messages=[
            {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question}"}
        ],
    )

    for block in message.content:
        if block.type == "tool_use" and block.name == "answer_hr_question":
            result = dict(block.input)
            if isinstance(result.get("summary"), str):
                result["summary"] = _sanitize_text(result["summary"])
            if isinstance(result.get("recommendations"), list):
                result["recommendations"] = [
                    _sanitize_text(r) for r in result["recommendations"] if isinstance(r, str)
                ]
            return result

    raise RuntimeError("Claude did not return a structured answer via the expected tool call")
