# Demo Mode Integration - Technical Documentation

## Overview

The demo mode has been successfully merged into the CLI application, eliminating code duplication and enabling automatic fallback to demo mode when the server is unavailable.

## Architecture

### Before
- **Separate codebases**: CLI and demo modes had duplicate UI code
- **Manual switching**: Users had to choose between CLI or demo versions
- **Conditional logic**: Demo mode used if-statements to route between storage backends

### After
- **Unified codebase**: Single set of UI components shared by both modes
- **Automatic detection**: App checks server health and switches automatically
- **Factory pattern**: API implementations chosen via dynamic imports
- **Polymorphic design**: No conditional logic - just different implementations

## Key Components

### 1. Initialization (`init.js`)
```javascript
// Checks server health
const health = await fetch('/api/health')

if (health.available && health.server === 'cli') {
    mode = 'cli'
} else {
    mode = 'demo'  // Fallback
}
```

### 2. API Factory (`api.js`)
```javascript
async function initializeAPIs() {
    const mode = getServerMode()
    
    if (mode === 'cli') {
        const { TaskAPI, SettingsAPI } = await import('./api-cli.js')
        // Use CLI implementations
    } else {
        const { TaskAPI, SettingsAPI } = await import('./api-demo.js')
        // Use demo implementations
    }
}
```

### 3. API Implementations

#### CLI API (`api-cli.js`)
- Uses `fetch()` to call server endpoints
- Endpoints: `/api/tasks`, `/api/settings`, etc.
- Requires running CLI server

#### Demo API (`api-demo.js`)
- Hybrid localStorage + File System Access API
- No server required
- Works entirely in browser

## User Experience

### CLI Server Running
1. User starts Kandown CLI: `kandown backlog.yaml`
2. Browser opens to `http://localhost:5001`
3. Health check succeeds → CLI mode activated
4. Data stored in `backlog.yaml`

### CLI Server Not Running
1. User opens Kandown page directly (e.g., from GitHub Pages)
2. Health check fails (timeout or 404)
3. Demo mode activated automatically
4. Data stored in browser localStorage
5. Optional: Switch to File System mode (Chrome/Edge only)

## Demo Mode Features

### localStorage Mode (Default)
- Works in all browsers
- Data stored in browser
- Initial demo tasks created
- Clear data option available

### File System Mode (Chrome/Edge)
- Reads/writes actual `backlog.yaml` files
- Uses File System Access API
- Directory handle persisted in IndexedDB
- Can switch back to localStorage

## Benefits

1. **No Code Duplication**: UI components shared between modes
2. **Automatic Fallback**: Demo mode activates when needed
3. **Clean Architecture**: Factory pattern with proper polymorphism
4. **Better UX**: Seamless mode switching
5. **Easier Maintenance**: Single codebase to update

## Testing

### Test Coverage
- `test_demo_mode.py`: Demo mode activation and API factory
- `test_init.py`: Server detection and initialization
- `test_health.py`: Health endpoint responses
- Total: 18 tests, all passing

### Manual Testing
1. **CLI Mode**: Start server, verify fetch-based API
2. **Demo Mode**: Open without server, verify localStorage
3. **File System Mode**: Test File System Access API (Chrome)
4. **Mode Switching**: Verify smooth transitions

## Migration Notes

### For Users
- No action required
- CLI mode works exactly as before
- Demo mode now available automatically when server offline

### For Developers
- Demo-specific code moved to `src/kandown/statics/`
- Build script updated to copy new files
- Demo directory maintained for GitHub Pages deployment

## File Structure

```
src/kandown/statics/
├── api.js              # Factory (chooses implementation)
├── api-cli.js          # CLI server implementation
├── api-demo.js         # Demo mode implementation
├── api-filesystem.js   # File System Access API
├── init.js             # Server detection
├── board.js            # Main UI (shared)
└── settings.js         # Settings UI (shared)

demo/
├── index.html          # Demo-specific HTML
├── settings-demo.js    # Demo settings wrapper
└── [built files]       # Copied from statics/
```

## Security

- ✅ Code review: No issues found
- ✅ CodeQL scan: 0 alerts
- ✅ No new dependencies added
- ✅ File System Access API uses browser security model

## Performance

- Minimal overhead from dynamic imports (one-time cost)
- No performance degradation in either mode
- localStorage operations remain fast
- File System Access API performance depends on browser

## Future Enhancements

Possible improvements:
1. Add more storage backends (e.g., IndexedDB)
2. Sync between localStorage and server
3. Offline mode with service worker
4. Progressive web app (PWA) support

## Questions?

See the main README.md or open an issue on GitHub.
