"""Test demo mode activation and API factory."""

import requests


def test_cli_server_uses_cli_api(kandown_server):
    """Test that CLI server initializes with CLI API."""
    # Verify health endpoint returns CLI mode
    health_response = requests.get(f"{kandown_server}/api/health")
    assert health_response.status_code == 200
    
    data = health_response.json()
    assert data["status"] == "ok"
    assert data["server"] == "cli"
    assert data["available"] is True
    
    # Verify init.js is served
    init_response = requests.get(f"{kandown_server}/statics/init.js")
    assert init_response.status_code == 200
    assert "checkHealth" in init_response.text
    
    # Verify API factory is served
    api_response = requests.get(f"{kandown_server}/statics/api.js")
    assert api_response.status_code == 200
    assert "initializeAPIs" in api_response.text
    assert "API Factory" in api_response.text
    
    # Verify CLI API implementation is served
    cli_api_response = requests.get(f"{kandown_server}/statics/api-cli.js")
    assert cli_api_response.status_code == 200
    assert "fetch('/api/tasks')" in cli_api_response.text
    
    # Verify demo API implementation is served
    demo_api_response = requests.get(f"{kandown_server}/statics/api-demo.js")
    assert demo_api_response.status_code == 200
    assert "localStorage" in demo_api_response.text
    assert "STORAGE_KEY" in demo_api_response.text


def test_demo_mode_files_exist():
    """Test that demo mode static files exist."""
    from pathlib import Path
    
    statics_dir = Path(__file__).parent.parent / "src" / "kandown" / "statics"
    
    required_files = [
        "init.js",
        "api.js",
        "api-cli.js",
        "api-demo.js",
        "api-filesystem.js",
    ]
    
    for filename in required_files:
        file_path = statics_dir / filename
        assert file_path.exists(), f"{filename} should exist in statics directory"
        
        # Verify files have content
        content = file_path.read_text()
        assert len(content) > 0, f"{filename} should not be empty"


def test_init_js_switches_to_demo_on_failure():
    """Test that init.js code contains logic to switch to demo mode."""
    from pathlib import Path
    
    init_file = Path(__file__).parent.parent / "src" / "kandown" / "statics" / "init.js"
    content = init_file.read_text()
    
    # Verify init.js has the refactored mode detection logic
    assert "serverMode = 'demo'" in content
    assert "entering demo mode" in content
    assert "checkHealth" in content
    assert "initializeApp" in content
    assert "detectMode" in content


def test_api_factory_has_dynamic_import():
    """Test that api.js factory uses dynamic imports."""
    from pathlib import Path
    
    api_file = Path(__file__).parent.parent / "src" / "kandown" / "statics" / "api.js"
    content = api_file.read_text()
    
    # Verify dynamic imports exist
    assert "import('./api-cli.js')" in content
    assert "import('./api-demo.js')" in content
    assert "initializeAPIs" in content
    assert "getServerMode" in content
