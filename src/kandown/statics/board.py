import js

async def fetch_tasks():
    resp = await js.fetch("/api/tasks")
    tasks = await resp.json()
    return tasks

def render_tasks(tasks):
    columns = {
        "todo": js.document.getElementById("todo-col"),
        "in_progress": js.document.getElementById("inprogress-col"),
        "done": js.document.getElementById("done-col"),
    }
    for col in columns.values():
        while col.children.length > 1:
            col.removeChild(col.lastChild)
    for task in tasks:
        el = js.document.createElement("div")
        el.className = "task"
        el.innerHTML = f"<span class='task-id'>{task['id']}</span>{task['text']}<div class='tags'>{', '.join(task['tags'])}</div>"
        columns[task["status"]].appendChild(el)

async def main():
    tasks = await fetch_tasks()
    render_tasks(tasks)

# Since version 2024.8.2. PyScript now uses a top level await by default.
await main()
