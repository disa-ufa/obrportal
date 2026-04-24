import { SectionCard } from "../components/ui/SectionCard";

export function AccountPage({ user, onPageChange, onLogout }) {
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
          Это первый frontend-stub личного кабинета физического лица. На следующем
          этапе сюда будут подключены реальные данные по обучению, курсам,
          документам и прогрессу.
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

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Профиль" subtitle="Базовая информация пользователя">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">E-mail</div>
              <div className="mt-2 font-semibold text-slate-900">
                {user?.email || "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">Статус</div>
              <div className="mt-2 font-semibold text-slate-900">
                Авторизованный пользователь
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Мои программы" subtitle="Будущий раздел обучения">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              Здесь появится список программ, на которые записан пользователь.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              Будут добавлены статусы, прогресс и быстрый переход к обучению.
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Документы" subtitle="Будущий раздел итоговых документов">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              Здесь появится список выданных документов и статусов формирования.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              Будет добавлена связка с публичной проверкой подлинности.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}