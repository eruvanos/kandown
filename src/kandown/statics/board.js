// Import dependencies
import {SettingsAPI, TaskAPI} from './api.js';

/**
 * @typedef {import('./types.js').Task}
 * @typedef {import('./types.js').Columns}
 */

// --- State ---
let editingTaskId = null;
let inputEl = null;
let columns = {};
let doneCollapsed = {};

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
 * @param {string} [taskId] - The id of the task being edited
 * @returns {HTMLTextAreaElement}
 */
function createTextarea(value, onBlur, onKeyDown, taskId) {
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-input';
    textarea.value = value || '';
    if (onBlur) textarea.addEventListener('blur', onBlur);
    if (onKeyDown) textarea.addEventListener('keydown', onKeyDown);

    textarea.addEventListener('paste', async (e) => {
        const settings = await SettingsAPI.getSettings()
        const storeImagesInSubfolder = settings.store_images_in_subfolder || false;

        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (storeImagesInSubfolder && taskId) {
                    // Upload image to backend
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                        const res = await fetch(`/api/tasks/${taskId}/upload`, {
                            method: 'POST',
                            body: formData
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const url = data.link;
                            const md = `![](${url})`;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            textarea.value = textarea.value.slice(0, start) + md + textarea.value.slice(end);
                        } else {
                            alert('Image upload failed.');
                        }
                    } catch (err) {
                        alert('Image upload error.');
                    }
                } else {
                    // Embed image as base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        const md = `![](${base64})`;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        textarea.value = textarea.value.slice(0, start) + md + textarea.value.slice(end);
                    };
                    reader.readAsDataURL(file);
                }
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

    document.getElementById('board').addEventListener('dragover', function (e) {
        e.preventDefault();
        removePlaceholder()
    });

    Object.entries(columns).forEach(([status, col]) => {
        if (!col) return;
        col.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
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
            TaskAPI.getTasks().then(allTasks => {
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
        payload[id] = {order: idx * 2}; // Use gaps of 2 to allow easy insertion
    });
    // If the moved task changed columns, update its status too
    if (movedId && originalStatus && originalStatus !== status) {
        payload[movedId].status = status;
        if (status === 'done') {
            showConfetti();
        }
    }
    TaskAPI.batchUpdateTasks(payload).then(() => {
        renderTasks();
    });
}


//--- Add Task ---
/**
 * Adds a new task to the board.
 * @param {string} status
 * @param {number} [order]
 * @returns {void}
 */
function addTask(status, order) {
    TaskAPI.createTask(status, order).then(task => {
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

// --- Task Rendering Helpers ---

/**
 * Type map for task types with icons and labels
 */
const TASK_TYPE_MAP = {
    chore: {icon: '⚙️', label: 'chore'},
    feature: {icon: '⭐️', label: 'feature'},
    epic: {icon: '🚀', label: 'epic'},
    bug: {icon: '🐞', label: 'bug'},
    request: {icon: '🗣️', label: 'request'},
    experiment: {icon: '🧪', label: 'experiment'},
};

/**
 * Creates a type dropdown for a task
 * @param {Object} task - The task object
 * @returns {{typeBtn: HTMLElement, dropdown: HTMLElement}} Type button and dropdown elements
 */
function createTypeDropdown(task) {
    const typeInfo = TASK_TYPE_MAP[task.type] || {icon: '', label: task.type || ''};
    const typeBtn = document.createElement('button');
    typeBtn.className = 'task-type-btn';
    typeBtn.title = typeInfo.label;
    typeBtn.innerHTML = `<span class="task-type-icon">${typeInfo.icon}</span>`;
    
    const dropdown = document.createElement('div');
    dropdown.className = 'type-dropdown';

    let openTypeDropdown = null;
    let closeTypeDropdownListener = null;
    
    Object.entries(TASK_TYPE_MAP).forEach(([key, {icon, label}]) => {
        const option = document.createElement('div');
        option.className = 'type-option';
        option.innerHTML = `<span class="type-icon">${icon}</span> ${label}`;
        if (key === task.type) {
            option.classList.add('type-option-selected');
        }
        option.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            if (closeTypeDropdownListener) {
                window.removeEventListener('mousedown', closeTypeDropdownListener);
                closeTypeDropdownListener = null;
                openTypeDropdown = null;
            }
            TaskAPI.updateTask(task.id, {type: key}).then(() => {
                renderTasks();
            });
        };
        dropdown.appendChild(option);
    });
    
    typeBtn.onclick = function (e) {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        document.querySelectorAll('.type-dropdown').forEach(d => d.style.display = 'none');
        if (closeTypeDropdownListener) {
            window.removeEventListener('mousedown', closeTypeDropdownListener);
            closeTypeDropdownListener = null;
            openTypeDropdown = null;
        }
        if (!isOpen) {
            dropdown.style.display = 'block';
            openTypeDropdown = dropdown;
            closeTypeDropdownListener = function (event) {
                if (openTypeDropdown && !openTypeDropdown.contains(event.target) && event.target !== typeBtn) {
                    openTypeDropdown.style.display = 'none';
                    window.removeEventListener('mousedown', closeTypeDropdownListener);
                    closeTypeDropdownListener = null;
                    openTypeDropdown = null;
                }
            };
            window.addEventListener('mousedown', closeTypeDropdownListener);
        } else {
            dropdown.style.display = 'none';
        }
    };
    
    return {typeBtn, dropdown};
}

/**
 * Creates the task header with type button, ID, and delete button
 * @param {Object} task - The task object
 * @returns {{headRow: HTMLElement, typeBtn: HTMLElement, idDiv: HTMLElement, buttonGroup: HTMLElement}} Header elements
 */
function createTaskHeader(task) {
    const headRow = document.createElement('div');
    headRow.className = 'task-id-row';
    
    const {typeBtn, dropdown} = createTypeDropdown(task);
    headRow.append(typeBtn);
    headRow.appendChild(dropdown);
    
    const idDiv = document.createElement('div');
    idDiv.className = 'task-id';
    idDiv.textContent = task.id;
    headRow.append(idDiv);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'done-button-group';
    
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-task-btn';
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = '&#10060;'; // Red cross
    deleteBtn.onclick = function (e) {
        e.stopPropagation();
        showDeleteModal(task.id);
    };
    buttonGroup.appendChild(deleteBtn);
    
    return {headRow, typeBtn, idDiv, buttonGroup};
}

/**
 * Creates the task text element (either textarea or rendered markdown)
 * @param {Object} task - The task object
 * @param {string} focusTaskId - ID of task to focus
 * @returns {HTMLElement} Text element
 */
function createTaskText(task, focusTaskId) {
    let textSpan;
    if (focusTaskId && task.id === focusTaskId && !task.text) {
        textSpan = createTextarea('', function () {
            if (textSpan.value.trim() !== '') {
                TaskAPI.updateTaskText(task.id, textSpan.value).then(() => renderTasks());
            } else {
                renderTasks();
            }
        }, function (e) {
            if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) textSpan.blur();
            else if (e.key === 'Escape') renderTasks();
        }, task.id);
        setTimeout(() => textSpan.focus(), 100);
    } else {
        textSpan = document.createElement('p');
        textSpan.className = 'task-text';
        if (!task.text) {
            textSpan.textContent = 'Click to add text';
            textSpan.classList.add('task-text-placeholder');
            textSpan.style.display = 'block';
        } else {
            if (window.marked) {
                textSpan.innerHTML = window.marked.parse(task.text);
                setTimeout(() => {
                    const checkboxes = textSpan.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        cb.addEventListener('click', handleCheckboxClick);
                    });
                }, 0);
            } else {
                textSpan.textContent = task.text;
            }
        }
        textSpan.style.cursor = 'pointer';
    }
    return textSpan;
}

/**
 * Creates a collapsed view for done tasks
 * @param {Object} task - The task object
 * @param {HTMLElement} el - The task element
 * @param {HTMLElement} typeBtn - Type button element
 * @param {HTMLElement} idDiv - ID div element
 * @param {HTMLElement} buttonGroup - Button group element
 * @returns {boolean} True if task is collapsed and view was created
 */
function createCollapsedView(task, el, typeBtn, idDiv, buttonGroup) {
    if (task.status !== 'done') {
        return false;
    }
    
    // Initialize collapse state if not set
    if (typeof doneCollapsed[task.id] === 'undefined') {
        doneCollapsed[task.id] = true;
    }
    
    // Create arrow button
    const arrowBtn = document.createElement('span');
    arrowBtn.className = 'collapse-arrow';
    arrowBtn.style.cursor = 'pointer';
    arrowBtn.textContent = doneCollapsed[task.id] ? '\u25B6' : '\u25BC'; // ▶ or ▼
    arrowBtn.onclick = function (e) {
        e.stopPropagation();
        doneCollapsed[task.id] = !doneCollapsed[task.id];
        renderTasks();
    };
    buttonGroup.appendChild(arrowBtn);
    
    // Handle collapsed state
    if (doneCollapsed[task.id]) {
        // Show arrow, and strikethrough title in one row
        let title = 'No title';
        if (task.text && task.text.trim()) {
            title = task.text.split('\n')[0].trim();
            if (!title) title = 'No title';
            const maxTitleLength = 35;
            if (title.length > maxTitleLength) {
                title = title.slice(0, maxTitleLength - 3) + '...';
            }
        }
        const rowDiv = document.createElement('div');
        rowDiv.className = 'collapsed-row';
        rowDiv.appendChild(typeBtn);
        rowDiv.appendChild(idDiv);
        const titleDiv = document.createElement('div');
        titleDiv.className = 'collapsed-title';
        titleDiv.innerHTML = `<s>${title}</s>`;
        rowDiv.appendChild(titleDiv);
        
        el.appendChild(rowDiv);
        return true;
    }
    
    return false;
}

/**
 * Creates the tags section with existing tags and input
 * @param {Object} task - The task object
 * @param {HTMLElement} el - The task element
 * @returns {HTMLElement} Tags div element
 */
function createTagsSection(task, el) {
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
            TaskAPI.updateTaskTags(task.id, newTags).then(() => renderTasks());
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
        
        addTagInput.onfocus = function (e) {
            tagInputFocused = true;
            el.classList.add('show-tag-input');
            TaskAPI.getTagSuggestions().then(tags => {
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
                TaskAPI.updateTaskTags(task.id, newTags).then(() => {
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
        
        // Show addTagInput only on hover for non-collapsed tasks
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
    
    return tagsDiv;
}

/**
 * Attaches the click-to-edit handler to a task element
 * @param {HTMLElement} el - The task element
 * @param {Object} task - The task object
 * @param {HTMLElement} textSpan - The text element to replace with textarea
 */
function attachTaskEditHandler(el, task, textSpan) {
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
                TaskAPI.updateTaskText(task.id, textarea.value).then(() => renderTasks());
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
        }, task.id);
        textSpan.replaceWith(textarea);
        textarea.focus();
    });
}

/**
 * Creates the hourglass icon with tooltip for a task
 * @param {Object} task - The task object
 * @param {HTMLElement} el - The task element
 */
function createTaskTooltip(task, el) {
    // Only show if not collapsed
    if (task.status === 'done' && doneCollapsed[task.id]) {
        return;
    }
    
    const hourglass = document.createElement('span');
    hourglass.className = 'task-hourglass';
    hourglass.tabIndex = 0;
    hourglass.textContent = '\u23F3'; // Unicode hourglass not done
    
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

/**
 * Creates the plus button for adding a task beneath
 * @param {Object} task - The task object
 * @returns {HTMLElement} Plus button element
 */
function createPlusButton(task) {
    const plusBtn = document.createElement('button');
    plusBtn.className = 'add-beneath-btn';
    plusBtn.title = 'Add task beneath';
    plusBtn.innerHTML = '<span>+</span>';
    plusBtn.onclick = function (e) {
        e.stopPropagation();
        addTask(task.status, (task.order || 0) + 1);
    };
    return plusBtn;
}

/**
 * Renders all tasks to the board.
 * @param {Function} [focusCallback]
 * @param {string} [focusTaskId]
 * @returns {void}
 */
function renderTasks(focusCallback, focusTaskId) {
    TaskAPI.getTasks().then(tasks => {
        // Sort tasks by order before rendering
        tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        Object.values(columns).forEach(col => {
            while (col.children.length > 1) col.removeChild(col.lastChild);
        });
        
        tasks.forEach(task => {
            const el = document.createElement('div');
            el.className = 'task';
            el.dataset.id = task.id;
            el.dataset.order = task.order.toString() || '0';
            
            // Create header with type, ID, and delete button
            const {headRow, typeBtn, idDiv, buttonGroup} = createTaskHeader(task);
            el.appendChild(buttonGroup);
            
            // Handle collapsed view for done tasks
            if (createCollapsedView(task, el, typeBtn, idDiv, buttonGroup)) {
                columns[task.status].appendChild(el);
                return;
            }
            
            // For non-collapsed tasks, show full content
            el.appendChild(headRow);
            
            // Create and append task text
            const textSpan = createTaskText(task, focusTaskId);
            el.appendChild(textSpan);
            
            // Create and append tags section
            const tagsDiv = createTagsSection(task, el);
            el.appendChild(tagsDiv);
            
            // Attach edit handler
            attachTaskEditHandler(el, task, textSpan);
            
            // Create and append tooltip
            createTaskTooltip(task, el);
            
            // Create and append plus button
            const plusBtn = createPlusButton(task);
            el.appendChild(plusBtn);
            
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
        modal.className = 'modal-overlay';
        const box = document.createElement('div');
        box.className = 'modal-box';
        box.innerHTML = '<h3>Delete Task?</h3><p>This action cannot be undone.</p>';
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-btn modal-btn-confirm';
        confirmBtn.textContent = 'Delete';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn modal-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        box.appendChild(confirmBtn);
        box.appendChild(cancelBtn);
        modal.appendChild(box);
        document.body.appendChild(modal);
        confirmBtn.onclick = function () {
            TaskAPI.deleteTask(taskId).then(() => {
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
    TaskAPI.getTasks().then(tasks => {
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
        TaskAPI.updateTaskText(taskId, newText).then(() => {
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
