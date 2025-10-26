# Hybrid Demo/File System Mode - Implementation Guide

## Overview

This document outlines the steps required to enhance the **Demo Mode** for Kandown by adding optional **File System Access API** support. The implementation uses a hybrid approach:

- **Primary:** File System Access API for reading/writing local `backlog.yaml` files (Chrome/Edge only)
- **Fallback:** localStorage-based demo mode when file access is unavailable or declined

This provides the best of both worlds: users with compatible browsers can work with real files, while all users can still use the demo with localStorage.

## Background

The File System Access API is a web API that allows web applications to read and write files on the user's local file system with explicit user permission. By combining this with the existing demo mode, we create a progressive enhancement:

1. On page load, check for File System Access API support
2. If supported, offer the user the option to connect a local folder
3. If declined or unsupported, fall back to localStorage demo mode
4. Users can switch between modes at any time

### Unified Demo Mode Features

**With File System Access (Chrome/Edge):**
- Read and write to a local `backlog.yaml` file
- Store images in a local `.backlog/` folder
- True file system integration
- Changes persist to actual files

**Without File System Access (all browsers):**
- Store tasks in localStorage
- Embed images as base64
- Works in all modern browsers
- Data persists in browser storage

## Browser Compatibility

The hybrid approach ensures the demo works in all browsers, with enhanced features in Chromium-based browsers:

| Browser | Demo Mode (localStorage) | File System Access |
|---------|-------------------------|-------------------|
| Chrome/Edge | ✅ Yes | ✅ Yes (optional) |
| Firefox | ✅ Yes | ❌ No (falls back to demo) |
| Safari | ✅ Yes | ❌ No (falls back to demo) |
| Opera | ✅ Yes | ✅ Yes (optional) |

**Key Points:**
- All users can use the demo with localStorage
- Chrome/Edge users get the option to use real files
- Graceful degradation ensures no one is locked out
- Users can switch between modes (localStorage ↔ file system)

**Reference:** [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)


## Implementation Steps

### 1. Project Structure

Enhance the existing demo directory with file system capabilities:

```
kandown/
├── demo/                    # Enhanced demo mode
│   ├── index.html          # Entry point with mode selector
│   ├── api.js              # Hybrid API (localStorage + file system)
│   ├── api-filesystem.js   # File System Access API wrapper
│   ├── yaml-handler.js     # YAML parsing/serialization
│   ├── settings-demo.js    # Settings with mode switcher
│   ├── board.js            # Existing board logic (reused)
│   ├── board.css           # Existing styles (reused)
│   ├── modal-manager.js    # Existing modal logic (reused)
│   ├── event-manager.js    # Existing event logic (reused)
│   └── README.md           # Documentation
└── scripts/
    └── build_demo.py       # Updated build script
```

**Key Changes:**
- Add `api-filesystem.js` for File System Access API
- Add `yaml-handler.js` for YAML parsing
- Update `api.js` to detect and route between storage modes
- Update `index.html` to show mode selector
- Update `settings-demo.js` to include mode switching

### 2. Hybrid API Implementation (`api.js`)

Update the existing `demo/api.js` to detect and route between storage modes:

```javascript
/**
 * Hybrid API for demo mode
 * Automatically switches between File System Access API and localStorage
 */

import { FileSystemAPI, FileSystemTaskAPI, FileSystemSettingsAPI } from './api-filesystem.js';

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

// ... existing localStorage implementation ...
const STORAGE_KEY = 'kandown_demo_tasks';
const SETTINGS_KEY = 'kandown_demo_settings';

// LocalStorage implementations
class LocalStorageTaskAPI {
    static async getTasks() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }
    
    static async createTask(status, order) {
        // ... existing implementation ...
    }
    
    // ... rest of existing methods ...
}

class LocalStorageSettingsAPI {
    static async getSettings() {
        // ... existing implementation ...
    }
    
    static async updateSettings(update) {
        // ... existing implementation ...
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
```

### 3. File System API Implementation (`api-filesystem.js`)

Create a File System Access API wrapper that matches the TaskAPI interface:

