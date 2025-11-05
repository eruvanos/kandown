// Read-only TaskAPI implementation (for URL-loaded backlogs)
class ReadOnlyTaskAPI {
    #readOnlyTasks = null;
    #readOnlySettings = null;

    async init() {
        const {tasks, settings} = await loadBacklogFromUrl(getBacklogUrlParameter())

        this.#readOnlyTasks = tasks;
        this.#readOnlySettings = settings;
        console.log('Backlog loaded in read-only mode:', this.#readOnlyTasks.length, 'tasks');
    }

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
        return this.#readOnlyTasks || [];
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
        return {};
    }

    /**
     * Updates settings - disabled in read-only mode
     */
    async updateSettings(update) {
        console.warn('Cannot update settings in read-only mode');
        throw new Error('Read-only mode: modifications not allowed');
    }
}

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
            tasks: data.tasks || [], settings: data.settings || {}
        };
    } catch (error) {
        console.error('Error loading backlog from URL:', error);
        throw error;
    }
}

export {ReadOnlySettingsAPI};
export {ReadOnlyTaskAPI};