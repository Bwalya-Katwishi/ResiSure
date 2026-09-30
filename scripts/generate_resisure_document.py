"""Generate ResiSure project overview Word document."""
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

OUTPUT = Path(__file__).resolve().parent.parent / "docs" / "ResiSure_Project_Overview.docx"


def add_heading(doc, text, level=1):
    return doc.add_heading(text, level=level)


def add_para(doc, text, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    return p


def add_bullets(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def add_numbered(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Number")


def build_document():
    doc = Document()

    # Title page
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("ResiSure")
    run.bold = True
    run.font.size = Pt(28)
    run.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub = subtitle.add_run("Escrow-Enabled Student Accommodation Platform\nProject Overview & Recommendations")
    sub.font.size = Pt(14)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.add_run(
        f"\nAuthor: Bwalya Katwishi\n"
        f"Institution: University of Zambia — CSC 4004 Final Year Project\n"
        f"Document date: {date.today().strftime('%d %B %Y')}\n"
    ).italic = True

    doc.add_page_break()

    # Table of contents placeholder
    add_heading(doc, "Table of Contents", 1)
    toc_items = [
        "1. Executive Summary",
        "2. Project Purpose",
        "3. Technology Stack",
        "4. System Architecture",
        "5. User Roles & Features",
        "6. Database Design",
        "7. Authentication & Verification",
        "8. Booking & Escrow Flow",
        "9. Payments Integration",
        "10. API Reference Summary",
        "11. Web Application",
        "12. Mobile Application",
        "13. Deployment & CI/CD",
        "14. Testing",
        "15. Current Limitations",
        "16. Recommendations",
    ]
    add_bullets(doc, toc_items)
    doc.add_page_break()

    # 1. Executive Summary
    add_heading(doc, "1. Executive Summary", 1)
    add_para(
        doc,
        "ResiSure is a full-stack accommodation marketplace designed for Zambian university students "
        "(primarily around UNZA and Lusaka). It connects students with landlords who list verified rooms, "
        "and protects rent payments through an escrow model: funds are held until the student confirms move-in "
        "or an admin resolves a dispute."
    )
    add_para(doc, "The platform consists of three applications in a single monorepo:")
    add_bullets(doc, [
        "REST API (Node.js / Express 5 / PostgreSQL)",
        "Web application (Next.js 14 / React / Tailwind CSS)",
        "Mobile application (Expo / React Native)",
    ])

    # 2. Purpose
    add_heading(doc, "2. Project Purpose", 1)
    add_para(doc, "ResiSure addresses common problems in student housing:")
    add_bullets(doc, [
        "Students struggle to trust unknown landlords and fear losing money before seeing a room.",
        "Landlords need a credible channel to reach verified student tenants.",
        "Admins must review identity documents and listing quality before rooms appear publicly.",
        "Payments should not reach the landlord until the student confirms the room matches the listing.",
    ])
    add_para(doc, "Core value proposition: verified listings, identity-checked users, and payment protection until move-in confirmation.")

    # 3. Tech stack
    add_heading(doc, "3. Technology Stack", 1)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Layer"
    hdr[1].text = "Technologies"
    rows = [
        ("API", "Node.js 20+, Express 5, PostgreSQL (pg), JWT, bcrypt, Multer, node-cron"),
        ("Web", "Next.js 14, React 18, Tailwind CSS, axios, lucide-react"),
        ("Mobile", "Expo 53, React Native 0.79, React Navigation 7, AsyncStorage"),
        ("Payments", "Mock provider + MTN MoMo + Airtel Money adapters"),
        ("Storage", "Local uploads or Cloudinary (properties, profiles, verification docs)"),
        ("Messaging", "Optional SMTP email, Africa's Talking / Twilio SMS"),
        ("Deployment", "Native Windows (PowerShell scripts, optional PM2)"),
        ("CI", "GitHub Actions with PostgreSQL service + Jest"),
    ]
    for layer, tech in rows:
        row = table.add_row().cells
        row[0].text = layer
        row[1].text = tech

    # 4. Architecture
    add_heading(doc, "4. System Architecture", 1)
    add_para(doc, "Repository structure (npm workspaces):")
    add_bullets(doc, [
        "apps/api — backend server on port 5000",
        "apps/web — Next.js frontend on port 3000",
        "apps/mobile — Expo client pointing at the API",
        "docs/ — deployment, payment, and audit documentation",
        "scripts/ — production setup/start/stop and utility scripts",
    ])
    add_para(doc, "Request flow:")
    add_numbered(doc, [
        "Web/mobile clients authenticate with JWT (Bearer token).",
        "Clients call REST endpoints under /api/*.",
        "Services enforce role-based access (student, landlord, admin).",
        "PostgreSQL stores users, profiles, listings, bookings, escrow transactions, and audit logs.",
        "A cron job runs every 5 minutes for move-in windows, reminders, and auto-release.",
    ])

    # 5. Roles
    add_heading(doc, "5. User Roles & Features", 1)

    add_heading(doc, "5.1 Student", 2)
    add_bullets(doc, [
        "Register and log in (terms acceptance required).",
        "Browse verified property listings with filters (area, price, type, amenities, verified landlord).",
        "Save favorite listings.",
        "Upload profile photo and update contact details.",
        "Submit verification documents: NRC number, NRC document, and university confirmation slip (or equivalent).",
        "Request bookings on verified listings.",
        "Pay rent via mobile money (mock or live providers).",
        "Confirm move-in or raise a dispute during the move-in window.",
        "View booking history, payment status, and notifications.",
        "Dashboard shows recommended rooms (verified landlords ranked first).",
    ])

    add_heading(doc, "5.2 Landlord", 2)
    add_bullets(doc, [
        "Register and receive a landlord profile (verification status: pending).",
        "Upload NRC number, NRC document, and land title / proof-of-ownership document.",
        "Create, edit, and delete property listings with up to 5 photos each.",
        "Submit listings for admin review (pending → under_review → verified/rejected).",
        "Accept or reject incoming booking requests.",
        "View protected payments and released funds ledger.",
        "Receive notifications when verified or when bookings change state.",
    ])

    add_heading(doc, "5.3 Admin", 2)
    add_bullets(doc, [
        "Seeded account only (admin@resisure.zm) — cannot self-register.",
        "Dashboard tabs: Overview, Landlords, Students, Properties, Bookings, Disputes, Audit.",
        "Click individual landlord accounts to review NRC and land documents, then verify or reject.",
        "Click individual student accounts to review NRC and university confirmation slip, then verify or reject.",
        "Approve or reject property listings (rejection requires a reason).",
        "Resolve disputes by refunding the student or releasing funds to the landlord.",
        "View platform audit logs and aggregate statistics.",
    ])

    # 6. Database
    add_heading(doc, "6. Database Design", 1)
    add_para(doc, "PostgreSQL with 8 migrations (001–008). Key tables:")
    add_bullets(doc, [
        "users — accounts with roles (student, landlord, admin), profile photo URL",
        "landlord_profiles — NRC, separate NRC/land documents, verification status",
        "student_profiles — NRC, university slip, verification status (migration 008)",
        "properties — listings with verification lifecycle, amenities, room inventory",
        "property_images — up to 5 images per listing",
        "bookings — full booking state machine",
        "escrow_transactions — capture, release, refund records",
        "booking_audit_log — per-booking status transitions",
        "disputes — student-raised issues with admin resolution",
        "notifications — in-app messages with optional links",
        "audit_logs — platform-wide admin/system actions",
        "favorites — student saved listings",
    ])

    # 7. Verification
    add_heading(doc, "7. Authentication & Verification", 1)
    add_heading(doc, "7.1 Authentication", 2)
    add_bullets(doc, [
        "JWT tokens (default 7-day expiry) issued on register/login.",
        "Passwords hashed with bcrypt (cost factor 12).",
        "Rate limiting on login/register (20 requests per 15 minutes).",
        "Profile updates via PATCH /api/auth/me; photo upload via POST /api/auth/me/photo.",
        "Not yet implemented: password reset, refresh tokens, server-side logout.",
    ])

    add_heading(doc, "7.2 Landlord Verification", 2)
    add_numbered(doc, [
        "Landlord submits NRC number + NRC document + land document.",
        "Documents stored securely (local opaque refs or Cloudinary); never publicly served.",
        "Admin opens individual landlord account, reviews both documents, verifies or rejects.",
        "Verified landlords show a badge on listing detail pages.",
        "Browse/recommendations can filter or rank by verified landlord status.",
    ])

    add_heading(doc, "7.3 Student Verification", 2)
    add_numbered(doc, [
        "Student submits NRC number + NRC document + university confirmation slip.",
        "Admin reviews both documents from the Students tab (click-to-review panel).",
        "On approval, users.is_verified is set and student receives a notification.",
        "Note: booking API currently does not block unverified students (recommended fix).",
    ])

    add_heading(doc, "7.4 Property Verification", 2)
    add_numbered(doc, [
        "New listings start as pending.",
        "Landlord submits for review → under_review.",
        "Admin approves or rejects with optional rejection reason.",
        "Only verified listings appear on public browse.",
        "Material edits to verified listings reset verification to pending.",
        "Students can only book verified listings.",
    ])

    # 8. Booking
    add_heading(doc, "8. Booking & Escrow Flow", 1)
    add_para(doc, "Booking states:")
    add_bullets(doc, [
        "pending → accepted → escrow_held or move_in_window → confirmed → completed",
        "pending/accepted → rejected or cancelled (before payment)",
        "move_in_window → disputed → refunded or completed (admin release)",
        "move_in_window → timed_out → completed (auto-release after 72 hours)",
    ])
    add_para(doc, "End-to-end flow:")
    add_numbered(doc, [
        "Student requests a booking on a verified listing.",
        "Landlord accepts (available room count decremented) or rejects.",
        "Student pays; funds captured into escrow (not sent to landlord yet).",
        "If move-in date is today or past, move-in window opens immediately; otherwise cron opens it on the date.",
        "Student confirms move-in → funds released to landlord → booking completed.",
        "Student raises dispute → funds frozen → admin refunds or releases.",
        "If student does nothing for 72 hours in the window, cron auto-releases to landlord.",
    ])

    # 9. Payments
    add_heading(doc, "9. Payments Integration", 1)
    add_bullets(doc, [
        "Mock provider for development/demo (phone ending 000 = fail, 111 = pending).",
        "MTN MoMo Collection (096/076 prefixes) and Airtel Money (097/077) when credentials configured.",
        "Live charges return pending; escrow finalizes only after webhook or status poll confirms success.",
        "Webhooks: POST /api/payments/webhooks/:provider (protected by PAYMENTS_WEBHOOK_SECRET).",
        "Amount always taken from server-side booking record (client cannot set price).",
        "Unique indexes prevent double capture, release, or refund.",
    ])

    # 10. API
    add_heading(doc, "10. API Reference Summary", 1)
    add_para(doc, "Base URL: http://localhost:5000 (development)")
    api_groups = [
        ("Health", "GET /health, GET /ready"),
        ("Auth", "POST /register, /login; GET/PATCH /me; POST /me/photo"),
        ("Properties", "CRUD, image upload, submit-review, public browse with filters"),
        ("Bookings", "Create, pay, confirm, dispute, cancel; landlord accept/reject; admin resolve"),
        ("Landlords", "GET /me, POST /me/verification, GET verification documents"),
        ("Students", "GET /me, POST /me/verification, GET verification documents"),
        ("Favorites", "GET/POST/DELETE (students only)"),
        ("Admin", "Stats, users, landlords, students, properties, bookings, disputes, audit logs, verify endpoints"),
        ("Payments", "GET /methods, POST /webhooks/:provider"),
        ("Notifications", "GET list, mark read"),
    ]
    for group, endpoints in api_groups:
        p = doc.add_paragraph()
        p.add_run(f"{group}: ").bold = True
        p.add_run(endpoints)

    # 11. Web
    add_heading(doc, "11. Web Application", 1)
    add_para(doc, "Key pages:")
    add_bullets(doc, [
        "/ — marketing homepage with search",
        "/properties — browse with filters and recommended sort",
        "/properties/[id] — listing detail and booking",
        "/favorites — saved rooms (students)",
        "/bookings/[id] — pay, confirm move-in, dispute",
        "/auth/login, /auth/register",
        "/dashboard/student — profile, verification, bookings, recommendations",
        "/dashboard/landlord — listings, verification, bookings, released funds",
        "/dashboard/admin — full admin console with clickable account review panels",
        "/legal/terms, /legal/privacy",
    ])
    add_para(doc, "Shared components include Layout/Navbar, PropertyCard, ProfileForm (Update profile + photo upload), BookingStepper, VerifiedBadge, and NotificationBell.")

    # 12. Mobile
    add_heading(doc, "12. Mobile Application", 1)
    add_bullets(doc, [
        "Expo app with role-based bottom tab navigation.",
        "Screens: Login, Register, Properties, Property Detail, Favorites, Bookings, Booking Detail, Notifications, Account.",
        "Landlord: Listings, Listing Form, booking requests.",
        "Admin: AdminHomeScreen with verify actions.",
        "Configure EXPO_PUBLIC_API_URL to point at the API; CORS_ALLOW_ALL may be needed in local dev.",
    ])

    # 13. Deployment
    add_heading(doc, "13. Deployment & CI/CD", 1)
    add_heading(doc, "13.1 Local Development", 2)
    add_numbered(doc, [
        "Install Node.js 20+ and PostgreSQL.",
        "npm install from repository root.",
        "Copy apps/api/.env and apps/web/.env.local from examples.",
        "Create database, run npm run migrate.",
        "Optional: npm run seed (creates admin account only).",
        "Start API (npm run dev:api) and web (npm run dev:web).",
    ])
    add_heading(doc, "13.2 Production (Windows)", 2)
    add_bullets(doc, [
        "npm run production:setup — install, migrate, build web",
        "npm run production:start / production:stop / production:status",
        "Use HTTPS reverse proxy (IIS, Caddy, or Nginx) for public hosts",
        "Set JWT_SECRET (≥32 chars), CORS_ALLOW_ALL=false, live payment credentials",
    ])
    add_heading(doc, "13.3 CI", 2)
    add_para(doc, "GitHub Actions runs API tests against PostgreSQL and builds the Next.js app on push/PR to main. Mobile is not in CI yet.")

    # 14. Testing
    add_heading(doc, "14. Testing", 1)
    add_para(doc, "API tests (Jest + Supertest, ~30 tests) in apps/api/tests/:")
    add_bullets(doc, [
        "health.test.js — liveness and readiness",
        "auth.test.js — registration, login, profile update",
        "authorization.test.js — role guards and IDOR protection",
        "escrow.e2e.test.js — full booking → pay → confirm → dispute flow",
        "favorites.test.js — favorites CRUD",
        "payments.test.js — phone routing, webhook auth",
    ])
    add_para(doc, "Run with: npm test (from apps/api or root). Utility: npm run cleanup:test-accounts removes demo/test student and landlord accounts.")

    # 15. Limitations
    add_heading(doc, "15. Current Limitations", 1)
    add_bullets(doc, [
        "Seed script now only creates the admin account; README demo student/landlord accounts were removed.",
        "Student verification is not enforced at booking time (UI and admin flow exist).",
        "Landlord verification is not required before creating listings.",
        "No password reset or refresh token flow.",
        "JWT stored in localStorage on web (XSS exposure risk).",
        "Mock payments default unless live MTN/Airtel credentials are configured.",
        "Room inventory is count-based, not calendar/date-range based.",
        "Cron runs every 5 minutes (not real-time for move-in windows).",
        "No automated mobile app tests in CI.",
        "Local file storage is not ideal for multi-server production without Cloudinary.",
        "Partial refunds are not supported in dispute resolution.",
    ])

    # 16. Recommendations
    add_heading(doc, "16. Recommendations", 1)

    add_heading(doc, "16.1 High Priority", 2)
    rec_high = [
        "Enforce student verification before allowing bookings — align API with admin messaging.",
        "Require landlord verification before listings enter the review queue (or before accepting bookings).",
        "Implement password reset via email for production readiness.",
        "Move JWT to httpOnly secure cookies on web to reduce XSS token theft.",
        "Update README to match current seed behaviour (admin-only) or restore controlled demo data for development.",
        "Configure Cloudinary and live payment credentials before any public launch.",
    ]
    add_numbered(doc, rec_high)

    add_heading(doc, "16.2 Medium Priority", 2)
    rec_med = [
        "Expand automated tests for student/landlord verification, property submit-review, and admin student verify.",
        "Add mobile build/lint step to GitHub Actions.",
        "Add webhook integration tests for MTN/Airtel callback flows.",
        "Implement calendar-based availability if double-booking by date is a business requirement.",
        "Add landlord response/evidence upload during disputes.",
        "Enable Expo push notifications for booking and verification events.",
    ]
    add_numbered(doc, rec_med)

    add_heading(doc, "16.3 Lower Priority / Future Enhancements", 2)
    rec_low = [
        "Refresh tokens or shorter-lived JWT with silent re-authentication.",
        "Partial refund support for admin dispute resolution.",
        "Real-time notifications via WebSockets instead of polling.",
        "Landlord analytics dashboard (views, conversion, occupancy).",
        "Multi-university support with institution-specific verification rules.",
        "Zamtel Money integration when a collection API becomes available.",
    ]
    add_numbered(doc, rec_low)

    add_heading(doc, "16.4 Operational Recommendations", 2)
    add_bullets(doc, [
        "Never run npm run seed with default passwords on a public server.",
        "Run npm run cleanup:test-accounts before demos to remove leftover test users.",
        "Schedule PostgreSQL backups and test restore procedures.",
        "Monitor /ready endpoint and escrow cron logs in production.",
        "Use ALLOW_MOCK_PAYMENTS=true only on clearly labelled demo environments.",
    ])

    # Footer
    doc.add_page_break()
    add_heading(doc, "Document Information", 1)
    add_para(doc, "This document describes the ResiSure platform as implemented in the project repository. It is intended for project submission, stakeholder review, and development planning.")
    add_para(doc, f"Generated: {date.today().strftime('%d %B %Y')}")

    return doc


def main():
    doc = build_document()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    main()
