import {
  formatDate,
  formatEnrollmentStatus,
} from "../../utils/organizationCabinet";

export function OrganizationGroupEnrollmentCard({
  enrollment,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
      <div className="font-semibold text-slate-950">
        {enrollment.course_title || enrollment.course_slug || enrollment.course_id}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Участник: {enrollment.user_full_name || enrollment.user_email || enrollment.user_id}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Статус: {formatEnrollmentStatus(enrollment.status)}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Создано: {formatDate(enrollment.created_at)}
      </div>
      {enrollment.status === "assigned" && (
        <button
          type="button"
          onClick={() => handleDeleteGroupEnrollment(enrollment)}
          disabled={deletingGroupEnrollmentId === enrollment.id}
          className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {deletingGroupEnrollmentId === enrollment.id ? "Снимаем..." : "Снять назначение"}
        </button>
      )}
    </div>
  );
}