```javascript
/**
 * File System Access API implementation for Kandown
 * Reads/writes directly to a local backlog.yaml file
 */

/**
 * File System Access API implementation for Kandown
 * Reads/writes directly to a local backlog.yaml file
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

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
        
        // Parse YAML (requires js-yaml library)
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
    static fileHandle = null;
    static directoryHandle = null;
    static backlogData = null;
    
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
            
            // Try to find backlog.yaml in the directory
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
            
            // Read initial data
            await this.loadBacklogData();
            return true;
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
     * Load and parse the backlog.yaml file
     */
    static async loadBacklogData() {
        if (!this.fileHandle) {
            throw new Error('No file handle available');
        }
        
        const file = await this.fileHandle.getFile();
        const text = await file.text();
        
        // Parse YAML (you'll need a YAML library like js-yaml)
        this.backlogData = YAML.parse(text);
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
        const yamlText = YAML.stringify(data);
        
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
     * Verify we still have permission to access the file
     */
    static async verifyPermission(readWrite = true) {
        if (!this.fileHandle) {
            return false;
        }
        
        const options = {};
        if (readWrite) {
            options.mode = 'readwrite';
        }
        
        // Check if permission was already granted
        if ((await this.fileHandle.queryPermission(options)) === 'granted') {
            return true;
        }
        
        // Request permission
        if ((await this.fileHandle.requestPermission(options)) === 'granted') {
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
```

### 4. YAML Handler

You'll need a JavaScript YAML library. The most popular option is `js-yaml`:

```html
<!-- In index.html -->
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
```

Or use a bundler to include it:

```bash
npm install js-yaml
```

### 5. HTML Entry Point (`index.html`)

