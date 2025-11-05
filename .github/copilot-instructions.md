# GitHub Copilot Instructions for Kandown

## Repository Overview
Kandown is a lightweight Kanban board application for managing tasks using a simple YAML file. It features a web UI, markdown support, image embedding, and a CLI for starting the server. The project is designed for easy installation and intuitive usage. A hybrid demo mode allows running entirely in the browser with localStorage or File System Access API support.

## Main Structure
- `backlog.yaml`: Default YAML file for storing tasks (auto-created if missing).
- `demo/`: This directory is now primarily to build artefact for GitHub Pages deployment
- `src/kandown/`: Python source code for the CLI, web server, and core logic.
  - `cli.py`: Command-line interface for starting the server.
  - `app.py`: Flask application and API routes.
  - `task_repo.py`: Task repository managing YAML operations.
  - `storage.py`: Storage abstraction layer for YAML file operations.
  - `models.py`: Pydantic models for tasks and settings.
  - `request_models.py`: Pydantic models for API requests/responses.
  - `templates/`: HTML templates for the web UI.
  - `statics/`: Static files (CSS, JS, images) for the web UI.
    - `board.js`: Main Kanban board UI logic.
    - `board.css`: Kanban board styles.
    - ... (other static assets)
- `scripts/`: Build and deployment scripts.
  - `build_demo.py`: Copies static assets to the demo directory.
  - `clean_demo.py`: Cleans old files from the demo directory.
  - `serve_demo.py`: Serves the demo locally for testing.
- `docs/`: Documentation files.
  - `screenshot.png`: Application screenshot.
- `tests/`: Automated tests for core functionality.
- `README.md`: Project overview, installation, and usage instructions.
- `DEV.md`: Development notes and design decisions.

## Key Concepts
- **Tasks** are stored in YAML files and visualized in a Kanban board (To Do, In Progress, Done).
- **Web UI** supports drag-and-drop, markdown, images, and checkboxes with a modular JavaScript architecture.
- **CLI** starts the Flask server and manages options (host, port, debug).
- **Hybrid Demo Mode** runs entirely in the browser with two storage backends:
  - **localStorage Mode** (default): Works in all modern browsers, data stored in browser.
  - **File System Mode** (Chrome/Edge only): Reads/writes actual `backlog.yaml` files on the user's computer.
- **Image Storage**: Images can be embedded as base64 in YAML or saved to `.backlog/` folder.
- **Easy setup**: Minimal dependencies, quick install via `uv`.

## Development Notes
- The project prioritizes simplicity, human-readable formats, and minimal setup.
- The CLI webserver approach was chosen for offline capability and ease of development.
- Frontend code is modular with separate managers for modals, events, and UI utilities.
- Demo mode is deployed to GitHub Pages and provides progressive enhancement based on browser capabilities.

Refer to README.md and DEV.md for more details on features and design decisions.

## Frameworks and Libraries

### Backend
- **Flask**: Lightweight web framework for the API server.
- **Pydantic**: Data validation and settings management.
- **PyYAML**: YAML parsing and serialization.
- **Click**: Command-line interface creation.
- **Waitress**: Production-ready WSGI server.
- **atomicwrites**: Atomic file writing for data safety.

### Frontend (Main Application)
- **Vanilla JavaScript**: No framework dependency, modular architecture.
- **Marked**: Markdown rendering library (CDN).
- **js-yaml**: YAML parsing/serialization in browser (for demo mode).

### Frontend (Demo Mode)
- **localStorage API**: Default storage backend (all browsers).
- **File System Access API**: Optional file system integration (Chrome/Edge only).
- **idb-keyval**: IndexedDB wrapper for persisting directory handles.

### Development & Testing
- **pytest**: Testing framework.
- **pytest-playwright**: End-to-end browser testing.
- **Ruff**: Python linter and formatter.
- **uv**: Fast Python package installer and dependency manager.
