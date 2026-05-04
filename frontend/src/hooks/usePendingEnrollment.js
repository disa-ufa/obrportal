import {
  enrollAccountCourse,
  getPublicCourseDetail,
} from "../api/client";

export function usePendingEnrollment({ setError }) {
  function getPendingEnrollmentSlug() {
    try {
      return localStorage.getItem("obrportal_pending_enrollment_slug") || "";
    } catch {
      return "";
    }
  }

  function clearPendingEnrollmentSlug() {
    try {
      localStorage.removeItem("obrportal_pending_enrollment_slug");
    } catch {
      // localStorage can be unavailable in private mode or tests.
    }
  }

  function setAccountEnrollmentNotice(notice) {
    try {
      sessionStorage.setItem("obrportal_account_notice", JSON.stringify(notice));
    } catch {
      // sessionStorage can be unavailable in private mode or tests.
    }
  }

  async function completePendingEnrollmentIfNeeded() {
    const pendingSlug = getPendingEnrollmentSlug();

    if (!pendingSlug) {
      return null;
    }

    try {
      const course = await getPublicCourseDetail(pendingSlug);
      await enrollAccountCourse(course.id);
      clearPendingEnrollmentSlug();
      setAccountEnrollmentNotice({
        tone: "green",
        title: "\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441",
        message: "\u0412\u044b \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u044b \u043d\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443. \u041a\u0443\u0440\u0441 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442.",
      });

      return {
        status: "created",
        slug: pendingSlug,
      };
    } catch (err) {
      if (err.status === 409) {
        clearPendingEnrollmentSlug();
        setAccountEnrollmentNotice({
          tone: "green",
          title: "\u041a\u0443\u0440\u0441 \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d",
          message: "\u0412\u044b \u0443\u0436\u0435 \u0431\u044b\u043b\u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u044b \u043d\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443. \u041a\u0443\u0440\u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
        });

        return {
          status: "already_enrolled",
          slug: pendingSlug,
        };
      }

      if (err.status === 404) {
        clearPendingEnrollmentSlug();
        setAccountEnrollmentNotice({
          tone: "red",
          title: "\u041a\u0443\u0440\u0441 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d",
          message: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u0430 \u0438\u043b\u0438 \u0431\u044b\u043b\u0430 \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u0430 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u043c.",
        });

        return {
          status: "not_found",
          slug: pendingSlug,
        };
      }

      setError(`${err.status || ""} ${err.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u043d\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443."}`.trim());

      return {
        status: "failed",
        slug: pendingSlug,
      };
    }
  }

  return {
    completePendingEnrollmentIfNeeded,
  };
}
