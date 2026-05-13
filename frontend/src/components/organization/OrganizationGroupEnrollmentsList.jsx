import { OrganizationGroupEnrollmentCard } from "./OrganizationGroupEnrollmentCard";

export function OrganizationGroupEnrollmentsList({
  groupEnrollmentsLoading,
  groupEnrollments,
  visibleGroupEnrollments,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
}) {
  if (groupEnrollmentsLoading) {
    return (
      <div className="mt-3 text-sm text-slate-500">Загружаем назначения...</div>
    );
  }

  if (groupEnrollments.length === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
        У выбранной группы пока нет назначенных курсов.
      </div>
    );
  }

  if (visibleGroupEnrollments.length === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
        По заданным фильтрам назначений не найдено.
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {visibleGroupEnrollments.map((enrollment) => (
        <OrganizationGroupEnrollmentCard
          key={enrollment.id}
          enrollment={enrollment}
          deletingGroupEnrollmentId={deletingGroupEnrollmentId}
          handleDeleteGroupEnrollment={handleDeleteGroupEnrollment}
        />
      ))}
    </div>
  );
}
