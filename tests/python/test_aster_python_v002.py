from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py"
SPEC = importlib.util.spec_from_file_location("aster_python_v002", MODULE_PATH)
assert SPEC and SPEC.loader
aster = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(aster)


def test_coerce_fill_guidance_handles_defaults_ranges_and_invalid_values():
    assert aster.coerce_fill_guidance(None, default=35) == 35
    assert aster.coerce_fill_guidance(0) == 28
    assert aster.coerce_fill_guidance(1) == 34
    assert aster.coerce_fill_guidance(2) == 40
    assert aster.coerce_fill_guidance(3, default=36) == 36
    assert aster.coerce_fill_guidance(999) == 80
    assert aster.coerce_fill_guidance("not-a-number", default=37) == 37


def test_normalize_prompt_text_collapses_mixed_whitespace():
    value = "  alpha\r\n beta\t gamma   "
    assert aster.normalize_prompt_text(value) == "alpha beta gamma"
    assert aster.normalize_prompt_text("") == ""


def test_cap_prompt_enforces_limit_without_trailing_whitespace():
    text = "alpha beta gamma delta"
    capped = aster.cap_prompt(text, limit=12)
    assert capped == "alpha beta g"
    assert len(capped) <= 12
    assert capped == capped.rstrip()


def test_chunk_text_for_prompts_handles_empty_and_over_limit_text():
    assert aster.chunk_text_for_prompts("") == []

    chunks = aster.chunk_text_for_prompts(
        "alpha beta gamma delta epsilon zeta eta theta",
        max_chunk_chars=12,
    )

    assert " ".join(chunks) == "alpha beta gamma delta epsilon zeta eta theta"
    assert all(len(chunk) <= 12 for chunk in chunks)
    assert len(chunks) > 1


def test_safe_prompt_compose_prefers_first_and_last_sections_when_over_limit():
    result = aster.safe_prompt_compose(
        "primary subject",
        "middle detail that is intentionally verbose",
        "final constraint",
        limit=35,
    )
    assert result == "primary subject. final constraint"


def test_invalid_url_parse_emits_structured_warning(monkeypatch, capfd):
    def fail_parse(_value):
        raise ValueError("malformed")

    monkeypatch.setattr(aster, "urlparse", fail_parse)

    assert aster.safe_http_url("bad") is False

    captured = capfd.readouterr().err.strip().splitlines()
    assert captured
    payload = json.loads(captured[-1])
    assert payload["level"] == "WARNING"
    assert payload["event"] == "invalid_http_url"
    assert payload["logger"] == "aster_python_v002"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("https://example.com/image.png", True),
        ("http://localhost/image.png", True),
        ("file:///tmp/image.png", False),
        ("javascript:alert(1)", False),
    ],
)
def test_safe_http_url_allows_only_http_and_https(value, expected):
    assert aster.safe_http_url(value) is expected
