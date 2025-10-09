// Import dependencies
import {TaskAPI} from './api.js';

/**
 * @typedef {import('./types.js').Task}
 * @typedef {import('./types.js').Columns}
 */

// --- State ---
let editingTaskId = null;
let inputEl = null;
let columns = {};
let doneCollapsed = {};
const api = new TaskAPI();

// --- Kanban Board Setup ---
if (window.marked) {
    const renderer = new marked.Renderer();
    renderer.checkbox = ({checked}) => `<input ${checked === true ? 'checked="" ' : ''} type="checkbox"/>`;
    marked.setOptions({renderer});
}

// --- Helpers ---
/**
 * Creates a textarea element for editing task text.
 * @param {string} value
 * @param {(this: HTMLTextAreaElement, ev: FocusEvent) => void} [onBlur]
 * @param {(this: HTMLTextAreaElement, ev: KeyboardEvent) => void} [onKeyDown]
 * @returns {HTMLTextAreaElement}
 */
function createTextarea(value, onBlur, onKeyDown) {
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-input';
    textarea.value = value || '';
    textarea.style.width = '95%';
    textarea.style.height = '12em';
    textarea.style.resize = 'vertical';
    textarea.style.margin = '8px 8px';
    if (onBlur) textarea.addEventListener('blur', onBlur);
    if (onKeyDown) textarea.addEventListener('keydown', onKeyDown);
    textarea.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
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
    return textarea;
}

/**
 * Creates a tag suggestion box for tag input.
 * @param {HTMLInputElement} input
 * @param {Task} task
 * @param {() => string[]} getTagSuggestions
 * @returns {HTMLDivElement}
 */
function createTagSuggestionBox(input, task, getTagSuggestions) {
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
    box.updateSuggestions = () => {
        const val = input.value.trim().toLowerCase();
        box.innerHTML = '';
        const tagSuggestions = getTagSuggestions();
        if (!val) {
            box.style.display = 'none';
            return;
        }
        const matches = tagSuggestions.filter(tag => tag.toLowerCase().includes(val) && !(task.tags || []).includes(tag));
        if (matches.length === 0) {
            box.style.display = 'none';
            return;
        }
        matches.forEach(tag => {
            const item = document.createElement('div');
            item.textContent = tag;
            item.className = 'tag-suggestion-item';
            item.style.padding = '4px 8px';
            item.style.cursor = 'pointer';
            item.onmousedown = (e) => {
                e.preventDefault();
                input.value = tag;
                input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
                box.style.display = 'none';
            };
            box.appendChild(item);
        });
        box.style.display = 'block';
    };
    input.onblur = () => {
        setTimeout(() => {
            box.style.display = 'none';
        }, 100);
    };
    return box;
}

// --- Drag & Drop ---
let dragSrcId = null;
let dragOverIndex = null;
let dragOverCol = null;
let placeholderEl = null;

/**
 * Makes all task cards draggable and sets up drag event listeners.
 * @returns {void}
 */
function makeDraggable() {
    document.querySelectorAll('.task').forEach(function (card, idx) {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', function (e) {
            dragSrcId = card.dataset.id;
            dragOverIndex = null;
            dragOverCol = null;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', function (e) {
            dragSrcId = null;
            dragOverIndex = null;
            dragOverCol = null;
            card.classList.remove('dragging');
            removePlaceholder();
        });
    });
}

/**
 * Removes the placeholder element from the DOM.
 * @returns {void}
 */
function removePlaceholder() {
    if (placeholderEl && placeholderEl.parentNode) {
        placeholderEl.parentNode.removeChild(placeholderEl);
    }
    placeholderEl = null;
}

/**
 * Sets up drop zones for each column and handles drag-and-drop logic.
 * @returns {void}
 */
