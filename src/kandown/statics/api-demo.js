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

// Read-only mode flag and in-memory storage for URL-loaded backlogs
let isReadOnlyMode = false;
let readOnlyTasks = null;
let readOnlySettings = null;

// Promise that resolves when storage mode is initialized
let storageModeInitialized = null;
let storageDataInitialized = null;

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
    await storageDataInitialized;
}

// Export current mode getter
export function getStorageMode() {
    return storageMode;
}

// Export read-only mode getter
export function isReadOnly() {
    return isReadOnlyMode;
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

/**
 * Check URL parameters for a backlog file to load
 * @returns {string|null} URL or path to backlog file, or null if not specified
 */
function getBacklogUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('backlog') || urlParams.get('file');
}

/**
 * Load backlog data from a URL or path
 * @param {string} url - URL or path to the YAML file
 * @returns {Promise<{tasks: Array, settings?: Object}>}
 */
async function loadBacklogFromUrl(url) {
    try {
        console.log(`Loading backlog from: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch backlog file: ${response.status} ${response.statusText}`);
        }
        
        const yamlText = await response.text();
        
        // Parse YAML (jsyaml should be loaded via CDN)
        if (typeof jsyaml === 'undefined') {
            throw new Error('js-yaml library not loaded');
        }
        
        const data = jsyaml.load(yamlText);
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid YAML format');
        }
        
        return {
            tasks: data.tasks || [],
            settings: data.settings || DEFAULT_SETTINGS
        };
    } catch (error) {
        console.error('Error loading backlog from URL:', error);
        throw error;
    }
}

// Initialize with demo data if no data exists
async function initializeStorage() {
    // Check for URL parameter to load a specific backlog file (read-only mode)
    const backlogUrl = getBacklogUrlParameter();
    
    if (backlogUrl) {
        // Enable read-only mode for URL-loaded backlogs
        isReadOnlyMode = true;
        storageMode = 'readonly';
        
        try {
            const backlogData = await loadBacklogFromUrl(backlogUrl);
            
            // Store in memory only, not in localStorage
            if (backlogData.tasks && backlogData.tasks.length > 0) {
                readOnlyTasks = backlogData.tasks;
                readOnlySettings = backlogData.settings || DEFAULT_SETTINGS;
                console.log(`✓ Loaded ${backlogData.tasks.length} tasks from ${backlogUrl} (read-only mode)`);
            } else {
                throw new Error('No tasks found in the loaded file');
            }
            
            return; // Successfully loaded from URL in read-only mode
        } catch (error) {
            console.error('Failed to load backlog from URL:', error);
            // Disable read-only mode and fall through to normal initialization
            isReadOnlyMode = false;
            storageMode = 'localStorage';
        }
    }
    
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
                text: "You can use **Markdown** formatting:\n\n- Lists\n- **Bold** and *italic*\n- [Links](https://github.com/eruvanos/kandown)\n- Images (paste from clipboard!)\n- [ ] even checkboxes!",
                status: "in_progress",
                tags: ["tutorial"],
                order: 0,
                type: "task"
            },
            {
                id: generateId(),
                text: "Click this text to edit or the ❌ to delete it.",
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

// Initialize storage on load (now async) and store the promise
storageDataInitialized = (async () => {
    await storageModeInitialized; // Wait for storage mode to be determined first
    await initializeStorage();
})();

// Read-only TaskAPI implementation (for URL-loaded backlogs)
class ReadOnlyTaskAPI {
    /**
     * Creates a new task - disabled in read-only mode
     */
    async createTask(status, order) {
        console.warn('Cannot create tasks in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }

    /**
     * Fetches all tasks from memory
     * @returns {Promise<Task[]>}
     */
    async getTasks() {
        return readOnlyTasks || [];
    }

    /**
     * Fetches tag suggestions
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
     * Updates a task - disabled in read-only mode
     */
    async updateTask(id, update) {
        console.warn('Cannot update tasks in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }

    /**
     * Updates the text of a task - disabled in read-only mode
     */
    updateTaskText(id, text) {
        console.warn('Cannot update task text in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }

    /**
     * Updates the tags of a task - disabled in read-only mode
     */
    updateTaskTags(id, tags) {
        console.warn('Cannot update task tags in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }

    /**
     * Batch updates multiple tasks - disabled in read-only mode
     */
    async batchUpdateTasks(updates) {
        console.warn('Cannot batch update tasks in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }

    /**
     * Deletes a task - disabled in read-only mode
     */
    async deleteTask(id) {
        console.warn('Cannot delete tasks in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }
}

// Read-only SettingsAPI implementation
class ReadOnlySettingsAPI {
    /**
     * Fetches all settings from memory
     * @returns {Promise<Settings>}
     */
    async getSettings() {
        return readOnlySettings || DEFAULT_SETTINGS;
    }

    /**
     * Updates settings - disabled in read-only mode
     */
    async updateSettings(update) {
        console.warn('Cannot update settings in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }
}

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

// Hybrid API that routes to the appropriate backend (localStorage, filesystem, or readonly)
export class TaskAPI {
    constructor() {
        this.localStorageAPI = new LocalStorageTaskAPI();
        this.fileSystemAPI = new FileSystemTaskAPI();
        this.readOnlyAPI = new ReadOnlyTaskAPI();
    }

    async getTasks() {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.getTasks();
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.getTasks();
        }
        return this.localStorageAPI.getTasks();
    }
    
    async createTask(status, order) {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.createTask(status, order);
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.createTask(status, order);
        }
        return this.localStorageAPI.createTask(status, order);
    }
    
    async updateTask(id, update) {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.updateTask(id, update);
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.updateTask(id, update);
        }
        return this.localStorageAPI.updateTask(id, update);
    }
    
    async batchUpdateTasks(updates) {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.batchUpdateTasks(updates);
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.batchUpdateTasks(updates);
        }
        return this.localStorageAPI.batchUpdateTasks(updates);
    }
    
    async deleteTask(id) {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.deleteTask(id);
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.deleteTask(id);
        }
        return this.localStorageAPI.deleteTask(id);
    }
    
    async getTagSuggestions() {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.getTagSuggestions();
        }
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
        this.readOnlyAPI = new ReadOnlySettingsAPI();
    }

    async getSettings() {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.getSettings();
        }
        if (storageMode === 'filesystem') {
            return this.fileSystemAPI.getSettings();
        }
        return this.localStorageAPI.getSettings();
    }
    
    async updateSettings(update) {
        if (storageMode === 'readonly') {
            return this.readOnlyAPI.updateSettings(update);
        }
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
            // without selecting a file, which will leave e.target.files[0] as undefined
        });
        
        // Trigger file picker
        input.click();
        
        // Wait for file selection
        const file = await filePromise;
        
        // Read file content
        const text = await file.text();
        
        // Parse YAML using jsyaml (loaded via CDN)
        const data = jsyaml.load(text);
        
        if (data == null) {
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
