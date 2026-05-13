export function OrganizationGroupEnrollmentsMessages({
  groupEnrollmentDeleteMessage,
  groupEnrollmentsError,
}) {
  const hasDeleteMessage = Boolean(groupEnrollmentDeleteMessage);
  const hasErrorMessage = Boolean(groupEnrollmentsError);

  if (!hasDeleteMessage && !hasErrorMessage) {
    return null;
  }

  return (
    <>
      {hasDeleteMessage && (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
          {groupEnrollmentDeleteMessage}
        </div>
      )}

      {hasErrorMessage && (
        <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {groupEnrollmentsError}
        </div>
      )}
    </>
  );
}
