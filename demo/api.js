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
    static async all() {
        const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return tasks;
    }

    static async create(taskData) {
        const tasks = await this.all();
        const newTask = {
            id: generateId(),
            text: taskData.text || '',
            status: taskData.status || 'todo',
            tags: taskData.tags || [],
            order: taskData.order !== undefined ? taskData.order : tasks.filter(t => t.status === taskData.status).length,
            type: taskData.type || 'task'
        };
        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return newTask;
    }

    static async update(id, updates) {
        const tasks = await this.all();
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }
        
        // Update task with provided fields
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && updates[key] !== null) {
                tasks[taskIndex][key] = updates[key];
            }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return tasks[taskIndex];
    }

    static async batchUpdate(updates) {
        const tasks = await this.all();
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

    static async delete(id) {
        const tasks = await this.all();
        const filteredTasks = tasks.filter(t => t.id !== id);
        if (filteredTasks.length === tasks.length) {
            return false; // Task not found
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
        return true;
    }

    static async getTagSuggestions() {
        const tasks = await this.all();
        const tagsSet = new Set();
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }
}

export class SettingsAPI {
    static async getSettings() {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
        return settings;
    }

    static async updateSettings(updates) {
        const settings = await this.getSettings();
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                settings[key] = updates[key];
            }
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
