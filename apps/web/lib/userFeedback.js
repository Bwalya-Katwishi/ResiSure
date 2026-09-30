export { getApiErrorMessage } from '@resisure/shared/validation/auth';

export function getActionableError(err, fallback = 'We could not complete that request. Please try again.') {
  const data = err?.response?.data;
  const message = data?.message || fallback;
  const code = data?.code;

  const actions = {
    STUDENT_NOT_VERIFIED: {
      actionHref: '/dashboard/student',
      actionLabel: 'Complete student verification',
    },
    LANDLORD_NOT_VERIFIED: {
      actionHref: '/dashboard/landlord',
      actionLabel: 'Complete landlord verification',
    },
    LANDLORD_DOCS_MISSING: {
      actionHref: '/dashboard/landlord',
      actionLabel: 'Upload verification documents',
    },
    LANDLORD_LISTING_NOT_TRUSTED: {
      actionHref: '/properties?verified=true',
      actionLabel: 'Browse verified landlords',
    },
  };

  return {
    message,
    code,
    ...(actions[code] || {}),
  };
}

export function showActionableToast(err, toast, fallback) {
  const info = getActionableError(err, fallback);
  toast.error(info.message);
  return info;
}
