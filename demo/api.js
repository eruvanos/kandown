/**
 * Hybrid API for demo mode
 * Automatically switches between File System Access API and localStorage
 */

import { FileSystemAPI, FileSystemTaskAPI, FileSystemSettingsAPI } from './api-filesystem.js';

const STORAGE_KEY = 'kandown_demo_tasks';
const SETTINGS_KEY = 'kandown_demo_settings';
const LAST_ID_KEY = 'kandown_demo_last_id';

// Storage mode detection
let storageMode = 'localStorage'; // Default fallback

// Check if File System Access API is available
const hasFileSystemSupport = 'showDirectoryPicker' in window;

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

// Initialize on load
initializeStorageMode();

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

// Default settings
const DEFAULT_SETTINGS = {
    random_port: false,
    store_images_in_subfolder: false
};

// Initialize with demo data if no data exists
function initializeStorage() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
        // No tasks exist, initialize with demo tasks
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
        const lastIdStored = localStorage.getItem(LAST_ID_KEY);
        if (!lastIdStored) {
            // Calculate the max ID from existing tasks and set it
            const tasks = JSON.parse(existing);
            const numericIds = tasks
                .map(task => {
                    const match = task.id.match(/K[-_](\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(num => !isNaN(num));

            const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
            localStorage.setItem(LAST_ID_KEY, maxId.toString());
        }
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
    static async createTask(status, order) {
        const tasks = await LocalStorageTaskAPI.getTasks();
        const newTask = {
            id: generateId(),
            text: '',
            status: status || 'todo',
            tags: [],
            order: order !== undefined ? order : tasks.filter(t => t.status === status).length,
            type: 'task'
        };
        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return newTask;
    }

    /**
     * Fetches all tasks.
     * @returns {Promise<Task[]>}
     */
    static async getTasks() {
        const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return tasks;
    }

    /**
     * Fetches tag suggestions.
     * @returns {Promise<string[]>}
     */
    static async getTagSuggestions() {
        const tasks = await LocalStorageTaskAPI.getTasks();
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
    static async updateTask(id, update) {
        const tasks = await LocalStorageTaskAPI.getTasks();
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
    static updateTaskText(id, text) {
        return LocalStorageTaskAPI.updateTask(id, {text});
    }

    /**
     * Updates the tags of a task.
     * @param {string} id
     * @param {string[]} tags
     * @returns {Promise<Task>}
     */
    static updateTaskTags(id, tags) {
        return LocalStorageTaskAPI.updateTask(id, {tags});
    }

    /**
     * Batch updates multiple tasks.
     * @param {{[id: string]: Partial<Task>}} updates
     * @returns {Promise<Task[]>}
     */
    static async batchUpdateTasks(updates) {
        const tasks = await LocalStorageTaskAPI.getTasks();
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
    static async deleteTask(id) {
        const tasks = await LocalStorageTaskAPI.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== id);
        if (filteredTasks.length === tasks.length) {
            return {success: false, error: 'Task not found'}; // Task not found
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
        return {success: true};
    }
}

class LocalStorageSettingsAPI {
    /** @type {Settings|null} */
    static _settingsCache = null;

    /**
     * Fetches all settings, using cache if available.
     * @returns {Promise<Settings>}
     */
    static async getSettings() {
        if (LocalStorageSettingsAPI._settingsCache) {
            return LocalStorageSettingsAPI._settingsCache;
        }
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
        LocalStorageSettingsAPI._settingsCache = settings;
        return settings;
    }

    /**
     * Updates settings with the given object and updates the cache.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    static async updateSettings(update) {
        const settings = await LocalStorageSettingsAPI.getSettings();
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined) {
                settings[key] = update[key];
            }
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        LocalStorageSettingsAPI._settingsCache = settings;
        return settings;
    }
}

// Hybrid API that routes to the appropriate backend
export class TaskAPI {
    static async getTasks() {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.getTasks();
        }
        return LocalStorageTaskAPI.getTasks();
    }
    
    static async createTask(status, order) {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.createTask(status, order);
        }
        return LocalStorageTaskAPI.createTask(status, order);
    }
    
    static async updateTask(id, update) {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.updateTask(id, update);
        }
        return LocalStorageTaskAPI.updateTask(id, update);
    }
    
    static async batchUpdateTasks(updates) {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.batchUpdateTasks(updates);
        }
        return LocalStorageTaskAPI.batchUpdateTasks(updates);
    }
    
    static async deleteTask(id) {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.deleteTask(id);
        }
        return LocalStorageTaskAPI.deleteTask(id);
    }
    
    static async getTagSuggestions() {
        if (storageMode === 'filesystem') {
            return FileSystemTaskAPI.getTagSuggestions();
        }
        return LocalStorageTaskAPI.getTagSuggestions();
    }
    
    static updateTaskText(id, text) {
        return TaskAPI.updateTask(id, {text});
    }
    
    static updateTaskTags(id, tags) {
        return TaskAPI.updateTask(id, {tags});
    }
}

export class SettingsAPI {
    static async getSettings() {
        if (storageMode === 'filesystem') {
            return FileSystemSettingsAPI.getSettings();
        }
        return LocalStorageSettingsAPI.getSettings();
    }
    
    static async updateSettings(update) {
        if (storageMode === 'filesystem') {
            return FileSystemSettingsAPI.updateSettings(update);
        }
        return LocalStorageSettingsAPI.updateSettings(update);
    }
}

// Clear all data function
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
