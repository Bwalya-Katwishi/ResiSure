"""
Generate ResiSure final year report and presentation from 2026 UNZA templates.
Outputs:
  docs/ResiSure_Final_Year_Report_2026.docx
  docs/ResiSure_Presentation_2026.pptx
"""
from __future__ import annotations

import shutil
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt
from pptx import Presentation
from pptx.util import Inches as PptInches

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
ASSETS = DOCS / "thesis_assets"
TEMPLATE_DOC = DOCS / "Final_Year_Project_Report_Template_2026.docx"
TEMPLATE_PPT = DOCS / "Presentation_Template_2026.pptx"
OUT_DOC = DOCS / "ResiSure_Final_Year_Report_2026.docx"
OUT_PPT = DOCS / "ResiSure_Presentation_2026.pptx"
OUT_DOCX_LEGACY = DOCS / "ResiSure_Thesis_Final.docx"

PROJECT_TITLE = (
    "ResiSure: An Escrow-Enabled Platform for Scam-Resistant Student Accommodation"
)
STUDENT_NAME = "Bwalya Katwishi"
COMPUTER_NUMBER = "2022041330"
SUPERVISOR = "Mr Andirea Theu"
DEGREE = "Bachelor of Science in Computer Science"
SUBMISSION_DATE = date.today().strftime("%d %B %Y")
KEYWORDS = (
    "Student accommodation; Escrow payments; Marketplace platform; "
    "Mobile money; Trust and safety"
)

FIGURES = [
    ("fig05_iterative_model.png", "Figure 3.1: Iterative development model"),
    ("fig06_architecture.png", "Figure 4.1: ResiSure layered system architecture"),
    ("fig07_state_machine.png", "Figure 4.2: Booking and escrow state machine"),
    ("fig08_er_diagram.png", "Figure 4.3: Entity relationship overview"),
    ("fig09_landing_page.png", "Figure 5.1: ResiSure landing page"),
    ("fig10_login_page.png", "Figure 5.2: User login page"),
    ("fig11_register_page.png", "Figure 5.3: User registration page"),
    ("fig12_properties_list.png", "Figure 5.4: Property listing and search page"),
    ("fig13_property_detail.png", "Figure 5.5: Property detail and booking page"),
    ("fig14_student_dashboard.png", "Figure 5.6: Student dashboard"),
    ("fig15_booking_escrow_timeline.png", "Figure 5.7: Booking detail page"),
    ("fig15_booking_escrow_diagram.png", "Figure 4.4: Escrow timeline diagram"),
    ("fig16_admin_dashboard.png", "Figure 5.8: Administrator dashboard"),
    ("fig17_landlord_dashboard.png", "Figure 5.9: Landlord dashboard"),
]

FIGURE_AFTER_HEADING = {
    "3.2 Research / Development Approach": ("fig05_iterative_model.png", "Figure 3.1: Iterative development model"),
    "4.6 System / Solution Architecture": ("fig06_architecture.png", "Figure 4.1: ResiSure layered system architecture"),
    "4.9 Algorithms / Models / Technical Design": [
        ("fig07_state_machine.png", "Figure 4.2: Booking and escrow state machine"),
        ("fig15_booking_escrow_diagram.png", "Figure 4.4: Escrow timeline diagram"),
    ],
    "4.7 Database / Data Design (where applicable)": ("fig08_er_diagram.png", "Figure 4.3: Entity relationship overview"),
}

SCREENSHOT_HEADING = "4.8 Interface / Interaction Design (where applicable)"
SCREENSHOTS = FIGURES[6:]  # UI screenshots

GLOBAL_REPLACEMENTS = {
    "[PROJECT TITLE]": PROJECT_TITLE,
    "[STUDENT NAME]": STUDENT_NAME,
    "[COMPUTER NUMBER]": COMPUTER_NUMBER,
    "[SUPERVISOR NAME]": SUPERVISOR,
    "[DATE]": SUBMISSION_DATE,
    "[DEGREE PROGRAMME]": DEGREE,
    "[Project Title]": PROJECT_TITLE,
    "[Group Name]": STUDENT_NAME,
    "[keyword 1]; [keyword 2]; [keyword 3]; [keyword 4]; [keyword 5]": KEYWORDS,
}

ABSTRACT = (
    "Accommodation scams remain a significant threat to university students in Zambia. "
    "At the University of Zambia (UNZA), on-campus housing covers only a fraction of enrolment, "
    "forcing most students into an informal off-campus rental market where advance mobile-money "
    "payments are often collected before a room is verified. ResiSure is a web-based marketplace "
    "that connects students with verified landlords and protects rent through an application-level "
    "escrow workflow: payment is held until the student confirms move-in or a defined confirmation "
    "window expires without dispute.\n\n"
    "The system was implemented as a monorepo comprising a Node.js/Express REST API, a PostgreSQL "
    "database, a Next.js web application, and an Expo mobile client. Authentication uses JWT and "
    "bcrypt with role-based access control for students, landlords, and administrators. The core "
    "contribution is a multi-state booking and escrow state machine with a scheduled auto-release "
    "job, dispute resolution, immutable audit logging, document-based verification for students "
    "and landlords, and a pluggable mobile-money payment layer (MTN, Airtel, Zamtel) with mock "
    "mode for development.\n\n"
    "The platform was tested through API and browser-based functional tests covering registration, "
    "listing management, booking, escrow capture, move-in confirmation, dispute handling, and "
    "authorisation boundaries. Results show that escrow logic correctly withholds landlord payout "
    "until confirmation preconditions are met. The project demonstrates that escrow-protected "
    "student accommodation booking can be implemented practically at the application layer without "
    "requiring the platform operator to hold a banking licence, while remaining ready for integration "
    "with licensed payment providers."
)

