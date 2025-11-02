/**
 * Initialization routine for Kandown
 * Detects the application mode and initializes the UI accordingly
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status - Status of the server ('ok' or 'unavailable')
 * @property {string} server - Server type ('cli' or 'demo')
 * @property {boolean} available - Whether the server is available
 */

/**
 * Server mode type
 * @typedef {'cli'|'demo'|'readOnly'|'unknown'} ServerMode
 */

/**
 * Storage mode type for demo mode
 * @typedef {'localStorage'|'filesystem'|'readOnly'} StorageMode
 */

let serverMode = 'unknown';
let storageMode = 'localStorage';
let initializationComplete = false;
let initializationPromise = null;

/**
 * Check if URL parameters specify a backlog file (read-only mode)
 * @returns {string|null} URL or path to backlog file, or null if not specified
 */
function getBacklogUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('backlog') || urlParams.get('file');
}

/**
 * Checks the health endpoint to determine server availability
 * @returns {Promise<HealthResponse>}
 */
async function checkHealth() {
    try {
        const response = await fetch('./api/health', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            // Set a timeout for the health check
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`Health check failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Validate the response format
        if (typeof data.available !== 'boolean') {
            throw new Error('Invalid health response format');
        }

        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        // Return a default response indicating unavailable
        return {
            status: 'unavailable',
            server: 'unknown',
            available: false
        };
    }
}

/**
 * Detect if File System Access API is available
 * @returns {Promise<boolean>}
 */
async function detectFilesystemHandle() {
    if (!('showDirectoryPicker' in window)) {
        return false;
    }
    
    // Check if we have a stored directory handle
    try {
        const { idbKeyval } = window;
        if (!idbKeyval) return false;
        
        const dirHandle = await idbKeyval.get('kandown-directory-handle');
        return dirHandle !== undefined && dirHandle !== null;
    } catch (error) {
        console.error('Error checking for filesystem handle:', error);
        return false;
    }
}

/**
 * Sets the appropriate CSS class on the body element based on the mode
 * @param {string} mode - The mode to set ('cli', 'demo-local', 'demo-file', or 'readOnly')
 */
function setModeClass(mode) {
    // Remove any existing mode classes
    document.body.classList.remove('mode-cli', 'mode-demo-local', 'mode-demo-file', 'mode-readOnly');

    // Add the new mode class
    document.body.classList.add(`mode-${mode}`);

    console.log(`✓ Set mode class: mode-${mode}`);
}

/**
 * Update demo mode UI elements (banner and storage indicator)
 */
function updateDemoModeUI() {
    if (serverMode !== 'demo' && serverMode !== 'readOnly') {
        return;
    }

    const banner = document.getElementById('demo-banner');
    const indicator = document.getElementById('storage-mode-indicator');
    if (!banner || !indicator) return;

    if (storageMode === 'readOnly') {
        console.log('Setting demo mode UI to Read-Only');
        banner.innerHTML = '📖 Read-Only Mode - Viewing external backlog file (no modifications allowed) | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.remove('fs-active');
        indicator.textContent = '📖 Read-Only';
        indicator.classList.remove('filesystem');
    } else if (storageMode === 'filesystem') {
        console.log('Setting demo mode UI to File System');
        banner.innerHTML = '📂 File System Mode - Connected to local backlog.yaml | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.add('fs-active');
        indicator.textContent = '📂 File System';
        indicator.classList.add('filesystem');
    } else if (storageMode === 'localStorage') {
        console.log('Setting demo mode UI to localStorage');
        banner.innerHTML = '🎯 Demo Mode - Data stored in browser localStorage | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.remove('fs-active');
        indicator.textContent = '💾 localStorage';
        indicator.classList.remove('filesystem');
    } else {
        console.log('Unknown storage mode:', storageMode);
        indicator.textContent = '❓ Unknown Mode';
    }
}

/**
 * Setup floating controls based on current mode
 */
function setupFloatingControls() {
    // Floating controls are already in the HTML with CSS visibility classes
    // No additional setup needed here, but we could add event listeners if needed
    console.log('✓ Floating controls ready');
}

/**
 * Setup settings panel based on current mode
 */
function setupSettings() {
    // Settings are already in the HTML with CSS visibility classes
    // The settings.js module handles the actual functionality
    console.log('✓ Settings panel ready');
}

/**
 * Detect the application mode following the priority order:
 * 1. URL parameter (read-only mode)
 * 2. Health API check (CLI mode)
 * 3. Filesystem handle availability (filesystem mode)
 * 4. Fallback to localStorage mode
 * @returns {Promise<void>}
 */
async function detectMode() {
    console.log('Detecting application mode...');
    
    // 1. Check for URL parameter - highest priority
    const backlogUrl = getBacklogUrlParameter();
    if (backlogUrl) {
        console.log('✓ URL parameter detected - entering read-only mode');
        serverMode = 'readOnly';
        storageMode = 'readOnly';
        return;
    }
    
    // 2. Check health API for CLI server
    const healthResponse = await checkHealth();
    if (healthResponse.available) {
        console.log('✓ CLI server detected');
        serverMode = 'cli';
        storageMode = 'cli'; // Not used in CLI mode, but set for consistency
        return;
    }
    
    // 3. Server unavailable - entering demo mode
    console.log('ℹ No CLI server - entering demo mode');
    serverMode = 'demo';
    
    // Import demo module to check storage initialization
    const { waitForStorageInit } = await import('./api-demo.js');
    await waitForStorageInit();
    
    // 4. Detect if filesystem handle is available
    const hasFilesystemHandle = await detectFilesystemHandle();
    if (hasFilesystemHandle) {
        console.log('✓ Filesystem handle detected');
        storageMode = 'filesystem';
        return;
    }
    
    // 5. Fallback to localStorage mode
    console.log('✓ Using localStorage mode');
    storageMode = 'localStorage';
}

/**
 * Initialize UI for the detected mode
 * @returns {Promise<void>}
 */
async function initUIForMode() {
    console.log(`Initializing UI for mode: ${serverMode} (storage: ${storageMode})`);
    
    // 1. Set mode CSS class on body
    if (serverMode === 'cli') {
        setModeClass('cli');
    } else if (serverMode === 'readOnly' || storageMode === 'readOnly') {
        setModeClass('readOnly');
    } else if (storageMode === 'filesystem') {
        setModeClass('demo-file');
    } else {
        setModeClass('demo-local');
    }
    
    // 2. Create API instances (done by initializeAPIs in api.js)
    // This is called by the board.js after initializeApp completes
    
    // 3. Setup secondary floating controls
    setupFloatingControls();
    
    // 4. Setup settings panel
    setupSettings();
    
    // 5. Update demo mode specific UI
    if (serverMode === 'demo' || serverMode === 'readOnly') {
        updateDemoModeUI();
    }
    
    console.log('✓ UI initialization complete');
}

/**
 * Initializes the application by detecting mode and setting up UI
 * @returns {Promise<ServerMode>}
 */
async function initializeApp() {
    // If already initialized, return cached result
    if (initializationComplete) {
        return serverMode;
    }

    // If initialization is in progress, return the existing promise
    if (initializationPromise) {
        return initializationPromise;
    }

    // Create initialization promise
    initializationPromise = (async () => {
        console.log('Initializing Kandown...');
        
        // Detect mode
        await detectMode();
        
        // Initialize UI for detected mode
        await initUIForMode();
        
        initializationComplete = true;
        console.log(`✓ Initialization complete - Mode: ${serverMode}`);
        return serverMode;
    })();

    return initializationPromise;
}

/**
 * Gets the current server mode
 * @returns {ServerMode}
 */
function getServerMode() {
    return serverMode;
}

/**
 * Gets the current storage mode (relevant in demo mode)
 * @returns {StorageMode}
 */
function getStorageMode() {
    return storageMode;
}

/**
 * Waits for initialization to complete
 * @returns {Promise<ServerMode>}
 */
async function waitForInit() {
    if (initializationComplete) {
        return serverMode;
    }
    return initializationPromise || initializeApp();
}

/**
 * Check if application is in read-only mode
 * @returns {boolean}
 */
function isReadOnly() {
    return serverMode === 'readOnly' || storageMode === 'readOnly';
}

// Export the initialization functions
export {
    initializeApp,
    getServerMode,
    getStorageMode,
    isReadOnly,
    waitForInit
};
