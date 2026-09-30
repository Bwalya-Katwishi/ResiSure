"""Generate diagram assets for ResiSure thesis."""
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ASSETS = Path(__file__).resolve().parent.parent / "docs" / "thesis_assets"
ASSETS.mkdir(parents=True, exist_ok=True)

BRAND = "#0047AB"
ACCENT = "#4DA6FF"
WHITE = "#FFFFFF"
LIGHT = "#eef4fc"


def save(fig, name):
    path = ASSETS / name
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def fig_iterative_model():
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis("off")
    ax.set_title("Figure: Iterative system development model", fontsize=12, fontweight="bold", pad=12)
    boxes = [
        (1, 3.2, "Planning\n& Requirements"),
        (4, 3.2, "Design"),
        (7, 3.2, "Implementation"),
        (4, 1.2, "Testing\n& Feedback"),
    ]
    for x, y, label in boxes:
        box = FancyBboxPatch((x, y), 2.2, 1.1, boxstyle="round,pad=0.08", linewidth=1.5,
                             edgecolor=BRAND, facecolor=LIGHT)
        ax.add_patch(box)
        ax.text(x + 1.1, y + 0.55, label, ha="center", va="center", fontsize=10, fontweight="bold")
    arrows = [((3.2, 3.75), (4, 3.75)), ((6.2, 3.75), (7, 3.75)), ((8.1, 3.2), (5.1, 2.3)),
              ((3.9, 1.75), (2.1, 3.2)), ((6.1, 1.75), (8.1, 3.2))]
    for start, end in arrows:
        ax.add_patch(FancyArrowPatch(start, end, arrowstyle="->", mutation_scale=14, color=BRAND, lw=1.5))
    ax.text(5, 0.3, "Repeat until system meets objectives", ha="center", fontsize=9, color="#475569")
    return save(fig, "fig05_iterative_model.png")


def fig_architecture():
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis("off")
    ax.set_title("Figure: ResiSure layered system architecture", fontsize=12, fontweight="bold", pad=12)

    def box(x, y, w, h, text, color=LIGHT, ec=BRAND):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.06", linewidth=1.5, edgecolor=ec, facecolor=color))
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=9, fontweight="bold")

    box(0.5, 5.2, 11, 1.2, "Presentation Layer\nNext.js Web  •  Expo Mobile App", ACCENT, BRAND)
    box(0.5, 3.5, 11, 1.2, "Application Layer\nExpress Routes  →  Controllers  →  Validation Middleware")
    box(0.5, 1.8, 11, 1.2, "Domain / Service Layer\nAuth • Property • Booking • Escrow • Notification • Admin Services")
    box(0.5, 0.2, 5.2, 1.2, "Data Access Layer\nModels (User, Property, Booking, …)")
    box(6.3, 0.2, 5.2, 1.2, "PostgreSQL Database\n11 migrations, UUID keys", "#dbeafe", BRAND)
    for y in [4.4, 2.7, 1.0]:
        ax.add_patch(FancyArrowPatch((6, y), (6, y - 0.55), arrowstyle="->", mutation_scale=14, color=BRAND, lw=1.5))
    return save(fig, "fig06_architecture.png")


def fig_state_machine():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis("off")
    ax.set_title("Figure: Booking and escrow state machine", fontsize=12, fontweight="bold", pad=12)
    states = [
        (1, 6.5, "pending"), (4.5, 6.5, "accepted"), (8, 6.5, "escrow_held"),
        (1, 4, "rejected"), (4.5, 4, "move_in_window"), (8, 4, "disputed"),
        (2.5, 1.5, "confirmed"), (6, 1.5, "timed_out"), (9.5, 1.5, "completed"),
    ]
    for x, y, label in states:
        box = FancyBboxPatch((x, y), 2.2, 0.9, boxstyle="round,pad=0.05", linewidth=1.2, edgecolor=BRAND, facecolor=LIGHT)
        ax.add_patch(box)
        ax.text(x + 1.1, y + 0.45, label, ha="center", va="center", fontsize=8, fontweight="bold")
    flow = [
        ((2.1, 6.95), (4.5, 6.95), "landlord accepts"),
        ((6.7, 6.95), (8, 6.95), "student pays"),
        ((9.1, 6.5), (5.6, 4.9), "move-in date"),
        ((5.6, 4), (3.6, 2.4), "confirm"),
        ((5.6, 4), (9.5, 2.4), "auto-release"),
        ((1, 6.5), (1, 4.9), "reject"),
    ]
    for s, e, _ in flow:
        ax.add_patch(FancyArrowPatch(s, e, arrowstyle="->", mutation_scale=12, color="#334155", lw=1.2))
    return save(fig, "fig07_state_machine.png")


