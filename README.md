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

## Content types

Besides **Text** and **URL**, the generator and the Studio build guided forms for **Wi-Fi** (escaped `WIFI:` string), **Email**, **Phone**, **SMS**, **WhatsApp** (`wa.me` link), **Contact** (vCard 3.0) and **Payment** (UPI and PayPal.me links). The format logic is in `src/lib/payloads.ts`.

eSewa, Khalti and Fonepay merchant QR codes are issued by your bank or wallet and contain account data that cannot be generated here, so they are deliberately not offered as a builder. To restyle one, paste the text of your issued QR into **Text** mode; a pasted EMVCo payment payload has its checksum verified and you are warned if it does not match.

## Two steps: Generate, then Decorate

The app is a clean two-step workflow: **User input > Generate QR > Original QR > Decorate QR > Final QR > Download.**

**Step 1, Generate QR.** Enter your content (Text, URL or any builder), choose colors, error correction, size and an optional logo, and generate. This is the only place a QR code is created. When it succeeds, the original QR is handed to step 2, and **Decorate this QR** takes you there. The original PNG download is unchanged.

**Step 2, Decorate QR.** The decorator receives the generated QR; it has no content input and never creates a QR of its own. Its content and error correction are locked and shown in the "Your QR from step 1" card. If you open step 2 before generating, you see "No QR code available. Please generate a QR code first." with a button back to step 1.

- **Live preview** at the top updates as you change anything; the scan check (jsQR and ZXing) runs on it and **Fix scannability** repairs design problems with an **Undo**.
- **Templates, Frames, Borders, Corners, Modules, Colors, Decorations, Logos**: each category has its own **Reset**; **Templates > Reset all** returns to the plain received QR. Logos can come from step 1, your own upload here, or the built-in set.
- **Generate Final QR** (below the preview and controls) renders the design, checks it with both decoders and unlocks **Download** (PNG, SVG, JPEG or PDF, 256 to 4096 px, transparent background optional). If you change the design afterwards, the final is marked out of date until you update it.
- A logo needs error correction Q or H. Because error correction belongs to step 1, the decorator offers a one-click **Raise to H**, which asks step 1 to regenerate the *same data* at the higher level. Nothing else about the content changes.

Where things live: `src/App.tsx` (the only place a QR is generated, and the hand-off), `src/lib/generated.ts` (the frozen `GeneratedQR` snapshot), `src/studio/` (the decorator: `types.ts`, `data/`, `lib/scene.ts` renderer, `components/`). Everything runs in the browser; no data leaves the tab.

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
