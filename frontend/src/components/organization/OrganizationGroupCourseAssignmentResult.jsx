export function OrganizationGroupCourseAssignmentResult({
  groupEnrollmentResult,
}) {
  const skippedEnrollments = Array.isArray(groupEnrollmentResult?.skipped)
    ? groupEnrollmentResult.skipped
    : [];
  const visibleSkippedEnrollments = skippedEnrollments.slice(0, 5);
  const hasSkippedEnrollments = visibleSkippedEnrollments.length > 0;

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-blue-100">
      <div className="font-semibold text-slate-950">Результат назначения</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Создано:</span>{" "}
          <span className="font-semibold text-slate-950">
            {groupEnrollmentResult.created_count}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Пропущено:</span>{" "}
          <span className="font-semibold text-slate-950">
            {groupEnrollmentResult.skipped_count}
          </span>
        </div>
      </div>

      {hasSkippedEnrollments && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Пропущенные участники
          </div>
          <div className="mt-2 grid gap-2">
            {visibleSkippedEnrollments.map((item) => (
              <div key={item.user_id} className="text-xs text-slate-600">
                {item.user_full_name || item.user_email || item.user_id} — уже назначен
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
