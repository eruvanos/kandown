"""Flask application for rendering markdown files."""

import os
from flask import Flask, render_template, jsonify, send_file, request, send_from_directory

app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), 'templates'))

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

    def update(self, id, status=None):
        for task in self.tasks:
            if task['id'] == id:
                if status is not None:
                    task['status'] = status
                return task
        return None

    def update_text(self, id, text=None):
        for task in self.tasks:
            if task['id'] == id:
                if text is not None:
                    task['text'] = text
                return task
        return None

# Instantiate the repository
repo = TaskRepository()

@app.route('/')
def index():
    """Render the kanban board as the index page."""
    return render_template("kanban.html")

@app.route('/api/tasks')
def get_tasks():
    """Return all tasks as JSON."""
    return jsonify(repo.all())

@app.route('/statics/<path:filename>')
def serve_static(filename):
    """Serve files from the statics directory."""
    statics_dir = os.path.join(os.path.dirname(__file__), 'statics')
    return send_from_directory(statics_dir, filename)

@app.route('/api/tasks/<id>', methods=['PATCH'])
def update_task(id):
    """Update a task's status by id."""
    data = request.get_json()
    status = data.get('status') if data else None
    if not status:
        return jsonify({'error': 'Missing status'}), 400
    task = repo.update(id, status=status)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task)

@app.route('/api/tasks/<id>/text', methods=['PATCH'])
def update_task_text(id):
    """Update a task's text by id."""
    data = request.get_json()
    text = data.get('text') if data else None
    if not text:
        return jsonify({'error': 'Missing text'}), 400
    task = repo.update_text(id, text=text)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task)

def create_app():
    """Create and configure the Flask app."""
    return app