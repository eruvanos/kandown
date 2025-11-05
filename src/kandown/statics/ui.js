/**
 * @typedef {import('./types.js').ServerMode}
 */

/**
 * Sets the appropriate CSS class on the body element based on the mode
 * @param {ServerMode} serverMode
 */
function setModeClass(serverMode) {
    // Remove any existing mode classes
    document.body.classList.forEach(
        (cls) => {
            if (cls.startsWith('mode-')) {
                document.body.classList.remove(cls);
            }
        }
    )

    // Add the new mode class
    document.body.classList.add(`mode-${serverMode}`);

    console.log(`✓ Set mode class: mode-${serverMode}`);
}

/**
 * Update page mode UI elements (banner and storage indicator)
 * @param {ServerMode} serverMode
 */
function updatePageModeUI(serverMode) {
    const banner = document.getElementById('page-banner');
    const indicator = document.getElementById('storage-mode-indicator');
    if (!banner || !indicator) return;

    if (serverMode === 'readOnly') {
        console.log('Setting page mode UI to Read-Only');
        banner.innerHTML = '📖 Read-Only Mode - Viewing external backlog file (no modifications allowed) | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.remove('fs-active');
        indicator.textContent = '📖 Read-Only';
        indicator.classList.remove('filesystem');
    } else if (serverMode === 'page-fs') {
        console.log('Setting page mode UI to File System');
        banner.innerHTML = '📂 File System Mode - Connected to local backlog.yaml | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.add('fs-active');
        indicator.textContent = '📂 File System';
        indicator.classList.add('filesystem');
    } else if (serverMode === 'page-local') {
        console.log('Setting page mode UI to localStorage');
        banner.innerHTML = '🎯 Page Mode - Data stored in browser localStorage | <a href="https://github.com/eruvanos/kandown" target="_blank">View on GitHub</a>';
        banner.classList.remove('fs-active');
        indicator.textContent = '💾 localStorage';
        indicator.classList.remove('filesystem');
    } else {
        console.log('Unknown storage mode:', serverMode);
        indicator.textContent = '❓ Unknown Mode';
    }
}


/**
 * Initialize UI for the detected mode
 * @param {ServerMode} serverMode - Detected server mode
 * @returns {Promise<void>}
 */
export async function initUIForMode(serverMode) {
    console.log(`Initializing UI for mode: ${serverMode}`);

    // 1. Set mode CSS class on body
    setModeClass(serverMode)

    // 2. Update page mode specific UI
    if (serverMode === 'page-local' || serverMode === 'page-fs' || serverMode === 'readOnly') {
        updatePageModeUI(serverMode);
    }

    console.log('✓ UI initialization complete');
}