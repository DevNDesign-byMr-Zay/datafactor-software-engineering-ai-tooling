from __future__ import annotations

import json
import logging

from python_support.logging_config import JsonFormatter, get_logger


def test_json_formatter_emits_structured_event_metadata_without_exception_payloads():
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="maintained.runtime",
        level=logging.WARNING,
        pathname=__file__,
        lineno=10,
        msg="bounded failure",
        args=(),
        exc_info=None,
    )
    record.event = "runtime.warning"

    payload = json.loads(formatter.format(record))

    assert payload["level"] == "WARNING"
    assert payload["logger"] == "maintained.runtime"
    assert payload["message"] == "bounded failure"
    assert payload["event"] == "runtime.warning"
    assert "timestamp" in payload
    assert "exc_info" not in payload


def test_get_logger_reuses_single_json_handler_and_disables_propagation():
    name = "software_ai_tooling.tests.structured_logger"
    logger = logging.getLogger(name)
    logger.handlers.clear()

    try:
        first = get_logger(name)
        second = get_logger(name)

        assert first is second
        assert first.propagate is False
        assert first.level == logging.INFO
        assert len(first.handlers) == 1
        assert isinstance(first.handlers[0].formatter, JsonFormatter)
    finally:
        logger.handlers.clear()
