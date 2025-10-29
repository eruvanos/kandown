/**
 * File System Access API implementation for Kandown
 * Reads/writes directly to a local backlog.yaml file
 */

// Use idb-keyval for storing directory handles (loaded via CDN in index.html)
const { get: idbGet, set: idbSet, del: idbDel } = idbKeyval;

/**
 * Core File System Access API wrapper
 * Provides methods for reading/writing to local filesystem using File System Access API
 */
class FileSystemAPI {
    static fileHandle = null;
    static directoryHandle = null;
    static backlogData = null;
    
    /**
     * Try to restore a previous directory connection from IndexedDB
     * @returns {Promise<boolean>} True if connection was restored successfully
     */
    static async restoreConnection() {
        try {
            const handle = await idbGet('directory-handle');
            if (!handle) return false;
            
            // Verify we still have permission
            if (await this.verifyPermission(handle)) {
                this.directoryHandle = handle;
                await this._findBacklogFile();
                if (this.fileHandle) {
                    await this.loadBacklogData();
                    return true;
                }
            }
        } catch (err) {
            console.error('Could not restore connection:', err);
        }
        return false;
    }
    
    /**
     * Request access to a directory from the user
     * This shows a browser directory picker dialog
     * @returns {Promise<boolean>} True if directory access was granted
     */
    static async requestDirectoryAccess() {
        try {
            // Request directory access with user permission
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            // Save handle to IndexedDB for later restoration
            await idbSet('directory-handle', this.directoryHandle);
            
            // Try to find backlog.yaml in the directory
            await this._findBacklogFile();
            
            if (this.fileHandle) {
                // Read initial data
                await this.loadBacklogData();
                return true;
            }
            
            return false;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('User cancelled directory selection');
            } else {
                console.error('Error requesting directory access:', err);
            }
            return false;
        }
    }
    
    /**
     * Find or create backlog.yaml file
     * @private
     * @returns {Promise<void>}
     */
    static async _findBacklogFile() {
        try {
            this.fileHandle = await this.directoryHandle.getFileHandle('backlog.yaml', {
                create: false
            });
        } catch (e) {
            // File doesn't exist, ask user if they want to create it
            if (confirm('backlog.yaml not found. Create a new one?')) {
                this.fileHandle = await this.directoryHandle.getFileHandle('backlog.yaml', {
                    create: true
                });
                // Initialize with empty structure
                await this.writeBacklogData({
                    settings: {
                        darkmode: false,
                        random_port: false,
                        store_images_in_subfolder: false
                    },
                    tasks: []
                });
            } else {
                throw new Error('No backlog.yaml file selected');
            }
        }
    }
    
    /**
     * Disconnect from file system
     * @returns {Promise<void>}
     */
    static async disconnect() {
        this.fileHandle = null;
        this.directoryHandle = null;
        this.backlogData = null;
        await idbDel('directory-handle');
    }
    
    /**
     * Load and parse the backlog.yaml file
     * @returns {Promise<Object>} Parsed YAML data
     */
    static async loadBacklogData() {
        if (!this.fileHandle) {
            throw new Error('No file handle available');
        }
        
        try {
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            
            // Parse YAML (jsyaml loaded via CDN in index.html)
            this.backlogData = jsyaml.load(text);
            
            // Validate and provide defaults
            if (!this.backlogData || typeof this.backlogData !== 'object') {
                console.warn('Invalid YAML structure, using defaults');
                this.backlogData = { settings: {}, tasks: [] };
            }
            
            this.backlogData.settings = this.backlogData.settings ?? {};
            this.backlogData.tasks = this.backlogData.tasks ?? [];
            
            return this.backlogData;
        } catch (err) {
            console.error('Error loading backlog data:', err);
            throw new Error(`Failed to load backlog.yaml: ${err.message}`);
        }
    }
    
    /**
     * Write backlog data back to the file
     * @param {Object} data - Data to write to file
     * @returns {Promise<void>}
     */
    static async writeBacklogData(data) {
        if (!this.fileHandle) {
            throw new Error('No file handle available');
        }
        
        try {
            // Create a writable stream
            const writable = await this.fileHandle.createWritable();
            
            // Serialize to YAML
            const yamlText = jsyaml.dump(data);
            
            // Write to file
            await writable.write(yamlText);
            await writable.close();
            
            this.backlogData = data;
        } catch (err) {
            console.error('Error writing backlog data:', err);
            throw new Error(`Failed to write backlog.yaml: ${err.message}`);
        }
    }
    
    /**
     * Check if we have file system access
     * @returns {boolean} True if file handle is available
     */
    static hasAccess() {
        return this.fileHandle !== null;
    }
    
    /**
     * Verify we still have permission to access the directory
     * @param {FileSystemHandle} [handle] - Handle to verify, defaults to directoryHandle
     * @param {boolean} [readWrite=true] - Whether to check for read/write access
     * @returns {Promise<boolean>} True if permission is granted
     */
    static async verifyPermission(handle = null, readWrite = true) {
        const targetHandle = handle ?? this.directoryHandle;
        if (!targetHandle) {
            return false;
        }
        
        const options = {};
        if (readWrite) {
            options.mode = 'readwrite';
        }
        
        // Check if permission was already granted
        if ((await targetHandle.queryPermission(options)) === 'granted') {
            return true;
        }
        
        // Request permission
        if ((await targetHandle.requestPermission(options)) === 'granted') {
            return true;
        }
        
        return false;
    }
}

/**
 * TaskAPI implementation using File System Access API
 */
export class FileSystemTaskAPI {
    /**
     * Get all tasks from the backlog file
     * @returns {Promise<Array>} Array of task objects
     */
    async getTasks() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();

        // Ensure last ID counter is synchronized with loaded tasks
        this._syncLastIdCounter(data.tasks ?? []);

