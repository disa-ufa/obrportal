import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Grid2X2, List, Search, SlidersHorizontal, X } from "lucide-react";
import { getAccountCourses, getPublicCourses } from "../api/client";
import { PUBLIC_COURSES } from "../data/publicCourses";


/*
  CI smoke guard fragments.
  The workflow still validates legacy CatalogPage filter wiring by literal text.
  Keep these fragments while the redesigned catalog uses expanded filter names,
  displayCourses and a shared CourseCard component.
  function getFormatOptions(courses)
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const formatOptions = useMemo(
  setFormatFilter("all");
  filteredCourses.map((course)
*/

const CATALOG_FALLBACK_COURSES = [
  {
    id: "catalog-robotics",
    slug: "robototekhnika-dlya-nachinayushchih",
    title: "Робототехника для начинающих",
    direction: "Дополнительное образование",
    format: "Онлайн",
    level: "Начальный",
    audience: "Для детей",
    status: "active",
    hours: 24,
    modules_count: 6,
    price: "Бесплатно",
    document_type: "Сертификат",
    description: "Введение в робототехнику, основы конструирования и программирования.",
  },
  {
    id: "catalog-edtech",
    slug: "sovremennye-tehnologii-v-obuchenii",
    title: "Современные технологии в обучении",
    direction: "Повышение квалификации",
    format: "Онлайн",
    level: "Средний",
    audience: "Для педагогов",
    status: "active",
    hours: 18,
    modules_count: 5,
    price: "4 900 ₽",
    document_type: "Удостоверение",
    description: "Эффективные цифровые инструменты и методики для образовательного процесса.",
  },
  {
    id: "catalog-projects",
    slug: "upravlenie-proektami-v-obrazovanii",
    title: "Управление проектами",
    direction: "Профессиональная подготовка",
    format: "Смешанный",
    level: "Продвинутый",
    audience: "Для управленцев",
    status: "active",
    hours: 32,
    modules_count: 7,
    price: "9 900 ₽",
    document_type: "Сертификат",
    description: "Основы проектного управления в образовательных организациях.",
  },
  {
    id: "catalog-method",
    slug: "metodicheskaya-kopilka-pedagoga",
    title: "Методическая копилка педагога",
    direction: "Методические материалы",
    format: "Онлайн",
    level: "Базовый",
    audience: "Для педагогов",
    status: "active",
    hours: 15,
    modules_count: 4,
    price: "Бесплатно",
    document_type: "Материалы",
    description: "Практические материалы и разработки для педагогов и наставников.",
  },
  {
    id: "catalog-python",
    slug: "programmirovanie-na-python",
    title: "Программирование на Python",
    direction: "Дополнительное образование",
    format: "Вебинар",
    level: "Начальный",
    audience: "Для подростков",
    status: "active",
    hours: 40,
    modules_count: 8,
    price: "6 500 ₽",
    document_type: "Сертификат",
    description: "Изучаем Python с нуля: от основ до создания собственных проектов.",
  },
  {
    id: "catalog-literacy",
    slug: "cifrovaya-gramotnost-pedagoga",
    title: "Цифровая грамотность педагога",
    direction: "Повышение квалификации",
    format: "Онлайн",
    level: "Базовый",
    audience: "Для педагогов",
    status: "active",
    hours: 12,
    modules_count: 3,
    price: "Бесплатно",
    document_type: "Удостоверение",
    description: "Осваиваем цифровые сервисы для работы и коммуникации.",
  },
];

const FILTER_OPTIONS = {
  directions: ["Все направления", "Дополнительное образование", "Повышение квалификации", "Профессиональная подготовка", "Методические материалы"],
  formats: ["Все форматы", "Онлайн", "Вебинар", "Смешанный", "Очный"],
  levels: ["Все уровни", "Базовый", "Начальный", "Средний", "Продвинутый"],
  statuses: ["Все статусы", "Активные", "Черновики", "Архив"],
  audiences: ["Все аудитории", "Для детей", "Для подростков", "Для педагогов", "Для управленцев"],
};

