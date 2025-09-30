"""Flask application for rendering markdown files."""

import os
import markdown
from flask import Flask, render_template_string, jsonify, send_file

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kandown - Markdown Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="content">
        {{ content|safe }}
    </div>
</body>
</html>
"""

KANBAN_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kandown - Kanban Board</title>
    <!-- PyScript CSS -->
    <link rel="stylesheet" href="https://pyscript.net/releases/2025.8.1/core.css">
    <!-- This script tag bootstraps PyScript -->
    <script type="module" src="https://pyscript.net/releases/2025.8.1/core.js"></script>

    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .board {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 40px;
        }
        .column {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            padding: 16px;
            width: 260px;
            min-height: 300px;
            display: flex;
            flex-direction: column;
        }
        .column h2 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 16px;
        }
        .task {
            background: #e3eafc;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
            color: #333;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .tags {
            font-size: 0.9em;
            color: #555;
            margin-top: 4px;
        }
        .task-id {
            font-size: 0.8em;
            color: #888;
            float: right;
        }
    </style>
</head>
<body>
    <h1 style="text-align:center;">Kanban Board</h1>
    <div class="board">
        <div class="column" id="todo-col">
            <h2>To Do</h2>
        </div>
        <div class="column" id="inprogress-col">
            <h2>In Progress</h2>
        </div>
        <div class="column" id="done-col">
            <h2>Done</h2>
        </div>
    </div>
    <mpy-script src="/board.py"></mpy-script>
</body>
</html>
"""

class TaskRepository:
    def __init__(self):
        self.tasks = []
        self.counter = 1
        # Pre-populate with initial tasks
        for t in [
            {"text": "Write documentation", "status": "todo", "tags": ["docs", "writing"]},
            {"text": "Design UI mockups", "status": "todo", "tags": ["design"]},
            {"text": "Set up CI/CD", "status": "todo", "tags": ["devops"]},
            {"text": "Implement markdown rendering", "status": "in_progress", "tags": ["backend", "markdown"]},
            {"text": "Add CLI options", "status": "in_progress", "tags": ["cli"]},
            {"text": "Initialize project", "status": "done", "tags": ["setup"]},
            {"text": "Create README", "status": "done", "tags": ["docs"]}
        ]:
            self.save(t)

    def save(self, task):
        if 'id' not in task:
            task = dict(task)
            task['id'] = f"K-{self.counter:03d}"
            self.counter += 1
        self.tasks.append(task)
        return task

    def get(self, id):
        for task in self.tasks:
            if task['id'] == id:
                return task
        return None

    def all(self):
        return list(self.tasks)

# Instantiate the repository
repo = TaskRepository()

@app.route('/')
def index():
    """Render the kanban board as the index page."""
    return render_template_string(KANBAN_TEMPLATE)

@app.route('/api/tasks')
def get_tasks():
    """Return all tasks as JSON."""
    return jsonify(repo.all())

@app.route('/board.py')
def serve_board_py():
    """Serve the PyScript file for the kanban board."""
    return send_file(
        os.path.join(os.path.dirname(__file__), 'board.py'),
        mimetype='text/x-python'
    )

def create_app():
    """Create and configure the Flask app."""
    return app