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
     * Try to restore a previous directory connection from IndexedDB
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
        await idbDel('directory-handle');
    }
    
    /**
     * Load and parse the backlog.yaml file
     */
    static async loadBacklogData() {
        if (!this.fileHandle) {
            throw new Error('No file handle available');
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
            throw new Error('No file handle available');
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
     * Check if we have file system access
     */
    static hasAccess() {
        return this.fileHandle !== null;
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
    static async getTasks() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        return data.tasks || [];
    }
    
    static async createTask(status, order) {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        
        // Generate unique ID (similar to server implementation)
        const taskIds = data.tasks.map(t => t.id);
        const maxId = taskIds.length > 0 
            ? Math.max(...taskIds.map(id => parseInt(id.split('-')[1]) || 0))
            : 0;
        const newId = `K-${String(maxId + 1).padStart(3, '0')}`;
        
        const newTask = {
            id: newId,
            text: '',
            status: status || 'todo',
            tags: [],
            order: order !== undefined ? order : data.tasks.filter(t => t.status === status).length,
            type: 'task',
            created_at: new Date().toISOString()
        };
        
        data.tasks.push(newTask);
        await FileSystemAPI.writeBacklogData(data);
        
        return newTask;
    }
    
    static async updateTask(id, update) {
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
    
    static async batchUpdateTasks(updates) {
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
    
    static async deleteTask(id) {
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
    
    static async getTagSuggestions() {
        const tasks = await this.getTasks();
        const tagsSet = new Set();
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }
    
    static async updateTaskText(id, text) {
        return this.updateTask(id, {text});
    }
    
    static async updateTaskTags(id, tags) {
        return this.updateTask(id, {tags});
    }
}

/**
 * SettingsAPI implementation using File System Access API
 */
export class FileSystemSettingsAPI {
    static _settingsCache = null;
    
    static async getSettings() {
        await FileSystemAPI.verifyPermission();
        const data = await FileSystemAPI.loadBacklogData();
        this._settingsCache = data.settings || {};
        return this._settingsCache;
    }
    
    static async updateSettings(update) {
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
