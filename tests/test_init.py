"""Test that the server serves static files, index, and health correctly."""

from pathlib import Path
import requests

STATICS_DIR = Path(__file__).parent.parent / "src" / "kandown" / "statics"


def test_board_js_matches_source(kandown_server):
    """Test that the served board.js matches the source file exactly."""
    expected = (STATICS_DIR / "board.js").read_text()
    response = requests.get(f"{kandown_server}/statics/board.js")
    assert response.status_code == 200
    assert response.text == expected


def test_visibility_css_matches_source(kandown_server):
    """Test that the served visibility.css matches the source file exactly."""
    expected = (STATICS_DIR / "visibility.css").read_text()
    response = requests.get(f"{kandown_server}/statics/visibility.css")
    assert response.status_code == 200
    assert response.text == expected


def test_index_is_served(kandown_server):
    """Test that the index page is served at the root URL."""
    response = requests.get(kandown_server)
    assert response.status_code == 200
    assert "text/html" in response.headers["Content-Type"]
    assert "<html" in response.text


def test_health_endpoint(kandown_server):
    """Test that the health endpoint returns the expected JSON payload."""
    response = requests.get(f"{kandown_server}/api/health")
    assert response.status_code == 200
    assert response.headers["Content-Type"].startswith("application/json")
    data = response.json()
    assert data == {"available": True}
