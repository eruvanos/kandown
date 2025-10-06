from kandown.models import Task
from kandown.task_repo import YamlTaskRepository


def make_repo_with_tasks(tmp_path):
    yaml_path = tmp_path / "test_tasks.yaml"
    repo = YamlTaskRepository(str(yaml_path))
    return repo, yaml_path


def test_save_and_get(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = Task(text="Test task", status="todo", tags=["pytest"])
    saved = repo.save(task)
    assert hasattr(saved, "id")
    fetched = repo.get(saved.id)
    assert fetched == saved


def test_all(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    repo.save(Task(text="Task 1", status="todo"))
    repo.save(Task(text="Task 2", status="todo"))
    all_tasks = repo.all()
    assert len(all_tasks) == 2
    assert all(t.id.startswith("K-") for t in all_tasks)


def test_update(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save(Task(text="Task", status="todo"))
    updated = repo.update(task.id, text="Updated Task", status="done", tags=["updated"], order=5)
    assert updated.text == "Updated Task"
    assert updated.tags == ["updated"]
    assert updated.status == "done"
    assert updated.order == 5


def test_update_non_existing(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    assert repo.update("K-999", status="done") is None


def test_get_nonexistent(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    assert repo.get("K-999") is None


def test_empty_all(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    assert repo.all() == []


def test_created_and_updated_fields(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = Task(text="Test date fields", status="todo")
    saved = repo.save(task)
    assert hasattr(saved, "created_at")
    assert hasattr(saved, "updated_at")
    assert saved.created_at == saved.updated_at
    # Update text and check updated changes
    updated = repo.update(saved.id, text="Changed text")
    assert updated.updated_at != updated.created_at


def test_closed_field_on_status_change(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save(Task(text="Close test", status="todo"))
    # Initially no closed field
    assert task.closed_at is None

    # Change status to done
    done_task = repo.update(task.id, status="done")
    assert done_task.status == "done"
    assert done_task.closed_at is not None
    closed_time = done_task.closed_at

    # Change status away from done
    reopened = repo.update(task.id, status="todo")
    assert reopened.status == "todo"
    assert reopened.closed_at is None

    # Change back to done, closed should be set again
    done_again = repo.update(task.id, status="done")
    assert done_again.closed_at is not None
    assert done_again.closed_at != closed_time
