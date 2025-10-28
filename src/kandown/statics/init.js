/**
 * Initialization routine for Kandown
 * Checks the health endpoint to determine server availability
 * and initializes the appropriate API backend
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status - Status of the server ('ok' or 'unavailable')
 * @property {string} server - Server type ('cli' or 'demo')
 * @property {boolean} available - Whether the server is available
 */

/**
 * Server mode type
 * @typedef {'cli'|'demo'|'unknown'} ServerMode
 */

let serverMode = 'unknown';
let initializationComplete = false;
let initializationPromise = null;

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
 * Initializes the application by checking server health
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
        
        const healthResponse = await checkHealth();
        
        console.log('Health check result:', healthResponse);
        
        // Determine server mode based on health response
        if (healthResponse.available) {
            serverMode = 'cli';
            console.log('✓ CLI server is available');
        } else {
            // Switch to demo mode if server is unavailable
            serverMode = 'demo';
            console.log('ℹ Running in demo mode (server unavailable)');
        }
        
        initializationComplete = true;
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
 * Waits for initialization to complete
 * @returns {Promise<ServerMode>}
 */
async function waitForInit() {
    if (initializationComplete) {
        return serverMode;
    }
    return initializationPromise || initializeApp();
}

// Export the initialization functions
export {
    initializeApp,
    getServerMode,
    waitForInit
};
