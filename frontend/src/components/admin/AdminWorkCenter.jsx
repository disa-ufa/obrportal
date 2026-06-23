import { Link } from "react-router-dom";

export function getAdminToneClasses(tone) {
  if (tone === "green") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }

  if (tone === "amber") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (tone === "red") {
    return "bg-red-50 text-red-800 ring-red-200";
  }

  if (tone === "violet") {
    return "bg-violet-50 text-violet-800 ring-violet-200";
  }

  if (tone === "gray") {
    return "bg-slate-50 text-slate-800 ring-slate-200";
  }

  return "bg-blue-50 text-blue-800 ring-blue-200";
}

export function AdminMetricCard({
  title,
  label,
  value,
  hint,
  to,
  tone = "blue",
  className = "",
  linkClassName = "block",
}) {
  const cardTitle = title || label;
  const bodyClassName = [
    "rounded-2xl p-5 ring-1 transition hover:bg-white hover:shadow-sm",
    getAdminToneClasses(tone),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <div className={bodyClassName}>
      <div className="text-sm font-semibold opacity-80">{cardTitle}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs leading-5 opacity-80">{hint}</div>}
    </div>
  );

  if (!to) {
    return body;
  }

  return (
    <Link to={to} className={linkClassName}>
      {body}
    </Link>
  );
}

export function AdminSignalCard({
  title,
  value,
  hint,
  to,
  tone = "blue",
  className = "",
  linkClassName = "block",
}) {
  const bodyClassName = [
    "rounded-2xl p-4 ring-1",
    getAdminToneClasses(tone),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <div className={bodyClassName}>
      <div className="text-sm font-semibold opacity-80">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs leading-5 opacity-80">{hint}</div>
    </div>
  );

  if (!to) {
    return body;
  }

  return (
    <Link to={to} className={linkClassName}>
      {body}
    </Link>
  );
}

export function AdminSummaryCard({ title, value, hint, to }) {
  const body = (
    <div className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-2 text-sm leading-5 text-slate-500">{hint}</div>}
    </div>
  );

  if (!to) {
    return body;
  }

  return (
    <Link to={to} className="block">
      {body}
    </Link>
  );
}

export function AdminWorkflowLink({ title, description, to }) {
  return (
    <Link
      to={to}
      className="rounded-shell bg-slate-50 p-5 text-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
    >
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2 leading-6 text-slate-600">{description}</div>
    </Link>
  );
}
