import { BOOKING_STEPS, bookingCopy } from '../../lib/bookingStatus';

export default function BookingStepper({ status }) {
  const current = bookingCopy(status).step;
  const currentLabel = BOOKING_STEPS[current] || BOOKING_STEPS[0];
  const progress = ((current + 1) / BOOKING_STEPS.length) * 100;

  return (
    <div aria-label="Booking progress">
      {/* Mobile: compact progress */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-blue-700">
            Step {current + 1} of {BOOKING_STEPS.length}
          </p>
          <p className="truncate text-sm text-slate-600">{currentLabel}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop: full stepper */}
      <ol className="hidden grid-cols-5 gap-2 md:grid" aria-label="Booking progress steps">
        {BOOKING_STEPS.map((label, index) => {
          const active = index <= current;
          const isCurrent = index === current;
          return (
            <li key={label} className="min-w-0" aria-current={isCurrent ? 'step' : undefined}>
              <div
                className={`mb-2 h-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-200'}`}
                aria-hidden="true"
              />
              <p className={`truncate text-xs font-medium ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                <span className="sr-only">
                  {isCurrent ? 'Current step: ' : active ? 'Completed: ' : 'Upcoming: '}
                </span>
                {index + 1}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      <span className="sr-only">
        Step {current + 1} of {BOOKING_STEPS.length}: {currentLabel}
      </span>
    </div>
  );
}