def fig_er_diagram():
    fig, ax = plt.subplots(figsize=(10, 6.5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")
    ax.set_title("Figure: Entity relationship overview", fontsize=12, fontweight="bold", pad=12)
    entities = [
        (0.5, 7, "users\nid, role, email"),
        (4, 7, "landlord_profiles\nverification_status"),
        (7.5, 7, "student_profiles\nverification_status"),
        (0.5, 4.5, "properties\nrent, area, status"),
        (4, 4.5, "property_images\nimage_url"),
        (7.5, 4.5, "bookings\nstatus, move_in_date"),
        (0.5, 2, "escrow_transactions\ncapture/release/refund"),
        (4, 2, "booking_audit_log\nfrom/to status"),
        (7.5, 2, "disputes\nreason, resolution"),
    ]
    for x, y, text in entities:
        box = FancyBboxPatch((x, y), 2.8, 1.3, boxstyle="round,pad=0.05", linewidth=1.2, edgecolor=BRAND, facecolor=LIGHT)
        ax.add_patch(box)
        ax.text(x + 1.4, y + 0.65, text, ha="center", va="center", fontsize=8)
    pairs = [((1.9, 7.6), (4, 7.6)), ((5.9, 7.6), (7.5, 7.6)), ((1.9, 5.8), (4, 5.8)), ((5.9, 5.8), (7.5, 5.8)),
             ((1.9, 3.3), (4, 3.3)), ((5.9, 3.3), (7.5, 3.3))]
    for s, e in pairs:
        ax.plot([s[0], e[0]], [s[1], e[1]], color=BRAND, lw=1.2)
        ax.text((s[0]+e[0])/2, s[1]+0.15, "1—N", ha="center", fontsize=7, color="#64748b")
    return save(fig, "fig08_er_diagram.png")


def fig_escrow_timeline_ui():
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis("off")
    ax.set_title("Figure: Booking detail — escrow timeline", fontsize=12, fontweight="bold", pad=12)
    ax.add_patch(FancyBboxPatch((0.3, 4.5), 9.4, 1.0, boxstyle="round,pad=0.05", linewidth=1.2, edgecolor=BRAND, facecolor=LIGHT))
    ax.text(5, 5.0, "Favorite test room  •  K1,200/month  •  Status: move_in_window", ha="center", va="center", fontsize=10, fontweight="bold")
    steps = [
        (0.8, 2.8, "Booking\ncreated", True),
        (2.6, 2.8, "Landlord\naccepted", True),
        (4.4, 2.8, "Payment\nin escrow", True),
        (6.2, 2.8, "Move-in\nwindow open", True),
        (8.0, 2.8, "Confirm\nmove-in", False),
    ]
    for x, y, label, done in steps:
        color = BRAND if done else "#cbd5e1"
        ax.add_patch(FancyBboxPatch((x, y), 1.4, 1.0, boxstyle="round,pad=0.05", linewidth=1.2, edgecolor=color, facecolor="white"))
        ax.text(x + 0.7, y + 0.5, label, ha="center", va="center", fontsize=8, fontweight="bold", color=color)
    for i in range(len(steps) - 1):
        ax.plot([steps[i][0] + 1.4, steps[i + 1][0]], [3.3, 3.3], color=BRAND, lw=2)
    ax.add_patch(FancyBboxPatch((2.5, 0.5), 5, 1.2, boxstyle="round,pad=0.06", linewidth=1.5, edgecolor=ACCENT, facecolor="#f0f7ff"))
    ax.text(5, 1.1, "Action available: Confirm move-in or Raise dispute\nAuto-release in 48 hours if no action taken", ha="center", va="center", fontsize=9)
    return save(fig, "fig15_booking_escrow_diagram.png")


if __name__ == "__main__":
    for fn in (fig_iterative_model, fig_architecture, fig_state_machine, fig_er_diagram, fig_escrow_timeline_ui):
        print("Wrote", fn())
