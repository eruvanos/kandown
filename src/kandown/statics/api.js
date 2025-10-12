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
    createTask(status) {
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
 * @class SettingsAPI
 * @classdesc Handles all settings-related backend interactions.
 */
class SettingsAPI {
    /**
     * Fetches all settings.
     * @returns {Promise<Object>}
     */
    static getSettings() {
        return fetch('/api/settings').then(r => r.json());
    }

    /**
     * Updates settings with the given object.
     * @param {Object} update
     * @returns {Promise<Object>}
     */
    static updateSettings(update) {
        return fetch('/api/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(update)
        }).then(r => r.json());
    }
}

export { TaskAPI, SettingsAPI };
