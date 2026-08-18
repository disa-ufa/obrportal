export const COURSE_DETAIL_STATES = Object.freeze({
  LOADING: "loading",
  NOT_FOUND: "not_found",
  ERROR: "error",
  GUEST: "guest",
  AUTHENTICATED_UNENROLLED: "authenticated_unenrolled",
  ASSIGNED: "assigned",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const PUBLIC_COURSE_LOAD_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  NOT_FOUND: "not_found",
  ERROR: "error",
});

export const ACCOUNT_COURSE_LOAD_STATES = Object.freeze({
  NOT_REQUIRED: "not_required",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
});

const ENROLLMENT_PAGE_STATES = Object.freeze({
  assigned: COURSE_DETAIL_STATES.ASSIGNED,
  active: COURSE_DETAIL_STATES.ACTIVE,
  completed: COURSE_DETAIL_STATES.COMPLETED,
  cancelled: COURSE_DETAIL_STATES.CANCELLED,
});

export function resolveCourseDetailState({
  publicState = PUBLIC_COURSE_LOAD_STATES.LOADING,
  accountState = ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED,
  user = null,
  enrollment = null,
} = {}) {
  if (publicState === PUBLIC_COURSE_LOAD_STATES.LOADING) {
    return COURSE_DETAIL_STATES.LOADING;
  }

  if (publicState === PUBLIC_COURSE_LOAD_STATES.NOT_FOUND) {
    return COURSE_DETAIL_STATES.NOT_FOUND;
  }

  if (
    publicState === PUBLIC_COURSE_LOAD_STATES.ERROR ||
    publicState !== PUBLIC_COURSE_LOAD_STATES.READY
  ) {
    return COURSE_DETAIL_STATES.ERROR;
  }

  if (!user) {
    return COURSE_DETAIL_STATES.GUEST;
  }

  if (accountState === ACCOUNT_COURSE_LOAD_STATES.LOADING) {
    return COURSE_DETAIL_STATES.LOADING;
  }

  if (
    accountState === ACCOUNT_COURSE_LOAD_STATES.ERROR ||
    accountState !== ACCOUNT_COURSE_LOAD_STATES.READY
  ) {
    return COURSE_DETAIL_STATES.ERROR;
  }

  const enrollmentStatus = `${enrollment?.status || ""}`.trim().toLowerCase();

  if (!enrollmentStatus) {
    return COURSE_DETAIL_STATES.AUTHENTICATED_UNENROLLED;
  }

  return (
    ENROLLMENT_PAGE_STATES[enrollmentStatus] ||
    COURSE_DETAIL_STATES.ERROR
  );
}
