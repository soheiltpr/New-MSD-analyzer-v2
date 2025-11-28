# MSD Plate Analyzer

A browser-based MSD plate analysis workspace with a modular JavaScript engine for fitting and visualizing 4PL curves across cytokines. The app runs entirely in the browser and can be served from any static server.

## Project structure
- `src/` – main application assets (UI markup, styles, and modular JavaScript logic).
- `server.js` – lightweight Express server for local development and distribution.
- `package.json` – scripts and dependencies used by the local server.
- Additional root files – research notes, historical experiments, and reference data from earlier iterations.

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:8000.

You can also host the contents of `src/` on any static hosting service (GitHub Pages, S3, etc.) without Node; the server is only required for convenient local testing.

## Health check
The development server exposes a simple readiness endpoint at `/health` returning `{ status: "ok" }`.

## Preparing a release
- Keep production assets in `src/` and avoid placing experimental files there.
- Update this README with any new workflows or dependencies.
- Tag releases after validating the UI in the browser.
