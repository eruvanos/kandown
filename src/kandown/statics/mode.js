/**
 * Detect and application mode (CLI, page-local, page-fs, readOnly)
 */

/**
 * @typedef {import('./types.js').ServerMode}
 */

/**
 * @typedef {Object} HealthResponse
 * @property {boolean} available - Whether the server is available
 */


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
            available: false
        };
    }
}


/**
 * Detect the application mode following the priority order:
 * 1. URL parameter (read-only mode)
 * 2. Health API check (CLI mode)
 * 3. Filesystem handle availability (filesystem mode)
 * 4. Fallback to localStorage mode
 * @returns {Promise<ServerMode>}
 */
async function detectMode() {
    console.log('Detecting application mode...');

    // 1. Check for URL parameter - highest priority
    const backlogUrl = getBacklogUrlParameter();
    if (backlogUrl) {
        console.log('✓ URL parameter detected - entering read-only mode');
        return 'readOnly'
    }

    // 2. Check health API for CLI server
    const healthResponse = await checkHealth();
    if (healthResponse.available) {
        console.log('✓ CLI server detected');
        return 'cli';
    }

    // 3. Detect if filesystem handle is available
    const filesystemModule = await import('./api-filesystem.js');
    const filesystemAccessRestored = await filesystemModule.FileSystemAPI.restoreConnection()
    if (filesystemAccessRestored) {
        console.log('✓ Filesystem handle detected');
        return 'page-fs';
    }

    // 4. Fallback to localStorage mode
    console.log('✓ Using localStorage');
    return 'page-local';
}



// Export the initialization functions
export {
    detectMode,
};
