import io
import os
import tempfile

import pytest
from PIL import Image

from backend.app import MAX_BODY_BYTES, create_app

SECRET = "TOP-SECRET-CONTENT-123"


@pytest.fixture()
def client():
    return create_app().test_client()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


@pytest.mark.parametrize("body", [None, [], "text", {}, {"data": ""}, {"data": "   "}, {"data": 5}])
def test_invalid_bodies_rejected(client, body):
    r = client.post("/api/qr", json=body)
    assert r.status_code == 400
    assert "error" in r.get_json()


def test_non_json_rejected(client):
    assert client.post("/api/qr", data="data=x", content_type="text/plain").status_code == 400


@pytest.mark.parametrize("extra", [{"error_correction": "Z"}, {"error_correction": 1}, {"box_size": 2}, {"box_size": True}, {"box_size": "9"}])
def test_invalid_options_do_not_echo_content(client, extra):
    r = client.post("/api/qr", json={"data": SECRET, **extra})
    assert r.status_code == 400
    assert SECRET not in r.get_data(as_text=True)


def test_oversized_request_rejected(client):
    r = client.post("/api/qr", data=b'{"data":"' + b"a" * (MAX_BODY_BYTES + 10) + b'"}', content_type="application/json")
    assert r.status_code == 413


def test_too_many_characters_rejected(client):
    assert client.post("/api/qr", json={"data": "a" * 1001}).status_code == 400


def test_valid_generation_returns_png(client):
    r = client.post("/api/qr", json={"data": "https://example.com/?a=1#b", "error_correction": "H", "box_size": 8})
    assert r.status_code == 200
    assert r.mimetype == "image/png"
    assert r.headers["Cache-Control"] == "no-store"
    img = Image.open(io.BytesIO(r.data))
    assert img.format == "PNG" and img.width == img.height and img.width > 100


def test_capacity_overflow_is_422_and_generic(client):
    r = client.post("/api/qr", json={"data": SECRET + "é" * 900, "error_correction": "H"})
    assert r.status_code == 422
    assert SECRET not in r.get_data(as_text=True)


def test_unknown_route_and_method(client):
    assert client.get("/api/nope").status_code == 404
    assert client.get("/api/qr").status_code == 405


def test_unexpected_error_hides_details(monkeypatch):
    app = create_app()

    def boom(*a, **k):
        raise RuntimeError(SECRET)

    monkeypatch.setattr("backend.app.qrcode.QRCode", boom)
    c = app.test_client()
    r = c.post("/api/qr", json={"data": "hello"})
    assert r.status_code == 500
    body = r.get_data(as_text=True)
    assert SECRET not in body and "Traceback" not in body


def test_nothing_written_to_disk(client, tmp_path, monkeypatch):
    work = tmp_path / "cwd"
    tmp = tmp_path / "tmp"
    work.mkdir()
    tmp.mkdir()
    monkeypatch.chdir(work)
    monkeypatch.setattr(tempfile, "tempdir", str(tmp))
    assert client.post("/api/qr", json={"data": "private"}).status_code == 200
    assert os.listdir(work) == [] and os.listdir(tmp) == []
