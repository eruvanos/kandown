# File System Access API Mode - Implementation Guide

## Overview

This document outlines the steps required to implement a new mode for Kandown that uses the **File System Access API** to mount a local folder and access a `backlog.yaml` file directly from the user's file system. This mode would enable users to work with their local YAML files in a browser without running a server.

## Background

The File System Access API is a web API that allows web applications to read and write files on the user's local file system with explicit user permission. This would enable a browser-based Kandown to:

- Read and write to a local `backlog.yaml` file
- Store images in a local `.backlog/` folder
- Provide true file system integration without a server
- Work offline after initial page load

### Current Modes

1. **Server Mode** (main app) - Flask server with YAML file storage
2. **Demo Mode** (this PR) - Browser-only with localStorage
3. **File System Mode** (proposed) - Browser-only with local file access

## Browser Compatibility

**Critical Limitation:** The File System Access API is currently only supported in Chromium-based browsers:

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Yes | Full support since Chrome 86 |
| Firefox | ❌ No | Not implemented, no plans announced |
| Safari | ❌ No | Not implemented |
| Opera | ✅ Yes | Based on Chromium |

**Reference:** [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

This limited browser support is why it was initially rejected in `DEV.md`:

> **Cons:**
> - Only Chrome supported (other browsers do not support file system access)
> - Security issues (access to local file system)

## Implementation Steps

### 1. Project Structure

Create a new directory for the File System API implementation:

```
kandown/
├── filesystem/              # New directory
│   ├── index.html          # Entry point
│   ├── api-filesystem.js   # File System Access API wrapper
│   ├── yaml-handler.js     # YAML parsing/serialization
│   ├── settings-fs.js      # File system mode settings
│   └── README.md           # Documentation
├── scripts/
│   └── build_filesystem.py # Build script (similar to build_demo.py)
└── .github/workflows/
    └── deploy-filesystem.yml # Optional: Deploy as separate page
```

### 2. API Implementation (`api-filesystem.js`)

Create a File System Access API wrapper that matches the TaskAPI interface:

```javascript
/**
 * File System Access API implementation for Kandown
 * Reads/writes directly to a local backlog.yaml file
 */

class FileSystemAPI {
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
export class TaskAPI {
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

export class SettingsAPI {
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

### 3. YAML Handler (`yaml-handler.js`)

You'll need a JavaScript YAML library. The most popular option is `js-yaml`:

```html
<!-- In index.html -->
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
```

Or use a bundler to include it:

```bash
npm install js-yaml
```

### 4. HTML Entry Point (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kandown - File System Mode</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
  <script type="module" src="./board.js"></script>
  <script type="module" src="./settings-fs.js"></script>
  <script type="module" src="./init-filesystem.js"></script>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="stylesheet" href="./board.css">
  <style>
    .fs-banner {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .fs-banner a {
      color: #fff;
      text-decoration: underline;
      font-weight: 600;
    }
    .fs-status {
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
    .fs-status.connected {
      background: rgba(17, 153, 142, 0.9);
    }
    .fs-permission-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      align-items: center;
      justify-content: center;
    }
    .fs-permission-modal.active {
      display: flex;
    }
    .fs-permission-content {
      background: white;
      padding: 32px;
      border-radius: 12px;
      max-width: 500px;
      text-align: center;
    }
  </style>
</head>
<body>
<div class="fs-banner">
  🗂️ File System Mode - Reading from your local backlog.yaml | 
  <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>
</div>

<div id="fs-status" class="fs-status">
  📂 Not connected to file system
</div>

<div id="fs-permission-modal" class="fs-permission-modal active">
  <div class="fs-permission-content">
    <h2>🗂️ Select Your Project Folder</h2>
    <p>Kandown needs access to a folder containing your <code>backlog.yaml</code> file.</p>
    <p><strong>Note:</strong> This mode only works in Chrome/Edge browsers.</p>
    <button id="select-folder-btn" style="
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-size: 1.1em;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
    ">Select Folder</button>
  </div>
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

<!-- Rest of UI components same as demo/index.html -->

<script type="module">
  import { FileSystemAPI } from './api-filesystem.js';
  
  const selectFolderBtn = document.getElementById('select-folder-btn');
  const permissionModal = document.getElementById('fs-permission-modal');
  const statusEl = document.getElementById('fs-status');
  
  selectFolderBtn.addEventListener('click', async () => {
    const success = await FileSystemAPI.requestDirectoryAccess();
    if (success) {
      permissionModal.classList.remove('active');
      statusEl.textContent = '✅ Connected to file system';
      statusEl.classList.add('connected');
      
      // Initialize the board (load tasks)
      window.location.reload();
    }
  });
</script>

</body>
</html>
```

### 5. Settings UI Modifications

Add file system specific settings in `settings-fs.js`:

```javascript
import {SettingsAPI, FileSystemAPI} from './api-filesystem.js';

// Add a button to reconnect/change folder
const changeFolderBtn = document.createElement('button');
changeFolderBtn.textContent = '📂 Change Folder';
changeFolderBtn.onclick = async () => {
    const success = await FileSystemAPI.requestDirectoryAccess();
    if (success) {
        window.location.reload();
    }
};

// Add to settings modal
document.querySelector('.modal-content').appendChild(changeFolderBtn);

// Rest of settings implementation...
```

### 6. Image Handling

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

### 7. Build Script

Create `scripts/build_filesystem.py`:

```python
#!/usr/bin/env python3
"""
Build script for Kandown File System Access API mode.
"""

import shutil
from pathlib import Path

def build_filesystem():
    """Build the filesystem directory by copying static assets."""
    
    repo_root = Path(__file__).parent.parent
    src_statics = repo_root / "src" / "kandown" / "statics"
    fs_dir = repo_root / "filesystem"
    
    fs_dir.mkdir(exist_ok=True)
    
    # Files to copy from statics
    files_to_copy = [
        "board.css",
        "board.js",
        "modal-manager.js",
        "event-manager.js",
        "types.js",
        "favicon.svg"
    ]
    
    print("Building Kandown File System mode...")
    
    for filename in files_to_copy:
        src_file = src_statics / filename
        dest_file = fs_dir / filename
        
        if src_file.exists():
            shutil.copy2(src_file, dest_file)
            print(f"✓ Copied {filename}")
    
    # Verify filesystem-specific files
    required_files = ["index.html", "api-filesystem.js", "yaml-handler.js"]
    print("\nVerifying filesystem-specific files...")
    for filename in required_files:
        if (fs_dir / filename).exists():
            print(f"✓ {filename} exists")
        else:
            print(f"✗ Error: {filename} is missing!")
            return False
    
    print("\n✅ File System mode build completed!")
    return True

if __name__ == "__main__":
    import sys
    success = build_filesystem()
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

**Problem:** Only Chromium browsers support this API.

**Solutions:**
- Add browser detection and show a clear message
- Provide fallback to demo mode for unsupported browsers
- Document the limitation prominently

```javascript
function checkFileSystemSupport() {
    if ('showDirectoryPicker' in window) {
        return true;
    }
    
    alert('Your browser does not support the File System Access API. ' +
          'Please use Chrome or Edge, or try our Demo mode.');
    return false;
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

### Option 1: Separate GitHub Pages Site

Deploy to a different path:

```yaml
# .github/workflows/deploy-filesystem.yml
name: Deploy File System Mode

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
      
      - name: Build
        run: python scripts/build_filesystem.py
      
      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./filesystem
          destination_dir: filesystem
```

Would be available at: `https://eruvanos.github.io/kandown/filesystem/`

### Option 2: Mode Selector

Create a landing page that lets users choose:
- Server Mode (install and run)
- Demo Mode (localStorage)
- File System Mode (local files, Chrome only)

## Documentation Updates

### README.md

Add section:

```markdown
## File System Mode (Chrome/Edge only)

For users who want to work with local YAML files in their browser:

**Requirements:**
- Chrome or Edge browser
- File System Access API support

**Usage:**
1. Visit [https://eruvanos.github.io/kandown/filesystem/](https://eruvanos.github.io/kandown/filesystem/)
2. Click "Select Folder"
3. Choose your project folder containing `backlog.yaml`
4. Grant read/write permission
5. Start managing your tasks!

**Features:**
- ✅ Read/write local YAML files
- ✅ Store images in `.backlog/` folder
- ✅ Offline capable after first load
- ✅ No server required

**Limitations:**
- ⚠️ Chrome/Edge only (no Firefox/Safari support)
- ⚠️ Requires explicit folder permission
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

Implementing File System Access API mode would provide a powerful middle ground between the server mode and demo mode:

**Pros:**
- Direct file system access
- True offline capability
- No server installation required
- Work with your existing YAML files
- Images stored as files, not base64

**Cons:**
- Chrome/Edge only (major limitation)
- More complex permission handling
- Potential for file conflicts
- Users need to understand file system concepts

**Recommendation:** Implement this as an experimental feature for power users who:
- Use Chrome/Edge
- Want browser-based UI
- Need to work with existing YAML files
- Understand the technical limitations

This mode complements the existing server and demo modes, giving users three distinct options based on their needs.
