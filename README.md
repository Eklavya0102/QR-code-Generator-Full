# QR Code Generator

A privacy-first QR code generator. Create QR codes from text or URLs, add an optional logo, pick colors and error correction, preview, and download a PNG. **Generation happens entirely in your browser.**

## Features

- Text and URL modes (WhatsApp invite links work; URLs are encoded exactly as typed, including query and fragment)
- URL validation without any network request. Allowed schemes: `http`, `https`, `mailto`, `tel`
- Logo upload (PNG, JPEG, WebP, max exactly 1 MiB), type checked by file signature, scaled locally with a white backing
- Foreground/background colors with contrast and inversion warnings; identical colors are blocked
- Error correction L/M/Q/H (switches to H automatically when a logo is added) and 512/1024/2048 px output
- Live preview, stale-preview protection, PNG download with sanitized optional file name, reset
- Fixed-size, square preview box: the QR is centered and scaled down by CSS only, so the downloaded PNG always keeps the full selected resolution (512/1024/2048 px)
- Responsive, keyboard accessible, with ARIA alerts and status messages

## Screenshots

_Placeholder: add `docs/screenshot-desktop.png` and `docs/screenshot-mobile.png`._

## Technology stack

React 19, Vite, TypeScript, [`qrcode`](https://www.npmjs.com/package/qrcode), Lucide React, plain CSS, Vitest + React Testing Library. Backend: Flask, `qrcode` + Pillow, Pytest. Deployment: Vercel.

## Project structure

```
frontend/        React + Vite app (src/components, src/hooks, src/lib, src/styles)
backend/         Flask app (app.py) and tests
api/index.py     Vercel Python entry point that exposes backend/app.py
tests/           Repo-level checks (vercel.json, "frontend never calls the API")
requirements.txt / requirements-dev.txt   Python dependencies (single root set)
vercel.json      Vercel build and routing config
```

## Prerequisites

Node.js 20+ and npm, Python 3.11+.

## Install

```bash
npm --prefix frontend ci            # or: cd frontend && npm install
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
```

## Development

```bash
npm --prefix frontend run dev       # http://localhost:5173
python backend/app.py               # optional API on http://127.0.0.1:5000 (debug off)
```

The Vite dev server proxies `/api` to port 5000 for convenience. The app itself never calls it.

## Tests and build

```bash
npm --prefix frontend test          # Vitest
npm --prefix frontend run typecheck # tsc --noEmit
npm --prefix frontend run build     # typecheck + production build to frontend/dist
python -m pytest                    # backend + repo-level tests
```

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel. Leave **Root Directory** as the repository root and **Framework Preset** as "Other" (`vercel.json` also sets `"framework": null`).
2. No environment variables are required. Click Deploy.
3. What `vercel.json` does:
   - installs and builds the frontend (`cd frontend && npm ci` / `npm run build`) and serves `frontend/dist`;
   - runs `api/index.py` as a Python Function. Vercel's documented Flask convention is an `app` instance at `api/index.py`, with dependencies in the root `requirements.txt`;
   - rewrites `/api/*` to that function and keeps `frontend/`, `tests/` and `backend/tests/` out of the function bundle;
   - sends security headers, including a strict Content-Security-Policy (same-origin scripts and connections only; `blob:` images for the logo preview and download).
4. Node: use Node 20.19+ or 22 (Project Settings → General → Node.js Version) because Vite requires it.
5. After deploying, open `https://<your-domain>/api/health`. It should return `{"status":"ok"}`.

**Checked locally:** `vercel.json` is valid JSON; a clean `npm ci` + build produces `frontend/dist`; a fresh virtualenv built only from `requirements.txt` can import `api/index.py` and serve `/api/health` and `/api/qr`; the production build loads, generates and downloads under the exact CSP headers with no violations.
**Not checked:** an actual Vercel deployment (this needs your account). If `/api/health` returns 404, confirm the repo root is the project root and see Vercel's Flask docs. The web app does not depend on the API. For a static-only deploy, delete `api/` and the `rewrites` and `functions` entries.

## Environment variables

None are required. Optional: `VITE_REPO_URL` (build-time, public) shows a repository link in the footer. Never put secrets in `VITE_*` variables; they are exposed to the browser.

## Privacy architecture

- Text, URLs, logo images, previews and PNG files are created in the browser with Canvas and `Blob` APIs. **Nothing from this workflow is sent to Flask or any other server.** A repo test fails if frontend code contains `fetch(`, `XMLHttpRequest` or `/api/`.
- No accounts, database, analytics, telemetry, third-party scripts, remote fonts or URL previews. User content is never written to localStorage, sessionStorage or IndexedDB (also checked by a test).
- Logo object URLs are revoked on replace, remove, reset and unmount. Reset clears the app's state and the canvas.
- **Optional API:** `POST /api/qr` (JSON: `data`, optional `error_correction`, `box_size`) returns a PNG for independent use. It is *not* used by the web app. If you call it yourself, your content does reach that server: it is processed in memory, never logged, stored or written to disk, and bodies are capped at 8 KB. `GET /api/health` is a plain health check.

## Security limitations

- The app clears its own transient state but cannot guarantee erasure from browser memory, downloads, screenshots, browser internals or OS caches.
- A QR code can point anywhere. The app does not check whether a destination is safe.
- No rate limiting on the optional API; add it before exposing it widely. CORS is not enabled (same-origin only).

## QR capacity and logo scannability

- Capacity depends on error correction (maximum is roughly 2,900 bytes at level L down to roughly 1,270 at H). The UI limits input to 1,500 characters and shows an error if the library still cannot fit it.
- The logo takes at most 22% of the code width. Use Q or H with a logo, keep strong contrast, and test with real devices before printing. Scanning cannot be guaranteed in every condition.

## Troubleshooting

- **Download did nothing:** check browser download permissions; the status message says "requested", not "completed".
- **Logo rejected:** the file must be a real PNG/JPEG/WebP of at most 1,048,576 bytes.
- **`/api/health` 404 on Vercel:** confirm the repo root is the project root and `api/index.py` is present.

## Future improvements

SVG export (with a safe sanitizer), Wi-Fi/vCard presets, rounded module styles, a decode self-check after generation.

## License

MIT, see `LICENSE`.
