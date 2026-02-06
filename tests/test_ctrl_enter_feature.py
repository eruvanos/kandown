"""Test for Ctrl+Enter to create another task feature."""

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.e2e
def test_ctrl_enter_creates_another_task(page: Page, kandown_server):
    """Test that Ctrl+Enter saves current task and creates another in same column."""
    page.goto(kandown_server)
    
    # Add a task in To Do column
    page.get_by_role("heading", name="📝 To Do +").locator("span").click()
    
    # Wait for textarea to appear
    expect(page.get_by_role("textbox")).to_be_visible()
    
    # Check that keyboard hint is visible
    expect(page.get_by_text("Ctrl/Cmd+Enter to save and create another task")).to_be_visible()
    
    # Fill in task text
    page.get_by_role("textbox").fill("First task")
    
    # Press Ctrl+Enter (or Cmd+Enter on Mac)
    page.get_by_role("textbox").press("Control+Enter")
    
    # Wait a moment for the first task to save and second task to be created
    page.wait_for_timeout(500)
    
    # Verify first task exists with the text we entered
    expect(page.get_by_text("First task")).to_be_visible()
    
    # Verify a new textarea appeared for the second task
    expect(page.get_by_role("textbox")).to_be_visible()
    
    # Fill in second task
    page.get_by_role("textbox").fill("Second task")
    
    # Press Ctrl+Enter again
    page.get_by_role("textbox").press("Control+Enter")
    
    # Wait for second task to save and third task to be created
    page.wait_for_timeout(500)
    
    # Verify both tasks exist
    expect(page.get_by_text("First task")).to_be_visible()
    expect(page.get_by_text("Second task")).to_be_visible()
    
    # Verify third textarea appeared
    expect(page.get_by_role("textbox")).to_be_visible()
    
    # Click outside to cancel editing the third task
    page.get_by_text("Kanban Board").click()
    
    # Verify the hint is no longer visible
    expect(page.get_by_text("Ctrl/Cmd+Enter to save and create another task")).not_to_be_visible()


@pytest.mark.e2e
def test_keyboard_hint_appears_on_edit(page: Page, kandown_server):
    """Test that keyboard hint appears when editing a task."""
    page.goto(kandown_server)
    
    # Add a task
    page.get_by_role("heading", name="📝 To Do +").locator("span").click()
    expect(page.locator("textarea.edit-input")).to_be_visible()
    page.locator("textarea.edit-input").fill("Test task")
    page.get_by_text("Kanban Board").click()
    
    # Wait for task to be created
    page.wait_for_timeout(500)
    
    # Click on the task to edit it
    page.get_by_text("Test task").click()
    
    # Verify textarea appears
    expect(page.locator("textarea.edit-input")).to_be_visible()
    
    # Verify keyboard hint is visible when editing
    expect(page.get_by_text("Ctrl/Cmd+Enter to save and create another task")).to_be_visible()
    
    # Press Escape to cancel
    page.locator("textarea.edit-input").press("Escape")
    
    # Verify hint is no longer visible
    expect(page.get_by_text("Ctrl/Cmd+Enter to save and create another task")).not_to_be_visible()
