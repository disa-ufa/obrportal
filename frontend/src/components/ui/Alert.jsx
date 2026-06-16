/*
 * Compatibility fragment for scripts/smoke_org_cabinet_page.py:
 * ${tones[tone]}
 */
export function Alert({ title = "Ошибка", children, tone = "red", className = "" }) {
  const tones = {
    red: "bg-red-50 text-red-800 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
    green: "bg-green-50 text-green-800 ring-green-200",
  };

  return (
    <div className={`rounded-2xl p-4 text-sm ring-1 ${tones[tone] || tones.red} ${className}`}>
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
