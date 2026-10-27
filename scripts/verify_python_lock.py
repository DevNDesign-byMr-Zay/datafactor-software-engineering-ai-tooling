from __future__ import annotations

import re
import tomllib
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

ROOT = Path(__file__).resolve().parents[1]
PYPROJECT = ROOT / "pyproject.toml"
LOCKFILE = ROOT / "requirements.lock.txt"
CONVENTIONAL_LOCKFILE = ROOT / "requirements.txt"
RUNTIME_MANIFEST = ROOT / "requirements.in"
DEV_MANIFEST = ROOT / "requirements-dev.txt"
LOCK_PATTERN = re.compile(r"^([A-Za-z0-9_.-]+)==([^\s#]+)$")


def load_declared_requirements() -> list[Requirement]:
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    project = data.get("project", {})
    raw = list(project.get("dependencies", []))
    optional = project.get("optional-dependencies", {})
    for group in optional.values():
        raw.extend(group)
    return [Requirement(item) for item in raw]


def load_locked_versions(path: Path = LOCKFILE) -> dict[str, Version]:
    locked: dict[str, Version] = {}
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(),
        start=1,
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_PATTERN.fullmatch(line)
        if not match:
            raise SystemExit(
                f"{path.name}:{line_number}: expected exact name==version pin: {line}"
            )
        name, version_text = match.groups()
        canonical = canonicalize_name(name)
        if canonical in locked:
            raise SystemExit(f"{path.name}: duplicate locked distribution: {canonical}")
        locked[canonical] = Version(version_text)
    return locked


def load_manifest_requirements(path: Path, *, include: str | None = None) -> list[Requirement]:
    requirements: list[Requirement] = []
    includes: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("-r "):
            includes.append(line[3:].strip())
            continue
        if line.startswith("-") or "://" in line or "#" in line:
            raise ValueError(f"{path.name}: unexpected requirement directive: {line}")
        requirements.append(Requirement(line))
    if include is None and includes:
        raise ValueError(f"{path.name}: unexpected nested requirement include")
    if include is not None and includes != [include]:
        raise ValueError(f"{path.name}: expected only -r {include}")
    return requirements


def require_same_declarations(
    actual: list[Requirement], expected: list[Requirement], label: str
) -> None:
    def identity(requirement: Requirement) -> tuple[str, str]:
        return canonicalize_name(requirement.name), str(requirement.specifier)

    actual_keys = [identity(item) for item in actual]
    expected_keys = [identity(item) for item in expected]
    if len(set(actual_keys)) != len(actual_keys) or sorted(actual_keys) != sorted(expected_keys):
        raise SystemExit(f"Python lock parity failed: {label} declarations differ from pyproject.toml")


def main() -> None:
    declared = load_declared_requirements()
    locked = load_locked_versions()

    conventional = load_locked_versions(CONVENTIONAL_LOCKFILE)
    if conventional != locked:
        raise SystemExit(
            "Python lock parity failed: requirements.txt differs from requirements.lock.txt"
        )

    project = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["project"]
    runtime = [Requirement(item) for item in project.get("dependencies", [])]
    development = [
        Requirement(item)
        for group in project.get("optional-dependencies", {}).values()
        for item in group
    ]
    require_same_declarations(
        load_manifest_requirements(RUNTIME_MANIFEST), runtime, "runtime requirements.in"
    )
    require_same_declarations(
        load_manifest_requirements(DEV_MANIFEST, include="requirements.in"),
        development,
        "development requirements-dev.txt",
    )

    missing: list[str] = []
    incompatible: list[str] = []

    for requirement in declared:
        name = canonicalize_name(requirement.name)
        version = locked.get(name)
        if version is None:
            missing.append(requirement.name)
            continue
        if requirement.specifier and version not in requirement.specifier:
            incompatible.append(f"{requirement} -> {version}")

    if missing or incompatible:
        details = []
        if missing:
            details.append("missing exact pins: " + ", ".join(sorted(missing)))
        if incompatible:
            details.append("pins outside declared ranges: " + "; ".join(sorted(incompatible)))
        raise SystemExit("Python lock parity failed: " + " | ".join(details))

    print(
        f"Python lock parity verified for {len(declared)} declared runtime/dev requirements "
        f"against {len(locked)} exact pinned distributions in both lock snapshots."
    )


if __name__ == "__main__":
    main()