function setupDropZones() {
    Object.entries(columns).forEach(([status, col]) => {
        if (!col) return;
        col.addEventListener('dragover', function (e) {
            e.preventDefault();
            const tasks = Array.from(col.querySelectorAll('.task'));
            let insertIdx = tasks.length;
            for (let i = 0; i < tasks.length; i++) {
                const rect = tasks[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    insertIdx = i;
                    break;
                }
            }
            dragOverIndex = insertIdx;
            dragOverCol = col;
            showPlaceholder(col, insertIdx);
        });
        col.addEventListener('dragleave', function (e) {
            removePlaceholder();
        });
        col.addEventListener('drop', function (e) {
            e.preventDefault();
            removePlaceholder();
            const id = dragSrcId || e.dataTransfer.getData('text/plain');
            if (!id) return;
            const tasks = Array.from(col.querySelectorAll('.task'));
            let newOrder = [];
            for (let i = 0; i < tasks.length; i++) {
                if (i === dragOverIndex) newOrder.push(id);
                if (tasks[i].dataset.id !== id) newOrder.push(tasks[i].dataset.id);
            }
            if (dragOverIndex === tasks.length) newOrder.push(id);
            // Fetch all tasks to get the original status
            api.getTasks().then(allTasks => {
                const draggedTask = allTasks.find(t => t.id === id);
                const originalStatus = draggedTask ? draggedTask.status : null;
                updateColumnOrder(status, newOrder, id, originalStatus);
            });
        });
    });
}

/**
 * Shows a placeholder in the column at the specified index.
 * @param {HTMLElement} col
 * @param {number} idx
 * @returns {void}
 */
function showPlaceholder(col, idx) {
    removePlaceholder();
    const tasks = Array.from(col.querySelectorAll('.task'));
    placeholderEl = document.createElement('div');
    placeholderEl.className = 'task-placeholder';
    placeholderEl.style.height = '0';
    placeholderEl.style.borderTop = '3px solid #2196f3';
    placeholderEl.style.margin = '2px 0';
    placeholderEl.style.transition = 'border-color 0.2s';
    if (idx >= tasks.length) {
        col.appendChild(placeholderEl);
    } else {
        col.insertBefore(placeholderEl, tasks[idx]);
    }
}

/**
 * Updates the order and status of tasks in a column via batch update.
 * @param {string} status
 * @param {string[]} newOrder
 * @param {string} movedId
 * @param {string} originalStatus
 * @returns {void}
 */
function updateColumnOrder(status, newOrder, movedId, originalStatus) {
    // Build batch update payload
    const payload = {};
    newOrder.forEach((id, idx) => {
        payload[id] = {order: idx};
    });
    // If the moved task changed columns, update its status too
    if (movedId && originalStatus && originalStatus !== status) {
        payload[movedId].status = status;
        if (status === 'done') {
            showConfetti();
        }
    }
    api.batchUpdateTasks(payload).then(() => {
        renderTasks();
    });
}


// --- Editing ---
/**
 * Handles editing of a task's text.
 * @param {string} taskId
 * @param {HTMLElement} textEl
 * @returns {void}
 */
function handleEdit(taskId, textEl) {
    if (editingTaskId) return;
    editingTaskId = taskId;
    const oldText = textEl.textContent;
    inputEl = createTextarea(oldText,
        function () {
            finishEdit(true);
        },
        function (e) {
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

//--- Add Task ---
/**
 * Adds a new task to the board.
 * @param {string} status
 * @returns {void}
 */
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

/**
 * Shows a confetti animation on the board.
 * @returns {void}
 */
function showConfetti() {
    // Simple confetti effect using canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const confettiCount = 80;
    const confetti = Array.from({length: confettiCount}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCount,
        color: `hsl(${Math.random() * 360},100%,60%)`,
        tilt: Math.random() * 10 - 10
    }));
    let angle = 0;

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confetti.forEach(c => {
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.r, c.r / 2, c.tilt, 0, 2 * Math.PI);
            ctx.fillStyle = c.color;
            ctx.fill();
        });
        update();
    };

    const update = () => {
        angle += 0.01;
        confetti.forEach(c => {
            c.y += (Math.cos(angle + c.d) + 3 + c.r / 2) * 0.8;
            c.x += Math.sin(angle);
            c.tilt = Math.sin(angle - c.d);
        });
    };

    let frame = 0;

    const animate = () => {
        draw();
        frame++;
        if (frame < 90) {
            requestAnimationFrame(animate);
        } else {
            document.body.removeChild(canvas);
        }
    };

    animate();
}

/**
 * Renders all tasks to the board.
 * @param {Function} [focusCallback]
 * @param {string} [focusTaskId]
 * @returns {void}
 */
