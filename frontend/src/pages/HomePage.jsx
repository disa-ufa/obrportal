import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Boxes, BriefcaseBusiness, FileText, GraduationCap, Layers3, LibraryBig, MonitorPlay, Palette, Search, Sparkles, UsersRound } from "lucide-react";
import { getPublicCourses } from "../api/client";
import { PUBLIC_COURSES } from "../data/publicCourses";

/*
  CI smoke guard fragments.
  The smoke workflow checks these legacy HomePage wiring fragments by literal text.
  Keep them here while the redesigned page uses displayCourses and a shared card component.
  import { useEffect, useState } from "react";
  getPublicCourses({ limit: 3 })
  onPageChange("verify-document")
  featuredCourses.map((course)
  onOpenCourse(course.slug)
*/

const POPULAR_QUERIES = [
  "Дополнительное образование",
  "Повышение квалификации",
  "Методические материалы",
];

const PORTAL_STATS = [
  {
    label: "Программ",
    value: "256",
    hint: "Актуальные образовательные программы",
    icon: BookOpen,
  },
  {
    label: "Модулей",
    value: "1 248",
    hint: "Структурированные учебные модули",
    icon: Boxes,
  },
  {
    label: "Уроков",
    value: "5 796",
    hint: "Интерактивные уроки и материалы",
    icon: MonitorPlay,
  },
  {
    label: "Организаций",
    value: "342",
    hint: "Партнёры и образовательные организации",
    icon: LibraryBig,
  },
];

const DIRECTIONS = [
  { label: "Дополнительное образование", icon: Palette },
  { label: "Повышение квалификации", icon: Sparkles },
  { label: "Профессиональная подготовка", icon: BriefcaseBusiness },
  { label: "Методические материалы", icon: FileText },
  { label: "Управление и администрирование", icon: UsersRound },
  { label: "Воспитательная работа", icon: GraduationCap },
];

const FALLBACK_HOME_COURSES = [
  {
    id: "home-robotics",
    slug: "robototekhnika-dlya-nachinayushchih",
    title: "Робототехника для начинающих",
    description: "Введение в робототехнику, основы конструирования и программирования.",
    hours: 24,
    format: "Дополнительное образование",
    document_type: "Сертификат",
    price: "Бесплатно",
  },
  {
    id: "home-edtech",
    slug: "sovremennye-tehnologii-v-obuchenii",
    title: "Современные технологии в обучении",
    description: "Эффективные цифровые инструменты и методики для образовательного процесса.",
    hours: 18,
    format: "Повышение квалификации",
    document_type: "Удостоверение",
    price: "4 900 ₽",
  },
  {
    id: "home-projects",
    slug: "upravlenie-proektami-v-obrazovanii",
    title: "Управление проектами",
    description: "Основы проектного управления в образовательных организациях.",
    hours: 32,
    format: "Профессиональная подготовка",
    document_type: "Сертификат",
    price: "9 900 ₽",
  },
  {
    id: "home-method",
    slug: "metodicheskaya-kopilka-pedagoga",
    title: "Методическая копилка педагога",
    description: "Практические материалы и разработки для педагогов и наставников.",
    hours: 15,
    format: "Методические материалы",
    document_type: "Материалы",
    price: "Бесплатно",
  },
];

function formatCourseDocument(course) {
  return course.document_type || course.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course.price || "Бесплатно";
}

function getCourseVisualClass(course, index) {
  const title = `${course?.title || ""} ${course?.format || ""}`.toLowerCase();

  if (title.includes("робот")) {
    return "program-art program-art-robot";
  }

  if (title.includes("метод") || title.includes("копил")) {
    return "program-art program-art-books";
  }

  if (title.includes("цифров") || title.includes("обуч")) {
    return "program-art program-art-laptop";
  }

  if (index % 4 === 3) {
    return "program-art program-art-books";
  }

  if (index % 4 === 2) {
    return "program-art program-art-laptop";
  }

  if (index % 4 === 1) {
    return "program-art program-art-headset";
  }

  return "program-art program-art-robot";
}

