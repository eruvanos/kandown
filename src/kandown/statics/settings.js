import { SettingsAPI } from './api.js';

const settingsBtn = document.getElementById('settings-toggle');
const modal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const randomPortCheckbox = document.getElementById('random-port');
const darkModeToggleBtn = document.getElementById('darkmode-toggle');

function setDarkMode(on) {
    document.body.classList.toggle('darkmode', on);
    darkModeToggleBtn.textContent = on ? '☀️' : '🌙';
    darkModeToggleBtn.classList.toggle('light', on);
}

let dark = false;
let randomPort = false;

function loadSettings() {
    SettingsAPI.getSettings().then(settings => {
        dark = !!settings.darkmode;
        setDarkMode(dark);
        randomPort = !!settings.random_port;
        randomPortCheckbox.checked = randomPort;
    });
}

loadSettings();

darkModeToggleBtn.onclick = function () {
    dark = !dark;
    setDarkMode(dark);
    SettingsAPI.updateSettings({ darkmode: dark });
};

settingsBtn.onclick = function () {
    modal.style.display = 'block';
};

closeBtn.onclick = function () {
    modal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

randomPortCheckbox.onchange = function () {
    randomPort = randomPortCheckbox.checked;
    SettingsAPI.updateSettings({ random_port: randomPort });
};

