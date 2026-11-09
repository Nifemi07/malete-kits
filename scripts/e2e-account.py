"""E2E: customer sign-in flow on #/account + storefront checks.

Walks the real UI: open login page -> request code (code read from dev log,
since no email provider is configured in dev) -> enter OTP -> expect the
signed-in account view. Also checks the WhatsApp link is live in the footer.
"""
import glob
import re
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
DEV_LOG = "/tmp/dev.log"


def latest_code(email: str) -> str | None:
    codes = []
    for path in glob.glob("/tmp/dev.log") + glob.glob(
        "/tmp/zcode-bash-*/sess_*/call_*-stdout.log"
    ):
        try:
            with open(path, "r", errors="ignore") as f:
                for line in f:
                    if email in line and "[DEV ONLY]" in line:
                        m = re.search(r"(\d{6})\s*$", line.strip())
                        if m:
                            codes.append(m.group(1))
        except OSError:
            continue
    return codes[-1] if codes else None


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto(f"{BASE}/#/account", wait_until="networkidle")
    page.wait_for_timeout(800)

    # 1. Login form visible?
    assert page.locator("text=Sign In").first.is_visible(), "Sign In heading missing"
    page.screenshot(path="/tmp/render/account-login.png", full_page=True)
    print("OK login form renders — screenshot saved")

    # 2. Header/footer nav links present
    assert page.locator("nav >> text=My Account").first.is_visible(), "header link missing"
    assert page.locator("text=My Account").count() >= 2, "footer link missing"
    print("OK My Account in header nav + footer")

    # 3. Request a code (fresh email per run — the 3-per-15min limit is per email)
    email = f"e2e.{int(time.time())}@example.com"
    page.fill("#acct-email", email)
    page.click("button:has-text('Email me a code')")
    page.wait_for_selector("text=Code sent to", timeout=15000)
    print("OK code screen reached")

    # 4. Enter the OTP from the dev log (input-otp renders one real input + slot divs).
    # The view auto-verifies on the 6th digit, so the button may vanish on success.
    code = latest_code(email)
    assert code, "no DEV ONLY code found in logs"
    page.locator("[data-slot='input-otp']").click()
    page.keyboard.type(code)
    try:
        page.wait_for_selector("text=My Orders", timeout=8000)
        print("OK auto-verified on 6th digit")
    except Exception:
        page.screenshot(path="/tmp/render/account-otp-debug.png", full_page=True)
        page.get_by_role("button", name="Verify & sign in").click(timeout=8000)
        page.wait_for_selector("text=My Orders", timeout=15000)
    page.wait_for_timeout(600)
    page.wait_for_selector("text=My Orders", timeout=15000)
    page.wait_for_timeout(600)
    assert page.locator("text=Verified").first.is_visible(), "Verified badge missing"
    assert page.locator("text=No orders yet").first.is_visible(), "empty-state missing"
    page.screenshot(path="/tmp/render/account-signed-in.png", full_page=True)
    print(f"OK signed in as {email}, verified badge + empty orders shown — screenshot saved")

    # 5. Storefront: WhatsApp link live in footer
    page.goto(f"{BASE}/#/", wait_until="networkidle")
    page.wait_for_timeout(800)
    hrefs = page.eval_on_selector_all(
        "a[href*='wa.me']", "els => els.map(e => e.getAttribute('href'))"
    )
    assert any("2349134980059" in (h or "") for h in hrefs), f"wa.me link wrong: {hrefs}"
    print(f"OK storefront WhatsApp links live: {hrefs}")
    page.screenshot(path="/tmp/render/home-footer-whatsapp.png", full_page=True)

    browser.close()
    print("ALL E2E CHECKS PASSED")
