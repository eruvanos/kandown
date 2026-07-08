
# Kandown

A lightweight, markdown-inspired Kanban board for developers — backed by a plain YAML file that lives right in your project repository.

![screenshot.png](https://raw.githubusercontent.com/eruvanos/kandown/refs/heads/main/docs/screenshot.png)

## What is Kandown?

Kandown is a simple Kanban board app that stores all your tasks in a single human-readable YAML file. Because it's just a file, you can:

- **Version-control your backlog** alongside your code in Git
- **Edit tasks manually** in any text editor
- **Share and review** your backlog like any other project file

It ships as a Python CLI that starts a local web server, giving you a clean drag-and-drop board in your browser. No database, no cloud account, no complex setup required.

## 🎯 Quick Start — No Installation Needed

> **Not a developer? This is the recommended option for you.**

Try Kandown instantly in your browser — no install, no sign-up, your data stays private and local:

👉 **[Open Kandown in your browser](https://eruvanos.github.io/kandown/)**

Want to see a real board? Check out our [own project backlog](https://eruvanos.github.io/kandown/?backlog=https://raw.githubusercontent.com/eruvanos/kandown/refs/heads/main/backlog.yaml).

The hosted static site runs entirely in your browser:
- **localStorage mode** (default, all browsers) — data is saved in your browser
- **File System mode** (Chrome / Edge only) — read and write a real `backlog.yaml` file on your computer

## Features

- 🗂️ **Kanban board** — drag-and-drop tasks between _Icebox_, _To Do_, _In Progress_, and _Done_ columns
- ✏️ **Markdown descriptions** — write rich task descriptions with full Markdown support
- ✅ **Interactive checkboxes** — check off items directly on the card
- 🏷️ **Tags and task types** — organise tasks with custom tags and built-in types (feature, bug, chore, epic, experiment, request)
- 🖼️ **Paste images** — paste screenshots directly into task descriptions
- 📄 **YAML-backed storage** — all tasks live in a plain, human-readable `backlog.yaml` file
- 🌐 **Browser-only mode** — use without installing anything via the [hosted static site](https://eruvanos.github.io/kandown/)
- 🔄 **JetBrains IDE integration** — view and navigate tasks from any JetBrains IDE
- 🚀 **CLI server** — start a local server with one command, auto-creates the YAML file if missing
- 🤖 **MCP server mode** — expose task operations for AI clients (tasks by column, edit, move)
- 🌙 **Dark mode** — easy on the eyes

## Getting Started

### For Developers — CLI Mode

Install and run with a single command:

```bash
# Run directly without installing (requires uv)
uvx kandown [YAML_FILE]

# Or install permanently
uv tool install kandown
pipx install kandown
pip install kandown

# Install with MCP support
pip install "kandown[mcp]"
```

#### Start the server

```bash
# Start with the default backlog.yaml (created automatically if missing)
kandown

# Start with a specific file on a custom port
kandown --port 8080 myproject.yaml
```

Open your browser at `http://127.0.0.1:5001` (default port) to view the board.

#### CLI Options

| Option | Default | Description |
|---|---|---|
| `YAML_FILE` | `backlog.yaml` | Path to the YAML task file (auto-created if missing) |
| `--port INTEGER` | `5001` | Port to listen on |
| `--debug` | off | Enable Flask debug mode |
| `--mcp` | off | Run as MCP server instead of starting the web UI server |
| `--default-backlog-path PATH` | none | MCP default backlog file if tool calls omit `backlog_path` and `project_root` |
| `--default-project-root PATH` | none | MCP default project root if tool calls omit `backlog_path` and `project_root` |
| `--backlog-filename TEXT` | `backlog.yaml` | MCP filename used when a project root is provided |
| `--transport TEXT` | `stdio` | MCP transport |
| `--help` | | Show help and exit |

### For Non-Technical Users — Static Site

The easiest way to use Kandown is through the **[hosted static site](https://eruvanos.github.io/kandown/)**. No installation required — just open it in your browser and start adding tasks.

Your data is stored in your browser (localStorage) by default, so it persists between visits without any server. Chrome and Edge users can also connect directly to a folder on their computer to read and write real YAML files.

## Storage Modes

Kandown supports four storage modes:

| Mode | How to access | Data stored in | Editable |
|---|---|---|---|
| **CLI** | `kandown myfile.yaml` | Local YAML file on disk | ✅ Yes |
| **localStorage** (default) | [Hosted site](https://eruvanos.github.io/kandown/) | Browser localStorage | ✅ Yes |
| **File System** | Hosted site → Settings → Use File System | Local YAML file (via browser API) | ✅ Yes (Chrome/Edge only) |
| **Read-Only** | `?backlog=<url>` URL parameter | Remote YAML (memory only) | 🚫 View only |

### Using File System Mode (Chrome / Edge)

1. Open the [hosted site](https://eruvanos.github.io/kandown/) in Chrome or Edge
2. Click the ⚙️ settings button
3. Under **Storage Mode**, click **📂 Use File System (Chrome/Edge)**
4. Select a folder — Kandown will read/write `backlog.yaml` in that folder
5. Work as normal; all changes are saved directly to the file

### Sharing a Board (Read-Only)

Anyone with access to a publicly hosted YAML file can view your board in read-only mode:

```
https://eruvanos.github.io/kandown/?backlog=https://example.com/path/to/backlog.yaml
```

The file must be accessible via HTTP and have CORS enabled (GitHub raw URLs work well).

### Deploying Your Own Static Site

Fork the repository, enable GitHub Pages (Settings → Pages → Source: GitHub Actions), and push to `main`. The included workflow will build and deploy the static site automatically.

## Settings

The settings panel (⚙️ button) exposes the following options. Availability depends on the active storage mode:

| Setting | Description | CLI | localStorage | File System | Read-Only |
|---|---|:---:|:---:|:---:|:---:|
| **Dark mode** | Toggle dark/light theme | ✅ | ✅ | ✅ | ✅ |
| **Show Icebox column** | Show or hide the leftmost Icebox column | ✅ | ✅ | ✅ | — |
| **Random port on startup** | Pick a free port automatically instead of using 5001 | ✅ | — | — | — |
| **Store images in subfolder** | Save pasted images as files in `.backlog/` instead of embedding them as base64 | ✅ | — | ✅ | — |
| **Download YAML** | Export the current board as a `backlog.yaml` file | — | ✅ | ✅ | — |
| **Import YAML** | Load tasks from a `backlog.yaml` file | — | ✅ | — | — |
| **Switch storage mode** | Toggle between localStorage and File System | — | ✅ | ✅ | — |
| **Clear / Reset data** | Delete all tasks and reset to defaults | — | ✅ | — | — |

> **Tip:** Settings are stored together with your tasks inside the `backlog.yaml` file in CLI and File System modes, so they roam with your project.

## MCP Server

Kandown can run as an MCP server so AI tools can query and update your backlog.

### Install

```bash
pip install "kandown[mcp]"
```

### Start

```bash
# Generic server, no fixed project:
kandown --mcp

# Set defaults for convenience:
kandown --mcp --default-project-root /path/to/project
# or
kandown --mcp --default-backlog-path /path/to/project/backlog.yaml
```

### Exposed MCP tools

- `tasks_by_column(column, backlog_path?, project_root?)`
- `edit_backlog_task(task_id, text?, status?, tags?, order?, task_type?, backlog_path?, project_root?)`
- `move_backlog_task(task_id, to_column, order?, backlog_path?, project_root?)`

### Configuration behavior

- Tool call parameters (`backlog_path`, `project_root`) always take precedence.
- If tool call parameters are omitted, MCP falls back to CLI defaults:
  - `--default-project-root` + `--backlog-filename`
  - or `--default-backlog-path`
- This allows one long-running MCP server process to work across multiple projects without restart, by passing `project_root` or `backlog_path` per tool call.

### Backlog target options: pros and cons

#### Option A: CLI MCP where every call passes `backlog.yaml` path

**Pros**
- Unambiguous target file
- Works with non-standard filenames and locations
- Easiest to reason about for automation

**Cons**
- Slightly more verbose tool calls
- Caller must know exact file path
- Harder to switch environments if absolute paths differ

#### Option B: CLI MCP where every call passes project root

**Pros**
- Cleaner, shorter interface
- Portable across environments when filename convention is stable
- Easier multi-project usage (`project_root` changes, server stays running)

**Cons**
- Assumes a known filename (default `backlog.yaml`, or configured)
- Ambiguity if multiple backlog files exist
- Slightly more implicit behavior than explicit file path calls

## JetBrains IDE Integration

Connect Kandown to any JetBrains IDE using the built-in [Tasks & Contexts](https://www.jetbrains.com/help/idea/managing-tasks-and-context.html) feature:

1. Open IDE settings → **Tools → Tasks → Servers**
2. Add a new **Generic** server with these details:

| Field | Value |
|---|---|
| URL | `http://localhost:5001` |
| Login Anonymously | ✅ Checked |
| Task List URL | `http://localhost:5001/api/tasks` |
| Tasks | `$` |
| id field | `id` |
| summary field | `text` |

## License

MIT License
