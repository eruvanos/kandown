"""MCP server support for Kandown task operations."""

from pathlib import Path
from typing import Any

from kandown.task_repo import YamlTaskRepository

DEFAULT_BACKLOG_FILENAME = "backlog.yaml"


def resolve_backlog_path(
    *,
    backlog_path: str | None = None,
    project_root: str | None = None,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
) -> Path:
    """Resolve a backlog YAML path from explicit or default parameters."""
    if backlog_path:
        resolved = Path(backlog_path).expanduser().resolve()
    else:
        root_candidate = project_root or default_project_root
        if root_candidate:
            resolved = (Path(root_candidate).expanduser().resolve() / backlog_filename).resolve()
        elif default_backlog_path:
            resolved = Path(default_backlog_path).expanduser().resolve()
        else:
            raise ValueError(
                "No backlog path could be resolved. Provide backlog_path or project_root in the tool call, "
                "or configure --default-backlog-path/--default-project-root when starting the MCP server."
            )

    if not resolved.exists():
        raise ValueError(f"Resolved backlog file does not exist: {resolved}")
    if not resolved.is_file():
        raise ValueError(f"Resolved backlog path is not a file: {resolved}")
    return resolved


def get_tasks_by_column(
    *,
    column: str,
    backlog_path: str | None = None,
    project_root: str | None = None,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
) -> dict[str, Any]:
    """List tasks for a single column/status."""
    resolved = resolve_backlog_path(
        backlog_path=backlog_path,
        project_root=project_root,
        default_backlog_path=default_backlog_path,
        default_project_root=default_project_root,
        backlog_filename=backlog_filename,
    )
    repo = YamlTaskRepository(resolved)
    filtered = [task for task in repo.all() if task.status == column]
    filtered.sort(key=lambda t: (t.order if t.order is not None else 0, t.id or ""))
    return {
        "backlog_path": str(resolved),
        "column": column,
        "count": len(filtered),
        "tasks": [task.to_dict() for task in filtered],
    }


def edit_task(
    *,
    task_id: str,
    text: str | None = None,
    status: str | None = None,
    tags: list[str] | None = None,
    order: int | None = None,
    task_type: str | None = None,
    backlog_path: str | None = None,
    project_root: str | None = None,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
) -> dict[str, Any]:
    """Edit task fields."""
    resolved = resolve_backlog_path(
        backlog_path=backlog_path,
        project_root=project_root,
        default_backlog_path=default_backlog_path,
        default_project_root=default_project_root,
        backlog_filename=backlog_filename,
    )
    updates: dict[str, Any] = {}
    if text is not None:
        updates["text"] = text
    if status is not None:
        updates["status"] = status
    if tags is not None:
        updates["tags"] = tags
    if order is not None:
        updates["order"] = order
    if task_type is not None:
        updates["type"] = task_type
    if not updates:
        raise ValueError("No updates provided. Specify at least one field to update (text, status, tags, order, or task_type).")

    repo = YamlTaskRepository(resolved)
    task = repo.update(task_id, **updates)
    if not task:
        raise ValueError(f"Task not found: {task_id}")

    return {"backlog_path": str(resolved), "task": task.to_dict()}


def move_task(
    *,
    task_id: str,
    to_column: str,
    order: int | None = None,
    backlog_path: str | None = None,
    project_root: str | None = None,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
) -> dict[str, Any]:
    """Move task to another column/status."""
    return edit_task(
        task_id=task_id,
        status=to_column,
        order=order,
        backlog_path=backlog_path,
        project_root=project_root,
        default_backlog_path=default_backlog_path,
        default_project_root=default_project_root,
        backlog_filename=backlog_filename,
    )


def create_mcp_server(
    *,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
):
    """Create a FastMCP server exposing Kandown task operations."""
    from mcp.server.fastmcp import FastMCP

    server = FastMCP("kandown")

    @server.tool()
    def tasks_by_column(
        column: str,
        backlog_path: str | None = None,
        project_root: str | None = None,
    ) -> dict[str, Any]:
        """Return all tasks in a given column/status."""
        return get_tasks_by_column(
            column=column,
            backlog_path=backlog_path,
            project_root=project_root,
            default_backlog_path=default_backlog_path,
            default_project_root=default_project_root,
            backlog_filename=backlog_filename,
        )

    @server.tool()
    def edit_backlog_task(
        task_id: str,
        text: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        order: int | None = None,
        task_type: str | None = None,
        backlog_path: str | None = None,
        project_root: str | None = None,
    ) -> dict[str, Any]:
        """Edit a task in a backlog file."""
        return edit_task(
            task_id=task_id,
            text=text,
            status=status,
            tags=tags,
            order=order,
            task_type=task_type,
            backlog_path=backlog_path,
            project_root=project_root,
            default_backlog_path=default_backlog_path,
            default_project_root=default_project_root,
            backlog_filename=backlog_filename,
        )

    @server.tool()
    def move_backlog_task(
        task_id: str,
        to_column: str,
        order: int | None = None,
        backlog_path: str | None = None,
        project_root: str | None = None,
    ) -> dict[str, Any]:
        """Move a task to another column/status in a backlog file."""
        return move_task(
            task_id=task_id,
            to_column=to_column,
            order=order,
            backlog_path=backlog_path,
            project_root=project_root,
            default_backlog_path=default_backlog_path,
            default_project_root=default_project_root,
            backlog_filename=backlog_filename,
        )

    return server


def run_mcp_server(
    *,
    default_backlog_path: str | None = None,
    default_project_root: str | None = None,
    backlog_filename: str = DEFAULT_BACKLOG_FILENAME,
    transport: str = "stdio",
) -> None:
    """Run the MCP server."""
    server = create_mcp_server(
        default_backlog_path=default_backlog_path,
        default_project_root=default_project_root,
        backlog_filename=backlog_filename,
    )
    server.run(transport=transport)
