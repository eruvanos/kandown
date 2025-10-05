from abc import ABC, abstractmethod
import os
import yaml
import datetime
import threading
from atomicwrites import atomic_write


class TaskRepository(ABC):
    """
    Abstract base class for a task repository.
    Defines the interface for saving, retrieving, updating, and listing tasks.
    """

    @abstractmethod
    def save(self, task: dict[str, object]) -> dict[str, object]:
        """
        Save a new task to the repository.
        Args:
            task (dict): The task to save.
        Returns:
            dict: The saved task with an assigned ID.
        """
        pass

    @abstractmethod
    def get(self, id: str) -> dict[str, object] | None:
        """
        Retrieve a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            dict or None: The task if found, else None.
        """
        pass

    @abstractmethod
    def all(self) -> list[dict[str, object]]:
        """
        Retrieve all tasks in the repository.
        Returns:
            list: List of all tasks.
        """
        pass

    @abstractmethod
    def update_status(self, id: str, status: str | None = None) -> dict[str, object] | None:
        """
        Update the status of a task.
        Args:
            id (str): The ID of the task.
            status (str, optional): The new status.
        Returns:
            dict or None: The updated task if found, else None.
        """
        pass

    @abstractmethod
    def update_text(self, id: str, text: str | None = None) -> dict[str, object] | None:
        """
        Update the text of a task.
        Args:
            id (str): The ID of the task.
            text (str, optional): The new text.
        Returns:
            dict or None: The updated task if found, else None.
        """
        pass

    @abstractmethod
    def update_tags(self, id: str, tags: list[str] | None = None) -> dict[str, object] | None:
        """
        Update the tags of a task.
        Args:
            id (str): The ID of the task.
            tags (list, optional): The new tags.
        Returns:
            dict or None: The updated task if found, else None.
        """
        pass

    @abstractmethod
    def update_order(self, id: str, order: int) -> dict[str, object] | None:
        """
        Update the order of a task.
        Args:
            id (str): The ID of the task.
            order (int): The new order value.
        Returns:
            dict or None: The updated task if found, else None.
        """
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        """
        Delete a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            bool: True if the task was deleted, False if not found.
        """
        pass


