# GestureOS

**Turn a pinch, an open hand, or a fist into an interaction with a browser particle scene.**

GestureOS is a small experimental playground for creative-coding developers and anyone curious about camera-based interaction. It combines MediaPipe hand tracking with particle VFX and keeps the gesture rules separate from rendering, so you can explore both the effect and how it works.

Camera frames stay in the browser and are not uploaded by this project. The demo uses MediaPipe from a CDN at runtime, so the first launch requires network access.

[Try it locally](#run-locally) · [Gesture scenarios](#what-to-try) · [Troubleshooting](#troubleshooting) · [Build on it](#help-improve-gestureos)

## Why try it?

Explore camera-based interaction without building a hand-tracking pipeline from scratch. GestureOS connects a small, inspectable gesture classifier to a browser particle scene so you can experiment with the interaction and understand the rules behind it.

- Try three explicit gesture states: pinch, open hand, and fist, with a tracking fallback.
- Inspect the classifier independently of the camera and rendering loop.
- Keep camera frames in your browser, while recognizing that runtime libraries still load from a CDN.

This is an experimental browser scene, not a replacement operating system or a tool for controlling other desktop applications. Gesture behavior depends on camera placement, lighting, and how clearly your hand is visible.

## What to try

| Scenario | What to inspect | Why it matters |
| --- | --- | --- |
| Move from an open hand to a fist | The detected state and corresponding particle response | Connect a physical action to a visible browser response. |
| Bring thumb and index finger together | The pinch classification | Explore a small, explicit gesture rather than an opaque command vocabulary. |
| Hold a pose near a detection boundary | State changes as landmark distances vary | Understand why camera distance and threshold choices matter. |
| Change a classifier rule | A focused test plus the live scene | Develop interaction behavior without mixing it into the rendering loop. |

The classifier uses landmark-distance thresholds, not a trained custom gesture model. Its thresholds are inspectable, but that does not establish accuracy across users, cameras, or viewing distances.

## Try the interaction

Follow [Run Locally](#run-locally), allow camera access, and try an open hand, a fist, and a thumb–index pinch. Compare the detected state with the visible scene response. If tracking is inconsistent, change the lighting or distance before interpreting it as a classifier result.

No recorded real-camera demonstration is included in this README yet. The steps above let you inspect the actual app; they are not a claim that every camera or browser has been validated.

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

3. Open `http://localhost:8080` and allow this page to use the camera.

**Your first successful check:** the page shows a camera-driven interaction, and changing between an open hand, fist, and pinch produces observable state/scene changes. If the page loads but tracking does not, use the troubleshooting steps below; a loaded page alone is not a camera acceptance test.

The static-server command uses `npx` and may download `http-server` if it is not already available. Runtime MediaPipe scripts and web fonts also use external hosts; local camera processing does not mean a completely offline first launch.

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

### Common questions

**Can it control my desktop or other apps?** No. The interaction is confined to this browser demo.

**Can I open `index.html` directly?** Use the documented local server instead. Camera APIs require a suitable secure context such as `localhost` or HTTPS.

**Why does a gesture change when I move closer?** Classification uses normalized landmark distances and fixed thresholds. Camera position, hand visibility, and pose can affect the result; this is a useful boundary to test, not evidence of a universal control scheme.

**Do I need to share camera video to report a bug?** No. Start with browser/OS versions, the pose, lighting conditions, expected/observed state, and a synthetic landmark test if possible.

## Repository scope

This repository contains the browser source, deterministic gesture-classification logic, tests, and quality checks. Local binaries, editor state, logs, dependency folders, and experimental scratch pages are intentionally excluded.

## Help improve GestureOS

Small, focused contributions are welcome. Useful starting points include classifier edge cases, clearer camera-permission errors, keyboard accessibility, and documentation that helps someone reproduce an interaction.

1. Read the module map above and choose one behavior to improve.
2. For classifier or policy changes, add a focused case in `tests/run-tests.mjs`.
3. Run `npm run check` and describe which browser/camera checks you actually performed.
4. Open a pull request explaining the observed problem, the change, and remaining limits.

| First contribution | Start here | Include in the PR |
| --- | --- | --- |
| A misclassified boundary case | `gesture-detector.js`, `tests/run-tests.mjs` | Synthetic landmarks and the expected state; explain why the rule should change. |
| A clearer camera failure | `gesture-policies.js`, `script.js` | The failure condition, expected message, and policy regression test. |
| Easier-to-use instructions | `index.html`, `README.md` | A reproducible interaction or setup step; distinguish actual device checks from static review. |

For rendering changes, keep classification logic independently testable. For camera changes, include denial, unavailable camera, and retry behavior where relevant.

For larger interaction changes, open an [issue](https://github.com/son-gladyso/gestureos/issues) first to discuss scope. Use synthetic test inputs where possible; do not attach another person's camera recording without permission.


