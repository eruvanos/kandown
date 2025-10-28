/**
 * Demo mode API implementations
 * Supports both localStorage and File System Access API
 */

import { FileSystemAPI, FileSystemTaskAPI, FileSystemSettingsAPI } from './api-filesystem.js';

const STORAGE_KEY = 'kandown_demo_tasks';
const SETTINGS_KEY = 'kandown_demo_settings';
const LAST_ID_KEY = 'kandown_demo_last_id';

// Storage mode detection
let storageMode = 'localStorage'; // Default fallback

// Check if File System Access API is available
const hasFileSystemSupport = 'showDirectoryPicker' in window;

// Promise that resolves when storage mode is initialized
let storageModeInitialized = null;

// Try to restore previous file system connection
async function initializeStorageMode() {
    if (hasFileSystemSupport) {
        const restored = await FileSystemAPI.restoreConnection();
        if (restored) {
            storageMode = 'filesystem';
            console.log('📂 Restored file system connection');
        }
    }
}

// Initialize on load and store the promise
storageModeInitialized = initializeStorageMode();

// Export function to wait for initialization
export async function waitForStorageInit() {
    await storageModeInitialized;
}

// Export current mode getter
export function getStorageMode() {
    return storageMode;
}

// Export mode switcher
export async function switchToFileSystem() {
    if (!hasFileSystemSupport) {
        throw new Error('File System Access API not supported');
    }
    
    const success = await FileSystemAPI.requestDirectoryAccess();
    if (success) {
        storageMode = 'filesystem';
        return true;
    }
    return false;
}

export function switchToLocalStorage() {
    storageMode = 'localStorage';
    FileSystemAPI.disconnect();
}

// Generate unique IDs based on stored last ID counter
function generateId() {
    // Get the last used ID from localStorage
    let lastId = parseInt(localStorage.getItem(LAST_ID_KEY) || '0', 10);

    // Increment for new task
    const newId = lastId + 1;

    // Store the new last ID
    localStorage.setItem(LAST_ID_KEY, newId.toString());

    // Format with leading zeros (e.g., K-001, K-002, ...)
    return `K-${String(newId).padStart(3, '0')}`;
}

// Initialize the last ID counter based on existing tasks
function initializeLastIdCounter(tasks) {
    const numericIds = tasks
        .map(task => {
            const match = task.id.match(/K[-_](\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num));

    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    localStorage.setItem(LAST_ID_KEY, maxId.toString());
    return maxId;
}

// Default settings
const DEFAULT_SETTINGS = {
    random_port: false,
    store_images_in_subfolder: false
};

// Initialize with demo data if no data exists
function initializeStorage() {
    // Only initialize localStorage with demo data if we're NOT in filesystem mode
    if (storageMode === 'filesystem') {
        // Don't populate localStorage with demo data if we're using filesystem
        console.warn("prevented demo content initialization in filesystem mode");
        return;
    }

    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
        // No tasks exist, reset the counter to 0 before generating demo tasks
        localStorage.setItem(LAST_ID_KEY, '0');

        // Initialize with demo tasks
        const demoTasks = [
            {
                id: generateId(),
                text: "Welcome to Kandown Demo! 🎉\n\nThis is a demo mode running entirely in your browser. All your data is stored locally using localStorage.",
                status: "todo",
                tags: ["demo"],
                order: 0,
                type: "task"
            },
            {
                id: generateId(),
                text: "**Try dragging me** to the 'In Progress' column!\n\nYou can drag and drop tasks between columns.",
                status: "todo",
                tags: ["tutorial"],
                order: 1,
                type: "task"
            },
            {
                id: generateId(),
                text: "You can use **Markdown** formatting:\n\n- Lists\n- **Bold** and *italic*\n- [Links](https://github.com/eruvanos/kandown)\n- Images (paste from clipboard!)",
                status: "in_progress",
                tags: ["tutorial"],
                order: 0,
                type: "task"
            },
            {
                id: generateId(),
                text: "Click the ✏️ icon to edit this task or the 🗑️ to delete it.\n\nDouble-click on task text to edit inline!",
                status: "in_progress",
                tags: ["tutorial"],
                order: 1,
                type: "task"
            },
            {
                id: generateId(),
                text: "All done! ✅\n\nYour changes are automatically saved to localStorage.\n\nTo clear all data, use the settings menu (⚙️ button).",
                status: "done",
                tags: ["demo"],
                order: 0,
                type: "task"
            }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoTasks));
    } else {
        // Tasks exist, ensure last ID counter is synchronized
        const tasks = JSON.parse(existing);
        initializeLastIdCounter(tasks);
    }
    
    const existingSettings = localStorage.getItem(SETTINGS_KEY);
    if (!existingSettings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
}

// Initialize storage on load
initializeStorage();

// LocalStorage-based implementations
class LocalStorageTaskAPI {
    /**
     * Creates a new task with the given status.
     * @param {string} status
     * @param {number} order
     * @returns {Promise<Task>}
     */
    async createTask(status, order) {
        const tasks = await this.getTasks();
        const newTask = {
            id: generateId(),
            text: '',
            status: status || 'todo',
            tags: [],
            order: order !== undefined ? order : tasks.filter(t => t.status === status).length,
            type: 'feature'
        };
        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return newTask;
    }

    /**
     * Fetches all tasks.
     * @returns {Promise<Task[]>}
     */
    async getTasks() {
        const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return tasks;
    }

    /**
     * Fetches tag suggestions.
     * @returns {Promise<string[]>}
     */
    async getTagSuggestions() {
        const tasks = await this.getTasks();
        const tagsSet = new Set();
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }

    /**
     * Updates a task with the given id and update object.
     * @param {string} id
     * @param {Partial<Task>} update
     * @returns {Promise<Task>}
     */
    async updateTask(id, update) {
        const tasks = await this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }
        
        // Update task with provided fields
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined && update[key] !== null) {
                tasks[taskIndex][key] = update[key];
            }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return tasks[taskIndex];
    }

    /**
     * Updates the text of a task.
     * @param {string} id
     * @param {string} text
     * @returns {Promise<Task>}
     */
    updateTaskText(id, text) {
        return this.updateTask(id, {text});
    }

    /**
     * Updates the tags of a task.
     * @param {string} id
     * @param {string[]} tags
     * @returns {Promise<Task>}
     */
    updateTaskTags(id, tags) {
        return this.updateTask(id, {tags});
    }

    /**
     * Batch updates multiple tasks.
     * @param {{[id: string]: Partial<Task>}} updates
     * @returns {Promise<Task[]>}
     */
    async batchUpdateTasks(updates) {
        const tasks = await this.getTasks();
        const updatedTasks = [];
        
        Object.entries(updates).forEach(([id, attrs]) => {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                Object.keys(attrs).forEach(key => {
                    if (attrs[key] !== undefined && attrs[key] !== null) {
                        tasks[taskIndex][key] = attrs[key];
                    }
                });
                updatedTasks.push(tasks[taskIndex]);
            }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return updatedTasks;
    }

    /**
     * Deletes a task by id.
     * @param {string} id
     * @returns {Promise<any>}
     */
    async deleteTask(id) {
        const tasks = await this.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== id);
        if (filteredTasks.length === tasks.length) {
            return {success: false, error: 'Task not found'}; // Task not found
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
        return {success: true};
    }
}

