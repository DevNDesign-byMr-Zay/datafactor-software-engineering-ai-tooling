#!/usr/bin/env python3
"""Import the curated Software Engineering & AI Tooling Drive corpus into GitHub.

The source Drive folder is public-by-link. gdown 6.1+ is used in probe mode to
resolve every recursive Drive file ID and real relative path before downloading.
Distinct Drive files that collide on the same path are all preserved with a
short Drive-ID suffix.
"""

from __future__ import annotations

import json
import os
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

# Textual source/configuration formats useful for code assessment. Presentation,
# office, image, audio, video, archive, and other binary formats are omitted.
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


def run_probe() -> list[dict[str, str]]:
    proc = subprocess.run(
        ["gdown", ROOT_URL, "--folder", "--json", "--quiet"],
        check=True,
        text=True,
        capture_output=True,
    )
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        print(proc.stdout, file=sys.stderr)
        print(proc.stderr, file=sys.stderr)
        raise RuntimeError("gdown returned an invalid folder manifest") from exc
    if not isinstance(payload, list):
        raise RuntimeError("gdown manifest was not a list")
    return payload


def extract_drive_id(url: str) -> str:
    parsed = urlparse(url)
    query_id = parse_qs(parsed.query).get("id")
    if query_id and query_id[0]:
        return query_id[0]
    m = re.search(r"/(?:d|folders)/([A-Za-z0-9_-]{10,})", parsed.path)
    if m:
        return m.group(1)
    # gdown's listing URLs may use /uc/<id> or another Drive route.
    for token in reversed([p for p in parsed.path.split("/") if p]):
        if re.fullmatch(r"[A-Za-z0-9_-]{20,}", token):
            return token
    raise ValueError(f"Cannot resolve Drive ID from {url!r}")


def safe_relative(raw_path: str) -> PurePosixPath:
    p = PurePosixPath(raw_path.replace("\\", "/"))
    parts = [part for part in p.parts if part not in ("", ".")]
    if p.is_absolute() or any(part == ".." for part in parts):
        raise ValueError(f"Unsafe Drive path: {raw_path!r}")
    # gdown may include the source root folder in the listing. Avoid nesting it twice.
    if parts and parts[0].casefold() == "software engineering & ai tooling".casefold():
        parts = parts[1:]
    if not parts:
        raise ValueError(f"Empty Drive path: {raw_path!r}")
    return PurePosixPath(*parts)


def is_source_file(path: PurePosixPath) -> bool:
    name = path.name.casefold()
    if name in SOURCE_BASENAMES:
        return True
    # Accept compound environment filenames such as .env.example.
    if name.startswith(".env"):
        return True
    return path.suffix.casefold() in SOURCE_SUFFIXES


def collision_path(path: PurePosixPath, drive_id: str) -> PurePosixPath:
    suffix = "".join(path.suffixes)
    stem = path.name[: -len(suffix)] if suffix else path.name
    short_id = re.sub(r"[^A-Za-z0-9_-]", "", drive_id)[:10]
    name = f"{stem}.drive-{short_id}{suffix}"
    return path.with_name(name)


def download_one(url: str, drive_id: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Use the stable Drive ID rather than a filename-derived URL.
    cmd = ["gdown", drive_id, "-O", str(destination), "--quiet", "--no-cookies"]
    proc = subprocess.run(cmd, text=True, capture_output=True)
    if proc.returncode != 0:
        print(f"Primary download failed for {drive_id}; retrying fuzzy URL", file=sys.stderr)
        retry = subprocess.run(
            ["gdown", url, "-O", str(destination), "--quiet", "--fuzzy", "--no-cookies"],
            text=True,
            capture_output=True,
        )
        if retry.returncode != 0:
            raise RuntimeError(
                f"Download failed for {drive_id} ({url})\n{proc.stderr}\n{retry.stderr}"
            )


def main() -> int:
    manifest = run_probe()
    entries: list[dict[str, object]] = []
    skipped_non_source = 0

    for item in manifest:
        url = str(item.get("url", ""))
        raw_path = str(item.get("path", ""))
        if not url or not raw_path:
            continue
        rel = safe_relative(raw_path)
        if not is_source_file(rel):
            skipped_non_source += 1
            continue
        drive_id = extract_drive_id(url)
        entries.append({"url": url, "drive_id": drive_id, "rel": rel})

    if not entries:
        raise RuntimeError("No source files were found in the Drive manifest")

    counts = Counter(str(e["rel"]).casefold() for e in entries)
    collision_groups = {k for k, n in counts.items() if n > 1}

    # Replace only the mirrored corpus. Keep repository metadata and README intact.
    if STAGING_ROOT.exists():
        shutil.rmtree(STAGING_ROOT)
    STAGING_ROOT.mkdir(parents=True, exist_ok=True)

    resolved_paths: set[str] = set()
    duplicate_files = 0
    for index, entry in enumerate(entries, 1):
        rel = entry["rel"]
        assert isinstance(rel, PurePosixPath)
        drive_id = str(entry["drive_id"])
        target_rel = collision_path(rel, drive_id) if str(rel).casefold() in collision_groups else rel
        # Extremely defensive: if short IDs still collide, extend with the full Drive ID.
        key = str(target_rel).casefold()
        if key in resolved_paths:
            target_rel = collision_path(rel, drive_id + "-full")
            key = str(target_rel).casefold()
        resolved_paths.add(key)
        if str(rel).casefold() in collision_groups:
            duplicate_files += 1

        target = STAGING_ROOT.joinpath(*target_rel.parts)
        print(f"[{index}/{len(entries)}] {rel} -> {target_rel}")
        download_one(str(entry["url"]), drive_id, target)

    report = [
        "# Drive Import Report",
        "",
        f"- Source folder ID: `{ROOT_FOLDER_ID}`",
        f"- Recursive Drive entries discovered: **{len(manifest)}**",
        f"- Source/configuration files imported: **{len(entries)}**",
        f"- Non-source/binary/document entries excluded: **{skipped_non_source}**",
        f"- Files in duplicate-path groups preserved with Drive-ID suffixes: **{duplicate_files}**",
        f"- Unique repository paths written: **{len(resolved_paths)}**",
        "",
        "The importer preserves every distinct Drive source entry selected for code assessment. "
        "When Drive contains multiple files at the same logical path, all copies are retained "
        "rather than overwritten.",
        "",
    ]
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
