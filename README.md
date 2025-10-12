
# Kandown

A simple, markdown-inspired Kanban board powered by YAML and Flask.

![screenshot.png](docs/screenshot.png)

## Overview

Kandown is a lightweight web application for visualizing and managing 
tasks in a Kanban board format. 
Tasks are stored in a YAML file, making it easy to edit, version, and share your board.
The app features a clean, responsive web UI started by the CLI.

## Features

- 🗂️ **Kanban board UI**: Drag-and-drop tasks between columns (To Do, In Progress, Done)
- ✏️ **Markdown support**: Write task descriptions using Markdown syntax
- 🖼️ **Paste images**: Task descriptions support pasting images from clipboard
- 🗂️ **Image Storage**: Images can be embedded as base64 or saved to disk into an `.backlog` folder
- ✅ **Interactive checkboxes**: Clickable checkboxes in task descriptions
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
- Open your browser to `http://127.0.0.1:5001` (default) to view the board.

#### CLI Options

```
Options:
  --host TEXT     Host to bind to (default: 127.0.0.1)
  --port INTEGER  Port to bind to (default: 5001)
  --debug         Enable debug mode
  --help          Show help message
```

#### Examples

```bash
# Start server with default YAML file (if exists)
kandown

# Start server with a custom YAML file on a custom port
kandown --port 5001 demo.yml
```

## Jetbrains Task Integration

You can integrate Kandown with Jetbrains IDEs using the [Tasks & Contexts](https://www.jetbrains.com/help/idea/managing-tasks-and-context.html) feature.

To set up Kandown as a task server open the IDE settings and navigate to `Tools > Tasks > Servers`.
Add a new generic server with the following details:

- **General Settings**:
  - URL: `http://localhost:5001` (or your server URL)
  - Login Anonymously: Checked
- **Server Configuration**:
  - Task List URL: `http://localhost:5001/api/tasks`
  - Tasks: $
  - id: `id`
  - summary: `text`

## License

MIT License
