"""Minimal local client demonstrating capture, trace, staleness, and replay requests."""

import json
from urllib.request import Request, urlopen

BASE_URL = "http://localhost:8000"


def post(path: str) -> dict:
    request = Request(f"{BASE_URL}{path}", method="POST", headers={"Content-Type": "application/json"})
    with urlopen(request) as response:  # noqa: S310 - fixed local development URL
        return json.loads(response.read())


def get(path: str) -> dict:
    with urlopen(f"{BASE_URL}{path}") as response:  # noqa: S310 - fixed local development URL
        return json.loads(response.read())


if __name__ == "__main__":
    run = post("/api/v1/examples/revenue-risk")
    print("Recorded run:", run["run_id"])
    print("Upstream graph:", json.dumps(get("/api/v1/lineage/result:q1_retention_risk:2025-W08"), indent=2))
    print("Staleness:", json.dumps(get("/api/v1/staleness/result:q1_retention_risk:2025-W08"), indent=2))
    print("Replay:", post(f"/api/v1/reproduce/{run['run_id']}"))
