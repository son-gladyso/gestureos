# GestureOS

GestureOS is a browser demo that combines MediaPipe hand tracking with a particle-based VFX scene.

Camera frames stay in the browser and are not uploaded by this project. The demo uses MediaPipe from a CDN at runtime, so the first launch requires network access.

## Requirements

- Node.js 20+ (project currently uses Node 24 in local verification)
- A modern browser with camera access
- HTTPS or `localhost` (required by camera APIs)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Serve this folder with a local static server. Example:

```bash
npx http-server . -p 8080
```

3. Open `http://localhost:8080`.

## Quality Commands

- `npm run lint`: ESLint checks
- `npm run format:check`: Prettier check
- `npm test`: unit tests + integrity checks
- `npm run check`: lint + format + test

## Project Structure

- `index.html`: app shell and UI layout
- `styles.css`: visual system and animations
- `script.js`: runtime loop, particles, gestures, camera lifecycle
- `gesture-config.js`: immutable runtime constants
- `gesture-helpers.js`: shared utility functions
- `gesture-detector.js`: pure gesture classification logic
- `gesture-policies.js`: quality/camera policy decisions and error mapping
- `tests/run-tests.mjs`: unit checks for config/helpers/detector/policies
- `scripts/quality-check.mjs`: strict UTF-8 and structural integrity checks

## Troubleshooting

- If camera fails, verify permissions and close other camera-using apps.
- If running on a remote host, use HTTPS.
- If CDN scripts fail to load, check network access to `cdn.jsdelivr.net`.

## Repository scope

This repository contains the browser source, deterministic gesture-classification logic, tests, and quality checks. Local binaries, editor state, logs, dependency folders, and experimental scratch pages are intentionally excluded.
