import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Boxes, BriefcaseBusiness, FileText, GraduationCap, Layers3, LibraryBig, MonitorPlay, Palette, Search, Sparkles, UsersRound } from "lucide-react";
import { getPublicCourses } from "../api/client";
import { PUBLIC_COURSES } from "../data/publicCourses";

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

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[3rem] text-lg font-black leading-6 text-[#111936]">
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

        <div className="mt-5 flex items-center justify-between gap-3">
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-white via-white to-blue-50/90 px-6 py-8 md:px-10 lg:min-h-[330px] lg:px-12 lg:py-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] overflow-hidden lg:block">
          <div className="absolute right-10 top-8 h-56 w-56 rounded-full bg-blue-100/80 blur-2xl" />
          <div className="absolute right-28 top-14 h-48 w-72 rounded-[4rem] bg-blue-200/35" />
          <div className="absolute bottom-8 right-20 h-28 w-80 rounded-[2rem] bg-white/70 shadow-[0_20px_50px_rgba(15,91,232,0.16)]" />
          <div className="absolute bottom-16 right-52 h-3 w-40 rounded-full bg-blue-700/80" />
          <div className="absolute bottom-24 right-48 h-3 w-32 rounded-full bg-blue-500/50" />
          <GraduationCap className="absolute right-32 top-16 h-11 w-11 text-blue-600/70" />
          <MonitorPlay className="absolute right-72 top-28 h-10 w-10 text-blue-500/50" />
          <FileText className="absolute right-16 top-28 h-12 w-12 text-blue-700/50" />
        </div>

        <div className="relative max-w-3xl">
          <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-[#111936] md:text-6xl">
            Образовательный портал РЦДО
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Современная платформа для дистанционного обучения и эффективного управления образовательными программами.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-8 flex max-w-2xl gap-3 rounded-xl bg-white p-2 shadow-[0_18px_40px_rgba(17,25,54,0.09)] ring-1 ring-slate-200">
            <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
              <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск программ и материалов..."
                className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
            <button type="submit" className="portal-btn-primary !h-11 !rounded-lg !px-7 !py-0">
              Найти
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold">Популярные запросы:</span>
            {POPULAR_QUERIES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => {
                  setSearchQuery(query);
                  saveCatalogQuery(query);
                  onPageChange("catalog");
                }}
                className="portal-chip"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PORTAL_STATS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="portal-card flex items-center gap-5 p-5">
              <span className="portal-icon-tile">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <div className="text-3xl font-black leading-none text-[#111936]">{item.value}</div>
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                className="portal-card portal-card-hover flex min-h-[78px] items-center gap-4 p-4 text-left"
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

      <section className="portal-card flex flex-col gap-5 bg-blue-50/80 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-center gap-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-white shadow-[0_12px_24px_rgba(15,91,232,0.25)]">
            <Layers3 className="h-8 w-8" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-[#111936]">Начните обучение уже сегодня</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Выберите программу и получите новые знания в удобном онлайн-формате.
            </p>
          </div>
        </div>

        <button type="button" onClick={() => onPageChange("catalog")} className="portal-btn-primary md:min-w-[220px]">
          Выбрать программу
        </button>
      </section>
    </div>
  );
}
