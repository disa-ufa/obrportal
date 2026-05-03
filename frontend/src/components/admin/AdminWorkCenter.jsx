import { Link } from "react-router-dom";

export function AdminSummaryCard({ title, value, hint, to }) {
  const body = (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300">
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
      className="rounded-[2rem] bg-slate-50 p-5 text-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
    >
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2 leading-6 text-slate-600">{description}</div>
    </Link>
  );
}
