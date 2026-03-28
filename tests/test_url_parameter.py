"""Test URL parameter backlog loading in page mode."""

import pytest
from pathlib import Path
from playwright.sync_api import expect

@pytest.fixture(autouse=True, scope="session")
def build(pytestconfig):
    """Clean and build the page."""
    import subprocess

    root = pytestconfig.rootpath

    subprocess.run(["uv", "run", "python", root / "scripts/clean_page.py"], check=True)
    subprocess.run(["uv", "run", "python", root / "scripts/build_page.py"], check=True)

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
            ["uv", "run", "python", "-m", "http.server", "8765"], cwd=str(demo_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        # Wait for server to start
        time.sleep(2)

        # Ensure server running
        assert server_process.poll() is None

        try:
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
def test_demo_mode_handles_file_not_available(page):
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
        # Navigate to page with invalid backlog parameter
        page.goto("http://localhost:8766/?backlog=nonexistent.yaml")

        # Wait for async initialization
        page.wait_for_timeout(1000)

        # Check that the default page tasks are loaded (fallback)
        expect(page.locator("text=Try Kandown yourself")).to_be_visible()

    finally:
        server_process.terminate()
        server_process.wait()
