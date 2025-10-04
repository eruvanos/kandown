"""Flask application for rendering markdown files."""

import os
from flask import (
    Flask,
    render_template,
    jsonify,
    request,
    send_from_directory,
)


def create_app(yaml_file):
    """Create and configure the Flask app using the factory pattern."""
    from .task_repo import YamlTaskRepository

    app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), "templates"))

    repo = YamlTaskRepository(yaml_file)

    def _map_task_fields(task):
        # Map backend date fields to frontend expected names
        mapped = dict(task)
        if "created" in mapped:
            mapped["created_at"] = mapped["created"]
        if "updated" in mapped:
            mapped["updated_at"] = mapped["updated"]
        if "closed" in mapped:
            mapped["closed_at"] = mapped["closed"]
        return mapped

    @app.route("/")
    def index():
        """Render the kanban board as the index page."""
        return render_template("kanban.html")

    @app.route("/api/tasks")
    def get_tasks():
        """Return all tasks as JSON."""
        return jsonify([_map_task_fields(t) for t in repo.all()])

    @app.route("/statics/<path:filename>")
    def serve_static(filename):
        """Serve files from the statics directory."""
        statics_dir = os.path.join(os.path.dirname(__file__), "statics")
        return send_from_directory(statics_dir, filename)

    @app.route("/api/tasks/<id>", methods=["PATCH"])
    def update_task(id):
        """Update a task's status by id."""
        data = request.get_json()
        status = data.get("status") if data else None
        if not status:
            return jsonify({"error": "Missing status"}), 400
        task = repo.update_status(id, status=status)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(_map_task_fields(task))

    @app.route("/api/tasks/<id>/text", methods=["PATCH"])
    def update_task_text(id):
        """Update a task's text by id."""
        data = request.get_json()
        text = data.get("text") if data else None
        if not text:
            return jsonify({"error": "Missing text"}), 400
        task = repo.update_text(id, text=text)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(_map_task_fields(task))

    @app.route("/api/tasks", methods=["POST"])
    def add_task():
        """Add a new task."""
        data = request.get_json()
        text = data.get("text") if data else ""
        status = data.get("status") if data else None
        tags = data.get("tags") if data else None
        if not status or not isinstance(tags, list):
            return jsonify({"error": "Missing or invalid fields: text, status, tags"}), 400
        task = {"text": text, "status": status, "tags": tags}
        created = repo.save(task)
        return jsonify(created), 201

    @app.route("/api/tasks/<id>/tags", methods=["PATCH"])
    def update_task_tags(id):
        """Update a task's tags by id."""
        data = request.get_json()
        tags = data.get("tags") if data else None
        if not isinstance(tags, list):
            return jsonify({"error": "Missing or invalid tags"}), 400
        # Optionally validate each tag is a string
        if not all(isinstance(tag, str) for tag in tags):
            return jsonify({"error": "Tags must be strings"}), 400
        task = repo.update_tags(id, tags=tags)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(task)

    @app.route("/api/tags/suggestions")
    def tag_suggestions():
        """Return a list of unique tags from all tasks."""
        all_tasks = repo.all()
        tags = set()
        for task in all_tasks:
            for tag in task.get("tags", []):
                tags.add(tag)
        return jsonify(sorted(tags))

    @app.route("/api/tasks", methods=["PATCH"])
    def batch_update_tasks():
        """Batch update tasks by id and attributes."""
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Payload must be a dict of id to attribute dicts"}), 400
        updated = repo.batch_update(data)
        return jsonify([_map_task_fields(t) for t in updated])

    @app.route("/api/tasks/<id>", methods=["DELETE"])
    def delete_task(id):
        """Delete a task by id."""
        deleted = repo.delete(id)
        if deleted:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": "Task not found"}), 404

    @app.route("/api/settings", methods=["PATCH"])
    def update_settings():
        """Update kanban board settings."""
        updates = request.get_json(force=True)
        if not isinstance(updates, dict):
            return jsonify({"error": "Invalid payload"}), 400
        repo.settings.update(updates)
        repo._save()
        return jsonify(repo.settings)

    return app
