import { scrollToSection } from '../../lib/scrollToSection';

export default function DashboardSectionNav({ items, ariaLabel = 'Dashboard sections' }) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="hide-scrollbar mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:mb-8"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(item.id);
          }}
          className="inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {item.label}
          {item.badge != null && item.badge > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              {item.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
