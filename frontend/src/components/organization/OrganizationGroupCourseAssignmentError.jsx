export function OrganizationGroupCourseAssignmentError({
  groupEnrollmentError,
}) {
  if (!groupEnrollmentError) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
      {groupEnrollmentError}
    </div>
  );
}
