from __future__ import annotations

import json
import mimetypes
from dataclasses import dataclass
from datetime import datetime, timedelta
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(__file__).parent
DATA_PATH = ROOT_DIR / "data" / "availability.json"
TEMPLATE_PATH = ROOT_DIR / "templates" / "index.html"
STATIC_DIR = ROOT_DIR / "static"
TIME_FORMAT = "%H:%M"
SLOT_MINUTES = 30


@dataclass
class Availability:
    name: str
    day: str
    start: str
    end: str
    timezone: str
    notes: str

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "Availability":
        required_fields = ["name", "day", "start", "end", "timezone"]
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            raise ValueError(f"Missing fields: {', '.join(missing)}")
        return cls(
            name=payload["name"].strip(),
            day=payload["day"].strip(),
            start=payload["start"].strip(),
            end=payload["end"].strip(),
            timezone=payload["timezone"].strip(),
            notes=payload.get("notes", "").strip(),
        )


class ScheduleHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/":
            self._send_file(TEMPLATE_PATH)
            return

        if self.path.startswith("/static/"):
            static_path = STATIC_DIR / self.path.replace("/static/", "", 1)
            self._send_file(static_path)
            return

        if self.path == "/api/slots":
            self._send_json(load_slots())
            return

        if self.path == "/api/suggestions":
            self._send_json(build_suggestions(load_slots()))
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/slots":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            availability = Availability.from_payload(payload)
            validate_time_order(availability.start, availability.end)
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        slots = load_slots()
        slots.append(availability.__dict__)
        save_slots(slots)
        self._send_json({"status": "ok"}, status=HTTPStatus.CREATED)

    def _send_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_type, _ = mimetypes.guess_type(str(path))
        content = path.read_bytes()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)



def load_slots() -> List[Dict[str, Any]]:
    if not DATA_PATH.exists():
        return []
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_slots(slots: List[Dict[str, Any]]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(slots, handle, ensure_ascii=False, indent=2)


def validate_time_order(start: str, end: str) -> None:
    start_time = datetime.strptime(start, TIME_FORMAT)
    end_time = datetime.strptime(end, TIME_FORMAT)
    if end_time <= start_time:
        raise ValueError("End time must be after start time")


def build_suggestions(slots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    bucket: Dict[str, Dict[str, int]] = {}

    for slot in slots:
        day = slot.get("day", "")
        start = slot.get("start", "")
        end = slot.get("end", "")
        if not day or not start or not end:
            continue
        try:
            start_time = datetime.strptime(start, TIME_FORMAT)
            end_time = datetime.strptime(end, TIME_FORMAT)
        except ValueError:
            continue
        current = start_time
        while current + timedelta(minutes=SLOT_MINUTES) <= end_time:
            label = current.strftime(TIME_FORMAT)
            bucket.setdefault(day, {})
            bucket[day][label] = bucket[day].get(label, 0) + 1
            current += timedelta(minutes=SLOT_MINUTES)

    suggestions_list = []
    for day, counts in bucket.items():
        for time_label, count in counts.items():
            suggestions_list.append(
                {
                    "day": day,
                    "time": time_label,
                    "count": count,
                }
            )

    suggestions_list.sort(key=lambda item: (-item["count"], item["day"], item["time"]))
    return suggestions_list[:12]


def run() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 5000), ScheduleHandler)
    print("Server running on http://localhost:5000")
    server.serve_forever()


if __name__ == "__main__":
    run()
