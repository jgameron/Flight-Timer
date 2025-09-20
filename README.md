# Flight Times Logger (PWA)

Log **OFF/OUT/IN/ON** timestamps with both **local** and **UTC** display, and get **BLOCK (OUT→IN)** and **AIR (OFF→ON)** totals in:
- **HH:MM**
- **Decimal hours** (e.g., 1.75)
- **Tenths of hours** (e.g., 1.8)

All data persists to **localStorage** and the app works **offline** via a service worker.

## Quick Start (Local)

1. Open `index.html` directly in a modern browser to test basics.
2. For full PWA behavior (service worker), serve the folder via a simple static server, e.g.:
   ```bash
   python3 -m http.server 8080
   ```
   Then browse to http://localhost:8080

## Deploy to Netlify

1. Push this folder to a GitHub repository.
2. In Netlify:
   - **New site from Git**
   - Pick your repo
   - **Build command**: _none_ (this is a static site)
   - **Publish directory**: `/` (root)
3. After deploy, visit the site. You should be prompted to install (on desktop Chrome/Edge) or use **Add to Home Screen** on iOS.

## Files

- `index.html` — App UI
- `app.js` — Logic: stamping times, formatting, localStorage, install prompt, SW register
- `sw.js` — Offline cache (stale-while-revalidate)
- `manifest.webmanifest` — PWA metadata
- `assets/logo.svg` — PWA icon and app header logo

## Notes

- Times are saved as ISO strings in localStorage under key `ftl.v1.times`.
- Copy button exports a plain-text summary of entered fields to your clipboard.
- Reset clears all four timestamps.
- If either endpoint (e.g., OFF or ON) is missing, totals show as `—`.
