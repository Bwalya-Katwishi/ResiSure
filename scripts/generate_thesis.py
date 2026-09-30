"""Build final ResiSure thesis from extracted draft text + embedded figures."""
import re
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "docs" / "thesis_assets"
SOURCE = ROOT / "docs" / "thesis_extracted.txt"
OUTPUT_DOWNLOADS = Path(r"C:\Users\bwaly\Downloads\ResiSure_Thesis_Final.docx")
OUTPUT_DOCS = ROOT / "docs" / "ResiSure_Thesis_Final.docx"

BRAND = RGBColor(0x00, 0x47, 0xAB)
SKIP_PREFIXES = ("TABLE OF CONTENTS", "LIST OF FIGURES")

FIGURE_INSERTS = {
    "3.1 Software Development Methodology": ("fig05_iterative_model.png", "Figure 5.1: Iterative system development model"),
    "4.1 Proposed System Architecture": ("fig06_architecture.png", "Figure 5.2: ResiSure layered system architecture"),
    "4.2 The Booking and Escrow State Machine": ("fig07_state_machine.png", "Figure 5.3: Booking and escrow state machine"),
    "4.3 Database Design (Entity Relationship Overview)": ("fig08_er_diagram.png", "Figure 5.4: Entity relationship overview"),
}

SCREENSHOTS = [
    ("fig09_landing_page.png", "Figure 5.5: ResiSure landing page"),
    ("fig10_login_page.png", "Figure 5.6: User login page"),
    ("fig11_register_page.png", "Figure 5.7: User registration page"),
    ("fig12_properties_list.png", "Figure 5.8: Property listing and search page"),
    ("fig13_property_detail.png", "Figure 5.9: Property detail page"),
    ("fig14_student_dashboard.png", "Figure 5.10: Student dashboard"),
    ("fig15_booking_escrow_timeline.png", "Figure 5.11: Booking detail page with escrow timeline"),
    ("fig16_admin_dashboard.png", "Figure 5.12: Administrator dashboard"),
    ("fig17_landlord_dashboard.png", "Figure 5.13: Landlord dashboard"),
]


def is_heading(line):
    return bool(re.match(r"^\d+(\.\d+)*\s+[A-Z]", line)) or line in {
        "ABSTRACT", "DECLARATION", "DEDICATION", "ACKNOWLEDGEMENT", "REFERENCES"
    }


def heading_level(line):
    if line in {"ABSTRACT", "DECLARATION", "DEDICATION", "ACKNOWLEDGEMENT", "REFERENCES"}:
        return 1
    parts = line.split()[0].split(".")
    return min(len(parts), 3)


def add_center(doc, text, size=12, bold=False, color=None, space_after=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)


def add_figure(doc, filename, caption, width=5.8):
    path = ASSETS / filename
    if path.exists():
        doc.add_picture(str(path), width=Inches(width))
        doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cap.add_run(caption)
    run.italic = True
    run.font.size = Pt(10)
    cap.paragraph_format.space_after = Pt(12)


def title_page(doc):
    logo = ASSETS / "resisure_logo.png"
    if logo.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(logo), width=Inches(1.4))
    add_center(doc, "THE UNIVERSITY OF ZAMBIA", 12, bold=True)
    add_center(doc, "SCHOOL OF NATURAL SCIENCES", 12, bold=True)
    add_center(doc, "DEPARTMENT OF COMPUTER SCIENCE", 12, bold=True, space_after=18)
    add_center(
        doc,
        "RESISURE: AN ESCROW-ENABLED PLATFORM FOR\nSCAM-RESISTANT STUDENT ACCOMMODATION",
        14,
        bold=True,
        color=BRAND,
        space_after=24,
    )
    add_center(doc, "BY", 12)
    add_center(doc, "BWALYA KATWISHI", 13, bold=True)
    add_center(doc, "2022041330", 12, space_after=18)
    add_center(doc, "CSC 4004 FINAL YEAR COURSE PROJECT", 12, bold=True)
    add_center(
        doc,
        "A THESIS SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENT\n"
        "FOR THE AWARD OF A BACHELOR'S DEGREE OF COMPUTER SCIENCE",
        11,
        space_after=24,
    )
    add_center(doc, "SUPERVISOR: MR ANDIREA THEU", 12, bold=True)
    add_center(doc, date.today().strftime("%B %Y"), 12)
    doc.add_page_break()


