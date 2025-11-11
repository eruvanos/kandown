/**
 * API Factory - chooses the correct API implementation based on server mode
 * This allows seamless fallback to page mode when the CLI server is unavailable
 */
let TaskAPIImpl = null;
let SettingsAPIImpl = null;

/**
 * Initialize API implementations based on server mode
 * @param {string} mode - 'cli', 'page-local', 'page-fs', or 'readOnly'
 */
async function initializeAPIFactories(mode) {
    // todo just return the API instances directly instead of setting globals

    if (mode === 'cli') {
        // Use CLI API
        const module = await import('./api-cli.js');
        TaskAPIImpl = module.CliTaskAPI;
        SettingsAPIImpl = module.SettingsAPI;
    } else if (mode === 'readOnly') {
        const module = await import('./api-readonly.js');
        TaskAPIImpl = module.ReadOnlyTaskAPI;
        SettingsAPIImpl = module.ReadOnlySettingsAPI;
    } else if (mode === 'page-fs') {
        const module = await import('./api-filesystem.js');
        TaskAPIImpl = module.FileSystemTaskAPI;
        SettingsAPIImpl = module.FileSystemSettingsAPI;
    } else if (mode === 'page-local') {
        const module = await import('./api-local-storage.js');
        TaskAPIImpl = module.LocalStorageTaskAPI;
        SettingsAPIImpl = module.LocalStorageSettingsAPI;
    } else {
        throw new Error(`Unknown mode for API initialization: ${mode}`);
    }

    // Import page-specific functions
    // todo move these to settings init
    // demoFunctions.clearAllData = pageModule.clearAllData;
    // demoFunctions.switchToFileSystem = pageModule.switchToFileSystem;
    // demoFunctions.switchToLocalStorage = pageModule.switchToLocalStorage;
    // demoFunctions.waitForStorageInit = pageModule.waitForStorageInit;
    // demoFunctions.importFromYamlFile = pageModule.importFromYamlFile;
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
export {initializeAPIFactories};