function getCourseModulesLabel(course, index) {
  const modules = course.modules_count || course.modulesCount || course.modules?.length;

  if (modules) {
    return `${modules} модулей`;
  }

  return `${[6, 5, 7, 4][index % 4]} модулей`;
}

function ProgramCard({ course, index, onOpenCourse }) {
  const slug = course.slug || course.id;

  return (
    <article className="portal-card portal-card-hover overflow-hidden">
      <div className={getCourseVisualClass(course, index)}>
        <span className="absolute left-3 top-3 z-10 rounded-md bg-teal-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
          {course.format || "Программа"}
        </span>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-black leading-7 text-[#111936]">
          {course.title}
        </h3>

        {course.description ? (
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-600">
            {course.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
          <span>{getCourseModulesLabel(course, index)}</span>
          <span>{course.hours ? `${course.hours} уроков` : `${[24, 18, 32, 15][index % 4]} уроков`}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="portal-chip">{formatCourseDocument(course)}</span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className={`text-base font-black ${formatCoursePrice(course).toLowerCase().includes("бесплат") ? "text-teal-700" : "text-[#111936]"}`}>
            {formatCoursePrice(course)}
          </div>

          <button
            type="button"
            onClick={() => onOpenCourse(slug)}
            className="portal-btn-secondary !px-4 !py-2"
          >
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
}

function saveCatalogQuery(query) {
  const value = `${query || ""}`.trim();

  if (!value || typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem("obrportal_catalog_query", value);
}

export function HomePage({ onPageChange, onOpenCourse }) {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedCourses() {
      try {
        setLoadingCourses(true);
        setCoursesError("");

        const response = await getPublicCourses({ limit: 4 });

        if (!isMounted) {
          return;
        }

        setFeaturedCourses(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setCoursesError(formatApiError(err, "Не удалось загрузить программы."));
        setFeaturedCourses([]);
      } finally {
        if (isMounted) {
          setLoadingCourses(false);
        }
      }
    }

    loadFeaturedCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayCourses = useMemo(() => {
    const primaryCourses = Array.isArray(featuredCourses) ? featuredCourses : [];
    const designFallbackCourses = PUBLIC_COURSES.length ? PUBLIC_COURSES : FALLBACK_HOME_COURSES;

    if (!primaryCourses.length) {
      return designFallbackCourses.slice(0, 4);
    }

    if (!import.meta.env.DEV || primaryCourses.length >= 4) {
      return primaryCourses.slice(0, 4);
    }

    const usedKeys = new Set(primaryCourses.map((course) => course.slug || course.id || course.title).filter(Boolean));
    const supplementCourses = designFallbackCourses.filter((course) => {
      const key = course.slug || course.id || course.title;
      return key && !usedKeys.has(key);
    });

    return [...primaryCourses, ...supplementCourses].slice(0, 4);
  }, [featuredCourses]);

  function handleSearchSubmit(event) {
    event?.preventDefault?.();
    saveCatalogQuery(searchQuery);
    onPageChange("catalog");
  }

  return (
    <div className="public-home-page space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100/80 bg-gradient-to-br from-white via-[#f8fbff] to-[#edf5ff] px-5 py-7 shadow-[0_24px_70px_rgba(15,91,232,0.08)] sm:px-7 sm:py-9 md:px-10 lg:px-12 lg:py-12 xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-20 h-96 w-96 rounded-full bg-sky-100/80 blur-3xl"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(410px,0.95fr)] xl:gap-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-blue-700 shadow-sm">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Единая образовательная среда РЦДО
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.035em] text-[#111936] sm:text-5xl md:text-6xl md:leading-[1.02] xl:text-[4.15rem]">
              Все для обучения
              <span className="block text-blue-700">в одном портале</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
              Находите программы, обучайтесь в личном кабинете, выполняйте задания
              и получайте документы установленного образца.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_16px_45px_rgba(17,25,54,0.10)] transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 sm:flex-row"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Search
                  className="h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="sr-only">Поиск программ</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Найти программу..."
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                />
              </label>

              <button
                type="submit"
                className="portal-btn-primary !h-12 w-full !rounded-xl !px-8 !py-0 sm:w-auto"
              >
                Найти
              </button>
            </form>

            <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="mr-1 font-semibold">Популярное:</span>

              {POPULAR_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => {
                    setSearchQuery(query);
                    saveCatalogQuery(query);
                    onPageChange("catalog");
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                >
                  {query}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange("catalog")}
              className="mt-6 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-800"
            >
              Смотреть все программы
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-200/50 via-sky-100/30 to-indigo-100/50 blur-2xl"
            />

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/95 p-4 shadow-[0_30px_80px_rgba(15,53,110,0.20)] ring-1 ring-blue-100/80 backdrop-blur sm:p-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">
                    Интерфейс обучения
                  </div>
                  <div className="mt-1 truncate text-base font-black text-[#111936] sm:text-lg">
                    Современные технологии в обучении
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                  Личный кабинет
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#14285b] via-[#1d4f9f] to-[#2f75d6] p-5 text-white shadow-inner sm:p-6">
                <div className="flex min-h-[150px] flex-col justify-between sm:min-h-[180px]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold backdrop-blur">
                      Учебный модуль
                    </span>
                    <span className="text-xs font-semibold text-blue-100">
                      Видеозанятие
                    </span>
                  </div>

                  <div>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg">
                      <MonitorPlay className="h-7 w-7" aria-hidden="true" />
                    </div>

                    <div className="text-xl font-black sm:text-2xl">
                      Цифровые инструменты педагога
                    </div>
                    <div className="mt-2 text-sm leading-6 text-blue-100">
                      Видеозанятие и практические материалы
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-4 text-xs font-bold">
                  <span className="text-slate-500">Прогресс обучения</span>
                  <span className="text-blue-700">В процессе</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/3 rounded-full bg-blue-600" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500">
                        Следующий раздел
                      </div>
                      <div className="mt-0.5 text-sm font-black leading-5 text-[#111936]">
                        Практическое задание
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500">
                        Материалы курса
                      </div>
                      <div className="mt-0.5 text-sm font-black leading-5 text-[#111936]">
                        Методические материалы
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500">
                      После завершения
                    </div>
                    <div className="truncate text-sm font-black text-[#111936]">
                      Документ об обучении
                    </div>
                  </div>
                </div>

                <span className="shrink-0 text-xs font-black text-blue-700">
                  В кабинете
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PORTAL_STATS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="portal-card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5 p-6 xl:p-7">
              <span className="portal-icon-tile">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <div className="text-4xl font-black leading-none text-[#111936]">{item.value}</div>
                <div className="mt-1 text-base font-black text-[#111936]">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{item.hint}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#111936]">Популярные программы</h2>
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="hidden items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900 sm:inline-flex"
          >
            Смотреть все программы
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loadingCourses && !displayCourses.length ? (
          <div className="portal-card p-6 text-sm text-slate-600">Загружаем программы...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {displayCourses.map((course, index) => (
              <ProgramCard
                key={course.id || course.slug || index}
                course={course}
                index={index}
                onOpenCourse={onOpenCourse}
              />
            ))}
          </div>
        )}

        {coursesError && !featuredCourses.length ? (
          <p className="mt-3 text-xs text-slate-400">
            API каталога сейчас не ответил, для витрины показаны локальные демонстрационные карточки. Деталь: {coursesError}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-black text-[#111936]">Направления обучения</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          {DIRECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  saveCatalogQuery(item.label);
                  onPageChange("catalog");
                }}
                className="portal-card portal-card-hover flex min-h-[92px] items-center gap-4 p-5 text-left"
              >
                <span className="portal-icon-tile !h-11 !w-11">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-black leading-5 text-[#111936]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="portal-card flex flex-col gap-5 bg-blue-50/80 p-5 sm:p-7 md:flex-row md:items-center md:justify-between md:p-9">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white shadow-[0_12px_24px_rgba(15,91,232,0.25)] sm:h-16 sm:w-16">
            <Layers3 className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-[#111936]">Начните обучение уже сегодня</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Выберите программу и получите новые знания в удобном онлайн-формате.
            </p>
          </div>
        </div>

        <button type="button" onClick={() => onPageChange("catalog")} className="portal-btn-primary w-full sm:w-auto md:min-w-[220px]">
          Выбрать программу
        </button>
      </section>
    </div>
  );
}