        return data.tasks ?? [];
    }
    
    /**
     * Synchronize the last ID counter with existing tasks
     * @private
     * @param {Array} tasks - Array of task objects
     */
    _syncLastIdCounter(tasks) {
        const LAST_ID_KEY = 'kandown_demo_last_id';
        const numericIds = tasks
            .map(task => {
                const match = task.id.match(/K[-_](\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => !Number.isNaN(num));

        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

        // Only update if the found max is higher than stored value
        const currentLastId = parseInt(localStorage.getItem(LAST_ID_KEY) ?? '0', 10);
        if (maxId > currentLastId) {
            localStorage.setItem(LAST_ID_KEY, maxId.toString());
        }
    }

    /**
     * Generate a new sequential ID
     * @private
     * @returns {string} Generated ID in format K-XXX
     */
    _generateId() {
        const LAST_ID_KEY = 'kandown_demo_last_id';

        // Get the last used ID from localStorage
        const lastId = parseInt(localStorage.getItem(LAST_ID_KEY) ?? '0', 10);

        // Increment for new task
        const newId = lastId + 1;

        // Store the new last ID
        localStorage.setItem(LAST_ID_KEY, newId.toString());

        // Format with leading zeros (e.g., K-001, K-002, ...)
        return `K-${String(newId).padStart(3, '0')}`;
    }

    /**
     * Create a new task
     * @param {string} status - Task status ('todo', 'in_progress', or 'done')
     * @param {number} [order] - Task order position
     * @returns {Promise<Object>} Created task object
     */
    async createTask(status, order) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        // Sync ID counter with existing tasks first
        this._syncLastIdCounter(data.tasks ?? []);

        // Generate unique sequential ID
        const newId = this._generateId();

        const newTask = {
            id: newId,
            text: '',
            status: status ?? 'todo',
            tags: [],
            order: order !== undefined ? order : data.tasks.filter(t => t.status === status).length,
            type: 'feature',
            created_at: new Date().toISOString()
        };
        
        data.tasks.push(newTask);
        await FileSystemAPI.writeBacklogData(data);
        
        return newTask;
    }
    
    /**
     * Update a task
     * @param {string} id - Task ID
     * @param {Object} update - Fields to update
     * @returns {Promise<Object>} Updated task object
     */
    async updateTask(id, update) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        const taskIndex = data.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            throw new Error(`Task not found: ${id}`);
        }
        
        // Update fields
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined && update[key] !== null) {
                data.tasks[taskIndex][key] = update[key];
            }
        });
        
        // Update timestamp
        data.tasks[taskIndex].updated_at = new Date().toISOString();
        
        await FileSystemAPI.writeBacklogData(data);
        return data.tasks[taskIndex];
    }
    
    /**
     * Batch update multiple tasks
     * @param {Object} updates - Object mapping task IDs to update objects
     * @returns {Promise<Array>} Array of updated tasks
     */
    async batchUpdateTasks(updates) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        const updatedTasks = [];
        
        Object.entries(updates).forEach(([id, attrs]) => {
            const taskIndex = data.tasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                Object.keys(attrs).forEach(key => {
                    if (attrs[key] !== undefined && attrs[key] !== null) {
                        data.tasks[taskIndex][key] = attrs[key];
                    }
                });
                data.tasks[taskIndex].updated_at = new Date().toISOString();
                updatedTasks.push(data.tasks[taskIndex]);
            }
        });
        
        await FileSystemAPI.writeBacklogData(data);
        return updatedTasks;
    }
    
    /**
     * Delete a task
     * @param {string} id - Task ID to delete
     * @returns {Promise<Object>} Result object with success status
     */
    async deleteTask(id) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        const initialLength = data.tasks.length;
        data.tasks = data.tasks.filter(t => t.id !== id);
        
        if (data.tasks.length === initialLength) {
            return {success: false, error: `Task not found: ${id}`};
        }
        
        await FileSystemAPI.writeBacklogData(data);
        return {success: true};
    }
    
    /**
     * Get all unique tags from tasks
     * @returns {Promise<Array<string>>} Sorted array of unique tags
     */
    async getTagSuggestions() {
        const tasks = await this.getTasks();
        const tagsSet = new Set();
        tasks.forEach(task => {
            (task.tags ?? []).forEach(tag => tagsSet.add(tag));
        });
        return Array.from(tagsSet).sort();
    }
    
    /**
     * Update task text
     * @param {string} id - Task ID
     * @param {string} text - New task text
     * @returns {Promise<Object>} Updated task object
     */
    async updateTaskText(id, text) {
        return this.updateTask(id, {text});
    }
    
    /**
     * Update task tags
     * @param {string} id - Task ID
     * @param {Array<string>} tags - New tags array
     * @returns {Promise<Object>} Updated task object
     */
    async updateTaskTags(id, tags) {
        return this.updateTask(id, {tags});
    }
}

/**
 * SettingsAPI implementation using File System Access API
 */
export class FileSystemSettingsAPI {
    constructor() {
        /** @type {Object|null} */
        this._settingsCache = null;
    }

    /**
     * Get settings from the backlog file
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        this._settingsCache = data.settings ?? {};
        return this._settingsCache;
    }
    
    /**
     * Update settings in the backlog file
     * @param {Object} update - Fields to update
     * @returns {Promise<Object>} Updated settings object
     */
    async updateSettings(update) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        data.settings = data.settings ?? {};
        Object.keys(update).forEach(key => {
            if (update[key] !== undefined) {
                data.settings[key] = update[key];
            }
        });
        
        await FileSystemAPI.writeBacklogData(data);
        this._settingsCache = data.settings;
        return data.settings;
    }
}

// Export FileSystemAPI for initialization
export { FileSystemAPI };
