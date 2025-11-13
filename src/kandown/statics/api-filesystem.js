/**
 * File System Access API implementation for Kandown
 * Reads/writes directly to a local backlog.yaml file
 */

// Use idb-keyval for storing directory handles (loaded via CDN in index.html)
const { get: idbGet, set: idbSet, del: idbDel } = idbKeyval;

/**
 * Core File System Access API wrapper
 */
class FileSystemAPI {
    static fileHandle = null;
    static directoryHandle = null;
    static backlogData = null;

    /**
     * Initializes the API (no-op for CLI mode).
     * @returns {Promise<void>}
     */
    async init(){
        // No initialization implemented here
    }

    /**
     * Try to restore a previous directory connection from IndexedDB
     */
    static async restoreConnection() {
        try {
            const handle = await idbGet('kandown-directory-handle');
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
            console.log('Could not restore connection:', err);
        }
        return false;
    }
    
    /**
     * Request access to a directory from the user
     * This shows a browser directory picker dialog
     */
    static async requestDirectoryAccess() {
        try {
            // Request directory access with user permission
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            // Save handle to IndexedDB for later restoration
            await idbSet('kandown-directory-handle', this.directoryHandle);
            
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
     */
    static async disconnect() {
        this.fileHandle = null;
        this.directoryHandle = null;
        this.backlogData = null;
        await idbDel('kandown-directory-handle');
    }
    
    /**
     * Load and parse the backlog.yaml file
     */
    static async loadBacklogData() {
        if (!this.fileHandle) {
            await this.restoreConnection()
        }
        
        const file = await this.fileHandle.getFile();
        const text = await file.text();
        
        // Parse YAML (jsyaml loaded via CDN in index.html)
        this.backlogData = jsyaml.load(text) || { settings: {}, tasks: [] };
        return this.backlogData;
    }
    
    /**
     * Write backlog data back to the file
     */
    static async writeBacklogData(data) {
        if (!this.fileHandle) {
            await this.restoreConnection()
        }
        
        // Create a writable stream
        const writable = await this.fileHandle.createWritable();
        
        // Serialize to YAML
        const yamlText = jsyaml.dump(data);
        
        // Write to file
        await writable.write(yamlText);
        await writable.close();
        
        this.backlogData = data;
    }
    
    /**
     * Upload an image file to the .backlog folder
     * @param {string} taskId - The task ID to associate with the image
     * @param {File} file - The image file to upload
     * @returns {Promise<{filename: string, link: string}>} The filename and relative link to the image
     */
    static async uploadImage(taskId, file) {
        if (!this.directoryHandle) {
            await this.restoreConnection()
        }
        
        await this.verifyPermission();
        
        // Get or create .backlog directory
        let backlogDirHandle;
        try {
            backlogDirHandle = await this.directoryHandle.getDirectoryHandle('.backlog', {
                create: true
            });
        } catch (err) {
            throw new Error(`Failed to create/access .backlog directory: ${err.message}`);
        }
        
        // Generate unique filename
        const ext = file.type.split('/').pop() || 'png';
        const randomStr = Math.random().toString(36).substring(2, 10);
        const filename = `${taskId}_${randomStr}.${ext}`;
        
        // Create file handle
        const fileHandle = await backlogDirHandle.getFileHandle(filename, {
            create: true
        });
        
        // Write file
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        
        // Return link in /api/attachment format (will be intercepted by fetch interceptor)
        const link = `/api/attachment/${filename}`;
        
        return { filename, link };
    }
    
    /**
     * Load an image file from the .backlog folder and return as blob URL
     * @param {string} filename - The filename to load
     * @returns {Promise<string>} A blob URL for the image
     */
    static async loadImage(filename) {
        if (!this.directoryHandle) {
            await this.restoreConnection()
        }
        
        await this.verifyPermission(null, false); // Read-only permission is enough
        
        // Get .backlog directory
        let backlogDirHandle;
        try {
            backlogDirHandle = await this.directoryHandle.getDirectoryHandle('.backlog', {
                create: false
            });
        } catch (err) {
            throw new Error(`Failed to access .backlog directory: ${err.message}`);
        }
        
        // Get file handle
        const fileHandle = await backlogDirHandle.getFileHandle(filename, {
            create: false
        });
        
        // Read file
        const file = await fileHandle.getFile();
        
        // Create blob URL
        const blobUrl = URL.createObjectURL(file);
        
        return blobUrl;
    }
    
    /**
     * Verify we still have permission to access the directory
     */
    static async verifyPermission(handle = null, readWrite = true) {
        const targetHandle = handle || this.directoryHandle;
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
     * Initializes the API (no-op for CLI mode).
     * @returns {Promise<void>}
     */
    async init(){
        // No initialization implemented here
    }

    async getTasks() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();

        // Ensure last ID counter is synchronized with loaded tasks
        this._syncLastIdCounter(data.tasks || []);

        return data.tasks || [];
    }
    
    /**
     * Synchronize the last ID counter with existing tasks
     * @private
     */
    _syncLastIdCounter(tasks) {
        const LAST_ID_KEY = 'kandown_demo_last_id';
        const numericIds = tasks
            .map(task => {
                const match = task.id.match(/K[-_](\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => !isNaN(num));

        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

        // Only update if the found max is higher than stored value
        const currentLastId = parseInt(localStorage.getItem(LAST_ID_KEY) || '0', 10);
        if (maxId > currentLastId) {
            localStorage.setItem(LAST_ID_KEY, maxId.toString());
        }
    }

    /**
     * Generate a new sequential ID
     * @private
     */
    _generateId() {
        const LAST_ID_KEY = 'kandown_demo_last_id';

        // Get the last used ID from localStorage
        let lastId = parseInt(localStorage.getItem(LAST_ID_KEY) || '0', 10);

        // Increment for new task
        const newId = lastId + 1;

        // Store the new last ID
        localStorage.setItem(LAST_ID_KEY, newId.toString());

        // Format with leading zeros (e.g., K-001, K-002, ...)
        return `K-${String(newId).padStart(3, '0')}`;
    }

    async createTask(status, order) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        // Sync ID counter with existing tasks first
        this._syncLastIdCounter(data.tasks || []);

        // Generate unique sequential ID
        const newId = this._generateId();

        const newTask = {
            id: newId,
            text: '',
            status: status || 'todo',
            tags: [],
            order: order !== undefined ? order : data.tasks.filter(t => t.status === status).length,
            type: 'feature',
            created_at: new Date().toISOString()
        };
        
        data.tasks.push(newTask);
        await FileSystemAPI.writeBacklogData(data);
        
        return newTask;
    }
    
    async updateTask(id, update) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        const taskIndex = data.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            throw new Error('Task not found');
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
    
    async deleteTask(id) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        const initialLength = data.tasks.length;
        data.tasks = data.tasks.filter(t => t.id !== id);
        
        if (data.tasks.length === initialLength) {
            return {success: false, error: 'Task not found'};
        }
        
        await FileSystemAPI.writeBacklogData(data);
        return {success: true};
    }
    
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
     * Upload an image file to the .backlog folder
     * @param {string} taskId - The task ID to associate with the image
     * @param {File} file - The image file to upload
     * @returns {Promise<{filename: string, link: string}>} The filename and relative link to the image
     */
    async uploadImage(taskId, file) {
        return FileSystemAPI.uploadImage(taskId, file);
    }
    
    async loadImage(filename) {
        return FileSystemAPI.loadImage(filename);
    }
    
    async updateTaskText(id, text) {
        return this.updateTask(id, {text});
    }
    
    async updateTaskTags(id, tags) {
        return this.updateTask(id, {tags});
    }
}

/**
 * SettingsAPI implementation using File System Access API
 */
export class FileSystemSettingsAPI {
    constructor() {
        this._settingsCache = null;
    }

    async getSettings() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        this._settingsCache = data.settings || {};
        return this._settingsCache;
    }
    
    async updateSettings(update) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        data.settings = data.settings || {};
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
