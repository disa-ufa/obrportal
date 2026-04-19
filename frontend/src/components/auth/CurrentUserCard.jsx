import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

export function CurrentUserCard({
  user,
  loading,
  onRbacCheck,
  onRefreshAdminData,
}) {
  return (
    <SectionCard title="Текущий пользователь">
      {!user ? (
        <p className="text-slate-600">
          Пользователь ещё не авторизован.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm text-slate-500">Email</div>
            <div className="font-semibold">{user.email}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm text-slate-500">ФИО</div>
            <div className="font-semibold">{user.full_name || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700">Роли</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <StatusBadge key={role.code} tone="blue">
                  {role.code}
                </StatusBadge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRbacCheck}
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Проверить admin RBAC
            </button>

            <button
              type="button"
              onClick={onRefreshAdminData}
              disabled={loading}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              Обновить admin API
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
