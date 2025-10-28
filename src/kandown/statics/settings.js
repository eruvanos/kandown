import {SettingsAPI} from './api.js';
import {waitForInit} from './init.js';

const settingsBtn = document.getElementById('settings-toggle');
const modal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const randomPortCheckbox = document.getElementById('random-port');
const storeImagesInSubfolderCheckbox = document.getElementById('store-images-in-subfolder');
const darkModeToggleBtn = document.getElementById('darkmode-toggle');

function setDarkMode(on) {
    document.body.classList.toggle('darkmode', on);
    darkModeToggleBtn.textContent = on ? '☀️' : '🌙';
    darkModeToggleBtn.classList.toggle('light', on);
}

let dark = false;
let randomPort = false;
let storeImagesInSubfolder = false;
const settingsAPI = new SettingsAPI();

async function loadSettings() {
    // Wait for initialization to complete
    await waitForInit();
    
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
