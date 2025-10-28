"""Test the initialization routine."""

from pathlib import Path
import requests


def test_init_js_exists():
    """Test that the init.js file exists."""
    init_file = Path(__file__).parent.parent / "src" / "kandown" / "statics" / "init.js"
    assert init_file.exists(), "init.js should exist"


def test_initialization_with_cli_server(kandown_server):
    """Test that initialization works with CLI server."""
    # First verify health endpoint is available
    health_response = requests.get(f"{kandown_server}/api/health")
    assert health_response.status_code == 200
    
    data = health_response.json()
    assert data["status"] == "ok"
    assert data["server"] == "cli"
    assert data["available"] is True
    
    # Verify the init.js is being served
    init_response = requests.get(f"{kandown_server}/statics/init.js")
    assert init_response.status_code == 200
    assert "initializeApp" in init_response.text
    assert "checkHealth" in init_response.text


def test_board_js_imports_init(kandown_server):
    """Test that board.js imports the init module."""
    board_response = requests.get(f"{kandown_server}/statics/board.js")
    assert board_response.status_code == 200
    assert "import {initializeApp} from './init.js'" in board_response.text
    assert "await initializeApp()" in board_response.text


def test_settings_js_imports_init(kandown_server):
    """Test that settings.js imports waitForInit."""
    settings_response = requests.get(f"{kandown_server}/statics/settings.js")
    assert settings_response.status_code == 200
    assert "import {waitForInit} from './init.js'" in settings_response.text
    assert "await waitForInit()" in settings_response.text
