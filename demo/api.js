/**
 * LocalStorage-based API for demo mode
 * Mimics the Flask API but stores data in browser localStorage
 */

const STORAGE_KEY = 'kandown_demo_tasks';
const SETTINGS_KEY = 'kandown_demo_settings';

// Generate unique IDs
function generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    }
    
    const existingSettings = localStorage.getItem(SETTINGS_KEY);
    if (!existingSettings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
}

// Initialize storage on load
initializeStorage();

export class TaskAPI {
    /**
     * Creates a new task with the given status.
     * @param {string} status
     * @param {number} order
     * @returns {Promise<Task>}
     */
    static async createTask(status, order) {
        const tasks = await TaskAPI.getTasks();
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
        const tasks = await TaskAPI.getTasks();
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
        const tasks = await TaskAPI.getTasks();
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
        return TaskAPI.updateTask(id, {text});
    }

    /**
     * Updates the tags of a task.
     * @param {string} id
     * @param {string[]} tags
     * @returns {Promise<Task>}
     */
    static updateTaskTags(id, tags) {
        return TaskAPI.updateTask(id, {tags});
    }

    /**
     * Batch updates multiple tasks.
     * @param {{[id: string]: Partial<Task>}} updates
     * @returns {Promise<Task[]>}
     */
    static async batchUpdateTasks(updates) {
        const tasks = await TaskAPI.getTasks();
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
        const tasks = await TaskAPI.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== id);
        if (filteredTasks.length === tasks.length) {
            return {success: false, error: 'Task not found'}; // Task not found
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
        return {success: true};
    }
}

export class SettingsAPI {
    /** @type {Settings|null} */
    static _settingsCache = null;

    /**
     * Fetches all settings, using cache if available.
     * @returns {Promise<Settings>}
     */
    static async getSettings() {
        if (SettingsAPI._settingsCache) {
            return Promise.resolve(SettingsAPI._settingsCache);
        }
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
        SettingsAPI._settingsCache = settings;
        return settings;
    }

    /**
     * Updates settings with the given object and updates the cache.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    static async updateSettings(update) {
        const settings = await SettingsAPI.getSettings();
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined) {
                settings[key] = update[key];
            }
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        SettingsAPI._settingsCache = settings;
        return settings;
    }
}

// Clear all data function
export function clearAllData() {
    if (confirm('Are you sure you want to delete all tasks and settings? This cannot be undone!')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
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