class LocalStorageSettingsAPI {
    constructor() {
        /** @type {Settings|null} */
        this._settingsCache = null;
    }

    /**
     * Fetches all settings, using cache if available.
     * @returns {Promise<Settings>}
     */
    async getSettings() {
        if (this._settingsCache) {
            return this._settingsCache;
        }
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
        this._settingsCache = settings;
        return settings;
    }

    /**
     * Updates settings with the given object and updates the cache.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    async updateSettings(update) {
        const settings = await this.getSettings();
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined) {
                settings[key] = update[key];
            }
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        this._settingsCache = settings;
        return settings;
    }
}

// Hybrid API that routes to the appropriate backend (localStorage or filesystem)
export class TaskAPI {
    constructor() {
        this.localStorageAPI = new LocalStorageTaskAPI();
        this.fileSystemAPI = new FileSystemTaskAPI();
    }

    async getTasks() {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.getTasks();
        }
        return this.localStorageAPI.getTasks();
    }
    
    async createTask(status, order) {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.createTask(status, order);
        }
        return this.localStorageAPI.createTask(status, order);
    }
    
    async updateTask(id, update) {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.updateTask(id, update);
        }
        return this.localStorageAPI.updateTask(id, update);
    }
    
    async batchUpdateTasks(updates) {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.batchUpdateTasks(updates);
        }
        return this.localStorageAPI.batchUpdateTasks(updates);
    }
    
    async deleteTask(id) {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.deleteTask(id);
        }
        return this.localStorageAPI.deleteTask(id);
    }
    
    async getTagSuggestions() {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.getTagSuggestions();
        }
        return this.localStorageAPI.getTagSuggestions();
    }
    
    updateTaskText(id, text) {
        return this.updateTask(id, {text});
    }
    
    updateTaskTags(id, tags) {
        return this.updateTask(id, {tags});
    }
}

export class SettingsAPI {
    constructor() {
        this.localStorageAPI = new LocalStorageSettingsAPI();
        this.fileSystemAPI = new FileSystemSettingsAPI();
    }

    async getSettings() {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.getSettings();
        }
        return this.localStorageAPI.getSettings();
    }
    
    async updateSettings(update) {
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.updateSettings(update);
        }
        return this.localStorageAPI.updateSettings(update);
    }
}

// Clear all data function (for demo mode only)
export function clearAllData() {
    if (confirm('Are you sure you want to delete all tasks and settings? This cannot be undone!')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(LAST_ID_KEY);
        initializeStorage();
        window.location.reload();
    }
}

// Export function to get data for download
export function exportData() {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
    return {
        tasks,
        settings,
        exportedAt: new Date().toISOString()
    };
}

// Import data function
export function importData(data) {
    if (data.tasks) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tasks));
    }
    if (data.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }
    window.location.reload();
}

// Import from YAML file (localStorage mode only)
export async function importFromYamlFile() {
    try {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.yaml,.yml';
        
        // Wait for file selection
        const filePromise = new Promise((resolve, reject) => {
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('No file selected'));
                }
            };
            // Note: oncancel is not reliable, so we rely on the user closing the picker
            // without selecting a file, which will leave files[0] as undefined
        });
        
        // Trigger file picker
        input.click();
        
        // Wait for file selection
        const file = await filePromise;
        
        // Read file content
        const text = await file.text();
        
        // Parse YAML using jsyaml (loaded via CDN)
        const data = jsyaml.load(text);
        
        if (data === null || data === undefined) {
            throw new Error('Invalid YAML file - no data found');
        }
        
        // Confirm before importing
        const taskCount = Array.isArray(data.tasks) ? data.tasks.length : 0;
        if (!confirm(`Import ${taskCount} tasks from ${file.name}? This will replace all existing tasks.`)) {
            return false;
        }
        
        // Import the data
        importData(data);
        return true;
        
    } catch (err) {
        console.error('Import error:', err);
        alert(`Failed to import file: ${err.message}`);
        return false;
    }
}
