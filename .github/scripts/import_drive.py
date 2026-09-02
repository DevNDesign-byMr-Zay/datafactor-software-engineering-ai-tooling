#!/usr/bin/env python3
"""Mirror the Software Engineering & AI Tooling Drive corpus for assessment."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs, urlparse

ROOT_FOLDER_ID = "1oUiGwTRyBuDRNsy6bRyx7v78d94ASEYs"
ROOT_URL = f"https://drive.google.com/drive/folders/{ROOT_FOLDER_ID}"
REPO_ROOT = Path(__file__).resolve().parents[2]
STAGING_ROOT = REPO_ROOT / "Software Engineering & AI Tooling"
REPORT_PATH = REPO_ROOT / "IMPORT_REPORT.md"
FAILURES_PATH = REPO_ROOT / "IMPORT_FAILURES.json"

SOURCE_SUFFIXES = {
    ".asm", ".bash", ".c", ".cc", ".cfg", ".cjs", ".clj", ".cljs", ".cmake",
    ".conf", ".cpp", ".cs", ".css", ".csv", ".dart", ".env", ".fish", ".fs",
    ".fsx", ".go", ".gql", ".graphql", ".h", ".hpp", ".htm", ".html", ".ini",
    ".java", ".js", ".jsx", ".json", ".kt", ".kts", ".less", ".lua", ".m",
    ".make", ".md", ".mjs", ".mm", ".php", ".pl", ".pm", ".properties",
    ".ps1", ".psd1", ".psm1", ".py", ".r", ".rb", ".rs", ".sass", ".scala",
    ".scss", ".sh", ".sql", ".svelte", ".swift", ".tf", ".tfvars", ".toml",
    ".ts", ".tsx", ".txt", ".vue", ".xml", ".yaml", ".yml", ".zsh",
}
SOURCE_BASENAMES = {
    "dockerfile", "makefile", "gemfile", "procfile", "rakefile", "justfile",
    "requirements.txt", "pipfile", "package.json", "package-lock.json",
    "pnpm-lock.yaml", "yarn.lock", "composer.json", "cargo.toml", "go.mod", "go.sum",
}


def probe() -> list[dict[str, str]]:
    p = subprocess.run(
        ["gdown", ROOT_URL, "--folder", "--json", "--quiet"],
        check=True, text=True, capture_output=True,
    )
    data = json.loads(p.stdout)
    if not isinstance(data, list):
        raise RuntimeError("Drive probe did not return a list")
    return data


def drive_id(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query).get("id")
    if query and query[0]:
        return query[0]
    match = re.search(r"/(?:d|folders)/([A-Za-z0-9_-]{10,})", parsed.path)
    if match:
        return match.group(1)
    for token in reversed([p for p in parsed.path.split("/") if p]):
        if re.fullmatch(r"[A-Za-z0-9_-]{20,}", token):
            return token
    raise ValueError(f"Cannot resolve Drive ID from {url!r}")


def safe_path(raw: str) -> PurePosixPath:
    p = PurePosixPath(raw.replace("\\", "/"))
    parts = [part for part in p.parts if part not in ("", ".")]
    if p.is_absolute() or ".." in parts:
        raise ValueError(f"Unsafe Drive path: {raw!r}")
    if parts and parts[0].casefold() == "software engineering & ai tooling":
        parts = parts[1:]
    if not parts:
        raise ValueError(f"Empty Drive path: {raw!r}")
    return PurePosixPath(*parts)


def is_source(path: PurePosixPath) -> bool:
    name = path.name.casefold()
    return (
        name in SOURCE_BASENAMES
        or name.startswith(".env")
        or path.suffix.casefold() in SOURCE_SUFFIXES
    )


def with_drive_suffix(path: PurePosixPath, fid: str, width: int = 10) -> PurePosixPath:
    suffix = "".join(path.suffixes)
    stem = path.name[:-len(suffix)] if suffix else path.name
    clean = re.sub(r"[^A-Za-z0-9_-]", "", fid)[:width]
    return path.with_name(f"{stem}.drive-{clean}{suffix}")


def download(url: str, fid: str, destination: Path) -> tuple[bool, str]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    attempts = [
        ["gdown", fid, "-O", str(destination), "--quiet", "--no-cookies"],
        ["gdown", f"https://drive.google.com/file/d/{fid}/view?usp=sharing", "-O", str(destination), "--quiet", "--no-cookies"],
        ["gdown", url, "-O", str(destination), "--quiet", "--no-cookies"],
    ]
    errors: list[str] = []
    for cmd in attempts:
        proc = subprocess.run(cmd, text=True, capture_output=True)
        if proc.returncode == 0 and destination.exists():
            return True, ""
        errors.append((proc.stderr or proc.stdout).strip())
        if destination.exists():
            destination.unlink()
    return False, " | ".join(e for e in errors if e)[-4000:]


def main() -> int:
    manifest = probe()
    entries: list[dict[str, object]] = []
    excluded = 0
    for item in manifest:
        url = str(item.get("url", ""))
        raw = str(item.get("path", ""))
        if not url or not raw:
            continue
        rel = safe_path(raw)
        if not is_source(rel):
            excluded += 1
            continue
        entries.append({"url": url, "id": drive_id(url), "rel": rel})

    if not entries:
        raise RuntimeError("No source/configuration files found")

    counts = Counter(str(e["rel"]).casefold() for e in entries)
    collisions = {path for path, count in counts.items() if count > 1}

    if STAGING_ROOT.exists():
        shutil.rmtree(STAGING_ROOT)
    STAGING_ROOT.mkdir(parents=True, exist_ok=True)

    used: set[str] = set()
    failures: list[dict[str, str]] = []
    collision_files = 0
    imported = 0

    for index, entry in enumerate(entries, 1):
        rel = entry["rel"]
        assert isinstance(rel, PurePosixPath)
        fid = str(entry["id"])
        collision = str(rel).casefold() in collisions
        target_rel = with_drive_suffix(rel, fid) if collision else rel
        key = str(target_rel).casefold()
        if key in used:
            target_rel = with_drive_suffix(rel, fid, width=len(fid))
            key = str(target_rel).casefold()
        used.add(key)
        if collision:
            collision_files += 1

        print(f"[{index}/{len(entries)}] {rel} -> {target_rel}", flush=True)
        target = STAGING_ROOT.joinpath(*target_rel.parts)
        ok, error = download(str(entry["url"]), fid, target)
        if ok:
            imported += 1
        else:
            print(f"BLOCKED {fid}: {rel}", file=sys.stderr, flush=True)
            failures.append({
                "drive_id": fid,
                "source_path": str(rel),
                "repository_path": str(PurePosixPath("Software Engineering & AI Tooling") / target_rel),
                "url": str(entry["url"]),
                "error": error,
            })

    FAILURES_PATH.write_text(json.dumps(failures, indent=2) + "\n", encoding="utf-8")
    report = [
        "# Drive Import Report", "",
        f"- Source folder ID: `{ROOT_FOLDER_ID}`",
        f"- Recursive Drive entries discovered: **{len(manifest)}**",
        f"- Assessment-relevant source/configuration entries selected: **{len(entries)}**",
        f"- Imported automatically: **{imported}**",
        f"- Authenticated follow-up required: **{len(failures)}**",
        f"- Non-source/binary entries excluded: **{excluded}**",
        f"- Files in duplicate-path groups preserved with Drive-ID suffixes: **{collision_files}**",
        "",
        "Every duplicate-path Drive entry receives a distinct repository path. Files that cannot be fetched anonymously are recorded in `IMPORT_FAILURES.json` for authenticated Drive recovery rather than silently omitted.",
        "",
    ]
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
