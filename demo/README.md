# Kandown Demo Mode - Unified Edition

⚠️ **IMPORTANT:** The demo mode has been unified with the main CLI application. This directory is now primarily for GitHub Pages deployment and backward compatibility.

The demo functionality is now built into the main CLI application - when the server is unavailable, the app automatically switches to demo mode with localStorage/filesystem support.

## What's in this directory

### Source files (tracked in git):
- `index.html` - Demo-specific HTML page with hybrid storage support
- `settings-demo.js` - Demo-specific settings with storage mode switching
- `.gitignore` - Excludes copied files from git

### Generated files (copied during build from `src/kandown/statics/`):
- `board.css` - Kanban board styles
- `board.js` - Main board UI logic
- `modal-manager.js` - Modal dialog manager
- `event-manager.js` - Event handling utilities
- `types.js` - TypeScript type definitions
- `ui-utils.js` - UI utility functions
- `favicon.svg` - Application icon
- `init.js` - Initialization and server detection logic
- `api.js` - API factory that chooses CLI or demo implementation
- `api-cli.js` - CLI server API implementation
- `api-demo.js` - Demo mode API (localStorage/filesystem hybrid)
- `api-filesystem.js` - File System Access API implementation

## Architecture Change

**Before:** Demo mode had separate `api.js` and `api-filesystem.js` files with conditional routing based on storage mode.

**Now:** The main application uses an API factory pattern:
1. `init.js` checks server health via `/api/health` endpoint
2. If server is available → uses `api-cli.js` (fetch-based)
3. If server unavailable → uses `api-demo.js` (localStorage/filesystem)
4. `api.js` acts as a factory, dynamically importing the correct implementation

This means:
- CLI mode users get automatic demo mode fallback
- Demo mode is no longer a separate codebase
- Both modes share the same UI code (board.js, settings.js, etc.)


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

The unified demo mode provides automatic fallback when the CLI server is unavailable:

### Initialization Flow
1. App loads and `init.js` runs health check on `/api/health`
2. If health check succeeds with `server: "cli"` → CLI mode
3. If health check fails or timeout → Demo mode
4. `api.js` factory dynamically imports the appropriate API implementation

### Demo Mode Storage (when CLI server unavailable)
The demo mode supports two storage backends:

#### localStorage Mode (Default)
1. Data stored in browser's localStorage
2. Works in all modern browsers
3. Initial demo tasks created automatically
4. Fast and reliable

##### Loading a Backlog File via URL Parameter
You can load a specific backlog YAML file using URL parameters:

```
http://localhost:8080/?backlog=example.yaml
http://localhost:8080/?file=path/to/backlog.yaml
```

When a URL parameter is provided:
- The demo will fetch the specified YAML file
- Tasks and settings from the file will be loaded into localStorage
- If the file cannot be loaded, it falls back to the default demo tasks
- The file must be accessible via HTTP (same origin or CORS-enabled)

Example use cases:
- Share pre-configured backlogs with team members
- Load example projects for demonstrations
- Quick-start with template backlogs

#### File System Mode (Chrome/Edge)
1. Reads/writes actual `backlog.yaml` files on user's computer
2. Uses File System Access API
3. Directory handle persisted in IndexedDB
4. Users can switch modes via settings panel

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
