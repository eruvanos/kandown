from pyscript import display, window
from js import document, fetch, Object
import json
from datetime import datetime

# --- State ---
editing_task_id = None
input_el = None
columns = {}
done_collapsed = {}

# --- API ---
async def get_tasks():
    resp = await fetch('/api/tasks')
    if resp is None:
        print('Error: fetch /api/tasks returned None')
        return []
    data = await resp.text()
    return json.loads(data)

async def update_task_status(id, status):
    headers = Object()
    headers['Content-Type'] = 'application/json'
    resp = await fetch(f'/api/tasks/{id}', {
        'method': 'PATCH',
        'headers': headers,
        'body': json.dumps({'status': status})
    })
    if resp is None:
        print(f'Error: fetch /api/tasks/{id} returned None')
        return None
    data = await resp.text()
    return json.loads(data)

async def update_task_text(id, text):
    headers = Object()
    headers['Content-Type'] = 'application/json'
    resp = await fetch(f'/api/tasks/{id}/text', {
        'method': 'PATCH',
        'headers': headers,
        'body': json.dumps({'text': text})
    })
    if resp is None:
        print(f'Error: fetch /api/tasks/{id}/text returned None')
        return None
    data = await resp.text()
    return json.loads(data)

async def create_task(status):
    headers = Object()
    headers['Content-Type'] = 'application/json'
    resp = await fetch('/api/tasks', {
        'method': 'POST',
        'headers': headers,
        'body': json.dumps({'text': '', 'status': status, 'tags': []})
    })
    if resp is None:
        print('Error: fetch /api/tasks (POST) returned None')
        return None
    data = await resp.text()
    return json.loads(data)

async def get_tag_suggestions():
    resp = await fetch('/api/tags/suggestions')
    if resp is None:
        print('Error: fetch /api/tags/suggestions returned None')
        return []
    data = await resp.text()
    return json.loads(data)

async def update_task_tags(id, tags):
    headers = Object()
    headers['Content-Type'] = 'application/json'
    resp = await fetch(f'/api/tasks/{id}/tags', {
        'method': 'PATCH',
        'headers': headers,
        'body': json.dumps({'tags': tags})
    })
    if resp is None:
        print(f'Error: fetch /api/tasks/{id}/tags returned None')
        return None
    data = await resp.text()
    return json.loads(data)

# --- Helpers ---
def format_date(date_str):
    if not date_str:
        return ''
    try:
        d = datetime.fromisoformat(date_str)
        return f"{d.year}-{d.month:02d}-{d.day:02d} {d.hour:02d}:{d.minute:02d}"
    except Exception:
        return date_str

# --- Render ---
async def render_tasks():
    tasks = await get_tasks()
    for col in columns.values():
        while len(list(col.children)) > 1:
            col.removeChild(col.lastChild)
    for task in tasks:
        el = document.createElement('div')
        el.className = 'task'
        el.dataset.id = task['id']

        # Collapsible Arrow for 'done' column
        if task['status'] == 'done':
            if task['id'] not in done_collapsed:
                done_collapsed[task['id']] = True
            arrow_btn = document.createElement('span')
            arrow_btn.className = 'collapse-arrow'
            arrow_btn.style.position = 'absolute'
            arrow_btn.style.top = '8px'
            arrow_btn.style.right = '8px'
            arrow_btn.style.cursor = 'pointer'
            arrow_btn.textContent = '\u25B6' if done_collapsed[task['id']] else '\u25BC'
            def arrow_click(e, tid=task['id']):
                e.stopPropagation()
                done_collapsed[tid] = not done_collapsed[tid]
                window.render_tasks()
            arrow_btn.onclick = arrow_click
            el.style.position = 'relative'
            el.appendChild(arrow_btn)
        # Task Text
        text_span = document.createElement('p')
        text_span.className = 'task-text'
        if not task.get('text'):
            text_span.textContent = 'Click to add text'
            text_span.style.fontStyle = 'italic'
            text_span.style.color = '#888'
            text_span.style.display = 'block'
        else:
            # Use marked to render markdown as HTML if available
            if hasattr(window, 'marked') and hasattr(window.marked, 'parse'):
                text_span.innerHTML = window.marked.parse(task['text'])
            else:
                text_span.textContent = task['text']
        text_span.style.cursor = 'pointer'
        el.appendChild(text_span)
        # Tags
        tags_div = document.createElement('div')
        tags_div.className = 'tags'
        for tag in task.get('tags', []):
            tag_label = document.createElement('span')
            tag_label.className = 'tag-label'
            tag_label.textContent = tag
            remove_btn = document.createElement('button')
            remove_btn.className = 'remove-tag'
            remove_btn.type = 'button'
            remove_btn.textContent = '×'
            def remove_click(e, t=tag):
                e.stopPropagation()
                new_tags = [tg for tg in task.get('tags', []) if tg != t]
                window.update_task_tags(task['id'], new_tags)
                window.render_tasks()
            remove_btn.onclick = remove_click
            tag_label.appendChild(remove_btn)
            tags_div.appendChild(tag_label)
        el.appendChild(tags_div)
        # Hourglass Icon & Tooltip
        if not (task['status'] == 'done' and done_collapsed[task['id']]):
            hourglass = document.createElement('span')
            hourglass.className = 'task-hourglass'
            hourglass.tabIndex = 0
            hourglass.textContent = '\u23F3'
            tooltip = document.createElement('span')
            tooltip.className = 'hourglass-tooltip'
            if task['status'] == 'done' and task.get('closed_at'):
                date_str = f"Closed: {format_date(task['closed_at'])}"
            elif task.get('updated_at'):
                date_str = f"Last updated: {format_date(task['updated_at'])}"
            else:
                date_str = 'No date available'
            tooltip.textContent = date_str
            el.style.position = 'relative'
            hourglass.onmouseenter = lambda e: setattr(tooltip.style, 'display', 'block')
            hourglass.onmouseleave = lambda e: setattr(tooltip.style, 'display', 'none')
            hourglass.onfocus = lambda e: setattr(tooltip.style, 'display', 'block')
            hourglass.onblur = lambda e: setattr(tooltip.style, 'display', 'none')
            el.appendChild(hourglass)
            el.appendChild(tooltip)
        columns[task['status']].appendChild(el)
    make_draggable()

# --- Drag & Drop ---
def make_draggable():
    for card in document.querySelectorAll('.task'):
        card.setAttribute('draggable', 'true')
        def drag_start(e, c=card):
            e.dataTransfer.setData('text/plain', c.dataset.id)
        card.addEventListener('dragstart', drag_start)
    for status, col in columns.items():
        if not col:
            continue
        col.addEventListener('dragover', lambda e: e.preventDefault())
        async def drop(e, s=status):
            print('Dropped on', s)
            e.preventDefault()
            id = e.dataTransfer.getData('text/plain')
            if not id:
                return
            await update_task_status(id, s)
            await render_tasks()
        # Use PyScript's create_proxy to wrap async handler for JS event
        col.addEventListener('drop', drop)

# --- Entry Point ---
async def main(_):
    print("Kanban board script loaded.")
    global columns
    columns = {
        'todo': document.getElementById('todo-col'),
        'in_progress': document.getElementById('inprogress-col'),
        'done': document.getElementById('done-col')
    }
    window.render_tasks = render_tasks
    window.update_task_status = update_task_status
    window.update_task_tags = update_task_tags
    await render_tasks()

window.addEventListener('mpy:done', main)
