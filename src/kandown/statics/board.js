// Kanban Board Refactored
(function() {
    // --- State ---
    let editingTaskId = null;
    let inputEl = null;
    let columns = {};
    let doneCollapsed = {};

    // --- API ---
    const api = {
        getTasks: () => fetch('/api/tasks').then(r => r.json()),
        updateTaskStatus: (id, status) => fetch(`/api/tasks/${id}`, {
            method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status})
        }).then(r => r.json()),
        updateTaskText: (id, text) => fetch(`/api/tasks/${id}/text`, {
            method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})
        }).then(r => r.json()),
        createTask: (status) => fetch('/api/tasks', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text: '', status, tags: []})
        }).then(r => r.json()),
        getTagSuggestions: () => fetch('/api/tags/suggestions').then(r => r.json()),
        updateTaskTags: (id, tags) => fetch(`/api/tasks/${id}/tags`, {
            method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tags})
        }).then(r => r.json()),
    };

    // --- Helpers ---
    function createTextarea(value, onBlur, onKeyDown, onPaste) {
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-input';
        textarea.value = value || '';
        textarea.style.width = '95%';
        textarea.style.height = '4em';
        textarea.style.resize = 'vertical';
        if (onBlur) textarea.addEventListener('blur', onBlur);
        if (onKeyDown) textarea.addEventListener('keydown', onKeyDown);
        if (onPaste) textarea.addEventListener('paste', onPaste);
        return textarea;
    }

    function createTagSuggestionBox(input, task, tagSuggestions) {
        const box = document.createElement('div');
        box.className = 'tag-suggestion-box';
        box.style.position = 'absolute';
        box.style.border = '1px solid #ccc';
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        box.style.zIndex = '10';
        box.style.display = 'none';
        box.style.minWidth = '100px';
        box.style.maxHeight = '120px';
        box.style.overflowY = 'auto';
        input.oninput = function() {
            const val = input.value.trim().toLowerCase();
            box.innerHTML = '';
            if (!val) { box.style.display = 'none'; return; }
            const matches = tagSuggestions.filter(tag => tag.toLowerCase().includes(val) && !(task.tags || []).includes(tag));
            if (matches.length === 0) { box.style.display = 'none'; return; }
            matches.forEach(tag => {
                const item = document.createElement('div');
                item.textContent = tag;
                item.className = 'tag-suggestion-item';
                item.style.padding = '4px 8px';
                item.style.cursor = 'pointer';
                item.onmousedown = function(e) {
                    e.preventDefault();
                    input.value = tag;
                    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
                    box.style.display = 'none';
                };
                box.appendChild(item);
            });
            box.style.display = 'block';
        };
        input.onblur = function() { setTimeout(() => { box.style.display = 'none'; }, 100); };
        return box;
    }

    // --- Drag & Drop ---
    function makeDraggable() {
        document.querySelectorAll('.task').forEach(function(card) {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });
        });
    }
    function setupDropZones() {
        Object.entries(columns).forEach(([status, col]) => {
            if (!col) return; // Defensive: skip if column not found
            col.addEventListener('dragover', e => e.preventDefault());
            col.addEventListener('drop', function(e) {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (!id) return;
                api.updateTaskStatus(id, status).then(() => renderTasks());
            });
        });
    }

    // --- Editing ---
    function handleEdit(taskId, textEl) {
        if (editingTaskId) return;
        editingTaskId = taskId;
        const oldText = textEl.textContent;
        inputEl = createTextarea(oldText,
            function() { finishEdit(true); },
            function(e) {
                if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) finishEdit(true);
                else if (e.key === 'Escape') finishEdit(false);
            }
        );
        textEl.replaceWith(inputEl);
        inputEl.focus();
        function finishEdit(save) {
            if (!editingTaskId) return;
            const newText = inputEl.value;
            if (save && newText !== oldText && newText.trim() !== '') {
                api.updateTaskText(taskId, newText).then(() => {
                    editingTaskId = null;
                    inputEl = null;
                    renderTasks();
                });
            } else {
                editingTaskId = null;
                inputEl = null;
                renderTasks();
            }
        }
        document.addEventListener('mousedown', function docClick(e) {
            if (inputEl && !inputEl.contains(e.target)) {
                finishEdit(true);
                document.removeEventListener('mousedown', docClick);
            }
        });
    }

    // --- Add Task ---
    function addTask(status) {
        api.createTask(status).then(task => {
            renderTasks(() => {
                setTimeout(() => {
                    const col = columns[status];
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

    // --- Render ---
    function renderTasks(focusCallback, focusTaskId) {
        api.getTasks().then(tasks => {
            Object.values(columns).forEach(col => {
                while (col.children.length > 1) col.removeChild(col.lastChild);
            });
            tasks.forEach(task => {
                const el = document.createElement('div');
                el.className = 'task';
                el.dataset.id = task.id;
                // --- Collapsible Arrow for 'done' column ---
                let arrowBtn = null;
                if (task.status === 'done') {
                    if (typeof doneCollapsed[task.id] === 'undefined') doneCollapsed[task.id] = true;
                    arrowBtn = document.createElement('span');
                    arrowBtn.className = 'collapse-arrow';
                    arrowBtn.style.position = 'absolute';
                    arrowBtn.style.top = '8px';
                    arrowBtn.style.right = '8px';
                    arrowBtn.style.cursor = 'pointer';
                    arrowBtn.textContent = doneCollapsed[task.id] ? '\u25B6' : '\u25BC'; // ▶ or ▼
                    arrowBtn.onclick = function(e) {
                        e.stopPropagation();
                        doneCollapsed[task.id] = !doneCollapsed[task.id];
                        renderTasks();
                    };
                    el.style.position = 'relative';
                    el.appendChild(arrowBtn);
                }
                // --- Task Text ---
                let textSpan;
                if (focusTaskId && task.id === focusTaskId && !task.text) {
                    textSpan = createTextarea('', function() {
                        if (textSpan.value.trim() !== '') {
                            api.updateTaskText(task.id, textSpan.value).then(() => renderTasks());
                        } else {
                            renderTasks();
                        }
                    }, function(e) {
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) textSpan.blur();
                        else if (e.key === 'Escape') renderTasks();
                    });
                    setTimeout(() => textSpan.focus(), 100);
                } else {
                    textSpan = document.createElement('p');
                    textSpan.className = 'task-text';
                    if (!task.text) {
                        textSpan.textContent = 'Click to add text';
                        textSpan.style.fontStyle = 'italic';
                        textSpan.style.color = '#888';
                        textSpan.style.display = 'block';
                    } else {
                        if (window.marked) textSpan.innerHTML = window.marked.parse(task.text);
                        else textSpan.textContent = task.text;
                    }
                    textSpan.style.cursor = 'pointer';
                }
                // Render task id and text on separate lines
                const idDiv = document.createElement('div');
                idDiv.className = 'task-id';
                idDiv.textContent = task.id;
                // --- Collapsed logic for 'done' column ---
                if (task.status === 'done' && doneCollapsed[task.id]) {
                    // Only show id, arrow, and strikethrough title in one row
                    el.classList.add('collapsed');
                    // Title extraction
                    let title = 'No title';
                    if (task.text && task.text.trim()) {
                        title = task.text.split('\n')[0].trim();
                        if (!title) title = 'No title';
                    }
                    // Inline row for ID and title
                    const rowDiv = document.createElement('div');
                    rowDiv.style.display = 'flex';
                    rowDiv.style.alignItems = 'center';
                    rowDiv.style.gap = '8px';
                    rowDiv.appendChild(idDiv);
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'collapsed-title';
                    titleDiv.innerHTML = `<s>${title}</s>`;
                    titleDiv.style.display = 'inline-block';
                    rowDiv.appendChild(titleDiv);
                    el.appendChild(rowDiv);
                    columns[task.status].appendChild(el);
                    return;
                }
                el.appendChild(textSpan);
                // --- Tags ---
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'tags';
                (task.tags || []).forEach(tag => {
                    const tagLabel = document.createElement('span');
                    tagLabel.className = 'tag-label';
                    tagLabel.textContent = tag;
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-tag';
                    removeBtn.type = 'button';
                    removeBtn.textContent = '×';
                    removeBtn.onclick = function(e) {
                        e.stopPropagation();
                        const newTags = (task.tags || []).filter(t => t !== tag);
                        api.updateTaskTags(task.id, newTags).then(() => renderTasks());
                    };
                    tagLabel.appendChild(removeBtn);
                    tagsDiv.appendChild(tagLabel);
                });
                // Add tag input (only if not editing text)
                if (!el.querySelector('textarea.edit-input')) {
                    const addTagInput = document.createElement('input');
                    addTagInput.className = 'add-tag-input';
                    addTagInput.type = 'text';
                    addTagInput.placeholder = 'Add tag...';
                    let tagSuggestions = [];
                    addTagInput.onfocus = function(e) {
                        e.stopPropagation();
                        api.getTagSuggestions().then(tags => { tagSuggestions = tags; });
                    };
                    const suggestionBox = createTagSuggestionBox(addTagInput, task, tagSuggestions);
                    addTagInput.onkeydown = function(e) {
                        if (e.key === 'Enter' && addTagInput.value.trim()) {
                            const newTag = addTagInput.value.trim();
                            if ((task.tags || []).includes(newTag)) {
                                addTagInput.value = '';
                                suggestionBox.style.display = 'none';
                                return;
                            }
                            const newTags = [...(task.tags || []), newTag];
                            api.updateTaskTags(task.id, newTags).then(() => renderTasks());
                            addTagInput.value = '';
                            suggestionBox.style.display = 'none';
                        }
                    };
                    addTagInput.addEventListener('click', e => e.stopPropagation());
                    tagsDiv.style.position = 'relative';
                    tagsDiv.appendChild(addTagInput);
                    tagsDiv.appendChild(suggestionBox);
                }
                el.appendChild(tagsDiv);
                // --- Edit Handler ---
                el.addEventListener('click', function(e) {
                    if (
                        e.target.classList.contains('tags') ||
                        e.target.tagName === 'A' ||
                        (e.target.classList && e.target.classList.contains('add-tag-input')) ||
                        e.target.tagName === 'INPUT' ||
                        (e.target.classList && e.target.classList.contains('collapse-arrow'))
                    ) return;
                    if (el.querySelector('textarea.edit-input')) return;
                    el.removeAttribute('draggable');
                    el.ondragstart = ev => ev.preventDefault();
                    const oldText = task.text;
                    const textarea = createTextarea(oldText, function() {
                        el.setAttribute('draggable', 'true');
                        el.ondragstart = null;
                        if (textarea.value.trim() !== '') {
                            api.updateTaskText(task.id, textarea.value).then(() => renderTasks());
                        } else {
                            renderTasks();
                        }
                    }, function(e) {
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) textarea.blur();
                        else if (e.key === 'Escape') {
                            el.setAttribute('draggable', 'true');
                            el.ondragstart = null;
                            renderTasks();
                        }
                    }, function(e) {
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
                    textSpan.replaceWith(textarea);
                    textarea.focus();
                });
                columns[task.status].appendChild(el);
            });
            makeDraggable();
            if (focusCallback) focusCallback();
        });
    }

    // --- Entry Point ---
    document.addEventListener('DOMContentLoaded', function() {
        columns = {
            'todo': document.getElementById('todo-col'),
            'in_progress': document.getElementById('inprogress-col'),
            'done': document.getElementById('done-col')
        };
        setupDropZones();
        document.querySelectorAll('.add-task').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const status = btn.getAttribute('data-status');
                addTask(status);
            });
        });
        window.renderTasks = renderTasks;
        renderTasks();
    });
})();
