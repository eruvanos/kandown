# Kandown - GitHub Copilot Instructions

## Project Vision

Kandown is a lightweight, markdown-inspired Kanban board application designed for managing small project backlogs. The core philosophy is:

- **Simplicity First**: Easy to install, use, and understand
- **File-Based Storage**: All data stored in a single, human-readable YAML file within your project repository
- **Version Control Friendly**: YAML format makes it easy to track changes via Git
- **Hybrid Approach**: Works as a CLI-served web app AND as a browser-only page mode
- **No Complexity**: No databases, no complex setup, no heavy dependencies

## Architecture Overview

### Tech Stack

**Backend (Python)**
- **Flask**: Lightweight web framework serving the API and UI
- **Pydantic**: Type-safe models for tasks and settings validation
- **Click**: CLI interface
- **PyYAML**: YAML file parsing and serialization
- **Atomicwrites**: Safe file writing to prevent data corruption

**Frontend (Vanilla JavaScript)**
- **No frameworks**: Pure HTML, CSS, and JavaScript for simplicity
- **Drag-and-drop**: Native browser API for task movement
- **Markdown rendering**: Client-side markdown parsing for task descriptions
- **Multiple storage modes**: API (CLI server), localStorage (page), File System Access API (Chrome/Edge)

### Application Flow

1. **CLI Mode**: User runs `kandown backlog.yaml` → Flask server starts → Browser UI connects to local API
2. **Page Mode (localStorage)**: User visits GitHub Pages → UI loads → Data stored in browser localStorage (page-local)
3. **Page Mode (File System)**: User grants folder access in Chrome/Edge → UI reads/writes local YAML files directly (page-fs)
4. **Read-Only Mode**: User visits with `?backlog=URL` parameter → UI loads remote YAML file in read-only mode

### Core Components

**Backend Layer**:
- `cli.py` - Command-line interface, starts the Flask server
- `app.py` - Flask application factory, defines API routes
- `task_repo.py` - Abstract repository pattern + YAML implementation for task persistence
- `models.py` - Pydantic models (Task, Settings, BacklogData)
- `request_models.py` - Pydantic models for API request validation
- `storage.py` - Attachment file management (images stored in `.backlog/` folder)

**Frontend Layer**:
- `templates/index.html` - Single-page application template
- `statics/board.js` - Main Kanban board UI logic
- `statics/ui.js` - UI rendering and DOM manipulation
- `statics/api*.js` - Multiple API adapters for different storage modes
- `statics/modal-manager.js` - Task detail modal management
- `statics/event-manager.js` - Event bus for component communication
- `statics/settings.js` - Settings management

## Folder Structure

```
kandown/
├── .github/                    # GitHub configuration
│   └── copilot-instructions.md # This file
│
├── src/kandown/               # Main application source
│   ├── __init__.py            # Package initialization
│   ├── app.py                 # Flask app factory and API routes
│   ├── cli.py                 # CLI entry point (kandown command)
│   ├── models.py              # Pydantic models (Task, Settings, etc.)
│   ├── request_models.py      # API request/response models
│   ├── task_repo.py           # Task repository (abstract + YAML impl)
│   ├── storage.py             # Attachment file resolver
│   ├── py.typed               # PEP 561 type marker
│   │
│   ├── templates/             # Jinja2 templates
│   │   └── index.html         # Main SPA template
│   │
│   └── statics/               # Frontend assets (served via Flask)
│       ├── board.js           # Kanban board logic
│       ├── ui.js              # UI rendering
│       ├── api.js             # API abstraction layer
│       ├── api-cli.js         # CLI server API adapter
│       ├── api-filesystem.js  # File System Access API adapter
│       ├── api-local-storage.js # localStorage API adapter
│       ├── api-readonly.js    # Read-only remote YAML adapter
│       ├── api-page.js        # GitHub Pages embedded data adapter
│       ├── event-manager.js   # Event bus
│       ├── modal-manager.js   # Modal dialogs
│       ├── settings.js        # Settings panel
│       ├── mode.js            # Storage mode detection
│       ├── ui-utils.js        # UI helper functions
│       ├── types.js           # JSDoc type definitions
│       ├── board.css          # Board styling
│       ├── visibility.css     # Visibility utilities
│       └── favicon.svg        # App icon
│
├── tests/                     # Test suite
│   ├── conftest.py            # Pytest fixtures
│   ├── test_task_repo.py      # Repository tests
│   ├── test_e2e.py            # End-to-end tests
│   ├── test_health.py         # Health check tests
│   ├── test_page_mode.py      # Page mode tests
│   └── test_url_parameter.py  # URL parameter tests
│
│   ├── build_page.py          # Build GitHub Pages site
│   ├── clean_page.py          # Clean page build artifacts
│   └── serve_page.py          # Local page server for testing
├── page/                      # Generated page mode files (GitHub Pages)
│   └── api/health             # Static health check response
│
├── docs/                      # Documentation assets
│   └── screenshot.png         # README screenshot
│
├── backlog.yaml               # Project's own backlog
├── sample.md                  # Sample markdown file
├── pyproject.toml             # Python project configuration
├── uv.lock                    # uv lockfile
├── README.md                  # User documentation
└── DEV.md                     # Development documentation
```

