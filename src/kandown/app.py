"""Flask application for rendering markdown files."""

import os
from flask import Flask, render_template, jsonify, send_file, request, send_from_directory

def create_app(yaml_file=None):
    """Create and configure the Flask app using the factory pattern."""
    from .task_repo import InMemoryTaskRepository, YamlTaskRepository

    app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), 'templates'))

    if yaml_file:
        repo = YamlTaskRepository(yaml_file)
    else:
        repo = InMemoryTaskRepository()

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

    @app.route('/api/tasks', methods=['POST'])
    def add_task():
        """Add a new task."""
        data = request.get_json()
        text = data.get('text') if data else ""
        status = data.get('status') if data else None
        tags = data.get('tags') if data else None
        if not status or not isinstance(tags, list):
            return jsonify({'error': 'Missing or invalid fields: text, status, tags'}), 400
        task = {'text': text, 'status': status, 'tags': tags}
        created = repo.save(task)
        return jsonify(created), 201

    return app