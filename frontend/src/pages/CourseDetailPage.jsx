import { useEffect, useState } from "react";
import { enrollAccountCourse, getAccountCourses, getPublicCourseDetail, getPublicCourses } from "../api/client";

function formatCourseDocument(course) {
  return course?.document_type || course?.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course?.price || "Стоимость уточняется";
}

export function CourseDetailPage({ courseSlug, onPageChange, onOpenCourse, user }) {
  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [loading, setLoading] = useState(Boolean(courseSlug));
  const [error, setError] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [existingEnrollment, setExistingEnrollment] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      if (!courseSlug) {
        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setLoading(false);
        setError("Курс не выбран.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [courseResponse, coursesResponse, accountCoursesResponse] = await Promise.all([
          getPublicCourseDetail(courseSlug),
          getPublicCourses({ limit: 6 }),
          user ? getAccountCourses() : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setCourse(courseResponse);
        setRelatedCourses(
          Array.isArray(coursesResponse)
            ? coursesResponse.filter((item) => item.slug !== courseResponse.slug).slice(0, 2)
            : []
        );

        const accountCourses = Array.isArray(accountCoursesResponse?.items)
          ? accountCoursesResponse.items
          : [];

        setExistingEnrollment(
          accountCourses.find(
            (item) =>
              item.course_id === courseResponse.id ||
              item.course_slug === courseResponse.slug
          ) || null
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setError(`${err.status || ""} ${err.message || "Программа не найдена."}`.trim());
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, user?.id]);

  async function handleEnroll() {
    if (!course) {
      return;
    }

    if (!user) {
      onPageChange("register");
      return;
    }

    if (existingEnrollment) {
      onPageChange("account");
      return;
    }

    try {
      setEnrollLoading(true);
      setEnrollError("");
      setEnrollSuccess("");

      const createdEnrollment = await enrollAccountCourse(course.id);

      setExistingEnrollment(createdEnrollment);
      setEnrollSuccess("Вы записаны на программу. Курс добавлен в личный кабинет.");
      onPageChange("account");
    } catch (err) {
      if (err.status === 409) {
        setExistingEnrollment({
          course_id: course.id,
          course_slug: course.slug,
          status: "assigned",
        });
        setEnrollError("");
        setEnrollSuccess("Вы уже записаны на эту программу. Курс доступен в личном кабинете.");
        return;
      }

      setEnrollError(`${err.status || ""} ${err.message || "Не удалось записаться на программу."}`.trim());
    } finally {
      setEnrollLoading(false);
    }
  }
  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        Загружаем карточку программы...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Программа не найдена
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          По этому адресу нет опубликованной карточки курса
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          {error || "Вернитесь в каталог и выберите активную программу."}
        </p>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="mt-6 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="flex flex-wrap gap-2">
          {course.format && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {course.format}
            </span>
          )}

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
            {formatCourseDocument(course)}
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-bold text-slate-900">
          {course.title}
        </h1>

        <div className="mt-2 text-sm text-slate-500">
          /courses/{course.slug}
        </div>

        {course.description && (
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            {course.description}
          </p>
        )}

        {existingEnrollment && (
          <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700 ring-1 ring-blue-200">
            Вы уже записаны на эту программу. Перейдите в личный кабинет, чтобы открыть назначенный курс.
          </div>
        )}

        {enrollError && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            {enrollError}
          </div>
        )}

        {enrollSuccess && (
          <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-700 ring-1 ring-green-200">
            {enrollSuccess}
          </div>
        )}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Формат</div>
            <div className="mt-2 font-semibold text-slate-900">{course.format || "—"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Объём</div>
            <div className="mt-2 font-semibold text-slate-900">
              {course.hours ? `${course.hours} часов` : "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Стоимость</div>
            <div className="mt-2 font-semibold text-slate-900">{formatCoursePrice(course)}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Документ</div>
            <div className="mt-2 font-semibold text-slate-900">{formatCourseDocument(course)}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrollLoading}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enrollLoading ? "Записываем..." : existingEnrollment ? "Открыть личный кабинет" : user ? "Записаться" : "Зарегистрироваться и записаться"}
          </button>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Назад в каталог
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Что входит в программу</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Доступ к материалам программы в личном кабинете",
              "Контроль прохождения и фиксация статуса обучения",
              "Итоговая проверка результата обучения",
              `Формирование итогового документа: ${formatCourseDocument(course)}`,
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Итоговая аттестация</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            После завершения программы слушатель получает итоговый документ,
            доступный в личном кабинете и проверяемый через публичный реестр.
          </p>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Проверить документ
          </button>
        </div>
      </section>

      {relatedCourses.length > 0 && (
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Похожие программы</h2>
          <p className="mt-2 text-sm text-slate-600">
            Быстрый переход к другим опубликованным программам из backend.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {relatedCourses.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="text-sm font-semibold text-blue-700">
                  {item.format || "Программа"}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <div className="mt-2 text-sm text-slate-600">
                  {item.hours ? `${item.hours} ч.` : "Объём уточняется"} · {formatCourseDocument(item)}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCourse(item.slug)}
                  className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Открыть
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}