function renderTasks(focusCallback, focusTaskId) {
    api.getTasks().then(tasks => {
        // Sort tasks by order before rendering
        tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        Object.values(columns).forEach(col => {
            while (col.children.length > 1) col.removeChild(col.lastChild);
        });
        tasks.forEach(task => {
            const el = document.createElement('div');
            el.className = 'task';
            el.dataset.id = task.id;

            // Header row for type button, ID and delete button
            const headRow = document.createElement('div');
            headRow.className = 'task-id-row';
            headRow.style.display = 'flex';
            headRow.style.flexDirection = 'row';
            headRow.style.alignItems = 'center';

            // Type button before ID
            const typeMap = {
                chore: {icon: '⚙️', label: 'chore'},
                feature: {icon: '⭐️', label: 'feature'},
                epic: {icon: '🚀', label: 'epic'},
                request: {icon: '🗣️', label: 'request'},
                experiment: {icon: '🧪', label: 'experiment'},
            };
            const typeInfo = typeMap[task.type] || {icon: '', label: task.type || ''};
            const typeBtn = document.createElement('button');
            typeBtn.className = 'task-type-btn';
            typeBtn.title = typeInfo.label;
            typeBtn.innerHTML = `<span style="font-size:1.2em;">${typeInfo.icon}</span>`;
            typeBtn.style.marginRight = '8px';
            typeBtn.style.border = 'none';
            typeBtn.style.background = 'transparent';
            typeBtn.style.cursor = 'pointer';
            typeBtn.style.verticalAlign = 'middle';
            typeBtn.onclick = function(e) {
                e.stopPropagation();
                alert(`Task type: ${typeInfo.label}`); // For now, just show type. Can be extended for type change.
            };
            headRow.append(typeBtn);

            // --- Task ID ---
            const idDiv = document.createElement('div');
            idDiv.className = 'task-id';
            idDiv.textContent = task.id;
            idDiv.style.display = 'inline-block';
            headRow.append(idDiv);

            // --- Delete Button (now after ID) ---
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-task-btn';
            deleteBtn.title = 'Delete task';
            deleteBtn.innerHTML = '&#10060;'; // Red cross
            deleteBtn.style.marginLeft = '8px';
            deleteBtn.style.color = '#e53935';
            deleteBtn.style.fontSize = '13px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.verticalAlign = 'middle';
            deleteBtn.style.position = 'static';
            deleteBtn.style.zIndex = '20';
            deleteBtn.onclick = function (e) {
                e.stopPropagation();
                showDeleteModal(task.id);
            };
            headRow.append(deleteBtn);
            el.appendChild(headRow);
            // --- Task Text ---
            let textSpan;
            if (focusTaskId && task.id === focusTaskId && !task.text) {
                textSpan = createTextarea('', function () {
                    if (textSpan.value.trim() !== '') {
                        api.updateTaskText(task.id, textSpan.value).then(() => renderTasks());
                    } else {
                        renderTasks();
                    }
                }, function (e) {
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
                    if (window.marked) {
                        textSpan.innerHTML = window.marked.parse(task.text);

                        // Attach checkbox click handler for interactive checkboxes
                        setTimeout(() => {
                            const checkboxes = textSpan.querySelectorAll('input[type="checkbox"]');
                            checkboxes.forEach(cb => {
                                cb.addEventListener('click', handleCheckboxClick);
                            });
                        }, 0);


                    } else textSpan.textContent = task.text;
                }
                textSpan.style.cursor = 'pointer';
            }
            // --- Collapsed logic for 'done' column ---
            if (task.status === 'done' && doneCollapsed[task.id]) {
                // Only show arrow, and strikethrough title in one row
                el.classList.add('collapsed');
                // Title extraction
                let title = 'No title';
                if (task.text && task.text.trim()) {
                    title = task.text.split('\n')[0].trim();
                    if (!title) title = 'No title';
                    // Truncate long titles
                    const maxTitleLength = 35;
                    if (title.length > maxTitleLength) {
                        title = title.slice(0, maxTitleLength - 3) + '...';
                    }
                }
                // Inline row for type button, ID, and title
                const rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                rowDiv.style.alignItems = 'center';
                rowDiv.style.gap = '8px';
                rowDiv.appendChild(typeBtn);
                rowDiv.appendChild(idDiv);
                const titleDiv = document.createElement('div');
                titleDiv.className = 'collapsed-title';
                titleDiv.innerHTML = `<s>${title}</s>`;
                titleDiv.style.display = 'inline-block';
                rowDiv.appendChild(titleDiv);
                rowDiv.appendChild(deleteBtn);
                el.appendChild(rowDiv);
                columns[task.status].appendChild(el);
                return;
            }
            // For all other cards, show type button and ID at the top in the same row
            el.appendChild(headRow);
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
                removeBtn.onclick = function (e) {
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
                let tagInputFocused = false;
                let mouseOverCard = false;
                // Fetch tag suggestions immediately when input is created
                addTagInput.onfocus = function (e) {
                    tagInputFocused = true;
                    el.classList.add('show-tag-input');
                    api.getTagSuggestions().then(tags => {
                        tagSuggestions = tags;
                    });
                };
                addTagInput.onblur = function (e) {
                    tagInputFocused = false;
                    setTimeout(() => {
                        if (!mouseOverCard) {
                            el.classList.remove('show-tag-input');
                        }
                    }, 0);
                };
                const suggestionBox = createTagSuggestionBox(addTagInput, task, () => tagSuggestions);
                addTagInput.oninput = function () {
                    suggestionBox.updateSuggestions();
                };
                addTagInput.onkeydown = function (e) {
                    if (e.key === 'Enter' && addTagInput.value.trim()) {
                        const newTag = addTagInput.value.trim();
                        if ((task.tags || []).includes(newTag)) {
                            addTagInput.value = '';
                            suggestionBox.style.display = 'none';
                            addTagInput.focus();
                            return;
                        }
                        const newTags = [...(task.tags || []), newTag];
                        api.updateTaskTags(task.id, newTags).then(() => {
                            renderTasks(() => {
                                setTimeout(() => {
                                    const col = columns[task.status];
                                    if (!col) return;
                                    const el2 = col.querySelector(`[data-id='${task.id}']`);
                                    if (el2) {
                                        const input = el2.querySelector('.add-tag-input');
                                        if (input) input.focus();
                                    }
                                }, 0);
                            });
                        });
                        addTagInput.value = '';
                        suggestionBox.style.display = 'none';
                    }
                };
                addTagInput.addEventListener('click', e => e.stopPropagation());
                tagsDiv.style.position = 'relative';
                tagsDiv.appendChild(addTagInput);
                tagsDiv.appendChild(suggestionBox);
                // Show addTagInput only on hover for non-collapsed tasks, but keep visible if focused
                if (!el.classList.contains('collapsed')) {
                    el.addEventListener('mouseenter', function () {
                        mouseOverCard = true;
                        el.classList.add('show-tag-input');
                    });
                    el.addEventListener('mouseleave', function () {
                        mouseOverCard = false;
                        setTimeout(() => {
                            if (!tagInputFocused) {
                                el.classList.remove('show-tag-input');
                            }
                        }, 0);
                    });
                }
            }
            el.appendChild(tagsDiv);
            // --- Edit Handler ---
            el.addEventListener('click', function (e) {
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
                const textarea = createTextarea(oldText, function () {
                    el.setAttribute('draggable', 'true');
                    el.ondragstart = null;
                    if (textarea.value.trim() !== '') {
                        api.updateTaskText(task.id, textarea.value).then(() => renderTasks());
                    } else {
                        renderTasks();
                    }
                }, function (e) {
                    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) textarea.blur();
                    else if (e.key === 'Escape') {
                        el.setAttribute('draggable', 'true');
                        el.ondragstart = null;
                        renderTasks();
                    }
                });
                textSpan.replaceWith(textarea);
                textarea.focus();
            });

            // --- Hourglass Icon with Tooltip ---
            // Only show if not collapsed
            if (!(task.status === 'done' && doneCollapsed[task.id])) {
                // Create hourglass icon
                const hourglass = document.createElement('span');
                hourglass.className = 'task-hourglass';
                hourglass.tabIndex = 0;
                hourglass.textContent = '\u23F3'; // Unicode hourglass not done
                // Tooltip
                const tooltip = document.createElement('span');
                tooltip.className = 'hourglass-tooltip';
                let dateStr = '';
                if (task.status === 'done' && task.closed_at) {
                    dateStr = `Closed: ${formatDate(task.closed_at)}`;
                } else if (task.updated_at) {
                    dateStr = `Last updated: ${formatDate(task.updated_at)}`;
                } else {
                    dateStr = 'No date available';
                }
                tooltip.textContent = dateStr;
                // Positioning
                el.style.position = 'relative';
                hourglass.onmouseenter = () => {
                    tooltip.style.display = 'block';
                };
                hourglass.onmouseleave = () => {
                    tooltip.style.display = 'none';
                };
                hourglass.onfocus = () => {
                    tooltip.style.display = 'block';
                };
                hourglass.onblur = () => {
                    tooltip.style.display = 'none';
                };
                el.appendChild(hourglass);
                el.appendChild(tooltip);
            }

            columns[task.status].appendChild(el);
        });
        makeDraggable();
        if (focusCallback) focusCallback();
    });
}