ACKNOWLEDGEMENTS = (
    "I express sincere gratitude to Mr Andirea Theu, my supervisor, for guidance and feedback "
    "throughout this project. I thank the Department of Computing and Informatics at the University "
    "of Zambia for the academic foundation that made this work possible. I also acknowledge peers "
    "and testers who provided informal feedback on the ResiSure interface during development."
)

DECLARATION = (
    "I declare that this final year project report is my own work and has been prepared in "
    "accordance with the academic requirements of the University of Zambia. Where material from "
    "other sources has been used, it has been acknowledged and referenced. This project was "
    "undertaken individually; all design, implementation, testing, and documentation presented "
    "here reflect my own contribution unless explicitly cited."
)

SECTIONS: dict[str, str] = {
    "1.1 Background and Context": (
        "Off-campus student accommodation is the dominant housing arrangement for Zambian university "
        "students. UNZA accommodates approximately 4,150 students on campus while total enrolment "
        "exceeds 28,000, meaning most students must secure private rentals through informal channels "
        "such as social media and word of mouth. Landlords frequently request mobile-money payment "
        "before a student has inspected a room, creating opportunities for misrepresentation and fraud.\n\n"
        "Digital listing platforms improve discovery but often release payment to landlords immediately "
        "after booking, leaving the financial transaction unprotected. ResiSure addresses this gap by "
        "combining verified listings with an escrow-style workflow that withholds payout until move-in "
        "is confirmed or a timeout/dispute path is resolved."
    ),
    "1.2 Problem Statement": (
        "Existing accommodation platforms accessible to Zambian students verify listings but do not "
        "protect payment. Funds reach landlords before the student confirms that the property exists, "
        "matches its description, and is habitable. This structural gap allows continued financial loss "
        "and erodes trust in digital booking tools among students who are most exposed to accommodation scams."
    ),
    "1.3 Project Aim": (
        "To design, develop, and evaluate a secure web-based marketplace that enables Zambian university "
        "students to discover, book, and pay for accommodation using an escrow mechanism that withholds "
        "landlord payout until the student confirms successful occupancy or the confirmation window "
        "closes without dispute."
    ),
    "1.4 Project Objectives": (
        "1. Implement role-based authentication for students, landlords, and administrators using JWT and bcrypt.\n"
        "2. Implement property listing, search, and filtering with landlord verification indicators.\n"
        "3. Design and implement a booking and escrow state machine covering acceptance, payment capture, "
        "move-in window, confirmation, dispute, timeout, and refund paths.\n"
        "4. Implement a scheduled background job for automatic fund release after a 72-hour confirmation window.\n"
        "5. Implement administrator workflows for landlord/student verification and dispute resolution.\n"
        "6. Implement secure verification document upload and authenticated document viewing.\n"
        "7. Integrate a pluggable mobile-money payment provider layer with mock mode for testing.\n"
        "8. Evaluate the system through structured functional and authorisation tests."
    ),
    "1.5 Research Questions (where applicable)": (
        "RQ1: Can an escrow-based payment mechanism be implemented at the application level to reduce "
        "financial risk for students booking off-campus accommodation without a banking licence?\n"
        "RQ2: What booking states are required to model escrow safely, including rejection, dispute, and timeout?\n"
        "RQ3: How can landlord and student verification be integrated without blocking all unverified listings?"
    ),
    "1.6 Scope of the Project": (
        "In scope: web marketplace, REST API, PostgreSQL persistence, escrow booking workflow, admin "
        "verification, dispute handling, mobile-responsive UI, mock/live mobile-money integration hooks, "
        "Expo mobile client (core screens), and AWS EC2 deployment.\n\n"
        "Out of scope: licensed third-party fund custody, full native-app feature parity, automated "
        "property valuation, and large-scale user field trials."
    ),
    "1.7 Significance of the Project": (
        "Students benefit from payment protection and clearer booking status. Landlords benefit from a "
        "structured booking channel and verified reputation. Administrators gain auditability and dispute "
        "tools. The project contributes a practical reference implementation for escrow-style rental "
        "workflows in low-trust digital markets."
    ),
    "1.8 Limitations": (
        "Escrow is simulated at the application/database layer rather than through a licensed payment "
        "institution. Live mobile-money credentials require operator partnership. User evaluation was "
        "limited to functional testing and informal feedback rather than a formal controlled study. "
        "Development time constrained some features such as push notifications and mutual dispute resolution."
    ),
    "1.9 Organisation of the Report": (
        "Chapter 2 reviews related work and the research gap. Chapter 3 describes methodology and tools. "
        "Chapter 4 presents analysis and design. Chapter 5 covers implementation. Chapter 6 reports "
        "testing and evaluation. Chapter 7 discusses findings. Chapter 8 concludes with recommendations "
        "and future work."
    ),
    "2.1 Introduction": (
        "This chapter reviews institutional accommodation at UNZA, comparable digital platforms, escrow "
        "mechanisms in marketplaces, and the gap addressed by ResiSure."
    ),
    "2.2 Key Concepts and Theories": (
        "Escrow: neutral holding of funds until contractual conditions are met.\n"
        "Marketplace trust models: listing verification, identity verification, and transactional protection.\n"
        "State machines: explicit booking states and allowed transitions to prevent invalid financial actions.\n"
        "Role-based access control: enforcing student, landlord, and admin privileges at the API layer."
    ),
    "2.3 Existing Systems / Related Work": (
        "Instay and similar verified-listing platforms reduce fake listings but typically pay landlords on booking. "
        "DigsConnect and Student.com focus on discovery in other markets. Muster addresses affordability through "
        "shared housing rather than payment protection. UNZA's accommodation portal covers on-campus allocation only. "
        "None combine verified discovery with move-in-gated payout for Zambian off-campus rentals."
    ),
    "2.4 Comparative Analysis": (
        "Verified-listing platforms score highly on discovery but low on payment protection. Escrow marketplaces "
        "elsewhere (freelance/e-commerce) protect buyers until delivery confirmation. ResiSure maps that pattern "
        "to student rentals by using move-in confirmation as the release condition."
    ),
    "2.5 Research / Knowledge Gap": (
        "No reviewed system for Zambian student housing combines verified listings, student/landlord document "
        "verification, and escrow-style payout delay until move-in confirmation. ResiSure targets this specific gap."
    ),
    "2.6 Conceptual or Theoretical Framework (where applicable)": (
        "The project applies a trust-and-safety framework with three layers: identity verification (NRC and "
        "supporting documents), listing visibility rules, and transactional escrow enforcement through a "
        "booking state machine and audit log."
    ),
    "2.7 Chapter Summary": (
        "Literature and product review shows a clear gap in payment protection for student rentals. Escrow and "
        "RBAC provide the conceptual foundation implemented in later chapters."
    ),
    "3.1 Introduction": (
        "This chapter explains the iterative development approach, requirements gathering, architecture, tools, "
        "ethics, and evaluation method used for ResiSure."
    ),
    "3.2 Research / Development Approach": (
        "An iterative Agile-style approach was used: schema and auth, listings, booking/escrow engine, verification, "
        "payments, admin tools, and UI polish were delivered incrementally with testing after each increment."
    ),
    "3.3 Requirements / Data Collection": (
        "Requirements were derived from problem-domain analysis, review of comparable platforms, UNZA accommodation "
        "statistics, and iterative refinement during implementation. No personal participant study was conducted; "
        "test accounts and seeded data supported functional validation."
    ),
    "3.4 System Architecture / Research Workflow": (
        "The monorepo separates apps/api (Express), apps/web (Next.js), apps/mobile (Expo), and packages/shared. "
        "Requests flow routes → controllers → services → models → PostgreSQL. A node-cron job enforces escrow timeouts."
    ),
    "3.5 Tools and Technologies": (
        "Frontend: Next.js 14, React, Tailwind CSS, Axios.\n"
        "Backend: Node.js 20, Express 5, PostgreSQL 15, node-cron, bcrypt, JWT.\n"
        "Storage: Cloudinary for images/documents; local fallback for development.\n"
        "Testing: Jest, Supertest, Postman, browser manual testing.\n"
        "Deployment: AWS EC2, Nginx, PM2, HTTPS via sslip.io.\n"
        "Version control: Git."
    ),
    "3.6 Ethical and Legal Considerations": (
        "Verification documents (NRC, university slips, title deeds) are sensitive personal data. ResiSure stores "
        "documents using authenticated API streaming rather than public URLs, validates NRC format (123456/78/1), "
        "uses role-restricted access, and blocks direct static access to upload paths. Users must accept terms at "
        "registration. Payment integration is designed to defer legal fund custody to licensed providers in production."
    ),
    "3.7 Evaluation Method": (
        "Evaluation combined automated API tests (auth, booking concurrency, escrow, payments, verification documents, "
        "trust/safety) with manual end-to-end browser tests of the booking lifecycle, dispute path, and dashboards."
    ),
    "3.8 Chapter Summary": (
        "An iterative methodology with layered architecture and automated plus manual testing was used to deliver and "
        "validate the escrow marketplace."
    ),
    "4.1 Introduction": (
        "This chapter documents stakeholders, requirements, architecture, data design, UI design, and the escrow "
        "state machine."
    ),
    "4.2 Stakeholder and User Analysis": (
        "Students: browse, book, pay, confirm move-in, raise disputes.\n"
        "Landlords: list properties, accept bookings, upload verification documents.\n"
        "Administrators: verify accounts, review documents, resolve disputes, audit activity."
    ),
    "4.3 Functional Requirements": (
        "Students register/login, browse listings, favourite properties, submit verification documents, create "
        "bookings, pay into escrow, confirm move-in, and raise disputes.\n"
        "Landlords manage listings and photos, submit NRC/title documents, and accept/reject bookings.\n"
        "Administrators verify users, review documents, manage disputes, and view audit data.\n"
        "System auto-releases escrow after timeout and logs all transitions."
    ),
    "4.4 Non-Functional Requirements": (
        "Security: bcrypt passwords, JWT auth, IDOR protection, authenticated document access.\n"
        "Usability: mobile-responsive UI, clear booking stepper and status banners.\n"
        "Reliability: cron-based timeout enforcement independent of user activity.\n"
        "Maintainability: layered backend architecture and shared validation package.\n"
        "Localisation: Zambian Kwacha (ZMW) formatting throughout."
    ),
    "4.5 Use Cases / User Stories": (
        "UC1 Student books verified room → landlord accepts → student pays → move-in window opens → student confirms → landlord paid.\n"
        "UC2 Student raises dispute during move-in window → admin refunds or releases.\n"
        "UC3 Landlord submits verification documents → admin approves → verified badge shown.\n"
        "UC4 Booking timeout → system auto-releases after 72 hours without dispute."
    ),
    "4.6 System / Solution Architecture": (
        "ResiSure uses a layered architecture: presentation (Next.js/Expo), application (Express routes/controllers), "
        "domain services (auth, property, booking, escrow, notification, admin), and PostgreSQL via parameterised queries."
    ),
    "4.7 Database / Data Design (where applicable)": (
        "Core tables include users, landlord_profiles, student_profiles, properties, property_images, bookings, "
        "escrow_transactions, booking_audit_log, disputes, notifications, favorites, and password_reset_tokens. "
        "UUID primary keys and foreign-key constraints enforce referential integrity."
    ),
    "4.8 Interface / Interaction Design (where applicable)": (
        "The UI provides role-specific dashboards, a booking stepper, mobile bottom action bars for booking/payment, "
        "modal document viewer for verification files, and admin review panels with accessible close controls."
    ),
    "4.9 Algorithms / Models / Technical Design": (
        "The booking escrow state machine defines states: pending, accepted, rejected, escrow_held, move_in_window, "
        "disputed, timed_out, confirmed, completed, cancelled, refunded. Invalid transitions are rejected at the service "
        "layer. NRC numbers must match \\d{6}/\\d{2}/\\d{1}."
    ),
    "4.10 Chapter Summary": (
        "Analysis and design produced a layered architecture, relational schema, RBAC model, and escrow state machine "
        "that together enforce payment protection and auditability."
    ),
    "5.1 Introduction": (
        "This chapter describes the implemented ResiSure system across API, web, mobile, verification, and deployment."
    ),
    "5.2 Development Environment": (
        "Development used Windows 11 and Amazon Linux 2023 (EC2). Node.js 20, PostgreSQL 15, VS Code, Git, Postman, "
        "and Playwright for screenshot capture. Production runs on EC2 with PM2 and Nginx reverse proxy."
    ),
    "5.3 System Components / Modules": (
        "Authentication module; Property module; Booking module; Escrow service and cron job; Payment provider "
        "abstraction (mock, MTN, Airtel, Zamtel); Verification upload/streaming; Notification service; Admin service; "
        "Favorites; Trust/safety and reporting."
    ),
    "5.4 Key Implementation Details": (
        "Escrow capture updates booking timestamps and writes capture transactions plus audit entries. Document URLs "
        "return authenticated API paths only. openAuthenticatedDocument uses an in-app viewer to avoid popup blockers. "
        "Mobile-money providers share normalised phone validation and webhook hooks for live mode."
    ),
    "5.5 Integration": (
        "Web and mobile clients consume the REST API via Axios with JWT interceptors. Cloudinary stores images and "
        "verification documents when configured. SMTP sends password-reset and notification emails. Payment webhooks "
        "update pending capture status in live mode."
    ),
    "5.6 Challenges and Solutions": (
        "Challenge: popup blockers prevented document viewing → Solution: in-app DocumentViewer modal.\n"
        "Challenge: production .env overwrite on deploy → Solution: exclude .env.local from upload archives.\n"
        "Challenge: booking race conditions → Solution: database concurrency guard migration.\n"
        "Challenge: CORS/port mismatches → Solution: explicit CLIENT_URL configuration."
    ),
    "5.7 Individual Contribution (group projects)": (
        "This is an individual project. All analysis, design, implementation, testing, deployment, and documentation "
        "were completed by the author."
    ),
    "5.8 Chapter Summary": (
        "A full-stack escrow marketplace was implemented with verification, payments, admin tooling, and production deployment."
    ),
    "6.1 Introduction": (
        "This chapter describes testing strategy, representative test cases, results, and objective evaluation."
    ),
    "6.2 Testing Strategy": (
        "Automated Jest/Supertest suites cover auth, authorization, booking concurrency, escrow e2e, payments, "
        "verification documents, favorites, and trust/safety. Manual browser testing validated UI flows and mobile layout."
    ),
    "6.3 Test Cases and Results": (
        "Representative results: registration/login (PASS); IDOR protection on properties/bookings (PASS); landlord "
        "verification document streaming auth (PASS); invalid NRC format rejected (PASS); booking pay-before-accept rejected (PASS); "
        "escrow auto-release cron (PASS); dispute freezes auto-release (PASS); mobile responsive nav (PASS)."
    ),
    "6.4 Experimental Results / Performance Results (where applicable)": (
        "Formal performance benchmarking was not the primary focus. Informal checks on EC2 showed acceptable response "
        "times for listing search and booking detail under test data volumes."
    ),
    "6.5 User Evaluation (where applicable)": (
        "Informal feedback from peer testers highlighted clarity of the booking stepper and need for mobile document "
        "viewing improvements, which were addressed in the document viewer update."
    ),
    "6.6 Analysis of Results": (
        "Tests confirm the escrow state machine prevents out-of-sequence payment and release actions. Authorisation tests "
        "confirm students cannot access other users' documents or bookings. Verification tests confirm raw storage paths are never exposed."
    ),
    "6.7 Objective-by-Objective Evaluation": (
        "Objectives 1–7 were achieved in the implemented codebase and verified by automated/manual tests. Objective 8 "
        "(formal user study) was partially met through functional testing and informal feedback rather than a controlled survey."
    ),
    "6.8 Individual Results (group projects)": (
        "Not applicable — individual project."
    ),
    "6.9 Chapter Summary": (
        "Testing demonstrates that ResiSure meets its functional and security requirements for escrow-protected booking."
    ),
    "7.1 Introduction": (
        "This chapter interprets findings, compares with existing work, and discusses contributions and limitations."
    ),
    "7.2 Interpretation of Findings": (
        "Results support the central claim: funds can be withheld at the application layer until move-in confirmation. "
        "The state machine makes invalid transitions structurally impossible rather than merely discouraged."
    ),
    "7.3 Comparison with Existing Work": (
        "Compared with verified-listing-only platforms, ResiSure adds transactional protection. Compared with generic "
        "escrow marketplaces, it specialises conditions for student rental move-in confirmation and Zambian mobile-money context."
    ),
    "7.4 Contributions of the Project": (
        "Technical: escrow state machine, audit log, verification document security, payment provider abstraction.\n"
        "Practical: deployable reference platform for UNZA-area student housing.\n"
        "Academic: demonstration of application-layer escrow without banking licence scope."
    ),
    "7.5 Limitations and Implications": (
        "Simulated escrow limits legal realism. Live mobile money requires operator credentials. Admin-only dispute "
        "resolution simplifies implementation but increases operational load."
    ),
    "7.6 Chapter Summary": (
        "The project successfully addresses a defined gap but requires licensed payment partnership for full production finance."
    ),
    "8.1 Introduction": (
        "This chapter summarises the project, states conclusions, evaluates objectives, and recommends future work."
    ),
    "8.2 Summary of the Project": (
        "ResiSure was built to reduce scam risk in off-campus student rentals by combining verified listings with "
        "escrow-style payout delay, document verification, and admin dispute handling."
    ),
    "8.3 Conclusions": (
        "An escrow-protected accommodation marketplace is feasible as a final-year software project and can be extended "
        "toward production through licensed payment integration and expanded user evaluation."
    ),
    "8.4 Achievement of Objectives": (
        "All primary development objectives were achieved. Formal large-scale user evaluation remains recommended future work."
    ),
    "8.5 Recommendations": (
        "Partner with a licensed mobile-money aggregator for live escrow settlement.\n"
        "Conduct structured usability testing with UNZA students.\n"
        "Add SMS/push reminders before escrow auto-release deadlines."
    ),
    "8.6 Future Work": (
        "Mutual dispute resolution; native mobile feature parity; formal PCI/licensed custody integration; analytics on "
        "timeout vs explicit confirmation rates; integration with university accommodation office workflows."
    ),
    "[Insert references here.]": (
        "[1] University of Zambia, \"Accommodation | University of Zambia,\" 2026. [Online]. Available: https://www.unza.zm/dosa/accommodation.\n"
        "[2] DigsConnect, \"Student Accommodation,\" 2025. [Online]. Available: https://www.digsconnect.com/.\n"
        "[3] I. Sommerville, Software Engineering, 10th ed. Pearson, 2015.\n"
        "[4] PostgreSQL Global Development Group, \"PostgreSQL Documentation.\" [Online]. Available: https://www.postgresql.org/docs/.\n"
        "[5] OpenJS Foundation, \"Express — Node.js web application framework.\" [Online]. Available: https://expressjs.com/.\n"
        "[6] Vercel, \"Next.js Documentation.\" [Online]. Available: https://nextjs.org/docs.\n"
        "[7] OWASP Foundation, \"Insecure Direct Object References (IDOR).\" [Online]. Available: https://owasp.org/www-community/Insecure_Direct_Object_Reference.\n"
        "[8] node-cron documentation. [Online]. Available: https://www.npmjs.com/package/node-cron."
    ),
    "[Insert material here.]": "",  # appendices placeholder default
    "[Generate or complete this section in the final document.]": "",
}

