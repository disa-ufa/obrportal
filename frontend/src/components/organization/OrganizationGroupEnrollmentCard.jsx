import {
  formatDate,
  formatEnrollmentStatus,
} from "../../utils/organizationCabinet";

function getEnrollmentDocumentMiniStatusLabel(status) {
  switch (status) {
    case "available":
      return "Документ опубликован";
    case "draft":
      return "Документ в черновике";
    case "revoked":
      return "Документ отозван";
    default:
      return "Документ ещё не сформирован";
  }
}

function getEnrollmentDocumentMiniStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-800 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-800 ring-red-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

export function OrganizationGroupEnrollmentCard({
  enrollment,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
}) {
  const courseLabel =
    enrollment.course_title || enrollment.course_slug || enrollment.course_id;
  const userLabel =
    enrollment.user_full_name || enrollment.user_email || enrollment.user_id;
  const statusLabel = formatEnrollmentStatus(enrollment.status);
  const createdAtLabel = formatDate(enrollment.created_at);
  const isAssigned = enrollment.status === "assigned";
  const documentItem = enrollment.document;
  const documentStatus = documentItem?.status || "missing";
  const isDeleting = deletingGroupEnrollmentId === enrollment.id;
  const deleteButtonLabel = isDeleting ? "Снимаем..." : "Снять назначение";

  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
      <div className="font-semibold text-slate-950">
        {courseLabel}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Участник: {userLabel}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Статус: {statusLabel}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Создано: {createdAtLabel}
      </div>
      <div
        data-testid="organization-enrollment-document-mini-status"
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getEnrollmentDocumentMiniStatusTone(documentStatus)}`}
      >
        {getEnrollmentDocumentMiniStatusLabel(documentStatus)}
      </div>
      {documentItem?.document_number && (
        <div className="mt-2 text-xs font-semibold text-slate-600">
          {documentItem.document_number}
        </div>
      )}
      {isAssigned && (
        <button
          type="button"
          onClick={() => handleDeleteGroupEnrollment(enrollment)}
          disabled={isDeleting}
          className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {deleteButtonLabel}
        </button>
      )}
    </div>
  );
}
