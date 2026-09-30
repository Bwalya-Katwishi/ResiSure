const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'accepted',
  'escrow_held',
  'move_in_window',
  'disputed',
];

const BOOKING_STATUS = {
  pending: {
    label: 'Waiting for landlord',
    color: 'pending',
    description: 'Your request has been sent. The landlord still needs to accept it.',
    next: 'We’ll notify you when the landlord responds.',
    step: 1,
  },
  accepted: {
    label: 'Ready for payment',
    color: 'pending',
    description: 'Your booking was accepted. Make your payment to protect the room.',
    next: 'Make your payment to continue.',
    step: 2,
  },
  rejected: {
    label: 'Declined',
    color: 'rejected',
    description: 'The landlord declined this request. You can browse other rooms.',
    next: 'Find another verified room.',
    step: 1,
  },
  escrow_held: {
    label: 'Payment protected',
    color: 'escrow',
    description: 'Your payment is protected until you confirm your move-in.',
    next: 'The move-in step opens on your move-in date.',
    step: 3,
  },
  move_in_window: {
    label: 'Confirm your move-in',
    color: 'pending',
    description: 'Your move-in window is open. Visit the room, then confirm if it matches the listing. You have 72 hours from when the window opened to confirm or raise a dispute.',
    next: 'Confirm move-in, or raise a dispute if something is wrong.',
    step: 3,
  },
  timed_out: {
    label: 'Completed',
    color: 'completed',
    description: 'This booking was completed after the move-in window closed.',
    next: null,
    step: 4,
  },
  confirmed: {
    label: 'Move-in confirmed',
    color: 'verified',
    description: 'You confirmed move-in. The landlord is being paid.',
    next: null,
    step: 4,
  },
  disputed: {
    label: 'Under review',
    color: 'disputed',
    description: 'This booking is being reviewed. Your payment stays protected for now.',
    next: 'An admin will update you when a decision is made.',
    step: 3,
  },
  completed: {
    label: 'Completed',
    color: 'completed',
    description: 'This booking is complete and the landlord has been paid.',
    next: null,
    step: 4,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'rejected',
    description: 'This booking was cancelled before payment.',
    next: 'You can start a new booking anytime.',
    step: 1,
  },
  refunded: {
    label: 'Refunded',
    color: 'verified',
    description: 'The review was resolved in your favour and the payment was returned.',
    next: null,
    step: 4,
  },
};

const BOOKING_STEPS = [
  'Review room',
  'Confirm booking',
  'Payment',
  'Move-in',
  'Complete',
];

const TRANSACTION_LABELS = {
  capture: 'Payment received',
  release: 'Paid to landlord',
  refund: 'Refund',
};

function bookingCopy(status) {
  return BOOKING_STATUS[status] || BOOKING_STATUS.pending;
}

function formatKwacha(amount) {
  return `K${Number(amount || 0).toLocaleString()}`;
}

function transactionLabel(type) {
  return TRANSACTION_LABELS[type] || type;
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUS,
  BOOKING_STEPS,
  TRANSACTION_LABELS,
  bookingCopy,
  formatKwacha,
  transactionLabel,
};
