import { OrganizationCabinetHero } from "./OrganizationCabinetForms";

export function OrganizationCabinetHeroSection({
  heroUserLabel,
  onPageChange,
  onLogout,
}) {
  const catalogButtonLabel = "Каталог программ";
  const logoutButtonLabel = "Выйти";

  function handleCatalogClick() {
    onPageChange("catalog");
  }

  return (
    <OrganizationCabinetHero>
      <div className="text-sm font-semibold uppercase tracking-wide text-blue-200">
        Кабинет организации
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Управление обучением сотрудников
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
            Здесь представитель юридического лица видит учебные группы своей организации,
            участников групп и дальнейшие корпоративные назначения.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
              {heroUserLabel}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
              Роль: представитель ЮЛ
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCatalogClick}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
          >
            {catalogButtonLabel}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            {logoutButtonLabel}
          </button>
        </div>
      </div>
    </OrganizationCabinetHero>
  );
}
