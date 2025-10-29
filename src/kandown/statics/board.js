// Import dependencies
import {SettingsAPI, TaskAPI, initializeAPIs, getStorageMode} from './api.js';
import {ModalManager} from './modal-manager.js';
import {EventManager} from './event-manager.js';
import {createButton, createDiv, createElement, createInput, createSpan} from './ui-utils.js';
import {initializeApp, getServerMode} from './init.js';

/**
 * @typedef {import('./types.js').Task}
 * @typedef {import('./types.js').Columns}
 */

// --- Constants ---
const ORDER_GAP = 2;
const CONFETTI_COUNT = 80;
const CONFETTI_DURATION_FRAMES = 90;
const COLLAPSED_TITLE_MAX_LENGTH = 35;
const TAG_SUGGESTION_HIDE_DELAY = 100;
const FOCUS_DELAY = 100;

// --- State ---
let columns = {};
const doneCollapsed = {};
const eventManager = new EventManager();
let taskAPI = null;
let settingsAPI = null;

// --- Kanban Board Setup ---
if (window.marked) {
    const renderer = new marked.Renderer();
    renderer.checkbox = ({checked}) => `<input ${checked === true ? 'checked="" ' : ''} type="checkbox"/>`;
    marked.setOptions({renderer});
}

// --- Helpers ---
/**
 * Inserts text at the current cursor position in a textarea
 * @param {HTMLTextAreaElement} textarea - Target textarea
 * @param {string} text - Text to insert
 */
function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    // Set cursor position after inserted text
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

/**
 * Creates a textarea element for editing task text.
 * @param {string} value - Initial text value
 * @param {(this: HTMLTextAreaElement, ev: FocusEvent) => void} [onBlur] - Blur event handler
 * @param {(this: HTMLTextAreaElement, ev: KeyboardEvent) => void} [onKeyDown] - KeyDown event handler
 * @param {string} [taskId] - The id of the task being edited
 * @returns {HTMLTextAreaElement} The created textarea element
 */
