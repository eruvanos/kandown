# DEVELOPMENT


## Idea

Kandown is a backlog for your small project, data stored as one file within the project repository.


### What should it provide?

- UI with drag and drop support
- Easy and intuitive usage
- Requirements should be easy to install

### What should it not provide?

- Webpage, which requires to upload/download state
- file format that is not human readable
- complex setup (hard to install)


## Options considered

- Webpage which mounts local file system and provides UI
    - Pros:
        - Easy to use
        - No installation required
        - Could be hosted on GitHub pages
    - Cons:
      - Not offline capable (maybe use as PWA?)
      - Security issues (access to local file system)
      - Only Chrome supported (other browsers do not support file system access)

- Desktop application
  - Pros:
      - Easy to use
      - Offline capable
  - Cons:
      - Hard to install (need to provide binaries for different OS)
      - Hard to develop (need to use framework like Electron, Tauri, ...)

- CLI application with webserver
  - Pros:
      - Medium hard to install (only Python required, use uv)
      - Offline capable
  - Cons:
      - Not as easy to use as desktop application (need to start server and open browser)
      - Need to install Python and dependencies

> V1 decided for CLI application with webserver


## Other "feature" discussions

### Pasting images

Pasting images from clipboard should be supported.

- Storing them as base64 in the YAML file does bloat the file.
- Storing them as files in a subfolder is more complex to handle (need to manage files, delete unused files, ...)
- Maybe support both options and let the user decide?

> V1 starts with base64 in YAML file, add option to store as file later


## Technologies

- Backend
  - Python (For sure! 😅)
  - Flask (Lightweight web framework, but might struggle with sse or websockets, requires threading)
      - FastAPI could be an option but is harder to start from program
      - Quart might be an alternative to circumvent single threaded Flask

- Frontend
  - Vanilla JS (No framework, keep it simple)
  - or use PuePy (Vue.js in Python, adds complexity, but is Python)
    - PuePy 

> V1 decided for Vanilla JS, maybe add PuePy later if needed


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


## Development

- Run tests with `uv run pytest`
- Lint code with `uv format`

## Dependencies

- **Flask**: Web framework
- **PyYAML**: YAML parsing
- **Click**: CLI
- **pytest**: Testing


## Pivot Scope?

Another idea which came up by colleagues is to make a "pivotal tracker"-like board.

Key features would be:
- UI
  - inverted column order
    - done
    - current iteration
    - backlog
  - sidebar to show/hide columns
- Story details
  - title
  - state (unstarted, started, finished, delivered, accepted, rejected)
  - story type (feature, bug, chore, release)
  - points (1, 2, 3, 5, 8,
  - description (markdown)
  - comments (markdown)
  - attachments (images, files)
  - tasks (checklist)
  - blockers
- Manage stories with multi-select and drag and drop
- Epics (group stories)
  Labels can be promoted to epics


> What would be the benefit over Kandown?
> - Dense view of stories
> - less drag and drop, more click to change state
>
> 🤔 do iterations make sense for small projects?


Existing tools (from https://bye-tracker.net/):
- [Lite Tracker](https://litetracker.com/)
- [BARD tracker](https://bardtracker.com/)

## Development

### Build and Run Demo Locally

To build and run the demo mode on your local machine:

```bash
# Build the page (copies static assets)
python scripts/build_page.py

# Serve the page locally
python -m http.server 8080 --directory page

# Open http://localhost:8080 in your browser
```

