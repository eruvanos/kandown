// Import dependencies
import {initializeAPIFactories, SettingsAPI, TaskAPI} from './api.js';
import {ModalManager} from './modal-manager.js';
import {EventManager} from './event-manager.js';
import {createButton, createDiv, createElement, createInput, createSpan} from './ui-utils.js';
import {detectMode} from "./mode.js";
import {initSettingsUI} from "./settings.js";
import {initUIForMode} from "./ui.js";

/**
 * @typedef {import('./types.js').Task}
 * @typedef {import('./types.js').Columns}
 * @typedef {import('./types.js').ServerMode}
 */

// --- State ---
let columns = {};
let doneCollapsed = {};
const eventManager = new EventManager();
let taskAPI = null;
let settingsAPI = null;

/**
 * @type {ServerMode}
 */
let serverMode = 'unknown';
let readOnlyMode = false;

/**
 * Cached filesystem image data URLs
 *
 * @type {Map<any, any>}
 */
const filesystemImageCache = new Map();

async function initRenderers() {
    if (window.marked) {
        const renderer = new marked.Renderer();
        renderer.checkbox = ({checked}) => `<input ${checked === true ? 'checked="" ' : ''}${readOnlyMode ? ' disabled ' : ''} type="checkbox"/>`;

        // Custom image renderer for filesystem mode
        const originalImageRenderer = renderer.image.bind(renderer);
        renderer.image = ({href, title, text}) => {
            // In filesystem mode, mark images for async loading
            if (serverMode === 'page-fs' && href.includes('/api/attachment/')) {
                // Extract filename
                const match = href.match(/\/api\/attachment\/(.+)$/);
                if (match) {
                    const filename = match[1];
                    // Use a placeholder data attribute to mark for loading
                    const titleAttr = title ? ` title="${title}"` : '';
                    const altAttr = text ? ` alt="${text}"` : '';
                    return `<img src="" data-fs-image="${filename}"${titleAttr}${altAttr} class="fs-loading-image"/>`;
                }
            }
            // For all other cases, use default renderer
            return originalImageRenderer({href, title, text});
        };

        marked.setOptions({renderer});
    }
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
        console.log('Paste event detected');
        const settings = await settingsAPI.getSettings()
        const storeImagesInSubfolder = settings.store_images_in_subfolder || false;

        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (storeImagesInSubfolder && taskId) {

                    // Todo, this should be in api.js
                    if (serverMode === 'cli') {
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
                    } else if (serverMode === 'page' && getStorageMode() === 'filesystem') {
                        // Demo mode with filesystem storage: save image to filesystem
                        try {
                            const result = await taskAPI.uploadImage(taskId, file);
                            const md = `![](${result.link})`;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            textarea.value = textarea.value.slice(0, start) + md + textarea.value.slice(end);
                        } catch (err) {
                            console.error('Image upload error:', err);
                            alert('Image upload failed: ' + err.message);
                        }
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
    const box = createElement('div', 'tag-suggestion-box');
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
 * Disabled in read-only mode.
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
            taskAPI.getTasks().then(allTasks => {
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
    placeholderEl = createElement('div', 'task-placeholder');
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
    taskAPI.batchUpdateTasks(payload).then(() => {
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
    taskAPI.createTask(status, order).then(task => {
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
    divider: {icon: '➖', label: 'divider'},
};

/**
 * Creates a type dropdown for a task
 * @param {Object} task - The task object
 * @returns {{typeBtn: HTMLElement, dropdown: HTMLElement}} Type button and dropdown elements
 */
function createTypeDropdown(task) {
    const typeInfo = TASK_TYPE_MAP[task.type] || {icon: '⭐️', label: 'feature'};
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

    typeBtn.onclick = function (e) {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';

        // Close all dropdowns and remove the global listener
        document.querySelectorAll('.type-dropdown').forEach(d => d.style.display = 'none');
        eventManager.removeListener('global-type-dropdown');
        openTypeDropdown = null;

        if (!isOpen) {
            dropdown.style.display = 'block';
            openTypeDropdown = dropdown;

            const closeHandler = function (event) {
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
 * In read-only mode, hides delete button and disables type changes.
 * @param {Object} task - The task object
 * @returns {{headRow: HTMLElement, typeBtn: HTMLElement, idDiv: HTMLElement, buttonGroup: HTMLElement}} Header elements
 */
function createTaskHeader(task) {
    const headRow = createElement('div', 'task-id-row');

    const {typeBtn, dropdown} = createTypeDropdown(task);

    // Disable type changes in read-only mode
    if (readOnlyMode) {
        typeBtn.style.pointerEvents = 'none';
        typeBtn.style.cursor = 'default';
    }

    headRow.append(typeBtn);
    headRow.appendChild(dropdown);

    const idDiv = createElement('div', 'task-id');
    idDiv.textContent = task.id;
    headRow.append(idDiv);

    const buttonGroup = createElement('div', 'done-button-group');

    // Don't show delete button in read-only mode
    if (!readOnlyMode) {
        const deleteBtn = createSpan({
            className: 'delete-task-btn',
            title: 'Delete task',
            innerHTML: '&#10060;', // Red cross
            onClick: function (e) {
                e.stopPropagation();
                showDeleteModal(task.id);
            }
        });
        buttonGroup.appendChild(deleteBtn);
    }

    return {headRow, typeBtn, idDiv, buttonGroup};
}

/**
 * Process images in rendered markdown to load filesystem images as data URLs
 * This modifies the HTML after rendering to replace placeholder images with data URLs
 * @param {HTMLElement} element - The element containing rendered markdown
 * @returns {Promise<void>}
 */
async function processFilesystemImages(element) {
    const images = element.querySelectorAll('img[data-fs-image]');
    const loadPromises = [];

    for (const img of images) {
        const filename = img.getAttribute('data-fs-image');
        if (!filename) continue;

        // Load image and convert to data URL
        const loadPromise = (async () => {
            try {
                // Check cache first
                if (filesystemImageCache.has(filename)) {
                    img.setAttribute('src', filesystemImageCache.get(filename));
                    img.classList.remove('fs-loading-image');
                    return;
                }

                // Load image from filesystem and get blob
                const blobUrl = await taskAPI.loadImage(filename);

                // Fetch the blob and convert to data URL
                const response = await fetch(blobUrl);
                const blob = await response.blob();

                // Convert blob to data URL
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                // Cache the data URL
                filesystemImageCache.set(filename, dataUrl);

                // Set the image src
                img.setAttribute('src', dataUrl);
                img.classList.remove('fs-loading-image');

                // Revoke blob URL to free memory
                URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error(`Failed to load image ${filename}:`, err);
                img.classList.add('fs-error-image');
                img.classList.remove('fs-loading-image');
                // Optionally set an error placeholder
                img.setAttribute('alt', `[Image load failed: ${filename}]`);
            }
        })();

        loadPromises.push(loadPromise);
    }

    // Wait for all images to load
    await Promise.all(loadPromises);
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
                const tmp = document.createElement('div');
                tmp.innerHTML = window.marked.parse(task.text);

                // Handle checkbox clicks
                const checkboxes = tmp.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.addEventListener('click', handleCheckboxClick);
                });

                // Process filesystem images asynchronously
                if (serverMode === 'page-fs') {
                    processFilesystemImages(tmp).catch(err => {
                        console.error('Error processing filesystem images:', err);
                    }).then(() => {
                        // After images are loaded, append the content
                        while (tmp.firstChild) {
                            textSpan.appendChild(tmp.firstChild);
                        }
                    });
                } else {
                    // Directly append content if no filesystem images
                    while (tmp.firstChild) {
                        textSpan.appendChild(tmp.firstChild);
                    }
                }

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
        onClick: function (e) {
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
        if (task.text && task.text.trim()) {
            title = task.text.split('\n')[0].trim();
            if (!title) title = 'No title';
            const maxTitleLength = 35;
            if (title.length > maxTitleLength) {
                title = title.slice(0, maxTitleLength - 3) + '...';
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

    (task.tags || []).forEach(tag => {
        const tagLabel = createElement('span', 'tag-label');
        tagLabel.textContent = tag;

        // Don't show remove button in read-only mode
        if (!readOnlyMode) {
            const removeBtn = createButton({
                className: 'remove-tag',
                text: '×',
                attributes: {type: 'button'},
                onClick: function (e) {
                    e.stopPropagation();
                    const newTags = (task.tags || []).filter(t => t !== tag);
                    taskAPI.updateTaskTags(task.id, newTags).then(() => renderTasks());
                }
            });
            tagLabel.appendChild(removeBtn);
        }

        tagsDiv.appendChild(tagLabel);
    });

    // Add tag input (only if not editing text and not in read-only mode)
    if (!el.querySelector('textarea.edit-input') && !readOnlyMode) {
        let tagSuggestions = [];
        let tagInputFocused = false;
        let mouseOverCard = false;

        const addTagInput = createInput({
            type: 'text',
            className: 'add-tag-input',
            placeholder: 'Add tag...',
            onFocus: function (e) {
                tagInputFocused = true;
                el.classList.add('show-tag-input');
                taskAPI.getTagSuggestions().then(tags => {
                    tagSuggestions = tags;
                });
            },
            onBlur: function (e) {
                tagInputFocused = false;
                setTimeout(() => {
                    if (!mouseOverCard) {
                        el.classList.remove('show-tag-input');
                    }
                }, 0);
            }
        });

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
 * Disabled in read-only mode.
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
                taskAPI.updateTaskText(task.id, textarea.value).then(() => renderTasks());
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

function create_divider(el, task) {
    el.classList.add('task-divider');

    // Create single row container
    const dividerRow = createElement('div', 'divider-row');

    // Left: Type button and dropdown
    const {typeBtn, dropdown} = createTypeDropdown(task);
    if (readOnlyMode) {
        typeBtn.style.pointerEvents = 'none';
        typeBtn.style.cursor = 'default';
    }
    dividerRow.appendChild(typeBtn);
    dividerRow.appendChild(dropdown);

    // Center: Title text
    const textSpan = document.createElement('span');
    textSpan.className = 'divider-text';
    if (!task.text || task.text.trim() === '') {
        textSpan.textContent = '━━━━━━━━━━━━';
        textSpan.style.opacity = '0.7';
    } else {
        textSpan.textContent = task.text.split('\n')[0].trim();
    }

    // Make divider text editable on click (if not read-only)
    if (!readOnlyMode) {
        textSpan.style.cursor = 'pointer';
        textSpan.addEventListener('click', function (e) {
            e.stopPropagation();
            const textarea = createTextarea(task.text || '', function () {
                if (textarea.value.trim() !== task.text) {
                    taskAPI.updateTaskText(task.id, textarea.value).then(() => renderTasks());
                } else {
                    renderTasks();
                }
            }, function (e) {
                if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) textarea.blur();
                else if (e.key === 'Escape') renderTasks();
            }, task.id);
            textSpan.replaceWith(textarea);
            setTimeout(() => textarea.focus(), 10);
        });
    }
    dividerRow.appendChild(textSpan);

    // Right: Delete button
    if (!readOnlyMode) {
        const deleteBtn = createSpan({
            className: 'delete-task-btn',
            title: 'Delete divider',
            innerHTML: '&#10060;',
            onClick: function (e) {
                e.stopPropagation();
                showDeleteModal(task.id);
            }
        });
        dividerRow.appendChild(deleteBtn);
    }

    el.appendChild(dividerRow);
    columns[task.status].appendChild(el);
}

/**
 * Renders all tasks to the board.
 * @param {Function} [focusCallback]
 * @param {string} [focusTaskId]
 * @returns {void}
 */
function renderTasks(focusCallback, focusTaskId) {
    taskAPI.getTasks().then(tasks => {
        // Clean up all tracked event listeners before re-rendering
        eventManager.cleanup();

        // Sort tasks by order before rendering
        tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        Object.values(columns).forEach(col => {
            while (col.children.length > 1) col.removeChild(col.lastChild);
        });

        tasks.forEach(task => {
            const el = createElement('div', 'task', {
                dataset: {
                    id: task.id,
                    order: task.order.toString() || '0'
                }
            });

            // Special handling for divider tasks
            if (task.type === 'divider') {
                create_divider(el, task);
                return;
            }

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
            if (!readOnlyMode) {
                attachTaskEditHandler(el, task, textSpan);
            }

            // Create and append tooltip
            createTaskTooltip(task, el);

            // Create and append plus button
            if (!readOnlyMode) {
                // todo fix plus button placement and functionality
                // const plusBtn = createPlusButton(task);
                // el.appendChild(plusBtn);
            }

            columns[task.status].appendChild(el);
        });

        if (!readOnlyMode) {
            makeDraggable();
        }
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

// --- Main Entrypoint ---
async function initBoardApp() {
    // Initialize and check server availability
    // This also sets up the UI for the detected mode
    serverMode = await detectMode();
    readOnlyMode = (serverMode === 'readOnly');

    // Initialize UI for the detected server mode
    await initUIForMode(serverMode)

    // Initialize the appropriate API implementations based on server mode
    await initializeAPIFactories(serverMode);

    // init renderer
    await initRenderers()

    // Create API instances after factories are initialized
    taskAPI = new TaskAPI();
    await taskAPI.init()
    window.taskApi = taskAPI; // Expose for debugging

    settingsAPI = new SettingsAPI();
    await initSettingsUI(taskAPI, settingsAPI, serverMode);

    // Check if we're in read-only mode
    // Update UI for read-only mode
    // TODO move this to a separate function
    if (readOnlyMode) {
        console.log('📖 Read-only mode enabled - modifications disabled');
        // Hide all "Add task" buttons
        document.querySelectorAll('.add-task').forEach(btn => {
            btn.style.display = 'none';
        });

        // Disable pointer events on indicator button
        const indicator = document.getElementById('storage-mode-indicator');
        if (indicator) {
            indicator.style.pointerEvents = 'none';
            indicator.style.cursor = 'default';
        }
    }

    // Setup columns and drag-and-drop
    columns = {
        'todo': document.getElementById('todo-col'),
        'in_progress': document.getElementById('inprogress-col'),
        'done': document.getElementById('done-col')
    };
    setupDropZones();

    // Setup add task buttons
    document.querySelectorAll('.add-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const status = btn.getAttribute('data-status');
            addTask(status);
        });
    });

    renderTasks();
}

window.renderTasks = renderTasks; // Expose for debugging

// Initialize the board app once the DOM is fully loaded
if (document.readyState !== "loading") {
    setTimeout(initBoardApp, 0);
} else {
    document.addEventListener("DOMContentLoaded", initBoardApp);
}
