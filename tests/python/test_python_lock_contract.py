from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest
from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "verify_python_lock.py"


def _verifier():
    spec = importlib.util.spec_from_file_location("python_lock_verifier", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_repo_python_sources_and_two_exact_pin_snapshots_are_in_sync():
    result = subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "exact pinned distributions in both lock snapshots" in result.stdout


def test_pin_parser_rejects_duplicates_and_unpinned_entries(tmp_path):
    verifier = _verifier()
    locked = tmp_path / "requirements.txt"
    locked.write_text("fastapi==0.141.1\nFastAPI==0.141.1\n", encoding="utf-8")
    with pytest.raises(SystemExit, match="duplicate locked distribution"):
        verifier.load_locked_versions(locked)
    locked.write_text("fastapi>=0.115\n", encoding="utf-8")
    with pytest.raises(SystemExit, match="expected exact name==version pin"):
        verifier.load_locked_versions(locked)


def test_direct_manifest_refuses_unapproved_nested_includes(tmp_path):
    verifier = _verifier()
    declared = tmp_path / "requirements-dev.txt"
    declared.write_text("-r requirements.txt\npytest>=9.0.3,<10\n", encoding="utf-8")
    with pytest.raises(ValueError, match="expected only -r requirements.in"):
        verifier.load_manifest_requirements(declared, include="requirements.in")
    declared.write_text("-r requirements.in\n-e git+https://example.invalid/x\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unexpected requirement directive"):
        verifier.load_manifest_requirements(declared, include="requirements.in")


def test_declaration_parity_rejects_missing_or_mismatched_ranges():
    verifier = _verifier()
    expected = [Requirement("fastapi>=0.115,<1"), Requirement("Pillow>=13,<14")]
    with pytest.raises(SystemExit, match="declarations differ"):
        verifier.require_same_declarations(
            [Requirement("fastapi>=0.115,<1")], expected, "runtime"
        )
    with pytest.raises(SystemExit, match="declarations differ"):
        verifier.require_same_declarations(
            [Requirement("fastapi>=0.115,<2"), Requirement("Pillow>=13,<14")],
            expected,
            "runtime",
        )


def test_hashed_lock_matches_every_exact_distribution_pin():
    verifier = _verifier()
    hashed = verifier.load_hashed_versions()
    locked = verifier.load_locked_versions()
    assert hashed
    assert len(hashed) == len(locked)
    assert hashed == locked


def test_hashed_lock_allows_new_transitive_distributions(tmp_path):
    verifier = _verifier()
    # A synthetic fixture proves lock growth is accepted only with matching
    # exact versions and SHA-256 hashes; it does not change the real lock.
    distribution_count = len(verifier.load_locked_versions()) + 1
    generated = "".join(
        f"example-dependency-{i}==1.0.0 \\\n"
        f"    --hash=sha256:{i:064x}\n"
        for i in range(distribution_count)
    )
    snapshot = tmp_path / "requirements.hashed.txt"
    snapshot.write_text(generated, encoding="utf-8")
    parsed = verifier.load_hashed_versions(snapshot)
    assert len(parsed) == distribution_count
    assert all(str(version) == "1.0.0" for version in parsed.values())


@pytest.mark.parametrize(
    ("body", "reason"),
    [
        ("fastapi==0.141.1\n", "missing or duplicate SHA-256 hashes"),
        ("fastapi==0.141.1 \\\n --hash=sha256:bad\n", "invalid SHA-256 hash entry"),
        ("fastapi>=0.115 \\\n --hash=sha256:" + "a" * 64 + "\n", "invalid hashed distribution pin"),
        ("fastapi==0.141.1 \\\n", "unterminated hash continuation"),
        (
            "fastapi==0.141.1 \\\n --hash=sha256:" + "a" * 64 + "\n"
            "FastAPI==0.141.1 \\\n --hash=sha256:" + "b" * 64 + "\n",
            "duplicate hashed distribution",
        ),
    ],
)
def test_hashed_lock_rejects_malformed_or_duplicate_hashes(tmp_path, body, reason):
    verifier = _verifier()
    path = tmp_path / "requirements.hashed.txt"
    path.write_text(body, encoding="utf-8")
    with pytest.raises(SystemExit, match=reason):
        verifier.load_hashed_versions(path)

