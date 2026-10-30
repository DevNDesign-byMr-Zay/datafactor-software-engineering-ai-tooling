"""Verify the inert Drive reference ZIP and its offline browser representation.

No Drive login, external requests, extraction or execution of samples is performed.
After an intentional ZIP + manifest refresh, --rebuild-browser regenerates the
data-only browser bundle. The historical v1.2.2 provenance remains immutable.
"""

import argparse
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps" / "aetherforge-corpus"
PREFIX = "/* Generated reference data; never execute sample contents. */\n"


def verified_catalog():
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    archive = ASSETS / "software-engineering-ai-tooling.zip"
    if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest["archiveSha256"]:
        raise ValueError("Reference ZIP checksum differs from the manifest")
    files = manifest["files"]
    if len(files) != manifest["fileCount"] or len({f["id"] for f in files}) != len(files):
        raise ValueError("Reference file count or Drive IDs are inconsistent")
    paths = [f["path"] for f in files]
    if len(set(p.casefold() for p in paths)) != len(paths):
        raise ValueError("Reference paths collide")
    catalog = []
    released = json.loads((ROOT / "provenance" / "HISTORICAL_CORPUS_V1_2_2_MANIFEST.json").read_text(encoding="utf-8"))
    historical = {file["path"]: file for file in released["files"]}
    differences = []
    with zipfile.ZipFile(archive) as source:
        if sorted(source.namelist()) != sorted(paths):
            raise ValueError("ZIP entries differ from the complete Drive inventory")
        for record in files:
            path = record["path"]
            parts = PurePosixPath(path).parts
            if (not parts or parts[0] != "Software Engineering & AI Tooling"
                    or ".." in parts or "\\" in path or "\0" in path
                    or path.startswith("/") or PurePosixPath(path).as_posix() != path):
                raise ValueError("Unsafe reference path")
            info = source.getinfo(path)
            if info.file_size != record["bytes"] or info.file_size > 230000:
                raise ValueError("Reference size mismatch: " + path)
            content = source.read(info)
            content.decode("utf-8", errors="strict")
            if hashlib.sha256(content).hexdigest() != record["sha256"]:
                raise ValueError("Reference content mismatch: " + path)
            blob = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
            if blob != record["gitBlobSha1"]:
                raise ValueError("Reference Git identity mismatch: " + path)
            original = historical.get(path)
            if original and original["git_blob_sha1"] != blob:
                differences.append({"path": path, "bytes": len(content), "oldBytes": original["bytes"],
                                    "archive": original["git_blob_sha1"], "current": blob})
            catalog.append({**record, "contentBase64": base64.b64encode(content).decode("ascii")})
    if sum(f["bytes"] for f in files) != manifest["totalBytes"]:
        raise ValueError("Reference byte total mismatch")
    folders = {str(parent) for path in paths for parent in PurePosixPath(path).parents
               if str(parent) not in (".", "Software Engineering & AI Tooling")}
    if len(folders) != manifest["folderCount"]:
        raise ValueError("Reference folder count mismatch")
    if sorted(differences, key=lambda f: f["path"]) != sorted(manifest["archiveDifferences"], key=lambda f: f["path"]):
        raise ValueError("Historical comparison differs from the verified content")
    return {"schemaVersion": 1, "sourceFolderId": manifest["sourceFolderId"],
            "verifiedAt": manifest["verifiedAt"], "files": catalog}


def browser_source(catalog):
    # Escape HTML-sensitive characters even though this is an external script.
    payload = json.dumps(catalog, ensure_ascii=True, separators=(",", ":"))
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return PREFIX + "globalThis.AETHERFORGE_CORPUS=" + payload + ";\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rebuild-browser", action="store_true")
    args = parser.parse_args()
    verified = verified_catalog()
    expected = browser_source(verified)
    target = ASSETS / "catalog.browser.js"
    if args.rebuild_browser:
        target.write_bytes(expected.encode("utf-8"))
    elif target.read_bytes() != expected.encode("utf-8"):
        raise ValueError("Browser catalog is stale; verify inputs, then use --rebuild-browser")
    print(f"Verified {len(verified['files'])} original files: ZIP, manifest and offline catalog agree.")
