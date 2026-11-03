import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_vercel_services_config():
    cfg = json.loads((ROOT / "vercel.json").read_text())
    services = cfg["services"]
    assert set(services) == {"app", "frontend"}
    assert services["app"]["framework"] == "flask" and services["frontend"]["framework"] == "vite"
    # Build/runtime keys are not valid at the top level when `services` is present.
    for key in ("functions", "installCommand", "buildCommand", "devCommand", "ignoreCommand", "outputDirectory", "framework"):
        assert key not in cfg
    # Specific /api rewrite first, catch-all last; both use the object form.
    rewrites = cfg["rewrites"]
    assert rewrites[0] == {"source": "/api/(.*)", "destination": {"service": "app"}}
    assert rewrites[-1] == {"source": "/(.*)", "destination": {"service": "frontend"}}
    # The frontend never calls the API, so no bindings are declared.
    assert all("bindings" not in svc for svc in services.values())
    assert (ROOT / "frontend" / "package-lock.json").exists()
    assert (ROOT / "api" / "index.py").exists() and (ROOT / "requirements.txt").exists()


def test_flask_routes_carry_the_public_api_prefix():
    # Services receive the original path (/api/health), so routes must include /api.
    from backend.app import create_app

    paths = {r.rule for r in create_app().url_map.iter_rules()}
    assert {"/api/health", "/api/qr"} <= paths


def test_security_headers_block_remote_connections():
    cfg = json.loads((ROOT / "vercel.json").read_text())
    csp = next(h["value"] for h in cfg["headers"][0]["headers"] if h["key"] == "Content-Security-Policy")
    assert "connect-src 'self'" in csp and "script-src 'self'" in csp


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