APPENDIX_B = (
    "Prerequisites: Node.js 20+, PostgreSQL 15+, Git.\n\n"
    "1. Clone repository and run npm install at project root.\n"
    "2. Configure apps/api/.env (database, JWT, CLIENT_URL, optional Cloudinary and SMTP).\n"
    "3. Run npm run migrate in apps/api.\n"
    "4. Configure apps/web/.env.local with NEXT_PUBLIC_API_URL.\n"
    "5. Start API: npm run dev --workspace=apps/api.\n"
    "6. Start web: npm run dev --workspace=apps/web.\n\n"
    "Production deployment on AWS EC2 uses Nginx, PM2, HTTPS, and daily database backups. See docs/DEPLOYMENT.md."
)


def replace_paragraph_text(paragraph, replacements: dict[str, str]):
    text = paragraph.text
    if not text:
        return
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
    if text.strip() == "[Write this section here.]":
        return "[[WRITE_SECTION]]"
    if text.startswith("[GUIDANCE:"):
        return ""
    return text


def apply_replacements(doc: Document):
    current_heading = None

    for paragraph in doc.paragraphs:
        raw = paragraph.text
        if paragraph.style.name.startswith("Heading"):
            current_heading = raw.strip()

        new_text = raw
        for old, new in GLOBAL_REPLACEMENTS.items():
            if old in new_text:
                new_text = new_text.replace(old, new)

        if new_text.strip() == "[Write this section here.]":
            if current_heading in SECTIONS:
                new_text = SECTIONS[current_heading]
            elif current_heading and "APPENDIX B" in current_heading:
                new_text = APPENDIX_B
            else:
                new_text = ""

        if new_text.startswith("[GUIDANCE:"):
            new_text = ""

        if new_text.strip() in {
            "[Generate or complete this section in the final document.]",
            "[Insert material here.]",
        }:
            if "LIST OF FIGURES" in (current_heading or ""):
                new_text = "\n".join(cap for _, cap in FIGURES)
            elif "LIST OF ABBREVIATIONS" in (current_heading or ""):
                new_text = (
                    "API — Application Programming Interface\n"
                    "EC2 — Amazon Elastic Compute Cloud\n"
                    "ER — Entity Relationship\n"
                    "JWT — JSON Web Token\n"
                    "NRC — National Registration Card\n"
                    "RBAC — Role-Based Access Control\n"
                    "UI — User Interface\n"
                    "UNZA — University of Zambia\n"
                    "ZMW — Zambian Kwacha"
                )
            else:
                new_text = ""

        if raw != new_text:
            paragraph.text = new_text

    # Special front matter
    for paragraph in doc.paragraphs:
        if paragraph.text.strip() == "[Write the abstract here.]":
            paragraph.text = ABSTRACT
        if paragraph.text.strip().startswith("I declare that this final year project report"):
            paragraph.text = DECLARATION
        if paragraph.text.strip().startswith("I express sincere gratitude"):
            continue
        if paragraph.text.strip() == "[Write acknowledgements here.]":
            paragraph.text = ACKNOWLEDGEMENTS

    # Insert figures after key sections (reverse order to preserve indices)
    body = doc.element.body
    from docx.oxml import OxmlElement
    from docx.text.paragraph import Paragraph

    def insert_after(paragraph, filename, caption):
        path = ASSETS / filename
        if not path.exists():
            return
        new_p = OxmlElement("w:p")
        paragraph._p.addnext(new_p)
        pic_para = Paragraph(new_p, paragraph._parent)
        pic_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = pic_para.add_run()
        run.add_picture(str(path), width=Inches(5.8))
        cap_p = OxmlElement("w:p")
        new_p.addnext(cap_p)
        cap_para = Paragraph(cap_p, paragraph._parent)
        cap_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap_run = cap_para.add_run(caption)
        cap_run.italic = True
        cap_run.font.size = Pt(10)

    for paragraph in list(doc.paragraphs):
        heading = paragraph.text.strip()
        if heading in FIGURE_AFTER_HEADING:
            entries = FIGURE_AFTER_HEADING[heading]
            if isinstance(entries, tuple):
                entries = [entries]
            anchor = paragraph
            for fname, caption in entries:
                insert_after(anchor, fname, caption)
                for p in doc.paragraphs:
                    if p.text.strip() == caption:
                        anchor = p
                        break

    for paragraph in list(doc.paragraphs):
        if paragraph.text.strip() == SCREENSHOT_HEADING:
            anchor = paragraph
            for fname, caption in SCREENSHOTS:
                insert_after(anchor, fname, caption)
                for p in doc.paragraphs:
                    if p.text.strip() == caption:
                        anchor = p
                        break
            break