function createTextarea(value, onBlur, onKeyDown, taskId) {
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-input';
    textarea.value = value ?? '';
    if (onBlur) textarea.addEventListener('blur', onBlur);
    if (onKeyDown) textarea.addEventListener('keydown', onKeyDown);

    textarea.addEventListener('paste', async (e) => {
        const settings = await settingsAPI.getSettings();
        const storeImagesInSubfolder = settings?.store_images_in_subfolder ?? false;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (!file) continue;

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
                            const md = `![](${data.link})`;
                            insertAtCursor(textarea, md);
                        } else {
                            console.error('Image upload failed with status:', res.status);
                            alert(`Image upload failed (${res.status}). Please try again.`);
                        }
                    } catch (err) {
                        console.error('Image upload error:', err);
                        alert(`Image upload error: ${err.message}`);
                    }
                } else {
                    // Embed image as base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        const md = `![](${base64})`;
                        insertAtCursor(textarea, md);
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
 * @param {HTMLInputElement} input - The tag input element
 * @param {Task} task - The task object
 * @param {() => string[]} getTagSuggestions - Function to get tag suggestions
 * @returns {HTMLDivElement} The suggestion box element
 */
function createTagSuggestionBox(input, task, getTagSuggestions) {
    const box = createElement('div', 'tag-suggestion-box');
    box.updateSuggestions = () => {
        const val = input.value.trim().toLowerCase();
        box.innerHTML = '';
        const tagSuggestions = getTagSuggestions();
        if (!val) {
            box.style.display = 'none';
            return;
        }
        const matches = tagSuggestions.filter(tag => 
            tag.toLowerCase().includes(val) && !(task.tags?.includes(tag) ?? false)
        );
        if (matches.length === 0) {
            box.style.display = 'none';
            return;
        }
        matches.forEach(tag => {
            const item = createElement('div', 'tag-suggestion-item');
            item.textContent = tag;
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
        }, TAG_SUGGESTION_HIDE_DELAY);
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
    document.querySelectorAll('.task').forEach((card) => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
            dragSrcId = card.dataset.id;
            dragOverIndex = null;
            dragOverCol = null;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', (e) => {
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

    document.getElementById('board').addEventListener('dragover', (e) => {
        e.preventDefault();
        removePlaceholder();
    });

    Object.entries(columns).forEach(([status, col]) => {
        if (!col) return;
        col.addEventListener('dragover', (e) => {
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
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            removePlaceholder();
            const id = dragSrcId || e.dataTransfer.getData('text/plain');
            if (!id) return;
            const tasks = Array.from(col.querySelectorAll('.task'));
            const newOrder = [];
            for (let i = 0; i < tasks.length; i++) {
                if (i === dragOverIndex) newOrder.push(id);
                if (tasks[i].dataset.id !== id) newOrder.push(tasks[i].dataset.id);
            }
            if (dragOverIndex === tasks.length) newOrder.push(id);
            // Fetch all tasks to get the original status
            taskAPI.getTasks().then(allTasks => {
                const draggedTask = allTasks.find(t => t.id === id);
                const originalStatus = draggedTask?.status ?? null;
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
    placeholderEl = createElement('div', 'task-placeholder');
    if (idx >= tasks.length) {
        col.appendChild(placeholderEl);
    } else {
        col.insertBefore(placeholderEl, tasks[idx]);
    }
}

/**
 * Updates the order and status of tasks in a column via batch update.
 * @param {string} status - The target column status
 * @param {string[]} newOrder - Array of task IDs in new order
 * @param {string} movedId - ID of the moved task
 * @param {string} originalStatus - Original status of the moved task
 * @returns {void}
 */
function updateColumnOrder(status, newOrder, movedId, originalStatus) {
    // Build batch update payload
    const payload = {};
    newOrder.forEach((id, idx) => {
        payload[id] = {order: idx * ORDER_GAP}; // Use configurable gap to allow easy insertion
    });
    // If the moved task changed columns, update its status too
    if (movedId && originalStatus && originalStatus !== status) {
        payload[movedId].status = status;
        if (status === 'done') {
            showConfetti();
        }
    }
    taskAPI.batchUpdateTasks(payload).then(() => {
        renderTasks();
    });
}


//--- Add Task ---
/**
 * Adds a new task to the board.
 * @param {string} status - The column status for the new task
 * @param {number} [order] - Optional order position
 * @returns {void}
 */
function addTask(status, order) {
    taskAPI.createTask(status, order).then(task => {
        renderTasks(() => {
            setTimeout(() => {
                const col = columns[status];
                if (!col) return;
                const tasks = col.querySelectorAll('.task');
                for (const el of tasks) {
                    if (el.dataset.id === task.id) {
                        const textarea = el.querySelector('textarea.edit-input');
                        if (textarea) textarea.focus();
                    }
                }
            }, FOCUS_DELAY);
        }, task.id);
    });
}

/**
 * Shows a confetti animation on the board when a task is completed.
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
    const confetti = Array.from({length: CONFETTI_COUNT}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * CONFETTI_COUNT,
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
        if (frame < CONFETTI_DURATION_FRAMES) {
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
    const typeBtn = createButton({
        className: 'task-type-btn',
        title: typeInfo.label,
        innerHTML: `<span class="task-type-icon">${typeInfo.icon}</span>`
    });

    const dropdown = createElement('div', 'type-dropdown');

    let openTypeDropdown = null;

    Object.entries(TASK_TYPE_MAP).forEach(([key, {icon, label}]) => {
        const option = createElement('div', 'type-option');
        option.innerHTML = `<span class="type-icon">${icon}</span> ${label}`;
        if (key === task.type) {
            option.classList.add('type-option-selected');
        }
        option.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            eventManager.removeListener('global-type-dropdown');
            openTypeDropdown = null;
            taskAPI.updateTask(task.id, {type: key}).then(() => {
                renderTasks();
            });
        };
        dropdown.appendChild(option);
    });

    typeBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';

        // Close all dropdowns and remove the global listener
        document.querySelectorAll('.type-dropdown').forEach(d => d.style.display = 'none');
        eventManager.removeListener('global-type-dropdown');
        openTypeDropdown = null;

        if (!isOpen) {
            dropdown.style.display = 'block';
            openTypeDropdown = dropdown;

            const closeHandler = (event) => {
                if (openTypeDropdown && !openTypeDropdown.contains(event.target) && event.target !== typeBtn) {
                    openTypeDropdown.style.display = 'none';
                    eventManager.removeListener('global-type-dropdown');
                    openTypeDropdown = null;
                }
            };
            eventManager.addListener(window, 'mousedown', closeHandler, 'global-type-dropdown');
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
    const headRow = createElement('div', 'task-id-row');

    const {typeBtn, dropdown} = createTypeDropdown(task);
    headRow.append(typeBtn);
    headRow.appendChild(dropdown);

    const idDiv = createElement('div', 'task-id');
    idDiv.textContent = task.id;
    headRow.append(idDiv);

    const buttonGroup = createElement('div', 'done-button-group');

    const deleteBtn = createSpan({
        className: 'delete-task-btn',
        title: 'Delete task',
        innerHTML: '&#10060;', // Red cross
        onClick: (e) => {
            e.stopPropagation();
            showDeleteModal(task.id);
        }
    });
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
                taskAPI.updateTaskText(task.id, textSpan.value).then(() => renderTasks());
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
    const arrowBtn = createSpan({
        className: 'collapse-arrow',
        text: doneCollapsed[task.id] ? '\u25B6' : '\u25BC', // ▶ or ▼
        attributes: {style: {cursor: 'pointer'}},
        onClick: (e) => {
            e.stopPropagation();
            doneCollapsed[task.id] = !doneCollapsed[task.id];
            renderTasks();
        }
    });
    buttonGroup.appendChild(arrowBtn);

    // Handle collapsed state
    if (doneCollapsed[task.id]) {
        // Show arrow, and strikethrough title in one row
        let title = 'No title';
        if (task.text?.trim()) {
            title = task.text.split('\n')[0].trim();
            if (!title) title = 'No title';
            if (title.length > COLLAPSED_TITLE_MAX_LENGTH) {
                title = title.slice(0, COLLAPSED_TITLE_MAX_LENGTH - 3) + '...';
            }
        }
        const titleDiv = createElement('div', 'collapsed-title');
        titleDiv.innerHTML = `<s>${title}</s>`;

        const rowDiv = createDiv('collapsed-row', [typeBtn, idDiv, titleDiv]);

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
    const tagsDiv = createElement('div', 'tags');

    (task.tags ?? []).forEach(tag => {
        const tagLabel = createElement('span', 'tag-label');
        tagLabel.textContent = tag;
        const removeBtn = createButton({
            className: 'remove-tag',
            text: '×',
            attributes: {type: 'button'},
            onClick: (e) => {
                e.stopPropagation();
                const newTags = (task.tags ?? []).filter(t => t !== tag);
                taskAPI.updateTaskTags(task.id, newTags).then(() => renderTasks());
            }
        });
        tagLabel.appendChild(removeBtn);
        tagsDiv.appendChild(tagLabel);
    });

    // Add tag input (only if not editing text)
    if (!el.querySelector('textarea.edit-input')) {
        let tagSuggestions = [];
        let tagInputFocused = false;
        let mouseOverCard = false;

        const addTagInput = createInput({
            type: 'text',
            className: 'add-tag-input',
            placeholder: 'Add tag...',
            onFocus: (e) => {
                tagInputFocused = true;
                el.classList.add('show-tag-input');
                taskAPI.getTagSuggestions().then(tags => {
                    tagSuggestions = tags;
                });
            },
            onBlur: (e) => {
                tagInputFocused = false;
                setTimeout(() => {
                    if (!mouseOverCard) {
                        el.classList.remove('show-tag-input');
                    }
                }, 0);
            }
        });

        const suggestionBox = createTagSuggestionBox(addTagInput, task, () => tagSuggestions);
        addTagInput.oninput = () => {
            suggestionBox.updateSuggestions();
        };

        addTagInput.onkeydown = (e) => {
            if (e.key === 'Enter' && addTagInput.value.trim()) {
                const newTag = addTagInput.value.trim();
                if ((task.tags ?? []).includes(newTag)) {
                    addTagInput.value = '';
                    suggestionBox.style.display = 'none';
                    addTagInput.focus();
                    return;
                }
                const newTags = [...(task.tags ?? []), newTag];
                taskAPI.updateTaskTags(task.id, newTags).then(() => {
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
            el.addEventListener('mouseenter', () => {
                mouseOverCard = true;
                el.classList.add('show-tag-input');
            });
            el.addEventListener('mouseleave', () => {
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
    el.addEventListener('click', (e) => {
        if (
            e.target.classList.contains('tags') ||
            e.target.tagName === 'A' ||
            e.target.classList?.contains('add-tag-input') ||
            e.target.tagName === 'INPUT' ||
            e.target.classList?.contains('collapse-arrow')
        ) return;
        if (el.querySelector('textarea.edit-input')) return;

        el.removeAttribute('draggable');
        el.ondragstart = ev => ev.preventDefault();
        const oldText = task.text;
        const textarea = createTextarea(oldText, () => {
            el.setAttribute('draggable', 'true');
            el.ondragstart = null;
            if (textarea.value.trim() !== '') {
                taskAPI.updateTaskText(task.id, textarea.value).then(() => renderTasks());
            } else {
                renderTasks();
            }
        }, (e) => {
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

    const hourglass = createSpan({
        className: 'task-hourglass',
        text: '\u23F3', // Unicode hourglass not done
        attributes: {tabIndex: '0'}
    });

    const tooltip = createElement('span', 'hourglass-tooltip');
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
    return createButton({
        className: 'add-beneath-btn',
        title: 'Add task beneath',
        innerHTML: '<span>+</span>',
        onClick: function (e) {
            e.stopPropagation();
            addTask(task.status, (task.order || 0) + 1);
        }
    });
}

/**
 * Renders all tasks to the board.
 * @param {Function} [focusCallback] - Optional callback to execute after rendering
 * @param {string} [focusTaskId] - ID of task to focus after rendering
 * @returns {void}
 */
function renderTasks(focusCallback, focusTaskId) {
    taskAPI.getTasks().then(tasks => {
        // Clean up all tracked event listeners before re-rendering
        eventManager.cleanup();

        // Sort tasks by order before rendering
        tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        Object.values(columns).forEach(col => {
            while (col.children.length > 1) col.removeChild(col.lastChild);
        });

        tasks.forEach(task => {
            const el = createElement('div', 'task', {
                dataset: {
                    id: task.id,
                    order: task.order?.toString() ?? '0'
                }
            });

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
    const modal = ModalManager.createConfirmModal(
        'Delete Task?',
        'This action cannot be undone.',
        () => {
            taskAPI.deleteTask(taskId).then(() => {
                renderTasks();
            });
        }
    );
    ModalManager.showModal(modal);
}

/**
 * Formats a date string for display.
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string (YYYY-MM-DD HH:mm)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
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
    taskAPI.getTasks().then(tasks => {
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
        taskAPI.updateTaskText(taskId, newText).then(() => {
            renderTasks();
        });
    });
}

// --- Update UI based on current storage mode (demo mode only)
async function updateDemoModeUI() {
    if (getServerMode() !== 'demo') {
        console.log('Not in demo mode, skipping demo mode UI update.');
        return;
    }

    const mode = getStorageMode()

    const banner = document.getElementById('demo-banner');
    const indicator = document.getElementById('storage-mode-indicator');
    if (!banner || !indicator) return;

    if (mode === 'filesystem') {
        console.log('Setting demo mode UI to File System');
        banner.innerHTML = '📂 File System Mode - Connected to local backlog.yaml | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.add('fs-active');
        indicator.textContent = '📂 File System';
        indicator.classList.add('filesystem');
    } else if (mode === 'localStorage') {
        console.log('Setting demo mode UI to localStorage');
        banner.innerHTML = '🎯 Demo Mode - Data stored in browser localStorage | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.remove('fs-active');
        indicator.textContent = '💾 localStorage';
        indicator.classList.remove('filesystem');
    } else {
        console.log('Unknown storage mode:', mode);
        indicator.textContent = '❓ Unknown Mode';
    }
}


// --- Main Entrypoint ---
/**
 * Initializes the Kanban board application
 * @returns {Promise<void>}
 */
async function initBoardApp() {
    // Initialize and check server availability
    await initializeApp();
    
    // Initialize the appropriate API implementations based on server mode
    await initializeAPIs();

    // Init DemoUI
    await updateDemoModeUI();
    
    // Create API instances
    taskAPI = new TaskAPI();
    settingsAPI = new SettingsAPI();
    
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
