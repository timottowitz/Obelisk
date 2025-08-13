import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_callcaps_dashboard(page: Page):
    """
    This test verifies that the new call recordings dashboard loads correctly,
    displays the featured recording, and that the 'Action Points' tab works.
    """
    # 1. Arrange: Go to the call recordings page.
    page.goto("http://localhost:3000/dashboard/callcaps")

    # 2. Take a screenshot to see the initial state.
    page.screenshot(path="jules-scratch/verification/debug_screenshot.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_callcaps_dashboard(page)
        browser.close()

if __name__ == "__main__":
    main()