def list_of_figures(doc):
    doc.add_heading("LIST OF FIGURES", level=1)
    for _, caption in list(FIGURE_INSERTS.values()) + SCREENSHOTS:
        doc.add_paragraph(caption, style="List Bullet")
    doc.add_page_break()


def fix_text(text):
    text = text.replace("Prisma-style structured queries", "node-postgres (pg) client with parameterised queries")
    text = text.replace("Mr Andirea Teu", "Mr Andirea Theu")
    text = text.replace("Mr. Andirea Teu", "Mr. Andirea Theu")
    return text


def load_lines():
    raw = SOURCE.read_text(encoding="utf-8").splitlines()
    start = 0
    for i, line in enumerate(raw):
        if line.strip() == "ABSTRACT":
            start = i
            break
    return [fix_text(l.strip()) for l in raw[start:] if l.strip()]


def build():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing extracted thesis text: {SOURCE}")

    doc = Document()
    doc.styles["Normal"].font.name = "Times New Roman"
    doc.styles["Normal"].font.size = Pt(12)

    title_page(doc)
    lines = load_lines()
    in_toc = False
    wrote_screenshots = False
    i = 0

    while i < len(lines):
        line = lines[i]

        if line == "TABLE OF CONTENTS":
            in_toc = True
            i += 1
            continue
        if in_toc:
            if is_heading(line) and not line[0].isdigit():
                in_toc = False
            elif re.match(r"^\d", line):
                i += 1
                continue
            else:
                in_toc = False

        if any(line.startswith(p) for p in SKIP_PREFIXES):
            if line.startswith("LIST OF FIGURES"):
                list_of_figures(doc)
            i += 1
            continue

        if line.startswith("[Insert screenshots"):
            doc.add_heading("5.4 Screenshots", level=2)
            doc.add_paragraph(
                "The following figures show the implemented ResiSure user interface captured from the running application."
            )
            for fname, caption in SCREENSHOTS:
                add_figure(doc, fname, caption)
            wrote_screenshots = True
            i += 1
            continue

        if is_heading(line):
            level = heading_level(line)
            doc.add_heading(line, level=level)
            if line in FIGURE_INSERTS:
                fname, caption = FIGURE_INSERTS[line]
                add_figure(doc, fname, caption)
            if line.startswith("1. INTRODUCTION"):
                doc.add_page_break()
            i += 1
            continue

        # Table-like blocks in original (Layer / Technology)
        if line == "Layer" and i + 1 < len(lines) and lines[i + 1] == "Technology":
            rows = []
            i += 2
            while i + 1 < len(lines) and not is_heading(lines[i]) and lines[i] not in SKIP_PREFIXES:
                if lines[i + 1] and not is_heading(lines[i + 1]):
                    rows.append((lines[i], lines[i + 1]))
                    i += 2
                else:
                    break
            table = doc.add_table(rows=1 + len(rows), cols=2)
            table.style = "Table Grid"
            table.rows[0].cells[0].text = "Layer"
            table.rows[0].cells[1].text = "Technology"
            for ri, (a, b) in enumerate(rows):
                table.rows[ri + 1].cells[0].text = a
                table.rows[ri + 1].cells[1].text = b
            doc.add_paragraph()
            continue

        # Skip orphan table header rows handled above
        if line in {"Technology", "Meaning", "Triggered By", "Purpose", "Test Case", "Method", "Result", "Description"}:
            i += 1
            continue

        doc.add_paragraph(line)
        i += 1

    if not wrote_screenshots:
        doc.add_heading("5.4 Screenshots", level=2)
        for fname, caption in SCREENSHOTS:
            add_figure(doc, fname, caption)

    OUTPUT_DOCS.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUTPUT_DOCS))
    doc.save(str(OUTPUT_DOWNLOADS))
    print(f"Wrote {OUTPUT_DOCS}")
    print(f"Wrote {OUTPUT_DOWNLOADS}")


if __name__ == "__main__":
    build()
