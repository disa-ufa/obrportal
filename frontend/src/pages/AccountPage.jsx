import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  downloadAccountDocument,
  getAccountActivities,
  getAccountCourseDetail,
  getAccountCourses,
  getAccountDocuments,
  getAccountSummary,
} from "../api/client";
import { LearnerAccountProfile } from "../components/account/LearnerAccountProfile";
import { LearnerAccountLayout } from "../components/account/LearnerAccountLayout";
import {
  getLearnerDashboardCurrentCourse,
  LearnerAccountDashboard,
} from "../components/account/LearnerAccountDashboard";
import { LearnerAccountLearning } from "../components/account/LearnerAccountLearning";
import { LearnerAccountAssignments } from "../components/account/LearnerAccountAssignments";
import { LearnerAccountDocuments } from "../components/account/LearnerAccountDocuments";
import { Alert } from "../components/ui/Alert";

const ACCOUNT_SECTION_TARGETS = {
  overview: "account-overview",
  learning: "account-learning",
  assignments: "account-assignments",
  documents: "account-documents",
  profile: "account-profile",
};

function getInitialAccountSection() {
  try {
    const requestedSection =
      sessionStorage.getItem("obrportal_account_section") || "";

    if (
      requestedSection &&
      ACCOUNT_SECTION_TARGETS[requestedSection]
    ) {
      return requestedSection;
    }
  } catch {
    // sessionStorage may be unavailable in private mode or tests.
  }

  return "overview";
}

