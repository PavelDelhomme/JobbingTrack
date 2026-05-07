#!/usr/bin/env python3
"""
Sample Docker resource usage for the monitoring hot path and emit p95 budgets.

Default target containers:
  jobbingtrack-metrics-aggregator, jobbingtrack-monitoring-c,
  jobbingtrack-log-collector-c, jobbingtrack-redis, jobbingtrack-frontend
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_TARGETS = [
    "jobbingtrack-metrics-aggregator",
    "jobbingtrack-monitoring-c",
    "jobbingtrack-log-collector-c",
    "jobbingtrack-redis",
    "jobbingtrack-frontend",
]


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, check=False, text=True, capture_output=True)


def parse_percent(raw: str | None) -> float:
    if not raw:
        return 0.0
    return float(raw.strip().replace("%", "") or 0)


def parse_bytes(raw: str | None) -> float:
    if not raw:
        return 0.0
    text = raw.strip().replace(" ", "")
    if not text or text == "--":
        return 0.0

    num = ""
    unit = ""
    for char in text:
        if char.isdigit() or char == ".":
            num += char
        else:
            unit += char
    if not num:
        return 0.0

    value = float(num)
    factors = {
        "B": 1,
        "kB": 1000,
        "KB": 1000,
        "KiB": 1024,
        "MB": 1000**2,
        "MiB": 1024**2,
        "GB": 1000**3,
        "GiB": 1024**3,
    }
    return value * factors.get(unit, 1)


def parse_pair(raw: str | None) -> tuple[float, float]:
    if not raw or "/" not in raw:
        return (0.0, 0.0)
    left, right = raw.split("/", 1)
    return (parse_bytes(left), parse_bytes(right))


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = (len(ordered) - 1) * pct
    lower = math.floor(idx)
    upper = math.ceil(idx)
    if lower == upper:
        return ordered[int(idx)]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (idx - lower)


def running_containers() -> set[str]:
    result = run(["docker", "ps", "--format", "{{.Names}}"])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "docker ps failed")
    return {line.strip() for line in result.stdout.splitlines() if line.strip()}


def resolve_targets(targets: list[str]) -> list[str]:
    running = running_containers()
    resolved: list[str] = []
    for target in targets:
        candidates = [target]
        if not target.startswith("jobbingtrack-"):
            candidates.append(f"jobbingtrack-{target}")
        match = next((name for name in candidates if name in running), None)
        if match:
            resolved.append(match)
        else:
            print(f"WARN: container not running, skipped: {target}", file=sys.stderr)
    return resolved


def docker_stats(containers: list[str]) -> list[dict[str, Any]]:
    result = run(["docker", "stats", "--no-stream", "--format", "{{json .}}", *containers])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "docker stats failed")
    rows: list[dict[str, Any]] = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def sample_row(raw: dict[str, Any], elapsed_sec: float, previous: dict[str, dict[str, float]]) -> dict[str, Any]:
    name = raw.get("Name") or raw.get("Container") or ""
    mem_used, mem_limit = parse_pair(raw.get("MemUsage"))
    net_rx, net_tx = parse_pair(raw.get("NetIO"))
    block_read, block_write = parse_pair(raw.get("BlockIO"))

    prev = previous.get(name)
    read_bps = 0.0
    write_bps = 0.0
    if prev and elapsed_sec > 0:
        read_bps = max(0.0, block_read - prev["block_read_bytes"]) / elapsed_sec
        write_bps = max(0.0, block_write - prev["block_write_bytes"]) / elapsed_sec

    previous[name] = {
        "block_read_bytes": block_read,
        "block_write_bytes": block_write,
    }

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "container": name,
        "cpu_percent": parse_percent(raw.get("CPUPerc")),
        "memory_percent": parse_percent(raw.get("MemPerc")),
        "memory_mb": mem_used / 1024 / 1024,
        "memory_limit_mb": mem_limit / 1024 / 1024,
        "network_rx_mb": net_rx / 1024 / 1024,
        "network_tx_mb": net_tx / 1024 / 1024,
        "block_read_mb": block_read / 1024 / 1024,
        "block_write_mb": block_write / 1024 / 1024,
        "block_read_kb_s": read_bps / 1024,
        "block_write_kb_s": write_bps / 1024,
    }


def build_summary(rows: list[dict[str, Any]], duration_sec: int, interval_sec: int) -> dict[str, Any]:
    by_container: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        by_container.setdefault(row["container"], []).append(row)

    containers: dict[str, Any] = {}
    for name, samples in by_container.items():
        containers[name] = {
            "samples": len(samples),
            "cpu_percent_avg": percentile([r["cpu_percent"] for r in samples], 0.50),
            "cpu_percent_p95": percentile([r["cpu_percent"] for r in samples], 0.95),
            "cpu_percent_max": max(r["cpu_percent"] for r in samples),
            "memory_mb_p95": percentile([r["memory_mb"] for r in samples], 0.95),
            "memory_mb_max": max(r["memory_mb"] for r in samples),
            "memory_percent_p95": percentile([r["memory_percent"] for r in samples], 0.95),
            "block_read_kb_s_p95": percentile([r["block_read_kb_s"] for r in samples[1:]], 0.95),
            "block_write_kb_s_p95": percentile([r["block_write_kb_s"] for r in samples[1:]], 0.95),
        }

    return {
        "duration_sec": duration_sec,
        "interval_sec": interval_sec,
        "containers": containers,
    }


def write_markdown(path: Path, summary: dict[str, Any]) -> None:
    lines = [
        "# Resource Budget Sample",
        "",
        f"- duration_sec: {summary['duration_sec']}",
        f"- interval_sec: {summary['interval_sec']}",
        "",
        "| Container | Samples | CPU p95 % | CPU max % | RAM p95 MB | RAM max MB | Block read p95 KB/s | Block write p95 KB/s |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for name, data in summary["containers"].items():
        lines.append(
            f"| `{name}` | {data['samples']} | {data['cpu_percent_p95']:.2f} | "
            f"{data['cpu_percent_max']:.2f} | {data['memory_mb_p95']:.1f} | "
            f"{data['memory_mb_max']:.1f} | {data['block_read_kb_s_p95']:.2f} | "
            f"{data['block_write_kb_s_p95']:.2f} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--duration-min", type=float, default=float(os.getenv("RESOURCE_BUDGET_DURATION_MIN", "45")))
    parser.add_argument("--interval-sec", type=int, default=int(os.getenv("RESOURCE_BUDGET_INTERVAL_SEC", "15")))
    parser.add_argument("--output-dir", default=os.getenv("RESOURCE_BUDGET_OUTPUT_DIR", "tests/results/resource-budget"))
    parser.add_argument("--targets", default=os.getenv("RESOURCE_BUDGET_TARGETS", ",".join(DEFAULT_TARGETS)))
    args = parser.parse_args()

    targets = [item.strip() for item in args.targets.split(",") if item.strip()]
    containers = resolve_targets(targets)
    if not containers:
        print("ERROR: no target container is running", file=sys.stderr)
        return 2

    duration_sec = int(args.duration_min * 60)
    output_dir = Path(args.output_dir) / datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "samples.csv"
    summary_json_path = output_dir / "summary.json"
    summary_md_path = output_dir / "summary.md"

    fieldnames = [
        "timestamp",
        "container",
        "cpu_percent",
        "memory_percent",
        "memory_mb",
        "memory_limit_mb",
        "network_rx_mb",
        "network_tx_mb",
        "block_read_mb",
        "block_write_mb",
        "block_read_kb_s",
        "block_write_kb_s",
    ]

    print(f"Sampling {', '.join(containers)} for {duration_sec}s every {args.interval_sec}s")
    print(f"Output: {output_dir}")

    rows: list[dict[str, Any]] = []
    previous: dict[str, dict[str, float]] = {}
    start = time.monotonic()
    last_sample = start

    with csv_path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        while True:
            now = time.monotonic()
            elapsed = now - last_sample
            last_sample = now
            for raw in docker_stats(containers):
                row = sample_row(raw, elapsed, previous)
                rows.append(row)
                writer.writerow(row)
            fp.flush()

            if time.monotonic() - start >= duration_sec:
                break
            time.sleep(args.interval_sec)

    summary = build_summary(rows, duration_sec, args.interval_sec)
    summary_json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_markdown(summary_md_path, summary)
    print(summary_md_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