/**
 * Shows the delete modal for a task.
 * @param {string} taskId
 * @returns {void}
 */
function showDeleteModal(taskId) {
    let modal = document.getElementById('delete-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.3)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '99999';
        const box = document.createElement('div');
        box.className = 'delete-modal-box';
        // Remove inline background, rely on CSS
        box.style.padding = '32px';
        box.style.borderRadius = '12px';
        box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
        box.style.textAlign = 'center';
        box.innerHTML = '<h3>Delete Task?</h3><p>This action cannot be undone.</p>';
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Delete';
        confirmBtn.style.background = '#e53935';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.border = 'none';
        confirmBtn.style.padding = '8px 24px';
        confirmBtn.style.margin = '16px';
        confirmBtn.style.borderRadius = '6px';
        confirmBtn.style.cursor = 'pointer';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.background = '#eee';
        cancelBtn.style.color = '#333';
        cancelBtn.style.border = 'none';
        cancelBtn.style.padding = '8px 24px';
        cancelBtn.style.margin = '16px';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.cursor = 'pointer';
        box.appendChild(confirmBtn);
        box.appendChild(cancelBtn);
        modal.appendChild(box);
        document.body.appendChild(modal);
        confirmBtn.onclick = function () {
            api.deleteTask(taskId).then(() => {
                document.body.removeChild(modal);
                renderTasks();
            });
        };
        cancelBtn.onclick = function () {
            document.body.removeChild(modal);
        };
    }
}