export function AccountPage({ user, onPageChange, onOpenCourse }) {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [coursesResponse, setCoursesResponse] = useState(null);
  const [documentsResponse, setDocumentsResponse] = useState(null);
  const [activitiesResponse, setActivitiesResponse] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadLoadingId, setDownloadLoadingId] = useState("");

  const [learningStatusFilter, setLearningStatusFilter] = useState("");
  const [activityStatusFilter, setActivityStatusFilter] = useState("");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("");
  const [accountNotice, setAccountNotice] = useState(null);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [courseDetailLoadingId, setCourseDetailLoadingId] = useState("");
  const [courseDetailError, setCourseDetailError] = useState(null);

  const [overviewCourseDetail, setOverviewCourseDetail] = useState(null);
  const [activeAccountSection, setActiveAccountSection] = useState(
    getInitialAccountSection
  );

  useEffect(() => {
    try {
      sessionStorage.removeItem("obrportal_account_section");

      const rawNotice = sessionStorage.getItem("obrportal_account_notice");

      if (rawNotice) {
        setAccountNotice(JSON.parse(rawNotice));
        sessionStorage.removeItem("obrportal_account_notice");
      }
    } catch {
      setAccountNotice(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountData() {
      try {
        setLoading(true);
        setError("");

        const [summaryResponse, coursesData, documentsData] = await Promise.all([
          getAccountSummary(),
          getAccountCourses(),
          getAccountDocuments(),
        ]);

        if (!cancelled) {
          setSummary(summaryResponse);
          setCoursesResponse(coursesData);
          setDocumentsResponse(documentsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Не удалось загрузить данные личного кабинета."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccountData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountActivities() {
      try {
        setActivitiesLoading(true);
        setActivitiesError("");

        const data = await getAccountActivities();

        if (!cancelled) {
          setActivitiesResponse(data);
        }
      } catch (err) {
        if (!cancelled) {
          setActivitiesError(
            formatApiError(
              err,
              "Не удалось загрузить задания и тесты."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      }
    }

    loadAccountActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAccountSnapshot() {
    const [summaryResponse, coursesData, documentsData] = await Promise.all([
      getAccountSummary(),
      getAccountCourses(),
      getAccountDocuments(),
    ]);

    setSummary(summaryResponse);
    setCoursesResponse(coursesData);
    setDocumentsResponse(documentsData);
  }

  async function refreshAccountActivities() {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");

      const data = await getAccountActivities();

      setActivitiesResponse(data);
    } catch (err) {
      setActivitiesError(
        formatApiError(
          err,
          "Не удалось обновить задания и тесты."
        )
      );
    } finally {
      setActivitiesLoading(false);
    }
  }

  function handleOpenLearningCourse(
    course,
    lessonId = ""
  ) {
    const enrollmentId = course?.enrollment_id;

    if (!enrollmentId) {
      return;
    }

    if (lessonId) {
      navigate(
        `/account/courses/${enrollmentId}/lessons/${lessonId}`
      );
      return;
    }

    navigate(
      `/account/courses/${enrollmentId}`
    );
  }

  function getFirstIncompleteLearningLesson(detail) {
    if (!detail?.modules?.length) {
      return null;
    }

    return (
      detail.modules
        .flatMap((module) => module.lessons || [])
        .find((lesson) => !lesson.is_completed) || null
    );
  }

  async function handleResumeLearningCourse(
    course,
    lessonIdHint = ""
  ) {
    const enrollmentId = course?.enrollment_id;

    if (!enrollmentId) {
      return;
    }

    if (course.status !== "active") {
      handleOpenLearningCourse(course);
      return;
    }

    if (lessonIdHint) {
      handleOpenLearningCourse(
        course,
        lessonIdHint
      );
      return;
    }

    const cachedDetail =
      overviewCourseDetail?.enrollment_id === enrollmentId
        ? overviewCourseDetail
        : selectedCourseDetail?.enrollment_id === enrollmentId
          ? selectedCourseDetail
          : null;

    try {
      const detail =
        cachedDetail ||
        await getAccountCourseDetail(enrollmentId);

      const nextLesson =
        getFirstIncompleteLearningLesson(detail);

      if (nextLesson?.id) {
        handleOpenLearningCourse(
          course,
          nextLesson.id
        );
        return;
      }
    } catch {
      // The course overview remains the safe fallback.
    }

    handleOpenLearningCourse(course);
  }

  async function handleLoadLearningCourseDetail(course) {
    const enrollmentId = course?.enrollment_id;

    if (!enrollmentId) {
      return;
    }

    try {
      setCourseDetailError(null);
      setCourseDetailLoadingId(enrollmentId);

      const detail = await getAccountCourseDetail(enrollmentId);

      setSelectedCourseDetail(detail);
    } catch (err) {
      setCourseDetailError({
        enrollmentId,
        message: formatApiError(
          err,
          "Не удалось загрузить прогресс по программе."
        ),
      });
    } finally {
      setCourseDetailLoadingId("");
    }
  }

  async function handleDownload(documentId) {
    try {
      setDownloadError("");
      setDownloadLoadingId(documentId);
      await downloadAccountDocument(documentId);
    } catch (err) {
      setDownloadError(formatApiError(err, "Не удалось подготовить документ."));
    } finally {
      setDownloadLoadingId("");
    }
  }

  function handleAccountSectionChange(section) {
    setActiveAccountSection(section);

    const targetId = ACCOUNT_SECTION_TARGETS[section];

    if (!targetId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const profile = summary?.profile || user;
  const courses = coursesResponse?.items || [];
  const documents = documentsResponse?.items || [];
  const activities = activitiesResponse?.items || [];

  useEffect(() => {
    let cancelled = false;

    const currentCourse = getLearnerDashboardCurrentCourse(
      coursesResponse?.items || []
    );

    if (!currentCourse?.enrollment_id) {
      setOverviewCourseDetail(null);

      return () => {
        cancelled = true;
      };
    }

    async function loadOverviewCourseDetail() {
      try {
        const detail = await getAccountCourseDetail(
          currentCourse.enrollment_id
        );

        if (!cancelled) {
          setOverviewCourseDetail(detail);
        }
      } catch {
        if (!cancelled) {
          setOverviewCourseDetail(null);
        }
      }
    }

    setOverviewCourseDetail(null);
    loadOverviewCourseDetail();

    return () => {
      cancelled = true;
    };
  }, [coursesResponse]);

  return (
    <LearnerAccountLayout
      user={profile}
      activeSection={activeAccountSection}
      onSectionChange={handleAccountSectionChange}
    >
      {accountNotice && (
        <div
          data-testid="learner-account-global-notice"
          className="mb-5"
        >
          <Alert
            title={accountNotice.title || "Уведомление"}
            tone={accountNotice.tone || "green"}
          >
            {accountNotice.message}
          </Alert>
        </div>
      )}

      <div
        id="account-overview"
        className={
          activeAccountSection === "overview"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountDashboard
          user={profile}
          summary={summary}
          courses={courses}
          documents={documents}
          currentCourseDetail={overviewCourseDetail}
          loading={loading}
          errorMessage={error}
          onSectionChange={handleAccountSectionChange}
          onOpenLearningCourse={handleOpenLearningCourse}
          onResumeLearningCourse={handleResumeLearningCourse}
        />
      </div>

      <div
        id="account-learning"
        className={
          activeAccountSection === "learning"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountLearning
          courses={courses}
          selectedStatus={learningStatusFilter}
          selectedCourseDetail={selectedCourseDetail}
          detailLoadingEnrollmentId={courseDetailLoadingId}
          loading={loading}
          errorMessage={
            error ||
            courseDetailError?.message ||
            ""
          }
          onStatusChange={setLearningStatusFilter}
          onLoadCourseDetail={handleLoadLearningCourseDetail}
          onResumeLearningCourse={handleResumeLearningCourse}
          onOpenCourse={onOpenCourse}
          onOpenCatalog={() => onPageChange("catalog")}
        />
      </div>

      <div
        id="account-assignments"
        className={
          activeAccountSection === "assignments"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountAssignments
          activities={activities}
          selectedFilter={activityStatusFilter}
          loading={activitiesLoading}
          errorMessage={activitiesError}
          onFilterChange={setActivityStatusFilter}
          onOpenLearningCourse={handleOpenLearningCourse}
          onOpenLearning={() =>
            handleAccountSectionChange("learning")
          }
        />
      </div>

      <div
        id="account-documents"
        className={
          activeAccountSection === "documents"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountDocuments
          documents={documents}
          selectedFilter={documentStatusFilter}
          loading={loading}
          errorMessage={error}
          actionErrorMessage={downloadError}
          downloadLoadingId={downloadLoadingId}
          onFilterChange={setDocumentStatusFilter}
          onDownload={handleDownload}
          onOpenCourse={onOpenCourse}
          onOpenLearning={() =>
            handleAccountSectionChange("learning")
          }
        />
      </div>

      <div
        id="account-profile"
        className={
          activeAccountSection === "profile"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountProfile
          accountUser={profile}
        />
      </div>
    </LearnerAccountLayout>
  );
}
