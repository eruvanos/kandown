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


def test_board_css_contains_mobile_layout_rules(kandown_server):
    """Test mobile board CSS rules are present in served board.css."""
    response = requests.get(f"{kandown_server}/statics/board.css")
    assert response.status_code == 200
    css = response.text
    assert "@media (max-width: 768px)" in css
    assert ".board > .column:not(.icebox-column)" in css
    assert "scroll-snap-type: x mandatory;" in css
    assert "--icebox-mobile-peek" in css
    assert "transform: translateX(calc(-100% + var(--icebox-mobile-peek)))" in css


def test_board_js_contains_mobile_swipe_support(kandown_server):
    """Test mobile swipe setup for horizontal board navigation is present in served board.js."""
    response = requests.get(f"{kandown_server}/statics/board.js")
    assert response.status_code == 200
    js = response.text
    assert "function setupMobileBoardSwipe()" in js
    assert "board.addEventListener('touchstart'" in js
    assert "board.addEventListener('touchmove'" in js
    assert "board.addEventListener('touchend'" in js
    assert "querySelectorAll('.column:not(.icebox-column)')" in js
    assert "setupMobileBoardSwipe();" in js


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
