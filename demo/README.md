# Kandown Demo Mode

This directory contains the demo version of Kandown that runs entirely in the browser without a server.

## What's in this directory

### Source files (tracked in git):
- `index.html` - Demo-specific HTML page with localStorage support
- `api.js` - localStorage-based API implementation that mimics the Flask backend
- `settings-demo.js` - Demo-specific settings with clear data functionality
- `.gitignore` - Excludes copied files from git

### Generated files (copied during build):
- `board.css` - Kanban board styles (copied from `src/kandown/statics/`)
- `board.js` - Main board UI logic (copied from `src/kandown/statics/`)
- `modal-manager.js` - Modal dialog manager (copied from `src/kandown/statics/`)
- `event-manager.js` - Event handling utilities (copied from `src/kandown/statics/`)
- `types.js` - TypeScript type definitions (copied from `src/kandown/statics/`)
- `favicon.svg` - Application icon (copied from `src/kandown/statics/`)

## Building the demo

Run the build script from the repository root:

```bash
python scripts/build_demo.py
```

This copies the necessary static assets from the main application to this directory.

## Running locally

After building, serve the demo with any static file server:

```bash
# Using Python's built-in server
python -m http.server 8080 --directory demo

# Using Node's http-server
npx http-server demo -p 8080
```

Then open http://localhost:8080 in your browser.

## How it works

The demo mode replaces the Flask API backend with a localStorage-based implementation:

1. **api.js** provides `TaskAPI` and `SettingsAPI` classes that store data in localStorage
2. **index.html** loads the same UI components as the main app
3. **board.js** (from main app) works with both backends through the same API interface
4. Initial demo tasks are created automatically on first load

## Deployment

The demo is automatically deployed to GitHub Pages using the workflow in `.github/workflows/deploy-demo.yml`.

The workflow:
1. Builds the demo using `scripts/build_demo.py`
2. Uploads the `demo/` directory as a Pages artifact
3. Deploys to GitHub Pages

You can also deploy to other static hosts (Netlify, Vercel, etc.) by uploading the contents of this directory.

## Data storage

All data in demo mode is stored in the browser's localStorage:
- Tasks: `kandown_demo_tasks`
- Settings: `kandown_demo_settings`

Clearing browser data will delete all tasks. Use the "Clear All Data" button in settings to reset the demo.
