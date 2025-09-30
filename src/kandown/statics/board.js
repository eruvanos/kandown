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

    function addTask(status) {
        const newTask = {
            text: '',
            status: status,
            tags: []
        };
        fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        })
        .then(resp => resp.json())
        .then(task => {
            window.renderTasks(() => {
                setTimeout(() => {
                    const col = document.getElementById(status === 'todo' ? 'todo-col' : status === 'in_progress' ? 'inprogress-col' : 'done-col');
                    if (!col) return;
                    const tasks = col.querySelectorAll('.task');
                    for (let el of tasks) {
                        if (el.dataset.id === task.id) {
                            const textarea = el.querySelector('textarea.edit-input');
                            if (textarea) textarea.focus();
                        }
                    }
                }, 100);
            }, task.id);
        });
    }

    document.querySelectorAll('.add-task').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const status = btn.getAttribute('data-status');
            addTask(status);
        });
    });

    // Patch renderTasks to optionally focus a new task for editing
    window.renderTasks = function(focusCallback, focusTaskId) {
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
                let textSpan;
                if (focusTaskId && task.id === focusTaskId && !task.text) {
                    textSpan = document.createElement('textarea');
                    textSpan.className = 'edit-input';
                    textSpan.value = '';
                    textSpan.style.width = '95%';
                    textSpan.style.height = '4em';
                    textSpan.style.resize = 'vertical';
                    setTimeout(() => textSpan.focus(), 100);
                    textSpan.addEventListener('blur', function() {
                        if (textSpan.value.trim() !== '') {
                            fetch(`/api/tasks/${task.id}/text`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: textSpan.value })
                            }).then(() => window.renderTasks());
                        } else {
                            window.renderTasks();
                        }
                    });
                    textSpan.addEventListener('keydown', function(e) {
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                            textSpan.blur();
                        } else if (e.key === 'Escape') {
                            window.renderTasks();
                        }
                    });
                } else {
                    textSpan = document.createElement('span');
                    textSpan.className = 'task-text';
                    if (!task.text) {
                        textSpan.textContent = 'Click to add text';
                        textSpan.style.fontStyle = 'italic';
                        textSpan.style.color = '#888';
                    } else {
                        // Render markdown using marked.js
                        if (window.marked) {
                            textSpan.innerHTML = window.marked.parse(task.text);
                        } else {
                            textSpan.textContent = task.text;
                        }
                    }
                    textSpan.style.cursor = 'pointer';
                }
                el.innerHTML = `<span class='task-id'>${task.id}</span>`;
                el.appendChild(textSpan);
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'tags';
                tagsDiv.textContent = task.tags.join(', ');
                el.appendChild(tagsDiv);
                // Make the whole card clickable for editing, except tags
                el.addEventListener('click', function(e) {
                    if (e.target.classList.contains('tags') || e.target.tagName === 'A') return;
                    // Only allow one edit at a time
                    if (el.querySelector('textarea.edit-input')) return;
                    // Disable drag while editing
                    el.removeAttribute('draggable');
                    el.ondragstart = function(ev) { ev.preventDefault(); };
                    // Replace textSpan with textarea for editing
                    const oldText = task.text;
                    const textarea = document.createElement('textarea');
                    textarea.className = 'edit-input';
                    textarea.value = oldText;
                    textarea.style.width = '95%';
                    textarea.style.height = '4em';
                    textarea.style.resize = 'vertical';
                    textSpan.replaceWith(textarea);
                    textarea.focus();
                    textarea.addEventListener('blur', function() {
                        // Restore drag after editing
                        el.setAttribute('draggable', 'true');
                        el.ondragstart = null;
                        if (textarea.value.trim() !== '') {
                            fetch(`/api/tasks/${task.id}/text`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: textarea.value })
                            }).then(() => window.renderTasks());
                        } else {
                            window.renderTasks();
                        }
                    });
                    textarea.addEventListener('keydown', function(e) {
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                            textarea.blur();
                        } else if (e.key === 'Escape') {
                            // Restore drag after editing
                            el.setAttribute('draggable', 'true');
                            el.ondragstart = null;
                            window.renderTasks();
                        }
                    });
                    textarea.addEventListener('paste', function(e) {
                        const items = e.clipboardData.items;
                        for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                                const file = items[i].getAsFile();
                                const reader = new FileReader();
                                reader.onload = function(event) {
                                    const base64 = event.target.result;
                                    const md = `![](${base64})`;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    textarea.value = textarea.value.slice(0, start) + md + textarea.value.slice(end);
                                };
                                reader.readAsDataURL(file);
                                e.preventDefault();
                                break;
                            }
                        }
                    });
                });
                columns[task.status].appendChild(el);
            });
            makeDraggable();
            if (focusCallback) focusCallback();
        });
    };

    setupDropZones();
    window.renderTasks();
});
