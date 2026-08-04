import { ShieldCheck } from "lucide-react";

export function AuthSecurityNotice({
  title = "Безопасное соединение",
  children,
  className = "",
}) {
  return (
    <div
      data-testid="auth-security-notice"
      className={`flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200 ${className}`}
    >
      <ShieldCheck
        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
        aria-hidden="true"
      />

      <div>
        <div className="font-bold">{title}</div>
        {children && <div className="mt-1 text-emerald-800">{children}</div>}
      </div>
    </div>
  );
}
