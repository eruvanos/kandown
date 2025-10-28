"""Test the health check endpoint."""

import json
from pathlib import Path

import requests


def test_health_endpoint_returns_ok(kandown_server):
    """Test that the health endpoint returns the correct response."""
    response = requests.get(f"{kandown_server}/api/health")

    assert response.status_code == 200
    data = response.json()

    assert data["available"] is True


def test_demo_health_file_content():
    """Test that the demo health file has the correct content."""
    demo_health_file = Path(__file__).parent.parent / "demo" / "api" / "health"

    assert demo_health_file.exists(), "Demo health file should exist"

    content = demo_health_file.read_text()
    data = json.loads(content)

    assert data["available"] is False
