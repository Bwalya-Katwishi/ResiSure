const TABS = ['Overview', 'Landlords', 'Students', 'Properties', 'Bookings', 'Disputes', 'Audit'];

export default function AdminTabNav({ tab, setTab, pendingLandlords, pendingStudents }) {
  return (
    <div
      className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Admin sections"
    >
      {TABS.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={tab === item}
          onClick={() => setTab(item)}
          className={`inline-flex shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-medium ${
            tab === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          {item}
          {item === 'Landlords' && pendingLandlords > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{pendingLandlords}</span>
          )}
          {item === 'Students' && pendingStudents > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{pendingStudents}</span>
          )}
        </button>
      ))}
    </div>
  );
}
