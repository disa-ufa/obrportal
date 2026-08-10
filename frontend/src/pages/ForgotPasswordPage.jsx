import { useState } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../api/client";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { formatApiError } from "../utils/apiErrors";

const TEXT = {
  pageTitle: "Восстановление пароля",
  pageSubtitle: "Укажите e-mail, который используется для входа в портал.",
  emailLabel: "E-mail",
  emailPlaceholder: "name@example.com",
  emailRequired: "Укажите e-mail.",
  submitButton: "Отправить ссылку",
  loadingButton: "Отправляем...",
  errorTitle: "Не удалось отправить запрос",
  errorFallback: "Не удалось отправить запрос восстановления пароля.",
  successTitle: "Запрос принят",
  successBody:
    "Если учётная запись существует, инструкции по восстановлению пароля отправлены на указанный адрес.",
  goLogin: "Вернуться ко входу",
  securityTitle: "Безопасность восстановления",
  securitySubtitle: "Система не раскрывает наличие учётной записи.",
  securityOne:
    "Одинаковый ответ показывается для существующих и неизвестных адресов.",
  securityTwo:
    "Ссылка из письма одноразовая и действует ограниченное время.",
  securityThree:
    "Если письмо не пришло, проверьте папку «Спам» и правильность введённого адреса.",
};

function SecurityItem({ children, emphasized = false }) {
  return (
    <div
      className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
        emphasized
          ? "bg-white/15 text-white ring-white/20"
          : "bg-white/10 text-blue-50 ring-white/15"
      }`}
    >
      {children}
    </div>
  );
}

export function ForgotPasswordPage({ onPageChange }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    setError("");
    setSuccess(false);

    if (!normalizedEmail) {
      setError(TEXT.emailRequired);
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setSuccess(true);
    } catch (err) {
      setError(formatApiError(err, TEXT.errorFallback));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      brand={
        <AuthBrandPanel
          title={TEXT.securityTitle}
          description={TEXT.securitySubtitle}
          footer="Восстановление доступа выполняется через одноразовую ссылку, отправленную на e-mail."
        >
          <div className="space-y-3">
            <SecurityItem emphasized>{TEXT.securityOne}</SecurityItem>
            <SecurityItem>{TEXT.securityTwo}</SecurityItem>
            <SecurityItem>{TEXT.securityThree}</SecurityItem>
          </div>
        </AuthBrandPanel>
      }
    >
      <AuthCard
        title={TEXT.pageTitle}
        subtitle={TEXT.pageSubtitle}
        footer={
          success ? null : (
            <div className="text-center">
              <Link
                to="/login"
                onClick={() => onPageChange?.("login")}
                className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
              >
                {TEXT.goLogin}
              </Link>
            </div>
          )
        }
      >
        {success ? (
          <div className="space-y-5">
            <Alert title={TEXT.successTitle} tone="green">
              {TEXT.successBody}
            </Alert>

            <Link
              to="/login"
              onClick={() => onPageChange?.("login")}
              className="portal-btn-primary"
            >
              {TEXT.goLogin}
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <Alert title={TEXT.errorTitle} tone="red">
                {error}
              </Alert>
            )}

            <AuthField
              type="email"
              label={TEXT.emailLabel}
              value={email}
              autoComplete="email"
              placeholder={TEXT.emailPlaceholder}
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
            />

            <button
              type="submit"
              className="portal-btn-primary w-full"
              disabled={loading}
            >
              {loading ? TEXT.loadingButton : TEXT.submitButton}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
