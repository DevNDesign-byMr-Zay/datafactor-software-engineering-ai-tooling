from __future__ import annotations

import importlib.util
import logging
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py"
SPEC = importlib.util.spec_from_file_location("aster_python_v002_urls", MODULE_PATH)
assert SPEC and SPEC.loader
aster = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(aster)


class FakeRequest:
    def __init__(self, base_url: str):
        self.base_url = base_url


def test_unwrap_media_proxy_url_returns_valid_inner_http_url():
    inner = "https://example.com/image.png?size=large"
    wrapped = f"http://127.0.0.1:5151/media?url={quote(inner, safe='')}"

    assert aster.unwrap_media_proxy_url(wrapped) == inner


def test_unwrap_media_proxy_url_leaves_non_media_and_invalid_inner_urls_unchanged():
    direct = "https://example.com/image.png"
    invalid = "http://127.0.0.1:5151/media?url=file%3A%2F%2F%2Ftmp%2Fimage.png"

    assert aster.unwrap_media_proxy_url(direct) == direct
    assert aster.unwrap_media_proxy_url(invalid) == invalid


def test_ui_proxy_url_returns_original_for_missing_request_or_non_http_url():
    url = "https://example.com/image.png"

    assert aster.ui_proxy_url(None, url) == url
    assert aster.ui_proxy_url(FakeRequest("http://localhost:5151/"), "file:///tmp/image.png") == (
        "file:///tmp/image.png"
    )
    assert aster.ui_proxy_url(FakeRequest("http://localhost:5151/"), "") == ""


def test_ui_proxy_url_uses_local_request_base_when_it_matches_image_service():
    url = "https://example.com/image.png?a=1&b=2"

    result = aster.ui_proxy_url(FakeRequest("http://localhost:5151/"), url)

    assert result == f"http://localhost:5151/media?url={quote(url, safe='')}"


def test_ui_proxy_url_forces_untrusted_request_base_back_to_image_tool_base():
    url = "https://example.com/image.png"

    result = aster.ui_proxy_url(FakeRequest("https://untrusted.example/"), url)

    assert result == f"{aster.IMAGE_TOOL_BASE}/media?url={quote(url, safe='')}"


def test_ui_proxy_url_logs_and_returns_original_when_request_base_access_fails():
    records: list[logging.LogRecord] = []

    class RecordHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(record)

    class BrokenRequest:
        @property
        def base_url(self):
            raise ValueError("broken base")

    handler = RecordHandler()
    aster.logger.addHandler(handler)
    url = "https://example.com/image.png"

    try:
        assert aster.ui_proxy_url(BrokenRequest(), url) == url
    finally:
        aster.logger.removeHandler(handler)

    assert records[-1].event == "ui_proxy_url_failed"
    assert records[-1].error_type == "ValueError"


def test_unwrap_media_proxy_logs_and_returns_original_when_url_parse_fails(monkeypatch):
    records: list[logging.LogRecord] = []

    class RecordHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(record)

    handler = RecordHandler()
    aster.logger.addHandler(handler)

    def fail_parse(_value):
        raise ValueError("malformed")

    monkeypatch.setattr(aster, "urlparse", fail_parse)

    try:
        assert aster.unwrap_media_proxy_url("bad") == "bad"
    finally:
        aster.logger.removeHandler(handler)

    assert records[-1].event == "media_proxy_unwrap_failed"
    assert records[-1].error_type == "ValueError"