Update the existing `demo/index.html` to support both modes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kandown Demo - Kanban Board</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/idb-keyval@6.2.1/dist/umd.js"></script>
  <script type="module" src="./board.js"></script>
  <script type="module" src="./settings-demo.js"></script>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="stylesheet" href="./board.css">
  <style>
    .demo-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .demo-banner.fs-active {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    .demo-banner a {
      color: #fff;
      text-decoration: underline;
      font-weight: 600;
    }
    .storage-mode-indicator {
      position: fixed;
      top: 60px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9em;
      z-index: 1000;
    }
    .storage-mode-indicator.filesystem {
      background: rgba(17, 153, 142, 0.9);
    }
  </style>
</head>
<body>
<div id="demo-banner" class="demo-banner">
  🎯 Demo Mode - Data stored in browser localStorage | 
  <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>
</div>

<div id="storage-mode-indicator" class="storage-mode-indicator">
  💾 localStorage
</div>

<div class="main-content">
  <h1 style="text-align:center;">Kanban Board</h1>
  <div id="board" class="board">
    <div class="column" id="todo-col">
      <h2>📝 To Do <span class="add-task" data-status="todo" title="Add task">&#x2795;</span></h2>
    </div>
    <div class="column" id="inprogress-col">
      <h2>⏳ In Progress <span class="add-task" data-status="in_progress" title="Add task">&#x2795;</span></h2>
    </div>
    <div class="column" id="done-col">
      <h2>✅ Done <span class="add-task" data-status="done" title="Add task">&#x2795;</span></h2>
    </div>
  </div>
</div>

<!-- Rest of UI components same as existing demo/index.html -->

<script type="module">
  import { getStorageMode, switchToFileSystem, switchToLocalStorage } from './api.js';
  
  // Update UI based on current storage mode
  function updateModeUI() {
    const mode = getStorageMode();
    const banner = document.getElementById('demo-banner');
    const indicator = document.getElementById('storage-mode-indicator');
    
    if (mode === 'filesystem') {
      banner.textContent = '📂 File System Mode - Connected to local backlog.yaml | ';
      banner.classList.add('fs-active');
      indicator.textContent = '📂 File System';
      indicator.classList.add('filesystem');
    } else {
      banner.textContent = '🎯 Demo Mode - Data stored in browser localStorage | ';
      banner.classList.remove('fs-active');
      indicator.textContent = '💾 localStorage';
      indicator.classList.remove('filesystem');
    }
    
    // Add GitHub link
    const link = document.createElement('a');
    link.href = 'https://github.com/eruvanos/kandown';
    link.target = '_blank';
    link.textContent = 'View on GitHub';
    banner.appendChild(link);
  }
  
  // Update on load
  setTimeout(updateModeUI, 100);
</script>

</body>
</html>
```

### 6. Settings UI Modifications

Update `settings-demo.js` to include mode switching:

```javascript
import { getStorageMode, switchToFileSystem, switchToLocalStorage } from './api.js';
import { SettingsAPI } from './api.js';

// Add storage mode section to settings
function addStorageModeSettings() {
    const settingsContent = document.querySelector('.modal-content');
    
    // Create storage mode section
    const storageModeSection = document.createElement('div');
    storageModeSection.className = 'settings-section';
    storageModeSection.innerHTML = `
        <h3>Storage Mode</h3>
        <div class="storage-mode-info">
            <p>Current mode: <strong id="current-mode">${getStorageMode()}</strong></p>
        </div>
        <div class="storage-mode-buttons">
            <button id="switch-to-filesystem" class="btn-mode">
                📂 Use File System (Chrome/Edge only)
            </button>
            <button id="switch-to-localstorage" class="btn-mode">
                💾 Use localStorage (All browsers)
            </button>
        </div>
    `;
    
    // Insert before existing settings
    settingsContent.insertBefore(storageModeSection, settingsContent.firstChild);
    
    // Add event listeners
    document.getElementById('switch-to-filesystem').addEventListener('click', async () => {
        try {
            const success = await switchToFileSystem();
            if (success) {
                alert('Switched to file system mode. The page will reload.');
                window.location.reload();
            } else {
                alert('Failed to access file system. Make sure you selected a valid folder.');
            }
        } catch (err) {
            alert('Your browser does not support the File System Access API. Use Chrome or Edge.');
        }
    });
    
    document.getElementById('switch-to-localstorage').addEventListener('click', () => {
        if (confirm('Switch to localStorage mode? Your file system data will remain unchanged.')) {
            switchToLocalStorage();
            alert('Switched to localStorage mode. The page will reload.');
            window.location.reload();
        }
    });
    
    // Update button states
    updateModeButtons();
}

function updateModeButtons() {
    const mode = getStorageMode();
    const fsBtn = document.getElementById('switch-to-filesystem');
    const lsBtn = document.getElementById('switch-to-localstorage');
    
    if (mode === 'filesystem') {
        fsBtn.disabled = true;
        lsBtn.disabled = false;
    } else {
        fsBtn.disabled = false;
        lsBtn.disabled = true;
    }
}

// Call on settings modal open
document.addEventListener('DOMContentLoaded', () => {
    // Wait for settings modal to be created
    setTimeout(addStorageModeSettings, 100);
});
```

### 7. Image Handling

For the `.backlog/` subfolder images:

```javascript
class ImageHandler {
    static async saveImage(file, taskId) {
        if (!FileSystemAPI.directoryHandle) {
            throw new Error('No directory access');
        }
        
        // Get or create .backlog directory
        const backlogDir = await FileSystemAPI.directoryHandle.getDirectoryHandle('.backlog', {
            create: true
        });
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filename = `${taskId}_${timestamp}.${ext}`;
        
        // Create file
        const fileHandle = await backlogDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        
        // Return relative path for markdown
        return `.backlog/${filename}`;
    }
    
    static async loadImage(path) {
        if (!FileSystemAPI.directoryHandle) {
            throw new Error('No directory access');
        }
        
        // Parse path (e.g., ".backlog/K-001_1234567890.png")
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        
        // Get .backlog directory
        const backlogDir = await FileSystemAPI.directoryHandle.getDirectoryHandle('.backlog');
        const fileHandle = await backlogDir.getFileHandle(filename);
        const file = await fileHandle.getFile();
        
        // Return as blob URL
        return URL.createObjectURL(file);
    }
}
```

### 8. Build Script

Update `scripts/build_demo.py` to include the new files:

```python
#!/usr/bin/env python3
"""
Build script for Kandown demo mode with optional file system access.
"""

import shutil
from pathlib import Path

def build_demo():
    """Build the demo directory by copying static assets."""
    
    repo_root = Path(__file__).parent.parent
    src_statics = repo_root / "src" / "kandown" / "statics"
    demo_dir = repo_root / "demo"
    
    demo_dir.mkdir(exist_ok=True)
    
    # Files to copy from statics
    files_to_copy = [
        "board.css",
        "board.js",
        "modal-manager.js",
        "event-manager.js",
        "types.js",
        "ui-utils.js",
        "favicon.svg"
    ]
    
    print("Building Kandown demo mode...")
    
    for filename in files_to_copy:
        src_file = src_statics / filename
        dest_file = demo_dir / filename
        
        if src_file.exists():
            shutil.copy2(src_file, dest_file)
            print(f"✓ Copied {filename}")
    
    # Verify demo-specific files
    required_files = [
        "index.html",
        "api.js",
        "api-filesystem.js",
        "settings-demo.js",
        "README.md"
    ]
    print("\nVerifying demo-specific files...")
    for filename in required_files:
        if (demo_dir / filename).exists():
            print(f"✓ {filename} exists")
        else:
            print(f"✗ Warning: {filename} is missing!")
    
    print("\n✅ Demo mode build completed!")
    print("📝 Demo supports both localStorage and File System Access API")
    return True

if __name__ == "__main__":
    import sys
    success = build_demo()
    sys.exit(0 if success else 1)
```

## Security Considerations

### 1. User Permission

The File System Access API requires explicit user permission:
- User must click to select a directory
- Permission can be revoked at any time
- Permission is tied to the origin (domain)

### 2. Sandboxing

Files are accessed with the same security model as regular file inputs, but with persistent access.

### 3. Privacy

- Only the selected directory and its contents are accessible
- The browser maintains the permission state
- Users can revoke access through browser settings

### 4. Best Practices

```javascript
// Always verify permission before accessing files
async function safeFileAccess() {
    if (!(await FileSystemAPI.verifyPermission())) {
        // Re-request permission or show error
        alert('File access permission was revoked. Please grant access again.');
        await FileSystemAPI.requestDirectoryAccess();
    }
    
    // Proceed with file operations
}
```

## Challenges and Solutions

### Challenge 1: Browser Compatibility

**Problem:** Only Chromium browsers support the File System Access API.

**Solution:** 
- Use localStorage as the default fallback mode
- All users can access the demo, regardless of browser
- Chrome/Edge users get enhanced file system features as opt-in
- Clear messaging about browser compatibility

```javascript
function checkFileSystemSupport() {
    const hasSupport = 'showDirectoryPicker' in window;
    
    if (!hasSupport) {
        console.log('File System Access API not available. Using localStorage mode.');
        // Continue with localStorage - no blocking error
    }
    
    return hasSupport;
}
```

### Challenge 2: Permission Persistence

**Problem:** Permissions may be lost when the browser is closed.

**Solution:** Save the directory handle in IndexedDB to restore access:

```javascript
import { get, set } from 'idb-keyval';

async function saveDirectoryHandle(handle) {
    await set('directory-handle', handle);
}

async function restoreDirectoryHandle() {
    const handle = await get('directory-handle');
    if (handle && await verifyPermission(handle)) {
        return handle;
    }
    return null;
}
```

### Challenge 3: YAML Parsing Performance

**Problem:** Large YAML files may be slow to parse.

**Solution:** 
- Implement caching
- Parse incrementally if possible
- Show loading indicators

### Challenge 4: Concurrent Access

**Problem:** User might edit the file outside the browser while the app is open.

**Solution:** Implement file watching or periodic refresh:

```javascript
// Check for external changes every 5 seconds
setInterval(async () => {
    const file = await fileHandle.getFile();
    const lastModified = file.lastModified;
    
    if (lastModified > lastKnownModified) {
        if (confirm('File was modified externally. Reload?')) {
            await loadBacklogData();
            renderTasks();
        }
    }
}, 5000);
```

## Testing

### Unit Tests

Test the YAML serialization/deserialization:

```javascript
import { describe, it, expect } from 'vitest';
import YAML from 'js-yaml';

describe('YAML Handler', () => {
    it('should serialize tasks correctly', () => {
        const data = {
            settings: { darkmode: true },
            tasks: [{ id: 'K-001', text: 'Test', status: 'todo' }]
        };
        
        const yaml = YAML.stringify(data);
        const parsed = YAML.parse(yaml);
        
        expect(parsed).toEqual(data);
    });
});
```

### Integration Tests

Test with a real file system (requires browser automation):

```javascript
// Using Playwright
test('should read and write to file system', async ({ page }) => {
    // Grant file system permission (this is tricky in tests)
    // Would need to use Chrome DevTools Protocol
    
    await page.goto('http://localhost:8080');
    await page.click('#select-folder-btn');
    
    // ... test file operations
});
```

### Manual Testing Checklist

- [ ] Directory selection works
- [ ] backlog.yaml is read correctly
- [ ] Tasks can be created
- [ ] Tasks can be edited
- [ ] Tasks can be deleted
- [ ] Changes persist to file
- [ ] File changes are detected
- [ ] Images save to `.backlog/` folder
- [ ] Images load correctly
- [ ] Settings are saved
- [ ] Permission handling works
- [ ] Error handling works

## Deployment

### GitHub Pages Deployment

The hybrid demo mode can be deployed as a single static site:

```yaml
# .github/workflows/deploy-demo.yml
name: Deploy Demo Mode

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Build demo
        run: python scripts/build_demo.py
      
      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./demo
```

Available at: `https://eruvanos.github.io/kandown/`

**User Experience:**
1. All users see the demo with localStorage by default
2. Chrome/Edge users see an option in settings to enable file system mode
3. If file system is enabled, the UI updates to show the current mode
4. Users can switch back to localStorage at any time

## Documentation Updates

### README.md

Add section describing the hybrid demo mode:

```markdown
## Demo Mode

Try Kandown instantly in your browser without any installation!

**Visit:** [https://eruvanos.github.io/kandown/](https://eruvanos.github.io/kandown/)

### Features

**localStorage Mode (all browsers):**
- ✅ Full kanban board functionality
- ✅ Data persists in browser storage
- ✅ Works offline
- ✅ No installation required

**File System Mode (Chrome/Edge only):**
- ✅ Read/write local YAML files
- ✅ Store images in `.backlog/` folder
- ✅ Work with existing backlog.yaml files
- ✅ No server required

### How to Use

1. Visit the demo site
2. Start with localStorage mode (works in all browsers)
3. **Optional:** If using Chrome/Edge, open Settings ⚙️ to enable File System mode
4. Grant folder access when prompted
5. Select your project folder containing `backlog.yaml`

### Switching Modes

You can switch between localStorage and file system modes at any time:
- Open Settings ⚙️
- Under "Storage Mode", click the mode you want to use
- Grant permissions if needed
- The page will reload with your selected mode

**Note:** Switching modes doesn't migrate data - your localStorage data and file system files remain separate.
```

## Future Enhancements

1. **Progressive Web App (PWA)**
   - Add service worker for offline support
   - Install as desktop app

2. **File Watcher**
   - Detect external file changes in real-time
   - Auto-reload or merge changes

3. **Multi-file Support**
   - Support multiple YAML files in a project
   - Switch between different boards

4. **Git Integration**
   - Show git status of the file
   - Commit changes directly from the UI

5. **Import/Export**
   - Export to different formats
   - Import from other task management tools

## Conclusion

Implementing a hybrid demo mode with optional File System Access API support provides the best of both worlds:

**Pros:**
- ✅ Works for all users (localStorage fallback)
- ✅ No browser lock-in - everyone can try the demo
- ✅ Progressive enhancement for Chrome/Edge users
- ✅ Single deployment (simpler maintenance)
- ✅ Direct file system access when available
- ✅ True offline capability
- ✅ No server installation required
- ✅ Work with existing YAML files
- ✅ Images stored as files, not base64 (in filesystem mode)

**Cons:**
- File system mode limited to Chrome/Edge
- More complex permission handling for filesystem mode
- Potential for file conflicts in filesystem mode
- Users need to understand two storage modes

**Recommendation:** Implement this as a **progressive enhancement** to the existing demo mode:

1. **Default Experience:** All users get fully functional demo with localStorage
2. **Enhanced Experience:** Chrome/Edge users can optionally connect to local files
3. **No Barriers:** Browser compatibility is no longer a blocking issue
4. **Flexible:** Users can switch modes based on their needs

This approach gives users flexibility while ensuring no one is excluded:
- **Casual users:** Quick demo in any browser (localStorage)
- **Power users (Chrome/Edge):** Full file system integration
- **Teams:** Share the same demo link, everyone gets the best experience for their browser

The hybrid approach transforms the File System Access API from a limitation into an optional enhancement, making Kandown more accessible while still offering advanced features where available.
