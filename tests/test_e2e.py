import re
import pytest
from playwright.sync_api import Page, expect
import tempfile
import socket
import subprocess
import time


@pytest.fixture()
def kandown_server():
    """Start the kandown CLI on a random port with a temporary file, yield the URL, and shut down after test."""
    # Find a free port
    sock = socket.socket()
    sock.bind(("localhost", 0))
    port = sock.getsockname()[1]
    sock.close()

    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    temp_file.close()

    # Start the CLI subprocess
    proc = subprocess.Popen(["python", "-m", "src.kandown.cli", temp_file.name, "--port", str(port)])

    # Wait for the server to start by polling the port
    start_time = time.time()
    timeout = 10  # seconds
    while True:
        try:
            test_sock = socket.create_connection(("localhost", port), timeout=1)
            test_sock.close()
            break  # Port is open
        except (ConnectionRefusedError, OSError):
            if time.time() - start_time > timeout:
                proc.terminate()
                proc.wait()
                raise RuntimeError(f"Server did not start on port {port} within {timeout} seconds.")
            time.sleep(0.1)
    url = f"http://localhost:{port}"
    try:
        yield url
    finally:
        proc.terminate()
        proc.wait()


# Basic Playwright E2E test using pytest
# Run with: pytest tests/test_e2e.py


@pytest.mark.e2e
def test_page_loads(page: Page, kandown_server):
    """Test that the homepage loads and shows the Kanban board."""
    page.goto(kandown_server)
    expect(page).to_have_title(re.compile("Kandown", re.I))
    expect(page.get_by_role("heading", name="Kanban Board")).to_be_visible()


@pytest.mark.e2e
def test_add_task(page: Page, kandown_server):
    """Test adding a new task."""
    page.goto(kandown_server)

    # click the add task button
    page.get_by_role("heading", name="📝 To Do ➕").locator("span").click()
    expect(page.get_by_text("K-001❌")).to_be_visible()
    expect(page.get_by_role("textbox")).to_be_visible()

    # fill in the task description
    page.get_by_role("textbox").click()
    page.get_by_role("textbox").fill("- [ ] task 1\n- [ ] task 2\n")
    page.get_by_text("Kanban Board 📝 To Do ➕ K-001").click()
    expect(page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox")).to_be_visible()
    expect(page.get_by_role("listitem").filter(has_text="task 2").get_by_role("checkbox")).to_be_visible()

    # mark task 1 as done
    page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox").check()
    expect(page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox")).to_be_visible()

    # move task to in-progress
    page.get_by_text("K-001❌ task 1 task 2 ⏳Last").drag_to(page.locator("#inprogress-col"))
    expect(page.locator("#inprogress-col").get_by_text("K-001❌ task 1 task 2 ⏳Last"))

    # move task to done
    page.get_by_text("K-001❌ task 1 task 2 ⏳Last").drag_to(page.locator("#done-col"))
    expect(page.locator("#done-col").get_by_text("K-001❌ task 1 task 2 ⏳Last"))
    expect(page.get_by_text("▶")).to_be_visible()

    # task is collapsed and strikethrough
    expect(page.locator("#done-col").locator("s")).to_contain_text("task 1")
    expect(page.locator("#done-col")).not_to_have_text("task 2")

    # expand task details
    page.get_by_text("▶").click()
    expect(page.get_by_text("▼")).to_be_visible()
    expect(page.get_by_text("task 1")).to_be_visible()
    expect(page.get_by_text("task 2")).to_be_visible()

    # delete the task
    page.get_by_text("❌").click()
    expect(page.get_by_text("Delete Task?This action")).to_be_visible()
    page.get_by_role("button", name="Delete").click()
