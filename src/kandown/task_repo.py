from abc import ABC, abstractmethod
import os
import yaml

class TaskRepository(ABC):
    @abstractmethod
    def save(self, task):
        pass

    @abstractmethod
    def get(self, id):
        pass

    @abstractmethod
    def all(self):
        pass

    @abstractmethod
    def update(self, id, status=None):
        pass

    @abstractmethod
    def update_text(self, id, text=None):
        pass

    @abstractmethod
    def update_tags(self, id, tags=None):
        pass

class InMemoryTaskRepository(TaskRepository):
    def __init__(self):
        self.tasks = []
        self.counter = 1
        # Pre-populate with initial tasks
        for t in [
            {"text": "Write documentation", "status": "todo", "tags": ["docs", "writing"]},
            {"text": "Design UI mockups", "status": "todo", "tags": ["design"]},
            {"text": "Set up CI/CD", "status": "todo", "tags": ["devops"]},
            {"text": "Implement markdown rendering", "status": "in_progress", "tags": ["backend", "markdown"]},
            {"text": "Add CLI options", "status": "in_progress", "tags": ["cli"]},
            {"text": "Initialize project", "status": "done", "tags": ["setup"]},
            {"text": "Create README", "status": "done", "tags": ["docs"]}
        ]:
            self.save(t)
        # After pre-population, set counter to highest existing id + 1
        self._update_counter()

    def _update_counter(self):
        max_id = 0
        for task in self.tasks:
            tid = task.get('id', '')
            if tid.startswith('K-'):
                try:
                    num = int(tid[2:])
                    if num > max_id:
                        max_id = num
                except ValueError:
                    continue
        self.counter = max_id + 1 if max_id > 0 else 1

    def save(self, task):
        if 'id' not in task:
            task = dict(task)
            task['id'] = f"K-{self.counter:03d}"
            self.counter += 1
        self.tasks.append(task)
        self._update_counter()
        return task

    def get(self, id):
        for task in self.tasks:
            if task['id'] == id:
                return task
        return None

    def all(self):
        return list(self.tasks)

    def update(self, id, status=None):
        for task in self.tasks:
            if task['id'] == id:
                if status is not None:
                    task['status'] = status
                return task
        return None

    def update_text(self, id, text=None):
        for task in self.tasks:
            if task['id'] == id:
                if text is not None:
                    task['text'] = text
                return task
        return None

    def update_tags(self, id, tags=None):
        for task in self.tasks:
            if task['id'] == id:
                if tags is not None:
                    task['tags'] = tags
                return task
        return None

class YamlTaskRepository(TaskRepository):
    def __init__(self, yaml_path):
        self.yaml_path = yaml_path
        self.tasks = []
        self.counter = 1
        self._load()
        self._update_counter()

    def _update_counter(self):
        max_id = 0
        for task in self.tasks:
            tid = task.get('id', '')
            if tid.startswith('K-'):
                try:
                    num = int(tid[2:])
                    if num > max_id:
                        max_id = num
                except ValueError:
                    continue
        self.counter = max_id + 1 if max_id > 0 else 1

    def _load(self):
        if os.path.exists(self.yaml_path):
            with open(self.yaml_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f) or []
                self.tasks = []
                for t in data:
                    self.save(t)
        else:
            self.tasks = []

    def _save(self):
        with open(self.yaml_path, 'w', encoding='utf-8') as f:
            yaml.safe_dump(self.tasks, f, allow_unicode=True)

    def save(self, task):
        if 'id' not in task:
            task = dict(task)
            task['id'] = f"K-{self.counter:03d}"
            self.counter += 1
        self.tasks.append(task)
        self._save()
        return task

    def get(self, id):
        for task in self.tasks:
            if task['id'] == id:
                return task
        return None

    def all(self):
        return list(self.tasks)

    def update(self, id, status=None):
        for task in self.tasks:
            if task['id'] == id:
                if status is not None:
                    task['status'] = status
                self._save()
                return task
        return None

    def update_text(self, id, text=None):
        for task in self.tasks:
            if task['id'] == id:
                if text is not None:
                    task['text'] = text
                self._save()
                return task
        return None

    def update_tags(self, id, tags=None):
        for task in self.tasks:
            if task['id'] == id:
                if tags is not None:
                    task['tags'] = tags
                self._save()
                return task
        return None