def set_shape_text(shape, text: str):
    if not getattr(shape, "has_text_frame", False):
        return
    tf = shape.text_frame
    tf.clear()
    lines = text.split("\n")
    for idx, line in enumerate(lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = line


def replace_in_shape(shape, mapping: dict[str, str]):
    if not getattr(shape, "has_text_frame", False):
        return
    full = shape.text
    for old, new in mapping.items():
        if old in full:
            full = full.replace(old, new)
    if full != shape.text:
        set_shape_text(shape, full)


def add_picture_to_slide(slide, image_path: Path, left, top, width):
    if image_path.exists():
        slide.shapes.add_picture(str(image_path), left, top, width=width)


def build_presentation():
    prs = Presentation(str(TEMPLATE_PPT))
    slides = list(prs.slides)

    slide_text = {
        0: {
            "[PROJECT TITLE]": PROJECT_TITLE,
        },
        1: {
            "Team Roles and Responsibilities": "Project Information",
            "[SUPERVISOR NAME]": SUPERVISOR,
        },
        3: {
            "Introduce the project area and relevant context.": SECTIONS["1.1 Background and Context"].split("\n\n")[0],
            "Explain why the topic/problem matters.": "Payment is often taken before students verify a room.",
            "Identify intended users, stakeholders or beneficiaries.": "Students, landlords, UNZA community, administrators.",
            "[Insert": "ResiSure marketplace with escrow protection.",
        },
        4: {
            "[Clearly state the specific problem being addressed.]": SECTIONS["1.2 Problem Statement"][:200],
            "What currently happens?": "Students pay via mobile money before viewing rooms.",
            "What is inadequate or missing?": "No payout delay until move-in confirmation.",
            "Who is affected?": "Off-campus UNZA students.",
            "Why does the problem req": "Financial loss and housing insecurity at term start.",
        },
        5: {"[State the single overall goal of the project.]": SECTIONS["1.3 Project Aim"]},
        6: {
            "[Objective 1]": "Role-based auth (JWT, bcrypt)",
            "[Objective 2]": "Verified listings and search",
            "[Objective 3]": "Escrow booking state machine",
            "[Objective 4]": "Auto-release cron + disputes",
            "[Objective 5]": "Document verification + mobile money layer",
        },
        7: {
            "IN SCOPE: [Item 1] • [Item 2] • [Item 3]": "IN SCOPE: Web/API • Escrow booking • Admin verification • AWS deploy",
            "OUT OF SCOPE: [Item 1] • [Item 2] • [Item 3]": "OUT OF SCOPE: Banking licence • Full user trial • Property valuation",
        },
        9: {
            "[Concept / Theory 1]": "Escrow / payment holding",
            "[Concept / Theory 2]": "Marketplace trust models",
            "[Concept / Theory 3]": "RBAC and state machines",
            "[Explain their relevance to the project.]": "Together they enforce safe booking-to-move-in flow.",
        },
        10: {
            "[System / Study 1]": "Instay — verified listings, immediate payout",
            "[System / Study 2]": "DigsConnect — discovery focused",
            "[System / Study 3]": "UNZA portal — on-campus allocation only",
        },
        11: {
            "[What is missing, inadequate, unresolved or improvable?]": "No Zambian student platform combines verification with move-in-gated payout.",
            "[Gap 1]": "Payment released before occupancy check",
            "[Gap 2]": "Limited document-based identity assurance",
            "[How does this project address the gap?]": "ResiSure escrow + verification documents + audit trail.",
        },
        13: {
            "[Agile / Waterfall / Design Science / Experimental Research / Other]": "Iterative Agile-style development",
            "Why was this approach selected?": "Escrow engine needed incremental state testing.",
        },
        14: {
            "[Insert final project workflow / research pipeline diagram here.]": "Plan → Design → Implement modules → Test → Deploy",
            "[Briefly explain the sequence of": "Each increment was verified before the next began.",
        },
        15: {
            "Languages: [Languages]": "Languages: JavaScript (Node.js, React)",
            "Frameworks / Libraries: [Frameworks]": "Frameworks: Express 5, Next.js 14, Expo",
            "Database: [Database]": "Database: PostgreSQL 15",
            "Development tools: [Tools]": "Tools: Git, Jest, Postman, PM2, Nginx",
            "Hardware / Cloud / Platforms: [Platforms]": "Platforms: AWS EC2, Cloudinary",
        },
        16: {
            "[Data sources / participants]": "Domain analysis + platform review",
            "[Requirements gathering methods]": "Iterative refinement during implementation",
        },
        18: {
            "[Stakeholder / User 1]": "Students — book and pay safely",
            "[Stakeholder / User 2]": "Landlords — list rooms, accept bookings",
            "[Stakeholder / User 3]": "Admins — verify users, resolve disputes",
        },
        19: {
            "FR1: [Requirement]": "FR1: Browse/search listings",
            "FR2: [Requirement]": "FR2: Escrow booking lifecycle",
            "FR3: [Requirement]": "FR3: Verification document upload/view",
            "NFR1: [Performance / usability / security / reliability requirement]": "NFR1: JWT auth, bcrypt, IDOR protection",
            "NFR2: [Requirement]": "NFR2: Mobile-responsive UI",
        },
        20: {
            "[Insert final system architecture diagram.]": "Layered monorepo: Web/Mobile → API → Services → PostgreSQL",
            "[Explain the major components and their interactions.]": "See architecture diagram.",
        },
        21: {
            "[Insert ER diagram, schema, data model or equivalent.]": "Users, profiles, properties, bookings, escrow_transactions, audit_log",
            "[Highlight the most important design decisions.]": "Separate financial history from booking status.",
        },
        22: {
            "[Insert 2–4 key screenshots or wireframes.]": "Landing, property detail, dashboards (see report figures)",
            "[Explain important interface / interaction decisions.]": "Booking stepper, mobile action bars, document viewer modal.",
        },
        23: {
            "[Algorithm / model 1]": "Escrow state machine",
            "[Algorithm / model 2]": "Auto-release cron (72h window)",
            "[Important technical decision]": "Authenticated document streaming",
            "[Why these choices were made]": "Security, auditability, and mobile UX.",
        },
        25: {
            "Operating system: [OS]": "OS: Windows 11 / Amazon Linux 2023",
            "Programming language(s): [Languages]": "JavaScript (Node/React)",
            "Framework(s): [Frameworks]": "Express, Next.js, Expo",
            "Database: [Database]": "PostgreSQL",
            "IDE / development tools: [Tools]": "VS Code, Git, Jest",
        },
        26: {
            "[Module 1]": "Auth & RBAC",
            "[Module 2]": "Properties & favorites",
            "[Module 3]": "Booking & escrow",
            "[Module 4]": "Verification documents",
            "[Module 5]": "Payments & admin",
        },
        27: {
            "[Important implementation decision]": "Shared @resisure/shared validation package",
            "[Algorithm / model]": "Booking state machine in services layer",
            "[API / service integration]": "MTN/Airtel/Zamtel provider abstraction",
            "[Security / performance consideration]": "No public document URLs; cron timeout enforcement",
        },
        28: {
            "Challenge: [Challenge 1] → Solution: [Solution 1]": "Challenge: Popup-blocked docs → Solution: In-app viewer",
            "Challenge: [Challenge 2] → Solution: [Solution 2]": "Challenge: Deploy env overwrite → Solution: Exclude .env from tar",
            "Challenge: [Challenge 3] → Solution: [Solution 3]": "Challenge: Booking races → Solution: DB concurrency guard",
        },
        30: {
            "Unit testing / Integration testing / System testing / Usability testing / Performance / security testing / Testing tools: [Tools / frameworks]": "Jest + Supertest API tests; manual browser E2E; Postman",
        },
        31: {
            "TC-01: [Test case] → PASS / FAIL": "TC-01: Register/login → PASS",
            "TC-02: [Test case] → PASS / FAIL": "TC-02: Escrow pay flow → PASS",
            "TC-03: [Test case] → PASS / FAIL": "TC-03: IDOR blocked → PASS",
            "TC-04: [Test case] → PASS / FAIL": "TC-04: NRC format validation → PASS",
        },
        32: {
            "[Insert graph, chart, table or model evaluation result.]": "11 automated verification-document tests passed",
            "[Highlight the most important quantitative findings.]": "All core escrow transitions validated",
        },
        33: {
            "[Insert survey / interview / usability findings where applicable.]": "Informal feedback: booking stepper clarity improved",
        },
        34: {
            "Objective 1 → [Evidence] → [Achieved / Partially achieved / Not achieved]": "Obj 1 Auth → JWT tests → Achieved",
            "Objective 2 → [Evidence] → [Status]": "Obj 2 Listings → UI + API → Achieved",
            "Objective 3 → [Evidence] → [Status]": "Obj 3 Escrow → E2E tests → Achieved",
            "Obje": "Obj 4–7 → Verification/payments → Achieved",
        },
        36: {
            "[Member 1] — [Role and major contribution]": f"{STUDENT_NAME} — sole developer: analysis, design, implementation, testing, deployment",
            "[Member 2] — [Role and major contribution]": "N/A (individual project)",
        },
        37: {
            "[Member] — modules / algorithms / research activities completed": f"{STUDENT_NAME} — full stack, escrow engine, verification, deployment",
        },
        39: {
            "What do the results mean?": "Application-layer escrow is viable for student rentals.",
            "How do the findings address the original problem?": "Payout delay reduces pay-before-view scam risk.",
        },
        40: {
            "Technical contribution: [Contribution]": "Escrow state machine + secure document streaming",
            "Practical contribution: [Contribution]": "Deployable UNZA-focused housing platform",
            "Research contribution: [Contribution]": "Feasibility evidence without banking licence",
        },
        41: {
            "[Limitation 1]": "Simulated escrow (not licensed custody)",
            "[Limitation 2]": "Limited formal user study",
            "[Limitation 3]": "Admin-only dispute resolution",
        },
        43: {
            "Problem: [Brief problem]": "Problem: Off-campus rental scams",
            "Approach: [Brief approach]": "Approach: Verified marketplace + escrow",
            "Solution: [Brief solution]": "Solution: ResiSure web/API platform",
            "Results: [Brief results]": "Results: Full lifecycle tested successfully",
            "Contribution: [Brief contribution]": "Contribution: Payment protection model for students",
        },
        44: {
            "Objective 1: [Status + evidence]": "Objective 1: Achieved — auth tests",
            "Objective 2: [Status + evidence]": "Objective 2: Achieved — listings UI",
            "Objective 3: [Status + evidence]": "Objective 3: Achieved — escrow E2E",
            "Objective 4: [Status + evidence]": "Objective 4: Achieved — cron + disputes",
        },
        45: {
            "[Recommendation 1]": "Integrate licensed mobile-money settlement",
            "[Recommendation 2]": "Run formal usability study with students",
            "[Recommendation 3]": "Add SMS reminders before auto-release",
        },
        46: {
            "[Future improvement 1]": "Mutual dispute resolution",
            "[Future improvement 2]": "Native mobile parity",
            "[Future improvement 3]": "University accommodation office integration",
        },
        47: {
            "Thank you": "Thank you",
            "[PROJECT TITLE]": PROJECT_TITLE,
            "Questions?": f"{STUDENT_NAME} • {COMPUTER_NUMBER}\nQuestions?",
        },
    }

    for idx, mapping in slide_text.items():
        if idx >= len(slides):
            continue
        slide = slides[idx]
        for shape in slide.shapes:
            replace_in_shape(shape, {**GLOBAL_REPLACEMENTS, **mapping})

    # Add student name to slide 2
    if len(slides) > 1:
        for shape in slides[1].shapes:
            if shape.has_text_frame and "Supervisor" in shape.text:
                set_shape_text(shape, f"Student: {STUDENT_NAME} ({COMPUTER_NUMBER})\nSupervisor: {SUPERVISOR}")

    # Diagrams on selected slides
    if len(slides) > 14:
        add_picture_to_slide(slides[14], ASSETS / "fig05_iterative_model.png", PptInches(5.5), PptInches(1.6), PptInches(4.2))
    if len(slides) > 20:
        add_picture_to_slide(slides[20], ASSETS / "fig06_architecture.png", PptInches(5.3), PptInches(1.5), PptInches(4.4))
    if len(slides) > 21:
        add_picture_to_slide(slides[21], ASSETS / "fig08_er_diagram.png", PptInches(5.2), PptInches(1.5), PptInches(4.5))
    if len(slides) > 22:
        add_picture_to_slide(slides[22], ASSETS / "fig13_property_detail.png", PptInches(5.5), PptInches(1.7), PptInches(3.8))

    prs.save(str(OUT_PPT))
    print(f"Wrote {OUT_PPT}")


def build_report():
    shutil.copyfile(TEMPLATE_DOC, OUT_DOC)
    doc = Document(str(OUT_DOC))
    apply_replacements(doc)
    doc.save(str(OUT_DOC))
    shutil.copyfile(OUT_DOC, OUT_DOCX_LEGACY)
    print(f"Wrote {OUT_DOC}")
    print(f"Wrote {OUT_DOCX_LEGACY}")


def regenerate_assets():
    import subprocess
    import sys

    subprocess.check_call([sys.executable, str(ROOT / "scripts" / "generate_thesis_assets.py")])
    logo_src = ROOT / "apps" / "web" / "public" / "logo.png"
    logo_dst = ASSETS / "resisure_logo.png"
    if logo_src.exists():
        shutil.copyfile(logo_src, logo_dst)
        print(f"Updated {logo_dst}")


def capture_screenshots():
    import subprocess
    import sys

    script = ROOT / "scripts" / "capture_thesis_screenshots.py"
    if not script.exists():
        return
    try:
        subprocess.check_call([sys.executable, str(script)])
    except subprocess.CalledProcessError as exc:
        print(f"Screenshot capture skipped or partial: {exc}")


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    print("Regenerating thesis diagram assets...")
    regenerate_assets()
    print("Capturing UI screenshots (if servers available)...")
    capture_screenshots()
    print("Building 2026 final year report...")
    build_report()
    print("Building 2026 presentation...")
    build_presentation()
    print("Done.")


if __name__ == "__main__":
    main()
