# QR Code Generator

A privacy-first QR code generator that runs entirely in your browser. Create QR codes from text or URLs, add an optional logo, pick colors and error correction, preview, and download a PNG. There is no backend: nothing you enter is ever sent anywhere.

## Features

- Text and URL modes (WhatsApp invite links work; URLs are encoded exactly as typed, including query and fragment)
- URL validation with no network request. Allowed schemes: `http`, `https`, `mailto`, `tel`
- Logo upload (PNG, JPEG, WebP, max exactly 1 MiB), type-checked by file signature, scaled locally with a white backing
- Foreground/background colors with contrast and inversion warnings; identical colors are blocked
- Error correction L/M/Q/H (switches to H when a logo is added) and 512/1024/2048 px output
- Fixed-size, square preview box. The QR is centered and scaled down by CSS only, so the downloaded PNG always keeps the full selected resolution
- PNG download with an optional sanitized file name, reset, stale-preview protection
- Responsive, keyboard accessible, with ARIA alerts and status messages
- Self-hosted fonts (Newsreader and Instrument Sans via Fontsource), so no font requests leave your domain

## Decoration Studio

Open **Decoration Studio** (next to **Generator** under the page heading) to style a code without changing its data.

- **Templates**: 15 ready-made designs. Pick one, then change anything.
- **Frames**: 8 categories (26 templates) with editable text, colors, thickness, radius, padding, extra width/height, shadow, opacity and alignment.
- **Borders, Corners, Modules, Colors, Decorations, Logos**: each category has its own **Reset**; **Templates > Reset all** clears every decoration.
- **Export**: PNG, SVG, JPEG or PDF, 256 to 4096 px (longest side), optional transparent background. The file is drawn from the same SVG as the preview.
- **Scan check**: decodes the rendered design with jsQR (loaded on demand) and reports success or failure. A pass is a good sign, not a guarantee, so always test with your own phone.

Design notes: the QR matrix comes from the same `qrcode` library as the generator and is never edited. Frames, borders, corner brackets and decorations are drawn *outside* the code box and quiet zone. Settings live in `src/studio/` (types and defaults in `types.ts`, frame templates and presets in `data/`, the renderer in `lib/scene.ts`). Everything runs in the browser; no data leaves the tab.

## Technology

React 19, Vite, TypeScript, [`qrcode`](https://www.npmjs.com/package/qrcode), Lucide React, plain CSS, Vitest + React Testing Library.

## Project structure

```
src/components/   Header, InputModeSelector, TextInputPanel, ImageUpload,
                  QRCustomization, QRPreview, PrivacyNotice, Footer
src/hooks/        useLogo (in-memory logo, object-URL cleanup)
src/lib/          qr, validate, color, download (+ tests)
src/styles/       app.css
vercel.json       security headers (CSP etc.)
```

## Run it

Requires Node.js 20.19+ or 22.

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run typecheck
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel. Root directory `./`; Vercel detects **Vite** automatically (build `npm run build`, output `dist`).
2. No environment variables are required. Deploy.

`vercel.json` adds security headers: a Content-Security-Policy that only allows same-origin scripts, fonts and connections (plus `blob:` and `data:` images for the logo preview), `nosniff`, `no-referrer` and frame blocking.

Optional: set `VITE_REPO_URL` (build-time, public) to show a repository link in the footer.

## Privacy architecture

- QR codes, previews and PNG files are created in the browser with Canvas and `Blob` APIs.
- No accounts, database, analytics, telemetry, third-party scripts, remote fonts or URL previews.
- User content is never written to localStorage, sessionStorage, IndexedDB or cookies. Logo object URLs are revoked on replace, remove, reset and unmount.
- A test (`src/lib/privacy.test.ts`) fails if source code adds network calls, storage APIs or remote resources, or if the CSP loses its same-origin rules.
- The app clears its own state on reset but cannot guarantee erasure from browser memory, downloads, screenshots or OS caches.

## QR capacity and logo scannability

- Capacity falls as error correction rises. Input is limited to 1,500 characters and a clear error appears if the library still cannot fit it.
- The logo takes at most 22% of the code width. Use Q or H with a logo, keep strong contrast, and test with real devices before printing. Scanning cannot be guaranteed in every condition.

## Troubleshooting

- **Download did nothing:** check browser download permissions. The status message says "requested", not "completed".
- **Logo rejected:** the file must be a real PNG/JPEG/WebP of at most 1,048,576 bytes.

## License

MIT, see `LICENSE`.
