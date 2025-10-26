/**
 * @typedef {import('./types.js').Task}
 */

/**
 * @typedef {Object} Columns
 * @property {HTMLElement} todo
 * @property {HTMLElement} in_progress
 * @property {HTMLElement} done
 */

/**
 * @class TaskAPI
 * @classdesc Handles all task-related backend interactions.
 */
class TaskAPI {
    /**
     * Creates a new task with the given status.
     * @param {string} status
     * @param {number} order
     * @returns {Promise<Task>}
     */
    createTask(status, order) {
        return fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: '', status, tags: [], order: order || 0})
        }).then(r => r.json());
    }

    /**
     * Fetches all tasks.
     * @returns {Promise<Task[]>}
     */
    getTasks() {
        return fetch('/api/tasks').then(r => r.json());
    }

    /**
     * Fetches tag suggestions.
     * @returns {Promise<string[]>}
     */
    getTagSuggestions() {
        return fetch('/api/tags/suggestions').then(r => r.json());
    }

    /**
     * Updates a task with the given id and update object.
     * @param {string} id
     * @param {Partial<Task>} update
     * @returns {Promise<Task>}
     */
    updateTask(id, update) {
        return fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(update)
        }).then(r => r.json());
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
    batchUpdateTasks(updates) {
        return fetch('/api/tasks', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updates)
        }).then(r => r.json());
    }

    /**
     * Deletes a task by id.
     * @param {string} id
     * @returns {Promise<any>}
     */
    deleteTask(id) {
        return fetch(`/api/tasks/${id}`, {
            method: 'DELETE'
        }).then(r => r.json());
    }
}

/**
 * @typedef {Object} Settings
 * @property {boolean} dark_mode
 * @property {boolean} random_port
 * @property {boolean} store_images_in_subfolder
 */

/**
 * @class SettingsAPI
 * @classdesc Handles all settings-related backend interactions.
 */
class SettingsAPI {
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
            return Promise.resolve(this._settingsCache);
        }
        const res = await fetch('/api/settings');
        const settings = await res.json();
        this._settingsCache = settings;
        return settings;
    }

    /**
     * Updates settings with the given object and updates the cache.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    async updateSettings(update) {
        const res = await fetch('/api/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(update)
        });
        const newSettings = await res.json();
        this._settingsCache = newSettings;
        return newSettings;
    }
}

// Create default instances for backward compatibility
const taskAPI = new TaskAPI();
const settingsAPI = new SettingsAPI();

export { TaskAPI, SettingsAPI, taskAPI, settingsAPI };
