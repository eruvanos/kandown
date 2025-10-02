"""
A simple task manager web application using Puepy and PyScript.
"""

from puepy import Application, Page, t

app = Application()


class TaskRepo:
    def __init__(self):
        self.tasks = {}
        self.next_id = 1

    def all(self):
        return list(self.tasks.values())

    def get(self, id):
        return self.tasks.get(id)

    def create(self, text, status, tags):
        task = {"id": self.next_id, "text": text, "status": status, "tags": tags}
        self.next_id += 1
        return self.save(task)

    def save(self, task):
        self.tasks[task["id"]] = task
        return task

    def update_status(self, id, status):
        task = self.get(id)

        if task:
            task["status"] = status
        return task

    def update_text(self, id, text):
        task = self.get(id)
        if task:
            task["text"] = text
        return task

    def update_tags(self, id, tags):
        task = self.get(id)
        if task:
            task["tags"] = tags
        return task


task_repo = TaskRepo()


@t.component()
class Card(Page):
    props = ["text", "tags", "task_id", "on_dragstart"]

    def populate(self):
        with t.div(
            classes=["kanban-task"],
            draggable="true",
            task_id=self.task_id,
            on_dragstart=self.on_dragstart,
        ):
            t.span(self.text)
            t.small(f"Tags: {', '.join(self.tags)}")

    def on_task_dragstart(self, event):
        task_id = event.target.getAttribute("task-id")
        event.dataTransfer.setData("text/plain", str(task_id))


@app.page()
class Home(Page):
    def initial(self):
        # Prepopulate with some example tasks for demo
        task_repo.create("Task 1", "todo", ["feature"])
        task_repo.create("Task 2", "in progress", ["bug"])
        task_repo.create("Task 3", "done", ["chore"])
        return dict(tasks=task_repo.all())

    def populate(self):
        tasks = self.state["tasks"]
        columns = [
            ("todo", "To Do"),
            ("in progress", "In Progress"),
            ("done", "Done"),
        ]
        with t.div(classes=["kanban-board"]):
            with t.div(classes=["kanban-columns"]):
                for col_key, col_title in columns:
                    with t.div(
                        classes=["kanban-column"],
                        on_dragover=self.on_column_dragover,
                        on_drop=lambda e, status=col_key: self.on_column_drop(e, status),
                    ):
                        with t.h2():
                            t.text(col_title)
                        with t.div(classes=["kanban-tasks"]):
                            for task in tasks:
                                if task["status"] == col_key:
                                    t.card(
                                        text=task["text"],
                                        tags=task["tags"],
                                        task_id=task["id"],
                                        on_dragstart=self.on_task_dragstart,
                                    )

    def on_column_dragover(self, event):
        event.preventDefault()

    def on_column_drop(self, event, new_status):
        event.preventDefault()
        task_id = event.dataTransfer.getData("text/plain")
        if task_id:
            task_id = int(task_id)
            task_repo.update_status(task_id, new_status)
            self.state["tasks"] = task_repo.all()
            self.redraw_tag(self)


app.mount("#app")
