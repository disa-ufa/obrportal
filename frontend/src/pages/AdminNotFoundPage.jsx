import { Link } from "react-router-dom";
import { getAdminPathForPage } from "../utils/adminRoutes";
import { ActionButton } from "../components/ui/ActionButton";
import { SectionCard } from "../components/ui/SectionCard";

const PAGE_TITLE =
  "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439 \u0440\u0430\u0437\u0434\u0435\u043b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d";

const PAGE_SUBTITLE =
  "\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u043d\u044b\u0439 \u0441\u043b\u0443\u0436\u0435\u0431\u043d\u044b\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043d\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d \u0432 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u0430\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u0438.";

const UNKNOWN_ROUTE_TITLE =
  "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442";

const UNKNOWN_ROUTE_TEXT =
  "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0432 \u0441\u0442\u0440\u043e\u043a\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0438\u043b\u0438 \u0432\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u0432 \u043e\u0431\u0437\u043e\u0440 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u043a\u043e\u043d\u0442\u0443\u0440\u0430.";

const DASHBOARD_LINK_LABEL =
  "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043e\u0431\u0437\u043e\u0440";

const DASHBOARD_BUTTON_LABEL =
  "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0431\u0437\u043e\u0440";

export function AdminNotFoundPage({ pathname = "", onOpenDashboard }) {
  return (
    <SectionCard title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="font-semibold">{UNKNOWN_ROUTE_TITLE}</div>
          <div className="mt-2 break-all font-mono text-xs">
            {pathname || "\u2014"}
          </div>
          <p className="mt-3 leading-6">{UNKNOWN_ROUTE_TEXT}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={getAdminPathForPage("dashboard")}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            onClick={onOpenDashboard}
          >
            {DASHBOARD_LINK_LABEL}
          </Link>

          <ActionButton type="button" tone="light" onClick={onOpenDashboard}>
            {DASHBOARD_BUTTON_LABEL}
          </ActionButton>
        </div>
      </div>
    </SectionCard>
  );
}