class YamlTaskRepository(TaskRepository):
    """
    Task repository implementation using a YAML file for storage.
    """

    def __init__(self, yaml_path: str) -> None:
        """
        Initialize the repository and load tasks from the YAML file.
        Args:
            yaml_path (str): Path to the YAML file.
        """
        self.yaml_path: str = yaml_path
        self.tasks: list[dict[str, object]] = []
        self.settings: dict[str, object] = {}
        self.counter: int = 1
        self.change_event: threading.Event = threading.Event()
        self._load()
        self._update_counter()

    def _update_counter(self) -> None:
        """
        Update the task ID counter based on the highest existing ID in the tasks.
        """
        max_id: int = 0
        for task in self.tasks:
            tid: str = task.get("id", "")
            if tid.startswith("K-"):
                try:
                    num: int = int(tid[2:])
                    if num > max_id:
                        max_id = num
                except ValueError:
                    continue
        self.counter = max_id + 1 if max_id > 0 else 1

    def _load(self) -> None:
        """
        Load tasks and settings from the YAML file. Supports both list and dict formats.
        """
        if os.path.exists(self.yaml_path):
            with open(self.yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict):
                    self.settings = data.get("settings", {})
                    self.tasks = data.get("tasks", [])
                else:
                    self.settings = {}
                    self.tasks = []
        else:
            self.settings = {}
            self.tasks = []

    def _save(self) -> None:
        """
        Save settings and tasks to the YAML file, including project metadata comments, using atomic file writing.
        """
        with atomic_write(self.yaml_path, mode="w", encoding="utf-8", overwrite=True) as f:
            f.write("# Project page: https://github.com/eruvanos/kandown\n")
            f.write(
                "# To open this file with uv, run: uv run --with git+https://github.com/eruvanos/kandown kandown demo.yml\n"
            )
            yaml.safe_dump({"settings": self.settings, "tasks": self.tasks}, f, allow_unicode=True)
        # Trigger change event after saving
        self.change_event.set()
        self.change_event.clear()

    def save(self, task: dict[str, object]) -> dict[str, object]:
        """
        Save a new task to the repository, assigning an ID if necessary.
        Args:
            task (dict): The task to save.
        Returns:
            dict: The saved task with an assigned ID.
        """
        now = datetime.datetime.now().isoformat()
        if "id" not in task:
            task = dict(task)
            task["created"] = now
            task["updated"] = now
        else:
            # If re-saving an existing task, don't overwrite created
            if "created" not in task:
                task["created"] = now
            task["updated"] = now
        if "closed" in task and task.get("status") != "done":
            del task["closed"]
        if task.get("status") == "done" and "closed" not in task:
            task["closed"] = now
        if "id" not in task:
            task["id"] = f"K-{self.counter:03d}"
            self.counter += 1
        self.tasks.append(task)
        self._save()
        return task

    def get(self, id: str) -> dict[str, object] | None:
        """
        Retrieve a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            dict or None: The task if found, else None.
        """
        for task in self.tasks:
            if task["id"] == id:
                return task
        return None

    def all(self) -> list[dict[str, object]]:
        """
        Retrieve all tasks in the repository.
        Returns:
            list: List of all tasks.
        """
        return list(self.tasks)

    def update_status(self, id: str, status: str | None = None) -> dict[str, object] | None:
        """
        Update the status of a task.
        Args:
            id (str): The ID of the task.
            status (str, optional): The new status.
        Returns:
            dict or None: The updated task if found, else None.
        """
        now = datetime.datetime.now().isoformat()
        for task in self.tasks:
            if task["id"] == id:
                if status is not None:
                    previous_status = task.get("status")
                    task["status"] = status
                    task["updated"] = now
                    if status == "done" and previous_status != "done":
                        task["closed"] = now
                    elif previous_status == "done" and status != "done":
                        task.pop("closed", None)
                self._save()
                return task
        return None

    def update_text(self, id: str, text: str | None = None) -> dict[str, object] | None:
        """
        Update the text of a task.
        Args:
            id (str): The ID of the task.
            text (str, optional): The new text.
        Returns:
            dict or None: The updated task if found, else None.
        """
        now = datetime.datetime.now().isoformat()
        for task in self.tasks:
            if task["id"] == id:
                if text is not None:
                    task["text"] = text
                    task["updated"] = now
                self._save()
                return task
        return None

    def update_tags(self, id: str, tags: list[str] | None = None) -> dict[str, object] | None:
        """
        Update the tags of a task.
        Args:
            id (str): The ID of the task.
            tags (list, optional): The new tags.
        Returns:
            dict or None: The updated task if found, else None.
        """
        now = datetime.datetime.now().isoformat()
        for task in self.tasks:
            if task["id"] == id:
                if tags is not None:
                    task["tags"] = tags
                    task["updated"] = now
                self._save()
                return task
        return None

    def update_order(self, id: str, order: int) -> dict[str, object] | None:
        """
        Update the order of a task.
        Args:
            id (str): The ID of the task.
            order (int): The new order value.
        Returns:
            dict or None: The updated task if found, else None.
        """
        now = datetime.datetime.now().isoformat()
        for task in self.tasks:
            if task["id"] == id:
                task["order"] = order
                task["updated"] = now
                self._save()
                return task
        return None

    def delete(self, id: str) -> bool:
        """
        Delete a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            bool: True if the task was deleted, False if not found.
        """
        for i, task in enumerate(self.tasks):
            if task.get("id") == id:
                del self.tasks[i]
                self._save()
                return True
        return False

    def batch_update(self, updates: dict[str, dict]) -> list[dict[str, object]]:
        """
        Batch update multiple tasks by id and attribute dicts.
        Args:
            updates (dict): Mapping of id to attribute dicts.
        Returns:
            list: List of updated tasks.
        """
        now = datetime.datetime.now().isoformat()
        updated = []
        for task in self.tasks:
            attrs = updates.get(task["id"])
            if attrs:
                for k, v in attrs.items():
                    task[k] = v
                task["updated"] = now
                updated.append(task)
        self._save()
        return updated

    def update_settings(self, updates: dict[str, object]) -> dict[str, object]:
        """
        Update settings and persist them to the YAML file.
        Args:
            updates (dict): Dictionary of settings to update.
        Returns:
            dict: The updated settings.
        """
        self.settings.update(updates)
        self._save()
        return self.settings
