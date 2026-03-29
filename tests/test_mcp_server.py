import pytest

from kandown.mcp_server import (
    edit_task,
    get_tasks_by_column,
    move_task,
    resolve_backlog_path,
)
from kandown.models import Task
from kandown.task_repo import YamlTaskRepository


def make_repo(tmp_path):
    backlog = tmp_path / "backlog.yaml"
    backlog.write_text("[]\n", encoding="utf-8")
    repo = YamlTaskRepository(backlog)
    return repo, backlog


def test_resolve_backlog_path_from_backlog_path(tmp_path):
    _, backlog = make_repo(tmp_path)
    resolved = resolve_backlog_path(backlog_path=str(backlog))
    assert resolved == backlog.resolve()


def test_resolve_backlog_path_from_project_root(tmp_path):
    _, backlog = make_repo(tmp_path)
    resolved = resolve_backlog_path(project_root=str(tmp_path))
    assert resolved == backlog.resolve()


def test_resolve_backlog_path_from_defaults(tmp_path):
    _, backlog = make_repo(tmp_path)
    resolved = resolve_backlog_path(default_backlog_path=str(backlog))
    assert resolved == backlog.resolve()


def test_resolve_backlog_path_raises_when_missing_inputs():
    with pytest.raises(ValueError, match="No backlog path could be resolved"):
        resolve_backlog_path()


def test_get_tasks_by_column_filters_and_sorts(tmp_path):
    repo, backlog = make_repo(tmp_path)
    repo.save(Task(text="B", status="todo", order=2))
    repo.save(Task(text="A", status="todo", order=1))
    repo.save(Task(text="Done", status="done", order=1))

    result = get_tasks_by_column(column="todo", backlog_path=str(backlog))
    assert result["count"] == 2
    assert [task["text"] for task in result["tasks"]] == ["A", "B"]


def test_edit_task_updates_fields(tmp_path):
    repo, backlog = make_repo(tmp_path)
    task = repo.save(Task(text="Original", status="todo", tags=["x"], order=1))

    result = edit_task(
        task_id=task.id,
        text="Updated",
        tags=["a", "b"],
        task_type="bug",
        backlog_path=str(backlog),
    )
    assert result["task"]["text"] == "Updated"
    assert result["task"]["tags"] == ["a", "b"]
    assert result["task"]["type"] == "bug"


def test_move_task_changes_status_and_order(tmp_path):
    repo, backlog = make_repo(tmp_path)
    task = repo.save(Task(text="Move me", status="todo", order=1))

    result = move_task(task_id=task.id, to_column="in-progress", order=3, backlog_path=str(backlog))
    assert result["task"]["status"] == "in-progress"
    assert result["task"]["order"] == 3
