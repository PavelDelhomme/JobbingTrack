#!/usr/bin/env python3
"""Compare monitoring-c and monitoring-agent-rs contracts."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


DEFAULT_C_URL = "http://localhost:5098"
DEFAULT_RS_URL = "http://localhost:5118"
REQUEST_TIMEOUT_SEC = 10
MIN_MATCH_RATIO = 0.80
MAX_AVAILABILITY_DELTA = 40.0
MAX_AVG_DELTA = 2000.0


@dataclass(frozen=True)
class CheckResult:
    name: str
    ok: bool
    detail: str


def main() -> int:
    c_url = os.environ.get("MONITORING_C_COMPARE_URL", DEFAULT_C_URL).rstrip("/")
    rs_url = os.environ.get("MONITORING_RS_COMPARE_URL", DEFAULT_RS_URL).rstrip("/")

    print(f"Comparing monitoring agents: C={c_url} Rust={rs_url}")
    c_metrics = fetch_json(f"{c_url}/api/v1/metrics")
    rs_metrics = fetch_json(f"{rs_url}/api/v1/metrics")
    c_history = fetch_json(f"{c_url}/api/v1/persistence/system/metrics?limit=3")
    rs_history = fetch_json(f"{rs_url}/api/v1/persistence/system/metrics?limit=3")

    checks = [
        check_top_level_contract(c_metrics, rs_metrics),
        check_container_contract(c_metrics, rs_metrics),
        check_container_overlap(c_metrics, rs_metrics),
        check_availability(c_metrics, rs_metrics),
        check_response_time(c_metrics, rs_metrics),
        check_history_contract(c_history, rs_history),
    ]

    for check in checks:
        status = "OK" if check.ok else "FAIL"
        print(f"[{status}] {check.name}: {check.detail}")

    return 0 if all(check.ok for check in checks) else 1


def fetch_json(url: str) -> dict[str, Any]:
    started_at = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SEC) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as error:
        raise SystemExit(f"Unable to fetch {url}: {error}") from error
    elapsed_ms = (time.monotonic() - started_at) * 1000
    print(f"Fetched {url} in {elapsed_ms:.1f} ms")
    if not isinstance(payload, dict):
        raise SystemExit(f"{url} did not return a JSON object")
    return payload


def check_top_level_contract(c_metrics: dict[str, Any], rs_metrics: dict[str, Any]) -> CheckResult:
    required = {
        "timestamp",
        "cpu",
        "memory",
        "disk",
        "container_count",
        "avg_response_time_ms",
        "avg_cpu_percent",
        "avg_memory_percent",
        "availability_percent",
        "load_score",
        "network",
        "services",
        "system",
        "containers",
    }
    missing = sorted(required - set(rs_metrics))
    return CheckResult(
        "top-level metrics keys",
        not missing and bool(c_metrics),
        "all required keys present" if not missing else f"missing {missing}",
    )


def check_container_contract(c_metrics: dict[str, Any], rs_metrics: dict[str, Any]) -> CheckResult:
    containers = rs_metrics.get("containers")
    if not isinstance(containers, list) or not containers:
        return CheckResult("container metrics shape", False, "Rust containers list is empty")

    required = {
        "name",
        "cpu_percent",
        "memory_mb",
        "memory_percent",
        "network_rx_bytes",
        "network_tx_bytes",
        "response_time_ms",
        "http_status",
    }
    missing = sorted(required - set(containers[0]))
    return CheckResult(
        "container metrics shape",
        not missing,
        "first container has required keys" if not missing else f"missing {missing}",
    )


def check_container_overlap(c_metrics: dict[str, Any], rs_metrics: dict[str, Any]) -> CheckResult:
    c_names = container_names(c_metrics)
    rs_names = container_names(rs_metrics)
    if not c_names:
        return CheckResult("container overlap", False, "C agent returned no containers")
    ratio = len(c_names & rs_names) / len(c_names)
    return CheckResult(
        "container overlap",
        ratio >= MIN_MATCH_RATIO,
        f"{len(c_names & rs_names)}/{len(c_names)} shared ({ratio:.0%})",
    )


def check_availability(c_metrics: dict[str, Any], rs_metrics: dict[str, Any]) -> CheckResult:
    c_value = number(c_metrics.get("availability_percent"))
    rs_value = number(rs_metrics.get("availability_percent"))
    delta = abs(c_value - rs_value)
    return CheckResult(
        "availability delta",
        delta <= MAX_AVAILABILITY_DELTA,
        f"C={c_value:.2f} Rust={rs_value:.2f} delta={delta:.2f}",
    )


def check_response_time(c_metrics: dict[str, Any], rs_metrics: dict[str, Any]) -> CheckResult:
    c_value = number(c_metrics.get("avg_response_time_ms"))
    rs_value = number(rs_metrics.get("avg_response_time_ms"))
    delta = abs(c_value - rs_value)
    return CheckResult(
        "avg response time delta",
        delta <= MAX_AVG_DELTA,
        f"C={c_value:.2f}ms Rust={rs_value:.2f}ms delta={delta:.2f}ms",
    )


def check_history_contract(c_history: dict[str, Any], rs_history: dict[str, Any]) -> CheckResult:
    if rs_history.get("success") is not True:
        return CheckResult("history endpoint", False, "Rust history success is not true")
    data = rs_history.get("data")
    if not isinstance(data, list):
        return CheckResult("history endpoint", False, "Rust history data is not a list")
    if data and "cpuUsagePercent" not in data[0]:
        return CheckResult("history endpoint", False, "Rust history row misses cpuUsagePercent")
    return CheckResult(
        "history endpoint",
        c_history.get("success") is True,
        f"Rust count={rs_history.get('count')} C count={c_history.get('count')}",
    )


def container_names(metrics: dict[str, Any]) -> set[str]:
    containers = metrics.get("containers")
    if not isinstance(containers, list):
        return set()
    return {
        str(container.get("name", "")).removeprefix("/")
        for container in containers
        if isinstance(container, dict) and container.get("name")
    }


def number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


if __name__ == "__main__":
    sys.exit(main())
