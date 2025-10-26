import { SettingsAPI, clearAllData, getStorageMode, switchToFileSystem, switchToLocalStorage, waitForStorageInit } from './api.js';

const settingsBtn = document.getElementById('settings-toggle');
const modal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const randomPortCheckbox = document.getElementById('random-port');
const storeImagesInSubfolderCheckbox = document.getElementById('store-images-in-subfolder');
const darkModeToggleBtn = document.getElementById('darkmode-toggle');
const clearDataBtn = document.getElementById('clear-data-btn');

// Create instance of SettingsAPI
const settingsAPI = new SettingsAPI();

function setDarkMode(on) {
    document.body.classList.toggle('darkmode', on);
    darkModeToggleBtn.textContent = on ? '☀️' : '🌙';
    darkModeToggleBtn.classList.toggle('light', on);
}

let dark = false;
let randomPort = false;
let storeImagesInSubfolder = false;

async function loadSettings() {
    // Wait for storage mode to be initialized before loading settings
    await waitForStorageInit();

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
};

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

// Clear data button handler (demo mode only)
if (clearDataBtn) {
    clearDataBtn.onclick = function () {
        clearAllData();
    };
}

// Storage mode switcher handlers
const switchToFilesystemBtn = document.getElementById('switch-to-filesystem');
const switchToLocalStorageBtn = document.getElementById('switch-to-localstorage');
const currentStorageModeSpan = document.getElementById('current-storage-mode');

// Update current mode display
function updateStorageModeUI() {
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

// Initialize storage mode UI
updateStorageModeUI();

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

// Update UI when settings modal is opened
settingsBtn.onclick = function () {
    modal.style.display = 'block';
    updateStorageModeUI();
};
