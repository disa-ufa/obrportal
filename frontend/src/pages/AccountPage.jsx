import { useEffect, useState } from "react";
import { getAccountSummary } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

export function AccountPage({ user, onPageChange, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");
        const response = await getAccountSummary();

        if (!cancelled) {
          setSummary(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(`${err.status || ""} ${err.message}`.trim());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const profile = summary?.profile || user;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Личный кабинет
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Кабинет пользователя
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Первый рабочий срез кабинета физического лица: профиль уже приходит с backend,
          а счетчики подключены к реальному endpoint summary.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Перейти в каталог
          </button>
          <button
            type="button"
            onClick={() => onPageChange("home")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Выйти
          </button>
        </div>
      </section>

      {error && (
        <Alert title="Не удалось загрузить кабинет" tone="red">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Профиль" subtitle="Базовая информация пользователя">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка профиля...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">E-mail</div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile?.email || "—"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">ФИО</div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile?.full_name || "—"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">Статус</div>
                <div className="mt-2 font-semibold text-slate-900">
                  Авторизованный пользователь
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Мои программы" subtitle="Первый реальный summary count">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка данных...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">Всего назначений</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.enrollments_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">Активных программ</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.active_courses_count ?? 0}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Документы" subtitle="Первый реальный summary count">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка данных...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">Документов доступно</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.documents_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                Следующим шагом сюда подключим реальный список документов пользователя.
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}