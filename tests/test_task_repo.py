from kandown.task_repo import YamlTaskRepository


def make_repo_with_tasks(tmp_path):
    yaml_path = tmp_path / "test_tasks.yaml"
    repo = YamlTaskRepository(str(yaml_path))
    return repo, yaml_path


def test_save_and_get(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = {"text": "Test task", "status": "todo", "tags": ["pytest"]}
    saved = repo.save(task)
    assert "id" in saved
    fetched = repo.get(saved["id"])
    assert fetched == saved


def test_all(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    repo.save({"text": "Task 1"})
    repo.save({"text": "Task 2"})
    all_tasks = repo.all()
    assert len(all_tasks) == 2
    assert all(t["id"].startswith("K-") for t in all_tasks)


def test_update_status(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save({"text": "Task", "status": "todo"})
    updated = repo.update_status(task["id"], "done")
    assert updated["status"] == "done"
    # Non-existent
    assert repo.update_status("K-999", "done") is None


def test_update_text(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save({"text": "Old text"})
    updated = repo.update_text(task["id"], "New text")
    assert updated["text"] == "New text"
    assert repo.update_text("K-999", "No text") is None


def test_update_tags(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save({"text": "Tag task", "tags": ["a"]})
    updated = repo.update_tags(task["id"], ["b", "c"])
    assert updated["tags"] == ["b", "c"]
    assert repo.update_tags("K-999", ["x"]) is None


def test_get_nonexistent(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    assert repo.get("K-999") is None


def test_empty_all(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    assert repo.all() == []


def test_created_and_updated_fields(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = {"text": "Test date fields", "status": "todo"}
    saved = repo.save(task)
    assert "created" in saved
    assert "updated" in saved
    assert saved["created"] == saved["updated"]
    # Update text and check updated changes
    updated = repo.update_text(saved["id"], "Changed text")
    assert updated["updated"] != updated["created"]


def test_closed_field_on_status_change(tmp_path):
    repo, _ = make_repo_with_tasks(tmp_path)
    task = repo.save({"text": "Close test", "status": "todo"})
    # Initially no closed field
    assert "closed" not in task
    # Change status to done
    done_task = repo.update_status(task["id"], "done")
    assert done_task["status"] == "done"
    assert "closed" in done_task
    closed_time = done_task["closed"]
    # Change status away from done
    reopened = repo.update_status(task["id"], "todo")
    assert reopened["status"] == "todo"
    assert "closed" not in reopened
    # Change back to done, closed should be set again
    done_again = repo.update_status(task["id"], "done")
    assert "closed" in done_again
    assert done_again["closed"] != closed_time
