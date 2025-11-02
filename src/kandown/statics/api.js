/**
 * API Factory - chooses the correct API implementation based on server mode
 * This allows seamless fallback to demo mode when the CLI server is unavailable
 */

import { getServerMode, getStorageMode, isReadOnly as isReadOnlyMode } from './init.js';

// We'll dynamically import the correct implementations
let TaskAPIImpl = null;
let SettingsAPIImpl = null;

// Import demo-specific functions conditionally
let demoFunctions = {
    clearAllData: null,
    switchToFileSystem: null,
    switchToLocalStorage: null,
    waitForStorageInit: null,
    importFromYamlFile: null
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
        // Use demo API - import specific implementations
        const demoModule = await import('./api-demo.js');
        const storageMode = getStorageMode();
        
        // Select the appropriate implementation based on storage mode
        if (storageMode === 'readOnly') {
            TaskAPIImpl = demoModule.ReadOnlyTaskAPI;
            SettingsAPIImpl = demoModule.ReadOnlySettingsAPI;
        } else if (storageMode === 'filesystem') {
            TaskAPIImpl = demoModule.FileSystemTaskAPI;
            SettingsAPIImpl = demoModule.FileSystemSettingsAPI;
        } else {
            TaskAPIImpl = demoModule.LocalStorageTaskAPI;
            SettingsAPIImpl = demoModule.LocalStorageSettingsAPI;
        }
        
        // Import demo-specific functions
        demoFunctions.clearAllData = demoModule.clearAllData;
        demoFunctions.switchToFileSystem = demoModule.switchToFileSystem;
        demoFunctions.switchToLocalStorage = demoModule.switchToLocalStorage;
        demoFunctions.waitForStorageInit = demoModule.waitForStorageInit;
        demoFunctions.importFromYamlFile = demoModule.importFromYamlFile;

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
export const switchToFileSystem = () => demoFunctions.switchToFileSystem?.();
export const switchToLocalStorage = () => demoFunctions.switchToLocalStorage?.();
export const importFromYamlFile = () => demoFunctions.importFromYamlFile?.();

// Re-export mode checking functions from init.js for convenience
export { getStorageMode, isReadOnly as isReadOnlyMode } from './init.js';
