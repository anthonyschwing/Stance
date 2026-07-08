"""Turn raw Airtable records into retrievable text chunks with metadata.

Each HR record is already a compact structured row, so chunking here is
mostly about rendering it into coherent natural-language text; the
character-based splitter only kicks in for long free-text fields (e.g. an
Executive Summaries narrative) that exceed CHUNK_MAX_CHARS.
"""
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


def _clean(v) -> str:
    return "" if v is None else str(v)


def render_employee(record: dict) -> str:
    known = {
        "id", "First Name", "Last Name", "ID", "Department", "JobRole", "JobLevel",
        "Risk Score", "Risk Level", "YearsAtCompany", "MonthlyIncome", "JobSatisfaction",
        "EnvironmentSatisfaction", "WorkLifeBalance", "OverTime", "NumCompaniesWorked",
        "AI_Insights", "HR_Recommendation",
    }
    name = f"{record.get('First Name', '')} {record.get('Last Name', '')}".strip()
    name = name or f"Employee #{record.get('ID', record.get('id', ''))}"

    parts = [
        f"Employee: {name} (ID {record.get('ID', record.get('id', ''))})",
        f"Department: {record.get('Department', 'N/A')} — Role: {record.get('JobRole', 'N/A')} "
        f"— Level: {record.get('JobLevel', 'N/A')}",
        f"Risk score: {record.get('Risk Score', 'N/A')} ({record.get('Risk Level', 'N/A')})",
        f"Tenure: {record.get('YearsAtCompany', 'N/A')} years — Monthly income: "
        f"{record.get('MonthlyIncome', 'N/A')}",
        f"Job satisfaction: {record.get('JobSatisfaction', 'N/A')} — Environment satisfaction: "
        f"{record.get('EnvironmentSatisfaction', 'N/A')} — Work-life balance: "
        f"{record.get('WorkLifeBalance', 'N/A')}",
        f"Overtime: {record.get('OverTime', 'N/A')} — Companies worked: "
        f"{record.get('NumCompaniesWorked', 'N/A')}",
        f"AI insights: {record.get('AI_Insights', 'N/A')}",
        f"HR recommendation: {record.get('HR_Recommendation', 'N/A')}",
    ]

    extras = {k: v for k, v in record.items() if k not in known and v not in (None, "")}
    if extras:
        parts.append("Additional fields: " + ", ".join(f"{k}={_clean(v)}" for k, v in extras.items()))

    return "\n".join(parts)


def render_department(record: dict) -> str:
    label = record.get("Department") or record.get("Name") or "N/A"
    parts = [f"Department rollup: {label}"]
    for k, v in record.items():
        if k in ("id", "Department", "Name") or v in (None, ""):
            continue
        parts.append(f"{k}: {_clean(v)}")
    return "\n".join(parts)


def render_executive(record: dict) -> str:
    label = record.get("Date") or record.get("Title") or "N/A"
    parts = [f"Executive summary — {label}"]
    for k, v in record.items():
        if k == "id" or v in (None, ""):
            continue
        parts.append(f"{k}: {_clean(v)}")
    return "\n".join(parts)


def render_stability(record: dict) -> str:
    return (
        f"Workforce stability snapshot — {record.get('Date', 'N/A')}\n"
        f"Total employees: {record.get('Total', 'N/A')}\n"
        f"Attrition rate: {record.get('AttritionRate', 'N/A')}%\n"
        f"Retention rate: {record.get('RetentionRate', 'N/A')}%\n"
        f"Average risk score: {record.get('AvgRisk', 'N/A')}"
    )


RENDERERS = {
    "employee": render_employee,
    "department": render_department,
    "executive": render_executive,
    "stability": render_stability,
}


def split_text(text: str, max_chars: int, overlap: int) -> list[str]:
    """Character-based splitter with overlap, biased to break on newlines."""
    if len(text) <= max_chars:
        return [text]

    pieces = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        if end < n:
            nl = text.rfind("\n", start, end)
            if nl > start + max_chars // 2:
                end = nl
        piece = text[start:end].strip()
        if piece:
            pieces.append(piece)
        start = end - overlap if end - overlap > start else end
    return pieces


def chunk_records(source_key: str, records: list[dict], max_chars: int, overlap: int) -> list[Chunk]:
    renderer = RENDERERS.get(source_key)
    if renderer is None:
        raise ValueError(f"No renderer registered for source '{source_key}'")

    chunks = []
    for record in records:
        text = renderer(record)
        base_id = record.get("id") or record.get("ID") or record.get("Date") or "unknown"

        metadata: dict[str, Any] = {
            "source_table": source_key,
            "record_id": str(record.get("id", "")),
        }
        if source_key == "employee":
            metadata["department"] = str(record.get("Department", ""))
            metadata["risk_level"] = str(record.get("Risk Level", ""))
            metadata["employee_name"] = (
                f"{record.get('First Name', '')} {record.get('Last Name', '')}".strip()
            )
        elif source_key in ("department", "executive", "stability"):
            metadata["date"] = str(record.get("Date", ""))

        for i, piece in enumerate(split_text(text, max_chars, overlap)):
            chunks.append(Chunk(id=f"{source_key}:{base_id}:{i}", text=piece, metadata=metadata))

    return chunks


def chunk_all_sources(
    sources: dict[str, list[dict]], max_chars: int, overlap: int
) -> list[Chunk]:
    chunks: list[Chunk] = []
    for key, records in sources.items():
        chunks.extend(chunk_records(key, records, max_chars, overlap))
    return chunks
