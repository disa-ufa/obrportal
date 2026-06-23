export function OrganizationGroupCourseAssignmentActions({
  groupEnrollmentForm,
  handleGroupEnrollmentFormChange,
  assigningGroupCourse,
  canAssignCourse,
}) {
  const selectedStatus = groupEnrollmentForm.status;
  const isSubmitDisabled = !canAssignCourse;
  const submitLabel = assigningGroupCourse ? "Назначаем..." : "Назначить";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        name="status"
        value={selectedStatus}
        onChange={handleGroupEnrollmentFormChange}
        className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
      >
        <option value="assigned">Назначен</option>
        <option value="in_progress">В процессе</option>
        <option value="completed">Завершён</option>
      </select>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitLabel}
      </button>
    </div>
  );
}
