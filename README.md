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

## Publishing to GitHub Pages
The repository includes a GitHub Actions workflow that publishes the static site from `dist/` to GitHub Pages whenever the `main` branch is updated.

1. Push your changes to the `main` branch (or merge a pull request into `main`).
2. The `Deploy static site` workflow will run `npm ci`, build the contents of `src/` into `dist/`, and deploy `dist/` to GitHub Pages automatically.
3. You can also trigger a manual deployment from the **Actions** tab using the **Run workflow** button.

To inspect the built output locally, run `npm run build` and serve the `dist/` directory with any static server (for example, `npx serve dist`).
