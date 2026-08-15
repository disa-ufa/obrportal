import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import {
  downloadAccountDocument,
  getAccountActivities,
  getAccountCourseDetail,
  getAccountCourses,
  getAccountDocuments,
  getAccountSummary,
  startAccountCourse,
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
  const [courseActionError, setCourseActionError] = useState("");
  const [courseActionLoadingKey, setCourseActionLoadingKey] = useState("");

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

  async function handleStartCourse(enrollmentId) {
    try {
      setCourseActionError("");
      setCourseActionLoadingKey(`${enrollmentId}:start`);

      await startAccountCourse(enrollmentId);
      await refreshAccountSnapshot();
      await refreshAccountActivities();

      setAccountNotice({
        tone: "green",
        title: "Обучение начато",
        message: "Статус программы обновлён. Теперь курс находится в работе.",
      });
    } catch (err) {
      setCourseActionError(formatApiError(err, "Не удалось начать обучение."));
    } finally {
      setCourseActionLoadingKey("");
    }
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
          onOpenCourse={onOpenCourse}
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
          actionLoadingEnrollmentId={
            courseActionLoadingKey.endsWith(":start")
              ? courseActionLoadingKey.slice(0, -6)
              : ""
          }
          loading={loading}
          errorMessage={
            error ||
            courseActionError ||
            courseDetailError?.message ||
            ""
          }
          onStatusChange={setLearningStatusFilter}
          onLoadCourseDetail={handleLoadLearningCourseDetail}
          onStartCourse={(course) =>
            handleStartCourse(course.enrollment_id)
          }
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
          onOpenCourse={onOpenCourse}
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
