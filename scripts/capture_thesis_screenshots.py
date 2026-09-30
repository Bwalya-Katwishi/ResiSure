"""Capture ResiSure UI screenshots for thesis document."""
import json
from pathlib import Path
import shutil
import sys

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Installing playwright...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "docs" / "thesis_assets"
ASSETS.mkdir(parents=True, exist_ok=True)
import os

BASE = os.environ.get("THESIS_SCREENSHOT_BASE", "https://15-134-236-93.sslip.io")
API_BASE = os.environ.get("THESIS_API_BASE", "https://15-134-236-93.sslip.io")
VIEWPORT = {"width": 1280, "height": 800}


def shot(page, name, url=None, wait_ms=2000, full_page=False):
    if url:
        page.goto(url, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(wait_ms)
    path = ASSETS / name
    page.screenshot(path=str(path), full_page=full_page)
    print(f"Wrote {path}")
    return path


def register_account(page, role, tag):
    email = f"thesis.{role}.{tag}@resisure.test"
    res = page.request.post(
        f"{API_BASE}/api/auth/register",
        data=json.dumps({
            "full_name": f"Thesis {role.title()} Demo",
            "email": email,
            "password": "password123",
            "phone": "0971234567",
            "role": role,
            "accepted_terms": True,
        }),
        headers={"Content-Type": "application/json"},
    )
    if res.status not in (200, 201):
        return login(page, email, "password123")
    body = res.json()
    token = body.get("token") or body.get("data", {}).get("token")
    if not token:
        return False
    page.goto(BASE, wait_until="domcontentloaded", timeout=60000)
    page.evaluate("(token) => localStorage.setItem('resisure_token', token)", token)
    page.reload(wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2000)
    return True


def login(page, email, password):
    res = page.request.post(
        f"{API_BASE}/api/auth/login",
        data=json.dumps({"email": email, "password": password}),
        headers={"Content-Type": "application/json"},
    )
    if not res.ok:
        return False
    body = res.json()
    token = body.get("token") or body.get("data", {}).get("token")
    if not token:
        return False
    page.goto(BASE, wait_until="domcontentloaded", timeout=60000)
    page.evaluate(
        """(token) => {
            localStorage.setItem('resisure_token', token);
        }""",
        token,
    )
    page.reload(wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2000)
    return True


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()

        shot(page, "fig09_landing_page.png", BASE, 3000, full_page=True)
        shot(page, "fig10_login_page.png", f"{BASE}/auth/login")
        shot(page, "fig11_register_page.png", f"{BASE}/auth/register")

        page.goto(f"{BASE}/properties", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(4000)
        shot(page, "fig12_properties_list.png")

        # Property detail — direct URL from API
        prop_res = page.request.get(f"{API_BASE}/api/properties?available=true&limit=1")
        if prop_res.ok:
            props = prop_res.json().get("data", {}).get("properties", [])
            if props:
                shot(page, "fig13_property_detail.png", f"{BASE}/properties/{props[0]['id']}", 3500)

        # Admin dashboard
        if login(page, "resisure.zm@gmail.com", "password123"):
            shot(page, "fig16_admin_dashboard.png", f"{BASE}/dashboard/admin", 4000)

        page.evaluate("() => localStorage.removeItem('resisure_token')")
        tag = str(int(__import__('time').time()))
        if register_account(page, "student", tag):
            shot(page, "fig14_student_dashboard.png", f"{BASE}/dashboard/student", 4000)
            token = page.evaluate("() => localStorage.getItem('resisure_token')")
            book_res = page.request.get(
                f"{API_BASE}/api/bookings/my",
                headers={"Authorization": f"Bearer {token}"},
            )
            bookings = []
            if book_res.ok:
                body = book_res.json()
                bookings = body.get("data", body.get("bookings", []))
                if isinstance(bookings, dict):
                    bookings = bookings.get("bookings", [])
            if not bookings:
                page.evaluate("() => localStorage.removeItem('resisure_token')")
                if login(page, "resisure.zm@gmail.com", "password123"):
                    admin_token = page.evaluate("() => localStorage.getItem('resisure_token')")
                    all_res = page.request.get(
                        f"{API_BASE}/api/admin/bookings",
                        headers={"Authorization": f"Bearer {admin_token}"},
                    )
                    if all_res.ok:
                        all_body = all_res.json()
                        bookings = all_body.get("data", all_body.get("bookings", []))
                        if isinstance(bookings, dict):
                            bookings = bookings.get("bookings", [])
            if bookings:
                shot(page, "fig15_booking_escrow_timeline.png", f"{BASE}/bookings/{bookings[0]['id']}", 4000)
            else:
                links = page.locator('a[href^="/bookings/"]')
                if links.count() > 0:
                    links.first.click()
                    page.wait_for_timeout(3000)
                    shot(page, "fig15_booking_escrow_timeline.png")

        page.evaluate("() => localStorage.removeItem('resisure_token')")
        if register_account(page, "landlord", tag):
            shot(page, "fig17_landlord_dashboard.png", f"{BASE}/dashboard/landlord", 4000)

        # Logo for title page
        logo_src = ROOT / "apps" / "web" / "public" / "logo.png"
        if logo_src.exists():
            shutil.copy2(logo_src, ASSETS / "resisure_logo.png")

        browser.close()


if __name__ == "__main__":
    main()
