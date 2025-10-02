"""Flask application for rendering markdown files."""

import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional
from .task_repo import YamlTaskRepository


class TaskModel(BaseModel):
    id: str
    text: Optional[str] = None
    status: str
    tags: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    closed_at: Optional[str] = None

class TaskCreateModel(BaseModel):
    text: Optional[str] = ""
    status: str
    tags: List[str] = Field(default_factory=list)

class TaskStatusModel(BaseModel):
    status: str

class TaskTextModel(BaseModel):
    text: str

class TaskTagsModel(BaseModel):
    tags: List[str]

def create_app(yaml_path=None):

    app = FastAPI()
    statics_dir = os.path.join(os.path.dirname(__file__), "statics")
    app.mount("/statics", StaticFiles(directory=statics_dir), name="statics")

    repo = YamlTaskRepository(yaml_path or os.environ.get("KANDOWN_YAML", "demo.yml"))

    def _map_task_fields(task: dict) -> dict:
        mapped = dict(task)
        if "created" in mapped:
            mapped["created_at"] = mapped["created"]
        if "updated" in mapped:
            mapped["updated_at"] = mapped["updated"]
        if "closed" in mapped:
            mapped["closed_at"] = mapped["closed"]
        return mapped

    @app.get("/")
    def index():
        # Serve kanban.html as main page
        template_path = os.path.join(os.path.dirname(__file__), "templates", "kanban.html")
        if not os.path.exists(template_path):
            raise HTTPException(status_code=404, detail="Template not found")
        with open(template_path, "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)

    @app.get("/api/tasks", response_model=List[TaskModel])
    def get_tasks():
        tasks = [_map_task_fields(t) for t in repo.all()]
        return tasks

    @app.patch("/api/tasks/{id}", response_model=TaskModel)
    def update_task(id: str, body: TaskStatusModel):
        status = body.status
        if not status:
            raise HTTPException(status_code=400, detail="Missing status")
        task = repo.update_status(id, status=status)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return _map_task_fields(task)

    @app.patch("/api/tasks/{id}/text", response_model=TaskModel)
    def update_task_text(id: str, body: TaskTextModel):
        text = body.text
        if not text:
            raise HTTPException(status_code=400, detail="Missing text")
        task = repo.update_text(id, text=text)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return _map_task_fields(task)

    @app.post("/api/tasks", response_model=TaskModel, status_code=201)
    def add_task(body: TaskCreateModel):
        if not body.status or not isinstance(body.tags, list):
            raise HTTPException(status_code=400, detail="Missing or invalid fields: text, status, tags")
        task = {"text": body.text, "status": body.status, "tags": body.tags}
        created = repo.save(task)
        return _map_task_fields(created)

    @app.patch("/api/tasks/{id}/tags", response_model=TaskModel)
    def update_task_tags(id: str, body: TaskTagsModel):
        tags = body.tags
        if not isinstance(tags, list):
            raise HTTPException(status_code=400, detail="Missing or invalid tags")
        if not all(isinstance(tag, str) for tag in tags):
            raise HTTPException(status_code=400, detail="Tags must be strings")
        task = repo.update_tags(id, tags=tags)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return _map_task_fields(task)

    @app.get("/api/tags/suggestions", response_model=List[str])
    def tag_suggestions():
        all_tasks = repo.all()
        tags = set()
        for task in all_tasks:
            for tag in task.get("tags", []):
                tags.add(tag)
        return sorted(tags)

    return app

