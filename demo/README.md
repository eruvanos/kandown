# Kandown Demo Mode - Hybrid Edition

This directory contains the hybrid demo version of Kandown that runs entirely in the browser with support for both localStorage and File System Access API.

## What's in this directory

### Source files (tracked in git):
- `index.html` - Demo-specific HTML page with hybrid storage support
- `api.js` - Hybrid API that routes between localStorage and File System Access API
- `api-filesystem.js` - File System Access API implementation for reading/writing backlog.yaml
- `settings-demo.js` - Demo-specific settings with storage mode switching
- `.gitignore` - Excludes copied files from git

### Generated files (copied during build):
- `board.css` - Kanban board styles (copied from `src/kandown/statics/`)
- `board.js` - Main board UI logic (copied from `src/kandown/statics/`)
- `modal-manager.js` - Modal dialog manager (copied from `src/kandown/statics/`)
- `event-manager.js` - Event handling utilities (copied from `src/kandown/statics/`)
- `types.js` - TypeScript type definitions (copied from `src/kandown/statics/`)
- `ui-utils.js` - UI utility functions (copied from `src/kandown/statics/`)
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

The demo mode provides a hybrid storage system that supports two backends:

### localStorage Mode (Default)
1. **api.js** detects storage mode and routes to `LocalStorageTaskAPI` and `LocalStorageSettingsAPI`
2. Data is stored in browser's localStorage
3. Works in all modern browsers
4. Initial demo tasks are created automatically on first load

### File System Mode (Chrome/Edge)
1. **api.js** routes to `FileSystemTaskAPI` and `FileSystemSettingsAPI` from `api-filesystem.js`
2. Reads/writes to actual `backlog.yaml` files on the user's computer
3. Uses File System Access API (Chrome/Edge only)
4. Directory handle is persisted in IndexedDB for reconnection

### Storage Mode Switching
- Users can switch between modes via the settings panel (⚙️)
- Current mode is displayed in the top-right corner
- Banner color changes based on mode (purple = localStorage, green = filesystem)
- File system connections are restored on page reload

## Browser Compatibility

| Browser | localStorage Mode | File System Mode |
|---------|-------------------|------------------|
| Chrome/Edge | ✅ Yes | ✅ Yes (optional) |
| Firefox | ✅ Yes | ❌ No (falls back to localStorage) |
| Safari | ✅ Yes | ❌ No (falls back to localStorage) |

## Deployment

The demo is automatically deployed to GitHub Pages using the workflow in `.github/workflows/deploy-demo.yml`.

The workflow:
1. Builds the demo using `scripts/build_demo.py`
2. Uploads the `demo/` directory as a Pages artifact
3. Deploys to GitHub Pages

You can also deploy to other static hosts (Netlify, Vercel, etc.) by uploading the contents of this directory.

## Data storage

### localStorage Mode
All data is stored in the browser's localStorage:
- Tasks: `kandown_demo_tasks`
- Settings: `kandown_demo_settings`
- Last ID counter: `kandown_demo_last_id`

Clearing browser data will delete all tasks. Use the "Clear All Data" button in settings to reset.

### File System Mode
Data is stored in files on your computer:
- Tasks & Settings: `backlog.yaml` (in the folder you select)
- Directory handle: Stored in IndexedDB (`keyval-store` database)

Your files remain on your computer even if you clear browser data. Only the connection to the folder is stored in the browser.

## Libraries

The demo uses these external libraries (loaded via CDN with fallbacks):
- **marked** - Markdown rendering (fallback uses browser's built-in if blocked)
- **js-yaml** - YAML parsing/serialization (fallback uses JSON if blocked)
- **idb-keyval** - IndexedDB wrapper for storing file handles (fallback included inline)
