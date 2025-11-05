import {switchToFileSystem, switchToLocalStorage} from './api-page.js';
import {clearAllData, importFromYamlFile} from './api-local-storage.js';

let dark = false;
let randomPort = false;
let storeImagesInSubfolder = false;

/**
 * @typedef {import('./types.js').SettingsAPI} SettingsAPI
 * @typedef {import('./types.js').TaskAPI} TaskAPI
 */

/**
 * Initialize settings UI and bind event handlers
 *
 * @param {TaskAPI} taskApi
 * @param {SettingsAPI} settingsAPI
 * @param {import('./types.js').ServerMode} serverMode
 * @returns {Promise<void>}
 */
export async function initSettingsUI(taskAPI, settingsAPI, serverMode) {
    // DOM element queries
    const darkModeToggleBtn = document.getElementById('darkmode-toggle');

    function setDarkMode(on) {
        document.body.classList.toggle('darkmode', on);
        if (darkModeToggleBtn) {
            darkModeToggleBtn.textContent = on ? '☀️' : '🌙';
            darkModeToggleBtn.classList.toggle('light', on);
        }
    }

    if (darkModeToggleBtn) {
        darkModeToggleBtn.onclick = async function () {
            dark = !dark;
            setDarkMode(dark);
            await settingsAPI.updateSettings({darkmode: dark});
        };
    }

    function updateStorageModeUI() {
        const currentStorageModeSpan = document.getElementById('current-storage-mode');
        if (currentStorageModeSpan) {
            currentStorageModeSpan.textContent = serverMode === 'page-fs' ? 'File System' : 'localStorage';
        }
        if (switchToFilesystemBtn && switchToLocalStorageBtn) {
            if (serverMode === 'page-fs') {
                switchToFilesystemBtn.disabled = true;
                switchToFilesystemBtn.style.opacity = '0.5';
                switchToLocalStorageBtn.disabled = false;
                switchToLocalStorageBtn.style.opacity = '1';
            } else {
                switchToFilesystemBtn.disabled = false;
                switchToFilesystemBtn.style.opacity = '1';
                switchToLocalStorageBtn.disabled = true;
                switchToLocalStorageBtn.style.opacity = '0.5';
            }
        }
    }

    // Open modal from settings button
    const settingsBtn = document.getElementById('settings-toggle');
    const modal = document.getElementById('settings-modal');
    if (settingsBtn) {
        settingsBtn.onclick = function () {
            modal.style.display = 'block';
            updateStorageModeUI();
        };
    }

    // Open modal from storage mode indicator
    const storageModeIndicator = document.getElementById('storage-mode-indicator');
    if (storageModeIndicator) {
        storageModeIndicator.onclick = function () {
            modal.style.display = 'block';
            updateStorageModeUI();
        };
    }

    // Close modal
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.style.display = 'none';
        };
    }
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Random port
    const randomPortCheckbox = document.getElementById('random-port');
    if (randomPortCheckbox) {
        randomPortCheckbox.onchange = async function () {
            randomPort = randomPortCheckbox.checked;
            await settingsAPI.updateSettings({random_port: randomPort});
        };
    }

    // Store images in subfolder
    const storeImagesInSubfolderCheckbox = document.getElementById('store-images-in-subfolder');
    if (storeImagesInSubfolderCheckbox) {
        storeImagesInSubfolderCheckbox.onchange = async function () {
            storeImagesInSubfolder = storeImagesInSubfolderCheckbox.checked;
            await settingsAPI.updateSettings({store_images_in_subfolder: storeImagesInSubfolder});
        };
    }

    // Clear all data
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.onclick = function () {
            if (!confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
                return;
            }
            taskApi.deleteAllTasks(); // Only available in localStorage mode
            window.location.reload();
        };
    }

    // Reset demo data
    const resetDemoDataBtn = document.getElementById('reset-data-btn');
    if (resetDemoDataBtn) {
        resetDemoDataBtn.onclick = function () {
            clearAllData()
            location.reload()
        }
    }


    // Switch to File System
    const switchToFilesystemBtn = document.getElementById('switch-to-filesystem');
    if (switchToFilesystemBtn) {
        switchToFilesystemBtn.onclick = async function () {
            try {
                const success = await switchToFileSystem();
                if (success) {
                    alert('Successfully connected to file system! The page will reload.');
                    window.location.reload();
                } else {
                    alert('Failed to connect to file system. Please make sure you selected a valid folder.');
                }
            } catch (err) {
                alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
                console.error(err);
            }
        };
    }

    // Switch to localStorage
    const switchToLocalStorageBtn = document.getElementById('switch-to-localstorage');
    if (switchToLocalStorageBtn) {
        switchToLocalStorageBtn.onclick = function () {
            if (confirm('Switch to localStorage mode? Your file system data will remain unchanged, but you will see the localStorage data instead.')) {
                switchToLocalStorage();
                alert('Switched to localStorage mode. The page will reload.');
                window.location.reload();
            }
        };
    }

    // Download backlog.yaml
    const downloadBtn = document.getElementById('download-toggle');
    if (downloadBtn) {
        downloadBtn.onclick = async function () {
            try {
                const {TaskAPI} = await import('./api.js');
                const taskAPI = new TaskAPI();
                const tasks = await taskAPI.getTasks();
                const settings = await settingsAPI.getSettings();
                const yamlData = {
                    settings: {
                        random_port: settings.random_port || false,
                        store_images_in_subfolder: settings.store_images_in_subfolder || false
                    },
                    tasks: tasks.map(task => ({
                        id: task.id,
                        text: task.text,
                        status: task.status,
                        tags: task.tags || [],
                        order: task.order || 0,
                        type: task.type || 'task',
                        ...(task.created_at && {created_at: task.created_at}),
                        ...(task.updated_at && {updated_at: task.updated_at}),
                        ...(task.closed_at && {closed_at: task.closed_at})
                    }))
                };
                const yamlString = '# Project page: https://github.com/eruvanos/kandown\n' +
                    '# To open this file with uv, run: uv run --with git+https://github.com/eruvanos/kandown kandown backlog.yaml\n' +
                    jsyaml.dump(yamlData);
                const blob = new Blob([yamlString], {type: 'application/x-yaml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'backlog.yaml';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Download failed:', err);
                alert('Failed to download backlog.yaml. Please try again.');
            }
        };
    }

    // Import from YAML file
    const importBtn = document.getElementById('import-toggle');
    if (importBtn) {
        importBtn.onclick = async function () {
            await importFromYamlFile();
        };
    }

    // Apply current settings to UI
    async function applySettings(settings) {
        dark = !!settings.darkmode;
        setDarkMode(dark);
        randomPort = !!settings.random_port;
        if (randomPortCheckbox) randomPortCheckbox.checked = randomPort;
        storeImagesInSubfolder = !!settings.store_images_in_subfolder;
        if (storeImagesInSubfolderCheckbox) storeImagesInSubfolderCheckbox.checked = storeImagesInSubfolder;
    }

    const currentSettings = await settingsAPI.getSettings();
    await applySettings(currentSettings);
}
