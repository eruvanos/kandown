import datetime
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import yaml
from atomicwrites import atomic_write

from .models import BacklogData, Settings, Task

ALLOWED_UPDATES = ("status", "text", "tags", "order")
"""Allowed fields for task updates. These are the fields the user can modify."""


class TaskRepository(ABC):
    """
    Abstract base class for a task repository.
    Defines the interface for saving, retrieving, updating, and listing tasks.
    """

    @abstractmethod
    def save(self, task: Task) -> Task:
        """
        Save a new task to the repository.
        Args:
            task (Task): The task to save.
        Returns:
            Task: The saved task with an assigned ID.
        """
        pass

    @abstractmethod
    def get(self, id: str) -> Optional[Task]:
        """
        Retrieve a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            Task or None: The task if found, else None.
        """
        pass

    @abstractmethod
    def all(self) -> List[Task]:
        """
        Retrieve all tasks in the repository.
        Returns:
            List[Task]: List of all tasks.
        """
        pass

    @abstractmethod
    def update(self, id: str, **kwargs) -> Optional[Task]:
        """
        Update one or more attributes of a task.
        Args:
            id (str): The ID of the task.
            **kwargs: Attributes to update.
        Returns:
            Task or None: The updated task if found, else None.
        """
        pass

    @abstractmethod
    def batch_update(self, updates: Dict[str, Dict[str, Any]]) -> List[Task]:
        """
        Batch update multiple tasks by id and attribute dicts.
        Args:
            updates (Dict[str, Dict[str, Any]]): Mapping of id to attribute dicts.
        Returns:
            List[Task]: List of updated tasks.
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

    @abstractmethod
    def update_settings(self, updates: Dict[str, Any]) -> Settings:
        """
        Update settings and persist them to the repository.
        Args:
            updates (Dict[str, Any]): Dictionary of settings to update.
        Returns:
            Settings: The updated settings.
        """
        pass


class YamlTaskRepository(TaskRepository):
    """
    Task repository implementation using a YAML file for storage with Pydantic models.
    """

    def __init__(self, yaml_path: str) -> None:
        """
        Initialize the repository and load tasks from the YAML file.
        Args:
            yaml_path (str): Path to the YAML file.
        """
        self.yaml_path: str = yaml_path
        self.backlog_data: BacklogData = BacklogData()
        self.counter: int = 1
        # self.change_event: threading.Event = threading.Event()
        self._load()
        self._update_counter()

    @property
    def tasks(self) -> List[Task]:
        """Get tasks from backlog data."""
        return self.backlog_data.tasks

    @property
    def settings(self) -> Settings:
        """Get settings from backlog data."""
        return self.backlog_data.settings

    def _update_counter(self) -> None:
        """
        Update the task ID counter based on the highest existing ID in the tasks.
        """
        max_id: int = 0
        for task in self.tasks:
            if task.id and task.id.startswith("K-"):
                try:
                    num: int = int(task.id[2:])
                    if num > max_id:
                        max_id = num
                except ValueError:
                    continue
        self.counter = max_id + 1 if max_id > 0 else 1

    def _load(self) -> None:
        """
        Load tasks and settings from the YAML file using Pydantic models.
        """
        if os.path.exists(self.yaml_path):
            with open(self.yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                try:
                    if isinstance(data, dict):
                        self.backlog_data = BacklogData.from_dict(data)
                    else:
                        # Handle legacy format (list of tasks)
                        self.backlog_data = BacklogData(
                            settings=Settings(),
                            tasks=[Task.from_dict(task) for task in data] if isinstance(data, list) else [],
                        )
                except Exception as e:
                    # Fallback for malformed data
                    print(f"Warning: Could not parse YAML data: {e}. Using defaults.")
                    self.backlog_data = BacklogData()
        else:
            self.backlog_data = BacklogData()

    def _save(self) -> None:
        """
        Save settings and tasks to the YAML file using Pydantic models.
        """
        with atomic_write(self.yaml_path, mode="w", encoding="utf-8", overwrite=True) as f:
            f.write("# Project page: https://github.com/eruvanos/kandown\n")
            f.write(
                "# To open this file with uv, run: uv run --with git+https://github.com/eruvanos/kandown kandown demo.yml\n"
            )
            yaml.safe_dump(self.backlog_data.to_dict(), f, allow_unicode=True)
        # Trigger change event after saving
        # self.change_event.set()

    def save(self, task: Task) -> Task:
        """
        Save a task to the repository, assigning an ID if necessary (new task).
        Args:
            task (Task): The task to save.
        Returns:
            Task: The saved task with an assigned ID.
        """
        now = datetime.datetime.now().isoformat()

        # Create a copy to avoid modifying the original
        task_data = task.model_dump()

        if not task_data.get("id"):
            task_data["created_at"] = now
            task_data["updated_at"] = now
            task_data["id"] = f"K-{self.counter:03d}"
            self.counter += 1
        else:
            # If re-saving an existing task, don't overwrite created_at
            if not task_data.get("created_at"):
                task_data["created_at"] = now
            task_data["updated_at"] = now

        # Handle status-specific logic
        if task_data.get("closed_at") and task_data.get("status") != "done":
            task_data.pop("closed_at", None)
        if task_data.get("status") == "done" and not task_data.get("closed_at"):
            task_data["closed_at"] = now

        saved_task = Task.from_dict(task_data)
        self.tasks.append(saved_task)
        self._save()
        return saved_task

    def get(self, id: str) -> Optional[Task]:
        """
        Retrieve a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            Task or None: The task if found, else None.
        """
        for task in self.tasks:
            if task.id == id:
                return task
        return None

    def all(self) -> List[Task]:
        """
        Retrieve all tasks in the repository.
        Returns:
            List[Task]: List of all tasks.
        """
        return list(self.tasks)

    @staticmethod
    def _patch_task(task: Task, **kwargs) -> Task:
        """Internal method to patch a task with given attributes.

        Args:
            task (Task): The task to patch.
            **kwargs: Attributes to update.
        Returns:
            Task or None: The updated task if input task is valid, else None.
        """
        if not task:
            raise ValueError("Task to patch cannot be None")

        now = datetime.datetime.now().isoformat()
        task_data = task.model_dump()
        for key, value in kwargs.items():
            # Only allow updates to specific fields
            if key not in ALLOWED_UPDATES or value is None:
                continue

            # Special handling for status changes
            if key == "status":
                previous_status = task.status
                if value == "done" and previous_status != "done":
                    task_data["closed_at"] = now
                elif value != "done":
                    task_data.pop("closed_at", None)

            task_data[key] = value
        task_data["updated_at"] = now
        return Task.from_dict(task_data)

    def update(self, id: str, **kwargs) -> Optional[Task]:
        """
        Update one or more attributes of a task.
        Args:
            id (str): The ID of the task.
            **kwargs: Attributes to update.
        Returns:
            Task or None: The updated task if found, else None.
        """
        for i, task in enumerate(self.tasks):
            if task.id == id:
                patched_task = YamlTaskRepository._patch_task(task, **kwargs)
                self.tasks[i] = patched_task
                self._save()
                return patched_task
        self._save()
        return None

    def batch_update(self, updates: Dict[str, Dict[str, Any]]) -> List[Task]:
        """
        Batch update multiple tasks by id and attribute dicts.
        Args:
            updates (Dict[str, Dict[str, Any]]): Mapping of id to attribute dicts.
        Returns:
            List[Task]: List of updated tasks.
        """
        updated = []

        for i, task in enumerate(self.tasks):
            if task.id in updates:
                patched_task = YamlTaskRepository._patch_task(task, **updates[task.id])
                self.tasks[i] = patched_task
                updated.append(patched_task)
        if updated:
            self._save()
        return updated

    def delete(self, id: str) -> bool:
        """
        Delete a task by its ID.
        Args:
            id (str): The ID of the task.
        Returns:
            bool: True if the task was deleted, False if not found.
        """
        for i, task in enumerate(self.tasks):
            if task.id == id:
                del self.tasks[i]
                self._save()
                return True
        return False

    def update_settings(self, updates: Dict[str, Any]) -> Settings:
        """
        Update settings and persist them to the YAML file.
        Args:
            updates (Dict[str, Any]): Dictionary of settings to update.
        Returns:
            Settings: The updated settings.
        """
        settings_data = self.settings.model_dump()
        settings_data.update(updates)
        self.backlog_data.settings = Settings.from_dict(settings_data)
        self._save()
        return self.settings
