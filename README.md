# Kandown

A simple, markdown-inspired Kanban board powered by YAML and Flask.

## Overview

Kandown is a lightweight web application for visualizing and managing 
tasks in a Kanban board format. 
Tasks are stored in a YAML file, making it easy to edit, version, and share your board.
The app features a clean, responsive web UI and a CLI for quick setup.

## Features

- 🗂️ **Kanban board UI**: Drag-and-drop tasks between columns (To Do, In Progress, Done)
- ✏️ **Markdown support**: Write task descriptions using Markdown syntax
- 🖼️ **Image embedding**: Embed images in task descriptions, supporting paste from clipboard
- 📄 **YAML-backed storage**: All tasks are stored in a simple YAML file
- 🔄 **Jetbrains IDE integration**: View and track tasks directly from JetBrains IDEs
- 🚀 **CLI**: Start the server, choose host/port/debug, auto-create YAML file if missing

## Installation

This project uses [uv](https://docs.astral.sh/uv/) for fast Python dependency management.

```bash
uv tool install git+https://github.com/eruvanos/kandown.git
```

## Usage

### Start the Kanban server

```bash
kandown [OPTIONS] [YAML_FILE]
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
# Start server with default YAML file (if exists)
kandown

# Start server with a custom YAML file on a custom port
kandown --port 8080 demo.yml
```

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
├── backlog.yaml       # Backlog
├── demo.yml           # Example board
├── pyproject.toml     # Project config
└── README.md          # This file
```

## Jetbrains Task Integration

You can integrate Kandown with Jetbrains IDEs using the [Tasks & Contexts](https://www.jetbrains.com/help/idea/managing-tasks-and-context.html) feature.

To set up Kandown as a task server open the IDE settings and navigate to `Tools > Tasks > Servers`.
Add a new generic server with the following details:

- **General Settings**:
  - URL: `http://localhost:8080` (or your server URL)
  - Login Anonymously: Checked
- **Server Configuration**:
  - Task List URL: `http://localhost:8080/api/tasks`
  - Tasks: $
  - id: `id`
  - summary: `text`

## Development

- Run tests with `uv run pytest`
- Lint code with `uv format`

## Dependencies

- **Flask**: Web framework
- **PyYAML**: YAML parsing
- **Click**: CLI
- **pytest**: Testing

## License

MIT License
