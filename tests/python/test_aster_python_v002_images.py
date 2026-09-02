from __future__ import annotations

import importlib.util
import logging
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py"
SPEC = importlib.util.spec_from_file_location("aster_python_v002_images", MODULE_PATH)
assert SPEC and SPEC.loader
aster = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(aster)


def make_source() -> Image.Image:
    image = Image.new("RGB", (2, 2))
    image.putpixel((0, 0), (255, 0, 0))
    image.putpixel((1, 0), (0, 255, 0))
    image.putpixel((0, 1), (0, 0, 255))
    image.putpixel((1, 1), (255, 255, 0))
    return image


def test_build_expand_prefill_canvas_repeats_source_edges_and_corners(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_PREFILL_BLUR", "0")

    canvas = aster.build_expand_prefill_canvas(make_source(), 1, 1, 1, 1)

    assert canvas.size == (4, 4)
    assert canvas.getpixel((0, 0)) == (255, 0, 0)
    assert canvas.getpixel((3, 0)) == (0, 255, 0)
    assert canvas.getpixel((0, 3)) == (0, 0, 255)
    assert canvas.getpixel((3, 3)) == (255, 255, 0)
    assert canvas.getpixel((1, 1)) == (255, 0, 0)
    assert canvas.getpixel((2, 2)) == (255, 255, 0)


def test_build_expand_prefill_canvas_with_no_padding_preserves_source(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_PREFILL_BLUR", "0")
    source = make_source()

    canvas = aster.build_expand_prefill_canvas(source, 0, 0, 0, 0)

    assert canvas.size == source.size
    assert list(canvas.getdata()) == list(source.getdata())


def test_build_expand_prefill_canvas_blur_preserves_original_center(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_PREFILL_BLUR", "2")
    source = make_source()

    canvas = aster.build_expand_prefill_canvas(source, 2, 2, 2, 2)

    assert canvas.size == (6, 6)
    assert canvas.getpixel((2, 2)) == source.getpixel((0, 0))
    assert canvas.getpixel((3, 3)) == source.getpixel((1, 1))


def test_maybe_feather_mask_returns_same_object_when_feather_disabled(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_MASK_FEATHER", "0")
    mask = Image.new("L", (5, 5), 0)

    result = aster.maybe_feather_mask(mask)

    assert result is mask


def test_maybe_feather_mask_returns_blurred_copy_when_enabled(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_MASK_FEATHER", "1")
    mask = Image.new("L", (5, 5), 0)
    mask.putpixel((2, 2), 255)

    result = aster.maybe_feather_mask(mask)

    assert result is not mask
    assert result.size == mask.size
    assert 0 < result.getpixel((2, 2)) < 255


def test_invalid_feather_value_logs_warning_and_leaves_mask_unchanged(monkeypatch):
    monkeypatch.setenv("ASTER_EXPAND_MASK_FEATHER", "not-a-number")
    records: list[logging.LogRecord] = []

    class RecordHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(record)

    handler = RecordHandler()
    aster.logger.addHandler(handler)
    mask = Image.new("L", (5, 5), 0)

    try:
        result = aster.maybe_feather_mask(mask)
    finally:
        aster.logger.removeHandler(handler)

    assert result is mask
    assert records[-1].event == "invalid_mask_feather"
    assert records[-1].error_type == "ValueError"
