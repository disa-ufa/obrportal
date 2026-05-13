import { shortId } from "../../utils/organizationCabinet";

export function OrganizationGroupCourseOption({
  course,
  active,
  onSelect,
}) {
  const courseTitle = course.title || course.slug || course.id;
  const courseMetaLabel = [
    course.slug || shortId(course.id),
    course.hours ? `${course.hours} ч.` : "",
    course.format || "",
    course.document_type || "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(course)}
      className={`rounded-2xl px-4 py-3 text-left text-sm ring-1 transition ${
        active
          ? "bg-blue-100 text-blue-950 ring-blue-300"
          : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
      }`}
    >
      <span className="block font-semibold">
        {courseTitle}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {courseMetaLabel}
      </span>
    </button>
  );
}
