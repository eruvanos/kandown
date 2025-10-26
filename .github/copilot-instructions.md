# GitHub Copilot Instructions for Kandown

## Repository Overview
Kandown is a lightweight Kanban board application for managing tasks using a simple YAML file. It features a web UI, markdown support, image embedding, and a CLI for starting the server. The project is designed for easy installation and intuitive usage.

## Main Structure
- `backlog.yaml`, `demo.yml`: Example YAML files for storing tasks.
- `demo/`: Demo web application showcasing Kandown features in a static setup.
- `src/`: Source code for the web server and core logic.
  - `kandown/` Python source code for the CLI, web server, and core logic.
  - `kandown/templates/`: HTML templates for the web UI.
  - `kandown/static/`: Static files (CSS, JS, images) for the web UI.
- `docs/`: Documentation and screenshots.
- `tests/`: Automated tests for core functionality.
- `README.md`: Project overview, installation, and usage instructions.
- `DEV.md`: Development notes and design decisions.

## Key Concepts
- **Tasks** are stored in YAML files and visualized in a Kanban board (To Do, In Progress, Done).
- **Web UI** supports drag-and-drop, markdown, images, and checkboxes.
- **CLI** starts the server and manages options (host, port, debug).
- **Easy setup**: Minimal dependencies, quick install via `uv`.

> `experimental/` contains a web frontend using PyScript and Puepy which mounts a local folder and reads/writes the YAML file directly in the browser.

## Development Notes
- The project prioritizes simplicity, human-readable formats, and minimal setup.
- The CLI webserver approach was chosen for offline capability and ease of development.

Refer to README.md and DEV.md for more details on features and design decisions.

## Frameworks and Libraries

- The main web server is built with Flask.
- The experimental web frontend uses PyScript and Puepy for Python in the browser.
  To get information about Puepy use the `experimental/PuePy.md` file which contains the documentation of the PuePy framework.