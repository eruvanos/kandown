/**
 * API Factory - chooses the correct API implementation based on server mode
 * This allows seamless fallback to demo mode when the CLI server is unavailable
 */

import { getServerMode } from './init.js';

// We'll dynamically import the correct implementations
let TaskAPIImpl = null;
let SettingsAPIImpl = null;

// Import demo-specific functions conditionally
let demoFunctions = {
    clearAllData: null,
    getStorageMode: null,
    switchToFileSystem: null,
    switchToLocalStorage: null,
    waitForStorageInit: null
};

/**
 * Initialize API implementations based on server mode
 */
async function initializeAPIs() {
    const mode = getServerMode();
    
    if (mode === 'cli') {
        // Use CLI API
        const cliModule = await import('./api-cli.js');
        TaskAPIImpl = cliModule.TaskAPI;
        SettingsAPIImpl = cliModule.SettingsAPI;
    } else {
        // Use demo API (localStorage/filesystem hybrid)
        const demoModule = await import('./api-demo.js');
        TaskAPIImpl = demoModule.TaskAPI;
        SettingsAPIImpl = demoModule.SettingsAPI;
        
        // Import demo-specific functions
        demoFunctions.clearAllData = demoModule.clearAllData;
        demoFunctions.getStorageMode = demoModule.getStorageMode;
        demoFunctions.switchToFileSystem = demoModule.switchToFileSystem;
        demoFunctions.switchToLocalStorage = demoModule.switchToLocalStorage;
        demoFunctions.waitForStorageInit = demoModule.waitForStorageInit;

        // Ensure storage is initialized
        await demoModule.waitForStorageInit()
    }
}

// Export factory classes that will instantiate the correct implementation
export class TaskAPI {
    constructor() {
        if (!TaskAPIImpl) {
            throw new Error('API not initialized. Call initializeAPIs() first or wait for app initialization.');
        }
        return new TaskAPIImpl();
    }
}

export class SettingsAPI {
    constructor() {
        if (!SettingsAPIImpl) {
            throw new Error('API not initialized. Call initializeAPIs() first or wait for app initialization.');
        }
        return new SettingsAPIImpl();
    }
}

// Export initialization function
export { initializeAPIs };

// Export demo functions (will be null in CLI mode)
export const clearAllData = () => demoFunctions.clearAllData?.();
export const getStorageMode = () => demoFunctions.getStorageMode?.() || 'cli';
export const switchToFileSystem = () => demoFunctions.switchToFileSystem?.();
export const switchToLocalStorage = () => demoFunctions.switchToLocalStorage?.();
