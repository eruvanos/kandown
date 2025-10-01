# Kandown

A simple, markdown-inspired Kanban board powered by YAML and Flask.

## Overview

Kandown is a lightweight web application for visualizing and managing 
tasks in a Kanban board format. 
Tasks are stored in a YAML file, making it easy to edit, version, and share your board.
The app features a clean, responsive web UI and a CLI for quick setup.

## Features

- 🗂️ **Kanban board UI**: Drag-and-drop tasks between columns (To Do, In Progress, Done)
- 📄 **YAML-backed storage**: All tasks are stored in a simple YAML file
- 🔄 **REST API**: List tasks and update their status via HTTP endpoints
- 🚀 **CLI**: Start the server, choose host/port/debug, auto-create YAML file if missing

## Installation

This project uses [uv](https://docs.astral.sh/uv/) for fast Python dependency management.

```bash
git clone <repository-url>
cd kandown
uv sync
```

## Usage

### Start the Kanban server

```bash
uv run kandown [OPTIONS] [YAML_FILE]
```

- If no YAML file is provided, defaults to `backlog.yaml` (auto-created if missing).
- Open your browser to `http://127.0.0.1:8080` (default) to view the board.

#### CLI Options

```
Options:
  --host TEXT     Host to bind to (default: 127.0.0.1)
  --port INTEGER  Port to bind to (default: 8080)
  --debug         Enable debug mode
  --help          Show help message
```

#### Examples

```bash
# Start server with default YAML file
uv run kandown

# Start server with a custom YAML file and debug mode
uv run kandown demo.yml --port 8080 --debug

# Make server accessible from other machines
uv run kandown backlog.yaml --host 0.0.0.0 --port 8080
```

## API

- `GET /api/tasks` — List all tasks as JSON
- `PATCH /api/tasks/<id>` — Update a task's status (body: `{"status": "In Progress"}`)

## Project Structure

```
kandown/
├── src/kandown/
│   ├── app.py         # Flask app and API
│   ├── cli.py         # Command line interface
│   ├── task_repo.py   # YAML-backed task repository
│   ├── templates/
│   │   └── kanban.html  # Kanban board template
│   └── statics/
│       └── board.js     # Board UI logic
├── tests/
│   └── test_task_repo.py # Unit tests
├── backlog.yaml       # Default YAML file
├── demo.yml           # Example board
├── pyproject.toml     # Project config
└── README.md          # This file
```

## Development

- Modify `templates/kanban.html` and `statics/board.js` for custom UI
- Extend `task_repo.py` for new task features
- Run tests with `uv run pytest`

## Dependencies

- **Flask**: Web framework
- **PyYAML**: YAML parsing
- **Click**: CLI
- **pytest**: Testing

## License

MIT License
