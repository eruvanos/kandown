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
     * @returns {Promise<Task>}
     */
    static createTask(status) {
        return fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: '', status, tags: []})
        }).then(r => r.json());
    }

    /**
     * Fetches all tasks.
     * @returns {Promise<Task[]>}
     */
    static getTasks() {
        return fetch('/api/tasks').then(r => r.json());
    }

    /**
     * Fetches tag suggestions.
     * @returns {Promise<string[]>}
     */
    static getTagSuggestions() {
        return fetch('/api/tags/suggestions').then(r => r.json());
    }

    /**
     * Updates a task with the given id and update object.
     * @param {string} id
     * @param {Partial<Task>} update
     * @returns {Promise<Task>}
     */
    static updateTask(id, update) {
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
    static batchUpdateTasks(updates) {
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
    static deleteTask(id) {
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
        const res = await fetch('/api/settings');
        const settings = await res.json();
        SettingsAPI._settingsCache = settings;
        return settings;
    }

    /**
     * Updates settings with the given object and updates the cache.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    static async updateSettings(update) {
        const res = await fetch('/api/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(update)
        });
        const newSettings = await res.json();
        SettingsAPI._settingsCache = newSettings;
        return newSettings;
    }
}

export { TaskAPI, SettingsAPI };