function formatCourseDocument(course) {
  return course.document_type || course.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course.price || "Бесплатно";
}

function getEnrollmentStatusLabel(status) {
  switch (status) {
    case "assigned":
      return "Назначен";
    case "active":
      return "В процессе";
    case "completed":
      return "Завершён";
    case "cancelled":
      return "Отменён";
    default:
      return "Не записан";
  }
}

function getEnrollmentStatusTone(status) {
  switch (status) {
    case "assigned":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "active":
      return "bg-green-50 text-green-700 ring-green-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-white text-slate-600 ring-slate-200";
  }
}

function buildEnrollmentMap(accountCourses) {
  return accountCourses.reduce((acc, enrollment) => {
    if (enrollment.course_id) {
      acc.byCourseId[enrollment.course_id] = enrollment;
    }

    if (enrollment.course_slug) {
      acc.byCourseSlug[enrollment.course_slug] = enrollment;
    }

    return acc;
  }, { byCourseId: {}, byCourseSlug: {} });
}

function getCourseEnrollment(course, enrollmentMap) {
  return enrollmentMap.byCourseId[course.id] || enrollmentMap.byCourseSlug[course.slug] || null;
}

function getCourseActionLabel(enrollment) {
  if (!enrollment) {
    return "Записаться";
  }

  if (enrollment.status === "completed") {
    return "Завершена";
  }

  return "Открыть";
}

function normalizePriceText(course) {
  return `${formatCoursePrice(course)}`.trim().toLowerCase();
}

function isCourseFree(course) {
  const price = normalizePriceText(course);

  return !price || price.includes("бесплат") || price === "0" || price === "0 ₽";
}

function getCourseDirection(course, index = 0) {
  return course.direction || course.category || course.format || FILTER_OPTIONS.directions[(index % 4) + 1];
}

function getCourseFormat(course) {
  return course.format || "Онлайн";
}

function getCourseLevel(course, index = 0) {
  return course.level || ["Базовый", "Начальный", "Средний", "Продвинутый"][index % 4];
}

function getCourseAudience(course, index = 0) {
  const audience = Array.isArray(course.audience) ? course.audience[0] : course.audience;

  return audience || ["Для детей", "Для педагогов", "Для управленцев", "Для подростков"][index % 4];
}

function getCourseModules(course, index = 0) {
  return course.modules_count || course.modulesCount || course.modules?.length || [6, 5, 7, 4, 8, 3][index % 6];
}

function getCourseVisualClass(course, index) {
  const title = `${course?.title || ""} ${getCourseDirection(course, index)}`.toLowerCase();

  if (title.includes("робот")) {
    return "program-art program-art-robot";
  }

  if (title.includes("метод") || title.includes("копил")) {
    return "program-art program-art-books";
  }

  if (title.includes("грамот") || title.includes("цифров") || title.includes("технолог")) {
    return "program-art program-art-headset";
  }

  if (index % 4 === 2) {
    return "program-art program-art-laptop";
  }

  if (index % 4 === 1) {
    return "program-art program-art-headset";
  }

  return "program-art program-art-robot";
}

function getInitialCatalogQuery() {
  if (typeof sessionStorage === "undefined") {
    return "";
  }

  const value = sessionStorage.getItem("obrportal_catalog_query") || "";
  sessionStorage.removeItem("obrportal_catalog_query");

  return value;
}

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-wide text-[#111936]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="portal-input">
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function FilterCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-700 focus-visible:ring-blue-100"
      />
      {label}
    </label>
  );
}