### Key File Purposes

**Backend Files**:
- `app.py`: Defines all API endpoints (`/api/tasks`, `/api/settings`, `/api/attachments`, etc.)
- `task_repo.py`: Implements repository pattern with `YamlTaskRepository` for file-based storage
- `models.py`: Defines `Task`, `Settings`, `BacklogData`, and `TaskType` enum
- `storage.py`: Manages attachment file paths (images in `.backlog/` folder)

**Frontend Files**:
- `board.js`: Core Kanban logic - drag-and-drop, task movement, state management
- `ui.js`: DOM manipulation, rendering tasks, columns, and UI updates
- `api*.js`: Strategy pattern for different storage backends (CLI, localStorage, FileSystem, etc.)
- `modal-manager.js`: Task creation/editing modal dialogs
- `event-manager.js`: Pub/sub event system for decoupled component communication

## Development Guidelines

### Code Style
- **Python**: Follow PEP 8, use type hints, prefer Pydantic models for validation
- **JavaScript**: Use modern ES6+, JSDoc comments for types, no transpilation needed
- **Tests**: Use pytest, maintain high coverage, test both backend and frontend scenarios

### Frontend Styling

- Use CSS variables for theming
- Keep styles within `statics/board.css`
- Use `visibility.css` for utility classes if needed

### Adding Features
1. **Backend**: Add API endpoint in `app.py`, update models if needed, add tests
2. **Frontend**: Update relevant `statics/*.js` file, ensure all API modes work
3. **Documentation**: Update README.md for user-facing features, DEV.md for technical details

### Testing
- Run tests: `pytest` or `uv run pytest`
- Tests use `conftest.py` fixtures for Flask app and temporary YAML files
- E2E tests verify full user workflows (create, update, move, delete tasks)
- When starting the server always use port `5002` for tests to avoid conflictsuv run kandown test-dividers.yaml

### Image Handling
- Images can be base64-encoded in YAML (bloats file but simple)
- OR saved to `.backlog/` folder as separate files (cleaner YAML)
- `AttachmentResolver` in `storage.py` manages file paths

### Multi-Mode Support
The app supports multiple storage modes via strategy pattern in `api.js`:
- **CLI Mode** (`cli`): HTTP API to local Flask server
- **Page Mode - localStorage** (`page-local`): Browser-only, data stored in localStorage
- **Page Mode - File System** (`page-fs`): Direct file access using File System Access API (Chrome/Edge only)
- **Read-Only Mode** (`readOnly`): Remote YAML URLs loaded via `?backlog=` URL parameter

Mode detection priority (in `mode.js`):
1. URL parameter → `readOnly`
2. Health API check → `cli`
3. File System handle → `page-fs`
4. Fallback → `page-local`

When adding features, ensure they work across all relevant modes.

## Common Tasks

### Add a New Task Field
1. Update `Task` model in `models.py`
2. Update `ALLOWED_UPDATES` in `task_repo.py` if editable
3. Update frontend rendering in `ui.js`
4. Update modal form in `modal-manager.js`
5. Add tests for new field

### Add a New API Endpoint
1. Define route in `app.py` with `@app.route()`
2. Add request/response models in `request_models.py`
3. Implement logic using `TaskRepository`
4. Add corresponding frontend API call in `api.js`
5. Write tests in `tests/`

### Modify the UI
1. Update HTML structure in `templates/index.html`
2. Update styling in `statics/board.css` or `visibility.css`
3. Update JavaScript logic in relevant `statics/*.js` file
4. Test across different browsers and screen sizes

