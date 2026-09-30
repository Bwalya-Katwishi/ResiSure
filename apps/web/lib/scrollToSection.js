export function scrollToSection(sectionId, { focusSelector = null } = {}) {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(sectionId);
  if (!element) return;

  const navOffset = 80;
  const top = element.getBoundingClientRect().top + window.scrollY - navOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

  if (focusSelector) {
    window.setTimeout(() => {
      const focusTarget = element.querySelector(focusSelector);
      focusTarget?.focus({ preventScroll: true });
    }, 350);
  }
}
