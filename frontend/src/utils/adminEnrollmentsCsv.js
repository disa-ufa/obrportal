// CSV exports must not treat unloaded document details as confirmed missing documents.
export function getEnrollmentExportActionRequired(enrollment, documentsById = {}) {
  if (
    enrollment.status === "assigned"
    || !enrollment.organization_id
    || !enrollment.learning_group_id
  ) {
    return "yes";
  }

  if (enrollment.status === "completed") {
    if (!Object.prototype.hasOwnProperty.call(documentsById, enrollment.id)) {
      return "unknown";
    }

    const documents = documentsById[enrollment.id];
    if (!Array.isArray(documents)) {
      return "unknown";
    }

    const hasAvailableDocument = documents.some((document) => document.status === "available");

    return hasAvailableDocument ? "no" : "yes";
  }

  return "no";
}

export function buildAdminEnrollmentsCsvRows(enrollments, documentsById, statusLabelFor) {
  return (Array.isArray(enrollments) ? enrollments : []).map((enrollment) => ({
    id: enrollment.id,
    user_id: enrollment.user_id || "",
    user_email: enrollment.user_email || "",
    user_full_name: enrollment.user_full_name || "",
    course_id: enrollment.course_id || "",
    course_title: enrollment.course_title || "",
    course_slug: enrollment.course_slug || "",
    organization_id: enrollment.organization_id || "",
    organization_name: enrollment.organization_name || "",
    learning_group_id: enrollment.learning_group_id || "",
    learning_group_name: enrollment.learning_group_name || "",
    status: enrollment.status || "",
    status_label: statusLabelFor(enrollment.status),
    started_at: enrollment.started_at || "",
    completed_at: enrollment.completed_at || "",
    action_required: getEnrollmentExportActionRequired(enrollment, documentsById),
    documents_url: enrollment.id
      ? `/admin/documents?enrollment_id=${enrollment.id}`
      : "",
    course_url: enrollment.course_slug
      ? `/courses/${enrollment.course_slug}`
      : "",
    created_at: enrollment.created_at || "",
    updated_at: enrollment.updated_at || "",
  }));
}