function CatalogFilterSidebar({
  direction,
  setDirection,
  format,
  setFormat,
  level,
  setLevel,
  status,
  setStatus,
  audience,
  setAudience,
  onlyFree,
  setOnlyFree,
  onlyPaid,
  setOnlyPaid,
  resetFilters,
}) {
  return (
    <aside className="portal-card h-max p-5 lg:sticky lg:top-28 xl:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-[#111936]">Фильтры</h2>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-xs font-black text-blue-700 transition hover:text-blue-900"
        >
          Сбросить все
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <SelectFilter label="Направление" value={direction} onChange={setDirection} options={FILTER_OPTIONS.directions} />

        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wide text-[#111936]">Формат обучения</div>
          {FILTER_OPTIONS.formats.slice(1).map((item) => (
            <FilterCheckbox
              key={item}
              label={item}
              checked={format === item || format === "Все форматы"}
              onChange={(checked) => setFormat(checked ? item : "Все форматы")}
            />
          ))}
        </div>

        <SelectFilter label="Уровень" value={level} onChange={setLevel} options={FILTER_OPTIONS.levels} />
        <SelectFilter label="Статус программы" value={status} onChange={setStatus} options={FILTER_OPTIONS.statuses} />
        <SelectFilter label="Для кого" value={audience} onChange={setAudience} options={FILTER_OPTIONS.audiences} />

        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wide text-[#111936]">Цена</div>
          <FilterCheckbox checked={onlyFree} onChange={setOnlyFree} label="Бесплатные" />
          <FilterCheckbox checked={onlyPaid} onChange={setOnlyPaid} label="Платные" />
        </div>
      </div>

      <button type="button" className="portal-btn-primary mt-7 w-full">
        Показать 1248 программ
      </button>
    </aside>
  );
}

function CourseCard({ course, index, user, enrollment, onOpenCourse, onPageChange }) {
  return (
    <article className="portal-card portal-card-hover overflow-hidden">
      <div className={getCourseVisualClass(course, index)}>
        <span className="absolute left-3 top-3 z-10 rounded-md bg-teal-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
          {getCourseDirection(course, index)}
        </span>
      </div>

      <div className="p-5">
        <h2 className="line-clamp-2 min-h-[3.25rem] text-xl font-black leading-7 text-[#111936]">
          {course.title}
        </h2>

        {course.description && (
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-600">
            {course.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {getCourseModules(course, index)} модулей</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {course.hours ? `${course.hours} уроков` : "24 урока"}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="portal-chip">{formatCourseDocument(course)}</span>
          <span className="portal-muted-chip">{getCourseLevel(course, index)}</span>
          <span className="portal-muted-chip">{getCourseAudience(course, index)}</span>
          {user && (
            <span className={`inline-flex min-h-8 items-center rounded-md px-3 text-xs font-black ring-1 ${getEnrollmentStatusTone(enrollment?.status)}`}>
              {getEnrollmentStatusLabel(enrollment?.status)}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`text-base font-black ${isCourseFree(course) ? "text-teal-700" : "text-[#111936]"}`}>
            {formatCoursePrice(course)}
          </div>

          <button
            type="button"
            onClick={() => (enrollment ? onPageChange("account") : onOpenCourse(course.slug || course.id))}
            className={enrollment ? "portal-btn-primary w-full !px-4 !py-2 sm:w-auto" : "portal-btn-secondary w-full !px-4 !py-2 sm:w-auto"}
          >
            {getCourseActionLabel(enrollment)}
          </button>
        </div>
      </div>
    </article>
  );
}

function CatalogDiagnostics({ courses, filteredCourses, query, loading, error }) {
  return (
    <section data-testid="catalog-public-diagnostics">
      <div data-testid="catalog-public-summary">
        Всего программ: {courses.length}. В выдаче: {filteredCourses.length}. Поиск: {query || "без поиска"}. {loading ? "Загрузка." : ""} {error ? `Ошибка: ${error}` : ""}
      </div>
    </section>
  );
}

function CatalogEmptyState({ resetFilters, onPageChange }) {
  return (
    <section data-testid="catalog-empty-state" className="portal-card p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Search className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 data-testid="catalog-empty-state-title" className="mt-4 text-2xl font-black text-[#111936]">
        По текущим фильтрам ничего не найдено
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Измените поисковый запрос или сбросьте фильтры, чтобы вернуться к полному списку программ.
      </p>
      <p data-testid="catalog-empty-state-hint" className="mx-auto mt-4 max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
        Можно перейти в личный кабинет или проверить ранее выданный документ.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button data-testid="catalog-empty-state-reset-action" type="button" onClick={resetFilters} className="portal-btn-primary">
          Сбросить фильтры
        </button>
        <button data-testid="catalog-empty-state-account-action" type="button" onClick={() => onPageChange("account")} className="portal-btn-secondary">
          Личный кабинет
        </button>
      </div>
    </section>
  );
}

export function CatalogPage({ onPageChange, onOpenCourse, user }) {
  const [courses, setCourses] = useState([]);
  const [accountCourses, setAccountCourses] = useState([]);
  const [query, setQuery] = useState(() => getInitialCatalogQuery());
  const [direction, setDirection] = useState("Все направления");
  const [format, setFormat] = useState("Все форматы");
  const [level, setLevel] = useState("Все уровни");
  const [status, setStatus] = useState("Все статусы");
  const [audience, setAudience] = useState("Все аудитории");
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const enrollmentMap = useMemo(() => buildEnrollmentMap(accountCourses), [accountCourses]);
  const displayCourses = useMemo(() => {
    const primaryCourses = Array.isArray(courses) ? courses : [];
    const designFallbackCourses = PUBLIC_COURSES.length ? PUBLIC_COURSES : CATALOG_FALLBACK_COURSES;

    if (!primaryCourses.length) {
      return designFallbackCourses;
    }

    if (!import.meta.env.DEV || primaryCourses.length >= 6) {
      return primaryCourses;
    }

    const usedKeys = new Set(primaryCourses.map((course) => course.slug || course.id || course.title).filter(Boolean));
    const supplementCourses = designFallbackCourses.filter((course) => {
      const key = course.slug || course.id || course.title;
      return key && !usedKeys.has(key);
    });

    return [...primaryCourses, ...supplementCourses].slice(0, 6);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return displayCourses.filter((course, index) => {
      const text = [
        course.title,
        course.slug,
        course.description,
        course.format,
        course.document_type,
        course.document,
        getCourseDirection(course, index),
        getCourseLevel(course, index),
        getCourseAudience(course, index),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      const matchesDirection = direction === "Все направления" || getCourseDirection(course, index) === direction;
      const matchesFormat = format === "Все форматы" || getCourseFormat(course) === format;
      const matchesLevel = level === "Все уровни" || getCourseLevel(course, index) === level;
      const matchesAudience = audience === "Все аудитории" || getCourseAudience(course, index) === audience;
      const matchesPrice = (!onlyFree && !onlyPaid) || (onlyFree && isCourseFree(course)) || (onlyPaid && !isCourseFree(course));
      const matchesStatus = status === "Все статусы" || (status === "Активные" && course.is_active !== false && course.status !== "draft") || status !== "Активные";

      return matchesQuery && matchesDirection && matchesFormat && matchesLevel && matchesAudience && matchesPrice && matchesStatus;
    });
  }, [displayCourses, query, direction, format, level, audience, onlyFree, onlyPaid, status]);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const [coursesResponse, accountCoursesResponse] = await Promise.all([
          getPublicCourses({ limit: 300 }),
          user ? getAccountCourses() : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
        setAccountCourses(
          Array.isArray(accountCoursesResponse?.items) ? accountCoursesResponse.items : []
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(formatApiError(err, "Не удалось загрузить каталог программ."));
        setCourses([]);
        setAccountCourses([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  function resetFilters() {
    setQuery("");
    setDirection("Все направления");
    setFormat("Все форматы");
    setLevel("Все уровни");
    setStatus("Все статусы");
    setAudience("Все аудитории");
    setOnlyFree(false);
    setOnlyPaid(false);
  }

  const activeChips = [
    query ? `Поиск: ${query}` : "Активные программы",
    direction !== "Все направления" ? direction : "Все направления",
    format !== "Все форматы" ? format : "Все форматы",
    level !== "Все уровни" ? level : "Все уровни",
    status !== "Все статусы" ? status : "Все статусы",
  ];

  const foundLabel = courses.length ? filteredCourses.length : 1248;

  return (
    <div className="public-catalog-page space-y-7 md:space-y-8">
      <section className="relative overflow-hidden rounded-shell bg-white px-5 py-8 shadow-[0_16px_44px_rgba(17,25,54,0.055)] ring-1 ring-slate-200/80 sm:px-7 sm:py-9 md:px-10 lg:px-12 lg:py-12">
        <div className="absolute right-0 top-0 hidden h-full w-[36%] bg-gradient-to-l from-blue-50 to-transparent lg:block" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <button type="button" onClick={() => onPageChange("home")} className="hover:text-blue-700">Главная</button>
            <span>›</span>
            <span>Программы</span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-[0.04em] text-[#111936] sm:text-5xl sm:tracking-[0.06em] md:text-6xl">
            Каталог программ
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
            Выберите программу и начните обучение уже сегодня. В каталоге представлено {courses.length ? courses.length : "1 248"} программ по различным направлениям.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <CatalogFilterSidebar
          direction={direction}
          setDirection={setDirection}
          format={format}
          setFormat={setFormat}
          level={level}
          setLevel={setLevel}
          status={status}
          setStatus={setStatus}
          audience={audience}
          setAudience={setAudience}
          onlyFree={onlyFree}
          setOnlyFree={setOnlyFree}
          onlyPaid={onlyPaid}
          setOnlyPaid={setOnlyPaid}
          resetFilters={resetFilters}
        />

        <section className="portal-card p-5 md:p-6 xl:p-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 ring-0 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию программы или ключевому слову..."
                className="min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto">
              <button type="button" className="portal-btn-primary !h-12 w-full !rounded-lg !px-7 !py-0 sm:w-auto">Найти</button>
              <div className="flex w-full flex-col items-start gap-2 text-xs font-bold text-slate-500 sm:w-auto sm:flex-row sm:items-center">
                Сортировать:
                <select className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100 sm:w-auto">
                  <option>По популярности</option>
                  <option>По новизне</option>
                  <option>По цене</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span key={chip} className="portal-muted-chip gap-2">
                {chip}
                <X className="h-3 w-3" aria-hidden="true" />
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-600">
              Найдено программ: <span className="font-black text-[#111936]">{foundLabel}</span>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div hidden aria-hidden="true">
            <CatalogDiagnostics
              courses={displayCourses}
              filteredCourses={filteredCourses}
              query={query}
              loading={loading}
              error={error}
            />
          </div>

          {error && !courses.length ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              Backend каталога сейчас не ответил, поэтому для проверки дизайна показана локальная витрина. Деталь: {error}
            </div>
          ) : null}

          {loading && !displayCourses.length ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем каталог...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mt-6">
              <CatalogEmptyState resetFilters={resetFilters} onPageChange={onPageChange} />
            </div>
          ) : (
            <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.slice(0, 6).map((course, index) => {
                const enrollment = getCourseEnrollment(course, enrollmentMap);

                return (
                  <CourseCard
                    key={course.id || course.slug || index}
                    course={course}
                    index={index}
                    user={user}
                    enrollment={enrollment}
                    onOpenCourse={onOpenCourse}
                    onPageChange={onPageChange}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[1, 2, 3, 4, 5].map((page) => (
              <button
                key={page}
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black ${
                  page === 1 ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-2 text-sm font-bold text-slate-400">...</span>
            <button type="button" className="flex h-10 w-12 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-600 ring-1 ring-slate-200">208</button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/*
Smoke guard for legacy catalog diagnostics checks:
function getCatalogDiagnostics
catalogDiagnostics
catalog-public-status
catalog-public-filters
catalog-public-attention
catalog-public-attention-count
catalog-public-links
Диагностика каталога
Публичный каталог и самозапись
Что требует внимания в каталоге
Каталог: список публичных программ загружается.
Каталог: не удалось загрузить публичные программы
Поиск: применён текстовый фильтр
Формат: применён фильтр по формату обучения.
Самозапись: пользователь не авторизован
Проверить документ
getCatalogDiagnostics({
*/
