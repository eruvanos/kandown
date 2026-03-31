import re
import pytest
from playwright.sync_api import Page, expect


# Basic Playwright E2E test using pytest
# Run with: pytest tests/test_e2e.py


@pytest.mark.e2e
def test_page_loads(page: Page, kandown_server):
    """Test that the homepage loads and shows the Kanban board."""
    page.goto(kandown_server)
    expect(page).to_have_title(re.compile("Kandown", re.I))
    expect(page.get_by_role("heading", name="Kanban Board")).to_be_visible()


@pytest.mark.e2e
def test_icebox_column_is_collapsed_by_default_and_can_be_expanded(page: Page, kandown_server):
    """Icebox starts as a thin collapsed column and can be expanded/collapsed via toggle."""
    page.goto(kandown_server)

    icebox_col = page.locator("#icebox-col")
    toggle_btn = page.locator("#icebox-toggle")

    expect(icebox_col).to_have_class(re.compile(r"\bis-collapsed\b"))
    expect(toggle_btn).to_have_text("▶")

    toggle_btn.click(force=True)
    expect(icebox_col).not_to_have_class(re.compile(r"\bis-collapsed\b"))
    expect(toggle_btn).to_have_text("◀")
    expect(page.locator("#icebox-col .icebox-title")).to_be_visible()

    toggle_btn.click(force=True)
    expect(icebox_col).to_have_class(re.compile(r"\bis-collapsed\b"))
    expect(toggle_btn).to_have_text("▶")


@pytest.mark.e2e
def test_can_add_task_to_icebox_column(page: Page, kandown_server):
    """Users can expand Icebox and create tasks directly in that column."""
    page.goto(kandown_server)

    page.locator("#icebox-toggle").click()
    page.locator("#icebox-col .add-task").click()

    expect(page.locator("#icebox-col .task")).to_have_count(1)
    expect(page.locator("#icebox-col").get_by_text("K-001")).to_be_visible()

    tasks = page.evaluate("""
        async () => {
            const response = await fetch('/api/tasks');
            return await response.json();
        }
    """)
    assert len(tasks) == 1
    assert tasks[0]["status"] == "icebox"


@pytest.mark.e2e
def test_add_task(page: Page, kandown_server):
    """Test adding a new task."""
    page.goto(kandown_server)

    page.evaluate("() => window.localStorage.clear()")
    page.evaluate("() => window.sessionStorage.clear()")
    page.reload()

    # click the add task button
    page.locator("#todo-col .add-task").click()
    expect(page.get_by_text("K-001")).to_be_visible()
    expect(page.get_by_role("textbox")).to_be_visible()

    # fill in the task description
    page.get_by_role("textbox").click()
    page.get_by_role("textbox").fill("- [ ] task 1\n- [ ] task 2\n")
    page.get_by_text("Kanban Board").click()
    expect(page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox")).to_be_visible()
    expect(page.get_by_role("listitem").filter(has_text="task 2").get_by_role("checkbox")).to_be_visible()

    # mark task 1 as done
    page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox").check()
    expect(page.get_by_role("listitem").filter(has_text="task 1").get_by_role("checkbox")).to_be_visible()

    # move task to in-progress
    page.get_by_text("K-001 task 1 task 2 ⏳Last").drag_to(page.locator("#inprogress-col"))
    page.wait_for_timeout(500)  # wait for drag-and-drop to complete
    expect(page.locator("#inprogress-col").get_by_text("K-001 task 1 task 2 ⏳Last"))

    # move task to done
    page.get_by_text("K-001 task 1 task 2 ⏳Last").drag_to(page.locator("#done-col"))
    page.wait_for_timeout(500)  # wait for drag-and-drop to complete
    expect(page.locator("#done-col").get_by_text("K-001 task 1 task 2 ⏳Last"))
    expect(page.locator("#done-col .collapse-arrow")).to_have_text("▶")

    # task is collapsed and strikethrough
    expect(page.locator("#done-col").locator("s")).to_contain_text("task 1")
    expect(page.locator("#done-col")).not_to_have_text("task 2")

    # expand task details
    page.locator("#done-col .collapse-arrow").click()
    expect(page.get_by_text("▼")).to_be_visible()
    expect(page.get_by_text("task 1")).to_be_visible()
    expect(page.get_by_text("task 2")).to_be_visible()

    # delete the task
    page.get_by_text("❌").click()
    expect(page.get_by_text("Delete Task?This action")).to_be_visible()
    page.get_by_role("button", name="Delete").click()
