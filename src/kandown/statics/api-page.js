/**
 * Demo mode API implementations
 * Supports both localStorage and File System Access API
 */

import {FileSystemAPI} from './api-filesystem.js';

// Check if File System Access API is available
const hasFileSystemSupport = 'showDirectoryPicker' in window;

// Promise that resolves when storage mode is initialized
let storageModeInitialized = null;

// Try to restore previous file system connection
async function restoreFilesystemConnection() {
    if (hasFileSystemSupport) {
        const restored = await FileSystemAPI.restoreConnection();
        if (restored) {
            console.log('📂 Restored file system connection');
            return true
        }
    }
    return false;
}

// Export mode switcher
export async function switchToFileSystem() {
    if (!hasFileSystemSupport) {
        throw new Error('File System Access API not supported');
    }
    
    const success = await FileSystemAPI.requestDirectoryAccess();
    if (success) {
        return true;
    }
    return false;
}

export function switchToLocalStorage() {
    FileSystemAPI.disconnect();
}


// Export specific API implementations for direct use

