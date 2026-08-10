import { useEffect, useMemo, useState } from "react";

import { getOrgProfile } from "../api/client";
import { OrganizationProfileCard } from "../components/organization/OrganizationCabinetForms";
import { formatApiError } from "../utils/apiErrors";
import { buildOrganizationOptions } from "../utils/organizationCabinet";

export function MinistryCabinetPage({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await getOrgProfile();

        if (!cancelled) {
          setProfile(response && typeof response === "object" ? response : null);
        }
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setError(
            formatApiError(
              err,
              "Не удалось загрузить профили подведомственных организаций."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const organizations = useMemo(
    () => buildOrganizationOptions(profile?.organizations || [], []),
    [profile]
  );

  const userLabel = user?.full_name || user?.email || "Администратор ведомства";

  return (
    <div data-testid="ministry-cabinet-page" className="space-y-6">
      <section className="rounded-shell bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Администратор ведомства
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Подведомственные организации
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              Просматривайте полные профили организаций, закреплённых за вашей учётной записью.
              Изменение данных из кабинета ведомства недоступно.
            </p>
            <div className="mt-4 text-sm font-semibold text-white">{userLabel}</div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
          >
            Выйти
          </button>
        </div>
      </section>

      <section data-testid="ministry-cabinet-summary" className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Организаций в доступе
          </div>
          <div className="mt-2 text-3xl font-black text-slate-950">
            {profile?.summary?.organizations_count ?? organizations.length}
          </div>
        </div>
        <div className="rounded-3xl bg-blue-50 p-5 text-blue-950 ring-1 ring-blue-100">
          <div className="text-sm font-bold">Режим доступа</div>
          <div className="mt-1 text-sm leading-6">
            Только просмотр профилей закреплённых организаций.
          </div>
        </div>
      </section>

      {loading && (
        <div
          data-testid="ministry-cabinet-loading"
          className="rounded-3xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-200"
        >
          Загружаем профили организаций...
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="ministry-cabinet-error"
          className="rounded-3xl bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200"
        >
          {error}
        </div>
      )}

      {!loading && !error && organizations.length === 0 && (
        <div
          data-testid="ministry-cabinet-empty"
          className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"
        >
          <div className="text-lg font-bold text-slate-950">
            Нет закреплённых организаций
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Обратитесь к системному администратору для назначения организаций вашей учётной записи.
          </div>
        </div>
      )}

      {!loading && !error && organizations.length > 0 && (
        <section data-testid="ministry-cabinet-organizations" className="space-y-5">
          {organizations.map((organization) => (
            <OrganizationProfileCard
              key={organization.id}
              organization={organization}
              readOnly
            />
          ))}
        </section>
      )}
    </div>
  );
}
