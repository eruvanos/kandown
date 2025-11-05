
# Kandown

A simple, markdown-inspired Kanban board powered by YAML and Flask.

![screenshot.png](docs/screenshot.png)

## 🎯 Try the Online Page

Try Kandown instantly without installation! 
Visit our **[GitHub hosted page](https://eruvanos.github.io/kandown/)** - all data is stored locally in your browser.

Or have a look on our projects [backlog](https://eruvanos.github.io/kandown/?backlog=https://raw.githubusercontent.com/eruvanos/kandown/refs/heads/main/backlog.yaml).

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
- 🌐 **Hybrid demo mode**: Try it in your browser with localStorage or connect to local files (Chrome/Edge)

## Usage

You can install it or directly use it via `uvx`

```bash
uv tool install kandown

# even without installing, you can run it directly:

uvx kandown [OPTIONS] [YAML_FILE]
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

## Hosted Version

A GitHub hosted version of Kandown is hosted at **[https://eruvanos.github.io/kandown/](https://eruvanos.github.io/kandown/)**.

### Storage Modes

**localStorage Mode (Default - All Browsers):**
- ✅ Works in all modern browsers
- ✅ Data stored in browser's localStorage
- ✅ Quick trials without any setup
- ✅ Privacy: Data stays in your browser
- ✅ Offline use after initial load
- ✅ Download data as YAML file
- ✅ Import data from YAML file

**File System Mode (Chrome/Edge Only - Optional):**
- ✅ Connect to a local folder on your computer
- ✅ Read and write real `backlog.yaml` files
- ✅ Work with existing Kandown projects
- ✅ True file system integration
- ✅ Changes persist to actual files

### Demo Mode Features

The demo mode includes all core features:
- ✅ Drag-and-drop task management
- ✅ Markdown rendering
- ✅ Image paste support (stored as base64 in localStorage, or as files in File System mode)
- ✅ Task tags and types
- ✅ Dark mode
- ✅ Data persistence (localStorage or file system)
- ✅ Storage mode switcher (localStorage ↔ File System)
- ✅ Clear data option in settings
- ✅ Load backlog files via URL parameter

### Loading a Backlog File via URL Parameter (Read-Only Mode)

You can load and view a specific backlog YAML file in demo mode using URL parameters:

```
https://eruvanos.github.io/kandown/?backlog=example.yaml
https://eruvanos.github.io/kandown/?file=path/to/backlog.yaml
```

**Read-Only Mode Features:**
When loading a backlog via URL parameter, the application enters read-only mode to protect your data:
- 📖 View-only access - no modifications allowed
- 🚫 Drag and drop disabled
- 🚫 Text editing disabled
- 🚫 Type changes disabled
- 🚫 Tag editing disabled
- 🚫 Task creation/deletion disabled
- 💾 Data not stored in localStorage - kept only in memory

This is useful for:
- 📤 Sharing backlogs with team members for viewing
- 📚 Providing example projects or templates
- 🎓 Creating tutorial or demo workflows
- 👁️ Previewing backlog files without modifying your local data

**Requirements:**
- The YAML file must be accessible via HTTP
- Either same-origin or CORS must be enabled on the file's server
- If the file cannot be loaded, the demo falls back to default demo tasks (editable)

### Using File System Mode

1. Open the demo in Chrome or Edge browser
2. Click the settings button (⚙️)
3. Scroll to "Storage Mode" section
4. Click "📂 Use File System (Chrome/Edge)"
5. Select a folder on your computer (it will look for or create `backlog.yaml`)
6. Start working with your local files!

**Note**: 
- In localStorage mode, data is stored in your browser's localStorage. Clearing browser data will delete all tasks.
- In File System mode, your data is stored in actual files on your computer. The browser needs permission to access the folder, which you can revoke at any time.

### Deploy Your Own Demo

The demo can be deployed to any static hosting service. A GitHub Actions workflow is included to automatically deploy to GitHub Pages:

1. Enable GitHub Pages in your repository settings (Settings → Pages → Source: GitHub Actions)
2. Push to the `main` branch or trigger the workflow manually
3. The demo will be built and deployed automatically

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
