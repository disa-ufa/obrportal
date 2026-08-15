import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import {
  LEARNER_ACCOUNT_SECTIONS,
  LearnerAccountSidebar,
} from "./LearnerAccountSidebar";

function getSectionTitle(activeSection) {
  return (
    LEARNER_ACCOUNT_SECTIONS.find(
      (item) => item.key === activeSection
    )?.label || "Личный кабинет"
  );
}

export function LearnerAccountLayout({
  user,
  activeSection = "overview",
  onSectionChange,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileToggleRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      setMobileMenuOpen(false);

      window.requestAnimationFrame(() => {
        mobileToggleRef.current?.focus();
      });
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  function handleSectionChange(section) {
    onSectionChange(section);
    setMobileMenuOpen(false);
  }

  return (
    <div
      data-testid="learner-account-layout"
      className="relative"
    >
      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 lg:hidden">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Личный кабинет
          </div>

          <div className="mt-0.5 truncate text-base font-bold text-slate-900">
            {getSectionTitle(activeSection)}
          </div>
        </div>

        <button
          ref={mobileToggleRef}
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-expanded={mobileMenuOpen}
          aria-controls="learner-account-mobile-navigation"
          aria-label={
            mobileMenuOpen
              ? "Закрыть меню личного кабинета"
              : "Открыть меню личного кабинета"
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="learner-account-mobile-navigation"
          data-testid="learner-account-mobile-navigation"
          className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200 lg:hidden"
        >
          <LearnerAccountSidebar
            user={user}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            compact
          />
        </div>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <LearnerAccountSidebar
              user={user}
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />
          </div>
        </div>

        <section
          data-testid="learner-account-content"
          className="min-w-0"
        >
          {children}
        </section>
      </div>
    </div>
  );
}
