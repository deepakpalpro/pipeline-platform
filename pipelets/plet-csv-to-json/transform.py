"""Generic CSV → JSON records pipelet."""

from __future__ import annotations

import csv
import io
from typing import Any


def parse_csv_text(
    text: str,
    *,
    delimiter: str = ",",
    has_header: bool = True,
) -> list[dict[str, Any]]:
    if not text or not text.strip():
        return []
    stream = io.StringIO(text)
    if has_header:
        reader = csv.DictReader(stream, delimiter=delimiter)
        rows: list[dict[str, Any]] = []
        for row in reader:
            cleaned = {
                (k or "").strip(): (v or "").strip()
                for k, v in row.items()
                if k is not None
            }
            if any(cleaned.values()):
                rows.append(cleaned)
        return rows

    reader_list = csv.reader(stream, delimiter=delimiter)
    rows = []
    for idx, cols in enumerate(reader_list):
        if not any(c.strip() for c in cols):
            continue
        rows.append({f"col{i}": c.strip() for i, c in enumerate(cols)})
    return rows


def extract_csv_text(message: dict[str, Any]) -> str:
    for key in ("csv", "content", "payload", "text"):
        value = message.get(key)
        if isinstance(value, str) and value.strip():
            return value
    records = message.get("records")
    if isinstance(records, list) and records and isinstance(records[0], str):
        return "\n".join(records)
    return ""


def run(message: dict[str, Any], execution: dict[str, Any]) -> dict[str, Any]:
    delimiter = str(execution.get("delimiter") or ",")
    has_header_raw = str(execution.get("hasHeader", "true")).strip().lower()
    has_header = has_header_raw in ("1", "true", "yes", "y")
    csv_text = extract_csv_text(message)
    records = parse_csv_text(csv_text, delimiter=delimiter, has_header=has_header)
    return {
        **message,
        "records": records,
        "recordCount": len(records),
        "pipeletId": "plet-csv-to-json",
        "execution": {
            "delimiter": delimiter,
            "hasHeader": str(has_header).lower(),
        },
    }