/**
 * Formats a date string for display.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Handles checkbox click events in markdown task text.
 * @param {MouseEvent} ev
 * @returns {void}
 */
function handleCheckboxClick(ev) {
    // Find the closest task card
    const taskEl = ev.target.closest('.task');
    if (!taskEl) return;
    const taskId = taskEl.dataset.id;
    // Find the task text element
    const textEl = taskEl.querySelector('.task-text');
    if (!textEl) return;
    // Get all checkboxes in this card
    const allCheckboxes = textEl.querySelectorAll('input[type="checkbox"]');
    const checkIndex = Array.from(allCheckboxes).findIndex(el => el === ev.target);
    if (checkIndex === -1) return;
    // Get the original markdown from the API (or store it in a data attribute)
    api.getTasks().then(tasks => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !task.text) return;
        // Split markdown into lines
        const lines = task.text.split(/\r?\n/);
        let todoIdx = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*- \[[ x]\] .*/.test(lines[i])) {
                if (todoIdx === checkIndex) {
                    // Toggle checkbox state for this line only
                    lines[i] = lines[i].includes('[ ]')
                        ? lines[i].replace('[ ]', '[x]')
                        : lines[i].replace('[x]', '[ ]');
                    break;
                }
                todoIdx++;
            }
        }
        const newText = lines.join('\n');
        api.updateTaskText(taskId, newText).then(() => {
            renderTasks();
        });
    });
}


// --- Main Entrypoint ---
function initBoardApp() {
    columns = {
        'todo': document.getElementById('todo-col'),
        'in_progress': document.getElementById('inprogress-col'),
        'done': document.getElementById('done-col')
    };
    setupDropZones();
    document.querySelectorAll('.add-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const status = btn.getAttribute('data-status');
            addTask(status);
        });
    });
    window.renderTasks = renderTasks;
    renderTasks();
}

window.addEventListener('DOMContentLoaded', initBoardApp);

