# kandown

A markdown backed kanban board easy to use

## Overview

Kandown is a simple Flask-based web application that renders markdown files in a clean, readable format through a web interface. It's perfect for viewing markdown-based kanban boards, documentation, or any markdown content through a browser.

## Features

- 📝 **Markdown rendering**: Full support for markdown syntax including tables and code blocks
- 🚀 **Simple CLI**: Easy-to-use command line interface
- 🌐 **Web interface**: Clean, responsive web UI for viewing content
- ⚡ **Fast setup**: Quick installation and setup with uv package manager
- 🎨 **Clean styling**: Beautiful, readable typography and layout

## Installation

This project uses [uv](https://docs.astral.sh/uv/) as the package manager. Install the package in development mode:

```bash
git clone <repository-url>
cd kandown
uv sync
```

## Usage

### Basic usage

Run the kandown server with a markdown file:

```bash
uv run kandown your-file.md
```

Then open your browser to `http://127.0.0.1:8000` to view the rendered content.

### CLI Options

```bash
uv run kandown [OPTIONS] MARKDOWN_FILE

Options:
  --host TEXT     Host to bind to (default: 127.0.0.1)
  --port INTEGER  Port to bind to (default: 8000) 
  --debug         Enable debug mode
  --help          Show help message
```

### Example

```bash
# Start server on default port 5000
uv run kandown sample.md

# Start server on custom port with debug mode
uv run kandown sample.md --port 8080 --debug

# Start server accessible from other machines
uv run kandown sample.md --host 0.0.0.0 --port 8080
```

## Development

### Project structure

```
kandown/
├── src/kandown/
│   ├── __init__.py      # Package initialization
│   ├── app.py           # Flask application
│   └── cli.py           # Command line interface
├── pyproject.toml       # Project configuration
├── sample.md           # Sample markdown file
└── README.md           # This file
```

### Dependencies

- **Flask**: Web framework
- **Markdown**: Markdown to HTML conversion
- **Click**: Command line interface

## License

This project is open source and available under the MIT License.
