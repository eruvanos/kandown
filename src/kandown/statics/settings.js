import {SettingsAPI, initializeAPIs, clearAllData, getStorageMode, switchToFileSystem, switchToLocalStorage, importFromYamlFile} from './api.js';
import {waitForInit, getServerMode} from './init.js';

const settingsBtn = document.getElementById('settings-toggle');
const modal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const randomPortCheckbox = document.getElementById('random-port');
const storeImagesInSubfolderCheckbox = document.getElementById('store-images-in-subfolder');
const darkModeToggleBtn = document.getElementById('darkmode-toggle');
const storageModeIndicator = document.getElementById('storage-mode-indicator');

function setDarkMode(on) {
    document.body.classList.toggle('darkmode', on);
    darkModeToggleBtn.textContent = on ? '☀️' : '🌙';
    darkModeToggleBtn.classList.toggle('light', on);
}

let dark = false;
let randomPort = false;
let storeImagesInSubfolder = false;
let settingsAPI = null;

async function loadSettings() {
    // Wait for initialization to complete
    await waitForInit();

    // Initialize APIs
    await initializeAPIs();

    // Create settings API instance
    settingsAPI = new SettingsAPI();
    settingsAPI.getSettings().then(settings => {
        dark = !!settings.darkmode;
        setDarkMode(dark);
        randomPort = !!settings.random_port;
        randomPortCheckbox.checked = randomPort;
        storeImagesInSubfolder = !!settings.store_images_in_subfolder;
        storeImagesInSubfolderCheckbox.checked = storeImagesInSubfolder;
    });
}

loadSettings();

darkModeToggleBtn.onclick = async function () {
    dark = !dark;
    setDarkMode(dark);
    await settingsAPI.updateSettings({darkmode: dark});
};

settingsBtn.onclick = function () {
    modal.style.display = 'block';
    // Update storage mode UI when opening settings in demo mode
    if (getServerMode() === 'demo') {
        updateStorageModeUI();
    }
};

storageModeIndicator.onclick = function () {
    modal.style.display = 'block';
    // Update storage mode UI when opening settings in demo mode
    if (getServerMode() === 'demo') {
        updateStorageModeUI();
    }
}

closeBtn.onclick = function () {
    modal.style.display = 'none';
};

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

randomPortCheckbox.onchange = async function () {
    randomPort = randomPortCheckbox.checked;
    await settingsAPI.updateSettings({random_port: randomPort});
};

storeImagesInSubfolderCheckbox.onchange = async function () {
    storeImagesInSubfolder = storeImagesInSubfolderCheckbox.checked;
    await settingsAPI.updateSettings({store_images_in_subfolder: storeImagesInSubfolder});
}

// Demo mode specific functionality
const switchToFilesystemBtn = document.getElementById('switch-to-filesystem');
const switchToLocalStorageBtn = document.getElementById('switch-to-localstorage');
const currentStorageModeSpan = document.getElementById('current-storage-mode');

// Update current mode display (only in demo mode)
function updateStorageModeUI() {
    if (getServerMode() !== 'demo') return;

    const mode = getStorageMode();
    if (currentStorageModeSpan) {
        currentStorageModeSpan.textContent = mode === 'filesystem' ? 'File System' : 'localStorage';
    }

    // Update button states
    if (switchToFilesystemBtn && switchToLocalStorageBtn) {
        if (mode === 'filesystem') {
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

// Clear data button handler (demo mode only)
const clearDataBtn = document.getElementById('clear-data-btn');
if (clearDataBtn) {
    clearDataBtn.onclick = function () {
        clearAllData();
    };
}

// Event handler for switching to filesystem mode
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

// Event handler for switching to localStorage mode
if (switchToLocalStorageBtn) {
    switchToLocalStorageBtn.onclick = function () {
        if (confirm('Switch to localStorage mode? Your file system data will remain unchanged, but you will see the localStorage data instead.')) {
            switchToLocalStorage();
            alert('Switched to localStorage mode. The page will reload.');
            window.location.reload();
        }
    };
}

// Download button handler
const downloadBtn = document.getElementById('download-toggle');
if (downloadBtn) {
    downloadBtn.onclick = async function () {
        try {
            // Demo mode: generate and download from frontend
            const {TaskAPI} = await import('./api.js');
            const taskAPI = new TaskAPI();
            const tasks = await taskAPI.getTasks();
            const settings = await settingsAPI.getSettings();

            // Build the YAML structure
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

            // Convert to YAML using js-yaml library
            const yamlString = '# Project page: https://github.com/eruvanos/kandown\n' +
                '# To open this file with uv, run: uv run --with git+https://github.com/eruvanos/kandown kandown backlog.yaml\n' +
                jsyaml.dump(yamlData);

            // Create a blob and download it
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

// Event handler for import button (demo mode localStorage only)
const importBtn = document.getElementById('import-toggle');
if (importBtn) {
    importBtn.onclick = async function () {
        await importFromYamlFile();
    };
}
