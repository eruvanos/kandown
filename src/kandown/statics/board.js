document.addEventListener('DOMContentLoaded', function() {
    let editingTaskId = null;
    let inputEl = null;

    function makeDraggable() {
        document.querySelectorAll('.task').forEach(function(card) {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });
        });
    }

    function setupDropZones() {
        const columns = {
            'todo': document.getElementById('todo-col'),
            'in_progress': document.getElementById('inprogress-col'),
            'done': document.getElementById('done-col')
        };
        Object.entries(columns).forEach(([status, col]) => {
            col.addEventListener('dragover', function(e) {
                e.preventDefault();
            });
            col.addEventListener('drop', function(e) {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (!id) return;
                fetch(`/api/tasks/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                }).then(resp => resp.json()).then(() => {
                    if (window.renderTasks) {
                        window.renderTasks();
                    }
                });
            });
        });
    }

    function handleEdit(taskId, textEl) {
        if (editingTaskId) return; // Only one edit at a time
        editingTaskId = taskId;
        const oldText = textEl.textContent;
        inputEl = document.createElement('textarea');
        inputEl.value = oldText;
        inputEl.className = 'edit-input';
        inputEl.style.width = '95%';
        inputEl.style.height = '4em';
        inputEl.style.resize = 'vertical';
        textEl.replaceWith(inputEl);
        inputEl.focus();

        function finishEdit(save) {
            if (!editingTaskId) return;
            const newText = inputEl.value;
            if (save && newText !== oldText && newText.trim() !== '') {
                fetch(`/api/tasks/${taskId}/text`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newText })
                }).then(resp => resp.json()).then(() => {
                    editingTaskId = null;
                    inputEl = null;
                    window.renderTasks();
                });
            } else {
                editingTaskId = null;
                inputEl = null;
                window.renderTasks();
            }
        }

        inputEl.addEventListener('blur', function() {
            finishEdit(true);
        });

        document.addEventListener('mousedown', function docClick(e) {
            if (inputEl && !inputEl.contains(e.target)) {
                finishEdit(true);
                document.removeEventListener('mousedown', docClick);
            }
        });

        inputEl.addEventListener('keydown', function(e) {
            // Enter inserts newline, Ctrl+Enter or Cmd+Enter saves
            if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                finishEdit(true);
            } else if (e.key === 'Escape') {
                finishEdit(false);
            }
        });
    }

    window.renderTasks = function() {
        fetch('/api/tasks').then(resp => resp.json()).then(tasks => {
            const columns = {
                'todo': document.getElementById('todo-col'),
                'in_progress': document.getElementById('inprogress-col'),
                'done': document.getElementById('done-col')
            };
            Object.values(columns).forEach(col => {
                while (col.children.length > 1) {
                    col.removeChild(col.lastChild);
                }
            });
            tasks.forEach(task => {
                const el = document.createElement('div');
                el.className = 'task';
                el.dataset.id = task.id;
                // Task text span for editing
                const textSpan = document.createElement('span');
                textSpan.className = 'task-text';
                textSpan.textContent = task.text;
                textSpan.style.cursor = 'pointer';
                textSpan.style.whiteSpace = 'pre-line'; // preserve line breaks
                textSpan.addEventListener('click', function(e) {
                    e.stopPropagation();
                    handleEdit(task.id, textSpan);
                });
                el.innerHTML = `<span class='task-id'>${task.id}</span>`;
                el.appendChild(textSpan);
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'tags';
                tagsDiv.textContent = task.tags.join(', ');
                el.appendChild(tagsDiv);
                columns[task.status].appendChild(el);
            });
            makeDraggable();
        });
    };

    setupDropZones();
    window.renderTasks();
});
