import { useParams } from "react-router-dom";
import { CourseDetailPage } from "../pages/CourseDetailPage";
import { VerifyDocumentPage } from "../pages/VerifyDocumentPage";

export function CourseDetailPublicRoute({ onPageChange, onOpenCourse, user }) {
  const { slug } = useParams();

  return (
    <CourseDetailPage
      courseSlug={slug}
      onPageChange={onPageChange}
      onOpenCourse={onOpenCourse}
      user={user}
    />
  );
}

export function VerifyDocumentCodeRoute({ onPageChange }) {
  const { code } = useParams();

  return <VerifyDocumentPage onPageChange={onPageChange} initialCode={code || ""} />;
}
