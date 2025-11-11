"""Test URL parameter backlog loading in page mode."""

import pytest
from pathlib import Path
from playwright.sync_api import expect


@pytest.mark.e2e
def test_demo_mode_loads_backlog_from_url_parameter(page, context):
    """Test that page mode can load a backlog file from URL parameter."""
    # Create a test YAML file
    test_yaml_content = """settings:
  darkmode: false
  random_port: false
  store_images_in_subfolder: false
tasks:
- id: TEST-001
  text: "Test task from URL parameter"
  status: todo
  tags:
    - test
  order: 0
  type: feature
- id: TEST-002
  text: "Another test task"
  status: done
  tags:
    - test
  order: 0
  type: task
"""

    # Get the page directory
    demo_dir = Path(__file__).parent.parent / "page"
    test_file = demo_dir / "test-backlog.yaml"

    # Write test file
    test_file.write_text(test_yaml_content)

    try:
        # Start a simple HTTP server for the page
        import subprocess
        import time

        server_process = subprocess.Popen(
            ["python", "-m", "http.server", "8765"], cwd=str(demo_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        # Wait for server to start
        time.sleep(2)

        try:
            # Clear localStorage to ensure fresh start
            page.goto("http://localhost:8765/")
            page.evaluate("localStorage.clear()")

            # Navigate to page with backlog parameter
            page.goto("http://localhost:8765/?backlog=test-backlog.yaml")

            # Wait for page to load
            page.wait_for_selector("#todo-col")

            # Wait a bit for async initialization
            page.wait_for_timeout(1000)

            # Verify test tasks appear
            expect(page.locator("text=Test task from URL parameter")).to_be_visible()
            expect(page.locator("text=Another test task")).to_be_visible()

            # Verify the default page tasks are NOT present
            page_text = page.inner_text("body")
            assert "Welcome to Kandown Demo!" not in page_text
            assert "Try dragging me" not in page_text

        finally:
            server_process.terminate()
            server_process.wait()
    finally:
        # Clean up test file
        if test_file.exists():
            test_file.unlink()


@pytest.mark.e2e
def test_demo_mode_falls_back_to_default_on_invalid_url(page):
    """Test that page mode falls back to default tasks if URL parameter fails."""
    # Get the page directory
    demo_dir = Path(__file__).parent.parent / "page"

    # Start a simple HTTP server for the page
    import subprocess
    import time

    server_process = subprocess.Popen(
        ["python", "-m", "http.server", "8766"], cwd=str(demo_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )

    # Wait for server to start
    time.sleep(2)

    try:
        # Clear localStorage to ensure fresh start
        page.goto("http://localhost:8766/")
        page.evaluate("localStorage.clear()")

        # Navigate to page with invalid backlog parameter
        page.goto("http://localhost:8766/?backlog=nonexistent.yaml")

        # Wait for page to load
        page.wait_for_selector("#todo-col")

        # Wait for async initialization
        page.wait_for_timeout(1000)

        # Check that the default page tasks are loaded (fallback)
        expect(page.locator("text=Welcome to Kandown Demo!")).to_be_visible()

    finally:
        server_process.terminate()
        server_process.wait()


def test_get_backlog_url_parameter():
    """Test the URL parameter parsing function."""
    from pathlib import Path

    # Read the api-page.js file
    api_demo_file = Path(__file__).parent.parent / "src" / "kandown" / "statics" / "api-page.js"
    content = api_demo_file.read_text()

    # Verify the function exists
    assert "getBacklogUrlParameter" in content
    assert "URLSearchParams" in content
    assert "backlog" in content or "file" in content


def test_load_backlog_from_url_function():
    """Test the load backlog from URL function."""
    from pathlib import Path

    # Read the api-page.js file
    api_demo_file = Path(__file__).parent.parent / "src" / "kandown" / "statics" / "api-page.js"
    content = api_demo_file.read_text()

    # Verify the function exists
    assert "loadBacklogFromUrl" in content
    assert "fetch" in content
    assert "jsyaml" in content
