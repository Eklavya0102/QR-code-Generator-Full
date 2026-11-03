import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_vercel_config_is_valid_and_points_at_real_paths():
    cfg = json.loads((ROOT / "vercel.json").read_text())
    assert cfg["outputDirectory"] == "frontend/dist"
    assert (ROOT / "frontend" / "package.json").exists()
    assert (ROOT / "api" / "index.py").exists()
    assert any(r["source"].startswith("/api/") for r in cfg["rewrites"])


def test_frontend_never_calls_the_backend():
    src = ROOT / "frontend" / "src"
    offenders = [p for p in src.rglob("*") if p.suffix in {".ts", ".tsx"} and not p.name.endswith(".test.tsx") and ("fetch(" in p.read_text() or "XMLHttpRequest" in p.read_text() or "/api/" in p.read_text())]
    assert offenders == []


def test_no_secrets_or_storage_apis_in_frontend():
    src = ROOT / "frontend" / "src"
    for p in src.rglob("*"):
        if p.suffix in {".ts", ".tsx"} and ".test." not in p.name:
            t = p.read_text()
            for banned in ("localStorage", "sessionStorage", "indexedDB", "navigator.sendBeacon"):
                assert banned not in t, f"{banned} in {p}"
