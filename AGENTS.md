# AGENTS.md

## Kandown at a glance
- Backend is a small Flask API + CLI wrapper in `src/kandown/cli.py` and `src/kandown/app.py` serving the single-page UI in `src/kandown/templates/index.html`.
- Persistence is file-based YAML via the repository pattern in `src/kandown/task_repo.py`, with Pydantic models in `src/kandown/models.py`.
- Frontend is vanilla JS with a strategy pattern for storage adapters in `src/kandown/statics/api.js` and `src/kandown/statics/api-*.js`.

## Core data flow (multi-mode)
- Mode detection lives in `src/kandown/statics/mode.js` with priority: URL `?backlog` read-only -> CLI health check -> File System API -> localStorage.
- The UI talks to the selected adapter through `api.js`; keep changes compatible across `api-*.js` files.
- Tasks are stored in YAML (see `README.md` for structure); image attachments can be embedded or saved under `.backlog/` via `src/kandown/storage.py`.

## Project-specific conventions
- Allowed task update fields are restricted in `src/kandown/task_repo.py` (`ALLOWED_UPDATES`).
- Default server port is 5001; tests often use 5002 (see `tests/` and `CLAUDE.md`).
- Frontend styling uses CSS variables in `src/kandown/statics/board.css` and visibility utilities in `src/kandown/statics/visibility.css`.

## Workflows you will use
- Run server: `uv run kandown [YAML_FILE] [--port PORT] [--debug]` (auto-creates backlog file if missing).
- Tests: `uv run pytest` (E2E subset uses `-m e2e`).
- Build the static demo: `python scripts/build_page.py` and serve from `page/`.

## Examples of cross-component changes
- Adding a task field touches `src/kandown/models.py`, `src/kandown/task_repo.py`, `src/kandown/statics/ui.js`, and `src/kandown/statics/modal-manager.js`.
- Adding an API endpoint starts in `src/kandown/app.py`, adds request models in `src/kandown/request_models.py`, and wires a frontend call in `src/kandown/statics/api.js`.

