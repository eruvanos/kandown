"""Flask application for rendering markdown files."""

import logging
import os
import random
import string
from pathlib import Path

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
    send_file,
)
from pydantic import ValidationError
from werkzeug.utils import secure_filename

from .models import Task
from .request_models import SettingsUpdateRequest, TaskCreateRequest, TaskUpdateRequest
from .storage import AttachmentResolver
from .task_repo import TaskRepository

logger = logging.getLogger(__name__)


def create_app(repo: TaskRepository, attachment_resolver: AttachmentResolver):
    """Create and configure the Flask app using the factory pattern."""
    app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), "templates"))

    @app.route("/")
    def index():
        """Render the kanban board as the index page."""
        return render_template("index.html")

    @app.route("/statics/<path:filename>")
    def serve_static(filename):
        """Serve files from the statics directory."""
        statics_dir = os.path.join(os.path.dirname(__file__), "statics")
        return send_from_directory(statics_dir, filename)

    @app.route("/api/health")
    def health_check():
        """Health check endpoint indicating the CLI server is available."""
        return jsonify({"available": True})

    @app.route("/api/tasks")
    def get_tasks():
        """Return all tasks as JSON."""
        return jsonify([t.to_dict() for t in repo.all()])

    @app.route("/api/tasks", methods=["POST"])
    def add_task():
        """Add a new task."""
        try:
            data = request.get_json() or {}
            task_create = TaskCreateRequest(**data)

            new_task = Task(
                text=task_create.text,
                status=task_create.status,
                tags=task_create.tags,
                order=task_create.order,
                type=task_create.type,
            )

            # todo add a explicit method to create new tasks
            created = repo.save(new_task)
            return created.to_dict(), 201
        except ValidationError as e:
            logger.exception("Validation error")
            return {"error": "Validation error", "details": e.errors()}, 400

    @app.route("/api/tasks/<id>", methods=["PATCH"])
    def update_task(id):
        """Update a task by id."""
        data = request.get_json()
        update = TaskUpdateRequest(**data)
        task = repo.update(
            id, status=update.status, order=update.order, text=update.text, tags=update.tags, type=update.type
        )

        if not task:
            return jsonify({"error": "Task not found"}), 404
        return task.to_dict()

    @app.route("/api/tasks", methods=["PATCH"])
    def batch_update_tasks():
        """Batch update tasks by id and attributes.

        Expects a JSON payload of the form:

        {
            "task_id_1": {"status": "in-progress", "order": 1},
            "task_id_2": {"status": "done"},
            ...
        }
        """

        try:
            data = request.get_json() or {}
            if not isinstance(data, dict):
                return {"error": "Payload must be a dict of id to attribute dicts"}, 400

            for id, attrs in data.items():
                if not isinstance(attrs, dict):
                    return {"error": f"Attributes for task {id} must be a dict"}, 400
                # Validate each attribute dict
                try:
                    TaskUpdateRequest(**attrs)
                except ValidationError as e:
                    logger.exception("Validation error")
                    return {"error": f"Validation error for task {id}", "details": e.errors()}, 400

            updated = repo.batch_update(data)
            return jsonify([t.to_dict() for t in updated])
        except ValidationError as e:
            logger.exception("Validation error")
            return {"error": "Validation error", "details": e.errors()}, 400

    @app.route("/api/tags/suggestions")
    def tag_suggestions():
        """Return a list of unique tags from all tasks."""
        all_tasks = repo.all()
        tags = set()
        for task in all_tasks:
            for tag in task.tags:
                tags.add(tag)
        return jsonify(sorted(tags))

    @app.route("/api/tasks/<id>", methods=["DELETE"])
    def delete_task(id):
        """Delete a task by id."""
        deleted = repo.delete(id)
        if deleted:
            return {"success": True}, 200
        else:
            return {"error": "Task not found"}, 404

    @app.route("/api/settings", methods=["PATCH"])
    def update_settings():
        """Update kanban board settings."""
        try:
            data = request.get_json() or {}
            settings_update = SettingsUpdateRequest(**data)

            # Only update non-None fields
            updates = {k: v for k, v in settings_update.model_dump().items() if v is not None}
            updated_settings = repo.update_settings(updates)
            return updated_settings.to_dict(), 200
        except ValidationError as e:
            logger.exception("Validation error")
            return {"error": "Validation error", "details": e.errors()}, 400

    @app.route("/api/settings", methods=["GET"])
    def get_settings():
        """Return current kanban board settings."""
        return repo.settings.to_dict()

    @app.route("/api/tasks/<task>/upload", methods=["POST"])
    def upload_file(task):
        """Upload a file for a specific task and store it under .backlog. Returns a link to fetch the file."""
        # ensure file
        if "file" not in request.files:
            return {"error": "No file part in request"}, 400
        file = request.files["file"]
        if file.filename == "":
            return {"error": "No selected file"}, 400

        # sanitize and create unique filename
        ext = Path(file.filename).suffix
        rand_str = "".join(random.choices(string.ascii_letters + string.digits, k=8))
        filename = secure_filename(f"{task}_{rand_str}{ext}")

        # save file
        file.save(attachment_resolver.resolve(filename))

        # return link to fetch file
        link = url_for("get_attachment", filename=filename)
        return {"filename": filename, "link": link}, 201

    @app.route("/api/attachment/<filename>", methods=["GET"])
    def get_attachment(filename):
        """Serve an uploaded file from .backlog."""
        filename = secure_filename(filename)
        file = attachment_resolver.resolve(filename)
        if not file.exists():
            return {"error": "File not found"}, 404
        return send_file(file)

    return app
