import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleUserRound, FileText, GraduationCap, MonitorPlay, Palette, Search, Sparkles, UsersRound } from "lucide-react";
import { getPublicCourses } from "../api/client";
import homeLearningVideoPreview from "../assets/home-learning-video-preview.webp";

const POPULAR_QUERIES = [
  "Дополнительное образование",
  "Повышение квалификации",
  "Методические материалы",
];

const HOME_FEATURES = [
  {
    title: "Каталог программ",
    description: "Найдите подходящую образовательную программу и изучите условия обучения.",
    page: "catalog",
    actionLabel: "Открыть каталог",
    icon: BookOpen,
  },
  {
    title: "Личный кабинет",
    description: "Продолжайте обучение, выполняйте задания и работайте со своими документами.",
    page: "account",
    actionLabel: "Перейти в кабинет",
    icon: GraduationCap,
  },
  {
    title: "Проверка документов",
    description: "Проверьте подлинность документа об обучении через публичный сервис портала.",
    page: "verify-document",
    actionLabel: "Проверить документ",
    icon: FileText,
  },
  {
    title: "Для организаций",
    description: "Откройте сведения и возможности портала для образовательных организаций.",
    page: "organization-info",
    actionLabel: "Для организаций",
    icon: UsersRound,
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

const LEARNING_STEPS = [
  {
    number: "01",
    title:
      "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
    description:
      "\u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438 \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435.",
    icon: Search,
  },
  {
    number: "02",
    title:
      "\u041e\u0431\u0443\u0447\u0430\u0439\u0442\u0435\u0441\u044c \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435",
    description:
      "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0438 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0439\u0442\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0432 \u0441\u0432\u043e\u0435\u043c \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
    icon: MonitorPlay,
  },
  {
    number: "03",
    title:
      "\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
    description:
      "\u0415\u0441\u043b\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u043e\u0439 \u043f\u0440\u0435\u0434\u0443\u0441\u043c\u043e\u0442\u0440\u0435\u043d \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442, \u043e\u043d \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f.",
    icon: FileText,
  },
];

function formatCourseDocument(course) {
  return course.document_type || course.document || "";
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

function ProgramCard({ course, index, onOpenCourse }) {
  const slug = course.slug || course.id;
  const documentLabel = formatCourseDocument(course);

  return (
    <article className="group flex h-full min-h-[360px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(17,25,54,0.05)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_55px_rgba(15,91,232,0.12)]">
      <div className={getCourseVisualClass(course, index)}>
        {course.format ? (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-blue-700 shadow-sm ring-1 ring-blue-100">
            {course.format}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-xl font-black leading-7 text-[#111936]">
          {course.title}
        </h3>

        {course.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {course.description}
          </p>
        ) : null}

        {course.hours || documentLabel ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {course.hours ? (
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                {course.hours} ч.
              </span>
            ) : null}

            {documentLabel ? (
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {documentLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onOpenCourse(slug)}
          className="mt-6 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#111936] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          Подробнее
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}
function getPopularProgramsGridClass(courseCount) {
  if (courseCount <= 1) {
    return "grid gap-6 lg:grid-cols-2";
  }

  if (courseCount === 2) {
    return "grid gap-6 md:grid-cols-2";
  }

  if (courseCount === 3) {
    return "grid gap-6 md:grid-cols-2 xl:grid-cols-3";
  }

  return "grid gap-6 md:grid-cols-2 xl:grid-cols-4";
}
function saveCatalogQuery(query) {
  const value = `${query || ""}`.trim();

  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem("obrportal_catalog_direction");

  if (!value) {
    sessionStorage.removeItem("obrportal_catalog_query");
    return;
  }

  sessionStorage.setItem("obrportal_catalog_query", value);
}

function saveCatalogDirection(direction) {
  const value = `${direction || ""}`.trim();

  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem("obrportal_catalog_query");

  if (!value) {
    sessionStorage.removeItem("obrportal_catalog_direction");
    return;
  }

  sessionStorage.setItem(
    "obrportal_catalog_direction",
    value,
  );
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

          <div className="relative mx-auto w-full max-w-[650px] lg:mx-0 lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-200/50 via-sky-100/40 to-indigo-100/50 blur-2xl"
            />

            <div
              data-testid="home-learning-video-preview"
              className="relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/95 p-4 shadow-[0_30px_80px_rgba(15,53,110,0.20)] ring-1 ring-blue-100/80 backdrop-blur sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 sm:text-xs">
                    Интерфейс обучения
                  </div>
                  <div className="mt-1 truncate text-sm font-black text-[#111936] sm:text-base">
                    Современные технологии в обучении
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                    <CircleUserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="hidden text-left sm:block">
                    <div className="text-[10px] font-black text-[#111936]">Анна Смирнова</div>
                    <div className="text-[9px] font-semibold text-slate-400">Слушатель</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-4 text-[10px] font-bold sm:text-xs">
                  <span className="text-slate-500">Прогресс курса</span>
                  <span className="text-blue-700">40%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/5 rounded-full bg-blue-600" />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.55fr)_minmax(150px,0.75fr)]">
                <div className="min-w-0">
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-[0_18px_35px_rgba(15,23,42,0.20)]">
                    <img
                      src={homeLearningVideoPreview}
                      alt="Превью видеозанятия с преподавателем"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Материалы модуля
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs font-black text-[#111936]">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                          <span className="truncate">Методические материалы</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-blue-700">Открыть</span>
                    </div>
                  </div>
                </div>

                <aside
                  aria-label="Содержание демонстрационного курса"
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Содержание курса
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-100">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold text-slate-400">Модуль 1</div>
                        <div className="truncate text-[10px] font-black text-slate-700">Введение</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-600 px-2.5 py-2 text-white shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-black">2</span>
                        <div className="min-w-0">
                          <div className="text-[9px] font-semibold text-blue-100">Модуль 2</div>
                          <div className="line-clamp-2 text-[10px] font-black leading-4">Цифровые инструменты</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold text-slate-400">Модуль 3</div>
                        <div className="truncate text-[10px] font-black text-slate-600">Практика</div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold text-slate-400">Модуль 4</div>
                        <div className="truncate text-[10px] font-black text-slate-600">Итоговый тест</div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                    </div>
                  </div>
                </aside>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-semibold text-slate-400">Текущий урок</div>
                    <div className="truncate text-[11px] font-black text-[#111936]">
                      Цифровые инструменты педагога
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[9px] font-black text-white">
                  Продолжить
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section aria-label="Основные возможности портала">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HOME_FEATURES.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onPageChange(item.page)}
                className="group relative flex min-h-[190px] flex-col items-start overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 text-left shadow-[0_16px_40px_rgba(17,25,54,0.05)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_50px_rgba(15,91,232,0.12)] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-50 transition duration-200 group-hover:scale-125 group-hover:bg-blue-100/80"
                />

                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h2 className="relative mt-5 text-lg font-black leading-6 text-[#111936]">
                  {item.title}
                </h2>

                <p className="relative mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                  {item.actionLabel}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="home-popular-programs-title">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2
              id="home-popular-programs-title"
              className="text-2xl font-black text-[#111936]"
            >
              Популярные программы
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Выберите программу и откройте подробную информацию об обучении.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="hidden shrink-0 items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900 sm:inline-flex"
          >
            Смотреть все программы
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loadingCourses ? (
          <div
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
            aria-label="Загрузка программ"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white"
                aria-hidden="true"
              >
                <div className="h-40 animate-pulse bg-slate-100" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-4/5 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : coursesError ? (
          <div
            role="status"
            className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6"
          >
            <h3 className="text-base font-black text-[#111936]">
              Не удалось загрузить программы
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {coursesError}
            </p>
            <button
              type="button"
              onClick={() => onPageChange("catalog")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700"
            >
              Открыть каталог
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : featuredCourses.length ? (
          <div className={getPopularProgramsGridClass(featuredCourses.length)}>
            {featuredCourses.map((course, index) => (
              <ProgramCard
                key={course.id || course.slug || index}
                course={course}
                index={index}
                onOpenCourse={onOpenCourse}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-black text-[#111936]">
              Опубликованных программ пока нет
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Новые программы появятся здесь после публикации в каталоге.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 sm:hidden"
        >
          Смотреть все программы
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
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
                  saveCatalogDirection(item.label);
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

      <section
        aria-labelledby="home-learning-flow-title"
        data-testid="home-learning-flow"
      >
        <div className="mb-6 max-w-2xl">
          <div className="text-xs font-black uppercase tracking-[0.1em] text-blue-600">
            {"\u041f\u0440\u043e\u0441\u0442\u043e\u0439 \u043f\u0443\u0442\u044c \u043a \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044e"}
          </div>

          <h2
            id="home-learning-flow-title"
            className="mt-2 text-2xl font-black tracking-[-0.02em] text-[#111936] sm:text-3xl"
          >
            {"\u041a\u0430\u043a \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            {"\u041e\u0442 \u0432\u044b\u0431\u043e\u0440\u0430 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0434\u043e \u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u2014 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u044d\u0442\u0430\u043f\u044b \u0441\u043e\u0431\u0440\u0430\u043d\u044b \u0432 \u043e\u0434\u043d\u043e\u043c \u043f\u043e\u0440\u0442\u0430\u043b\u0435."}
          </p>
        </div>

        <div className="relative grid gap-5 lg:grid-cols-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-9 hidden h-px bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 lg:block"
          />

          {LEARNING_STEPS.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="relative flex min-h-[245px] flex-col rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_16px_40px_rgba(17,25,54,0.05)] sm:p-7"
              >
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon
                      className="h-6 w-6"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="text-4xl font-black tracking-[-0.04em] text-blue-100">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-black leading-6 text-[#111936] sm:text-xl">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        data-testid="home-document-verification"
        aria-labelledby="home-document-verification-title"
        className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-[#13285b] via-[#18458f] to-[#2868c7] p-6 text-white shadow-[0_24px_60px_rgba(15,53,110,0.18)] sm:p-8 lg:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center lg:gap-12">
          <div>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur">
              <FileText
                className="h-6 w-6"
                aria-hidden="true"
              />
            </span>

            <div className="mt-6 text-xs font-black uppercase tracking-[0.1em] text-blue-100">
              {"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u0440\u0435\u0435\u0441\u0442\u0440"}
            </div>

            <h2
              id="home-document-verification-title"
              className="mt-2 text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl"
            >
              {"\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
            </h2>

            <p
              id="home-document-verification-description"
              className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base"
            >
              {"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0432 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u043c \u0440\u0435\u0435\u0441\u0442\u0440\u0435 \u043f\u043e\u0440\u0442\u0430\u043b\u0430."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-inner backdrop-blur sm:p-5">
            <form
              action="/verify-document"
              method="get"
              data-testid="home-document-verification-form"
              className="rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(8,25,62,0.24)]"
            >
              <label
                htmlFor="home-document-verification-number"
                className="block px-2 pt-1 text-xs font-black uppercase tracking-[0.06em] text-slate-500"
              >
                {"\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438"}
              </label>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                  <Search
                    className="h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />

                  <input
                    id="home-document-verification-number"
                    name="number"
                    type="text"
                    required
                    minLength={3}
                    maxLength={128}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="home-document-verification-description"
                    placeholder={"\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: AUTO-... \u0438\u043b\u0438 DOCV-..."}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                  />
                </label>

                <button
                  type="submit"
                  data-testid="home-document-verification-submit"
                  className="portal-btn-primary !h-12 shrink-0 !rounded-xl !px-7 !py-0"
                >
                  {"\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c"}
                </button>
              </div>
            </form>

            <p className="mt-3 px-1 text-xs leading-5 text-blue-100">
              {"\u0414\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0432\u0445\u043e\u0434 \u0432 \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442."}
            </p>
          </div>
        </div>
      </section>

      <section
        data-testid="home-audience-cta"
        aria-labelledby="home-audience-cta-title"
      >
        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-[0.1em] text-blue-600">
            {"\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u043f\u0443\u0442\u044c"}
          </div>

          <h2
            id="home-audience-cta-title"
            className="mt-2 text-2xl font-black tracking-[-0.02em] text-[#111936]"
          >
            {"\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u0440\u0442\u0430\u043b\u0430 \u0434\u043b\u044f \u0432\u0430\u0441"}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="portal-card flex min-h-[220px] flex-col p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <span className="portal-icon-tile !h-12 !w-12">
                <GraduationCap
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </span>

              <span className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">
                {"\u0421\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e"}
              </span>
            </div>

            <h3 className="mt-6 text-xl font-black text-[#111936]">
              {"\u0425\u043e\u0447\u0443 \u043e\u0431\u0443\u0447\u0430\u0442\u044c\u0441\u044f"}
            </h3>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {"\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435 \u0438 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u0443\u044e \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044e \u043e\u0431 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438."}
            </p>

            <button
              type="button"
              data-testid="home-audience-learner-action"
              onClick={() => onPageChange("catalog")}
              className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-blue-700"
            >
              {"\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b"}
              <ArrowRight
                className="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </article>

          <article className="relative flex min-h-[220px] flex-col overflow-hidden rounded-[1.75rem] border border-blue-100 bg-blue-50/80 p-6 shadow-[0_16px_40px_rgba(17,25,54,0.05)] sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-100/70"
            />

            <div className="relative flex items-start justify-between gap-5">
              <span className="portal-icon-tile !h-12 !w-12">
                <UsersRound
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </span>

              <span className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">
                {"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438"}
              </span>
            </div>

            <div className="relative">
              <h3 className="mt-6 text-xl font-black text-[#111936]">
                {"\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043b\u044f\u044e \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e"}
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {"\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0438 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u0440\u0442\u0430\u043b\u0430 \u0434\u043b\u044f \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0439."}
              </p>
            </div>

            <button
              type="button"
              data-testid="home-audience-organization-action"
              onClick={() => onPageChange("organization-info")}
              className="relative mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-blue-700"
            >
              {"\u0414\u043b\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0439"}
              <ArrowRight
                className="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
