import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resetPasswordWithToken } from "../api/client";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordField } from "../components/auth/PasswordField";
import { Alert } from "../components/ui/Alert";
import { formatApiError } from "../utils/apiErrors";

const TEXT = {
  fillBoth: "Заполните оба поля пароля.",
  minLength: "Пароль должен содержать не менее 8 символов.",
  mismatch: "Пароли не совпадают.",
  missingToken: "Ссылка восстановления пароля некорректна: отсутствует token.",
  apiFallback:
    "Не удалось изменить пароль. Проверьте ссылку или запросите новую.",
  pageTitle: "Новый пароль",
  pageSubtitle: "Задайте новый пароль для входа в ОбрПортал.",
  badLinkTitle: "Некорректная ссылка",
  badLinkBody:
    "В ссылке отсутствует token. Откройте полную ссылку из письма или запросите восстановление пароля повторно.",
  successTitle: "Пароль успешно изменён",
  successBody: "Теперь можно войти в систему с новым паролем.",
  goLogin: "Перейти ко входу",
  requestAgain: "Запросить новую ссылку",
  submitErrorTitle: "Не удалось изменить пароль",
  newPassword: "Новый пароль",
  repeatPassword: "Повторите пароль",
  loadingButton: "Сохраняем пароль...",
  submitButton: "Сохранить новый пароль",
  securityTitle: "Безопасность ссылки",
  securitySubtitle: "Ссылка одноразовая и действует ограниченное время.",
  securityOne:
    "После успешной смены пароля повторно использовать эту ссылку нельзя.",
  securityTwo:
    "Если срок действия истёк, запросите новую ссылку восстановления.",
  securityThree:
    "Используйте уникальный пароль длиной не менее 8 символов и не передавайте его другим людям.",
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

function getPasswordValidationError(password, passwordConfirmation) {
  if (!password || !passwordConfirmation) {
    return TEXT.fillBoth;
  }

  if (password.length < 8) {
    return TEXT.minLength;
  }

  if (password !== passwordConfirmation) {
    return TEXT.mismatch;
  }

  return "";
}

export function ResetPasswordPage({ onPageChange }) {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() || "",
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hasToken = Boolean(token);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = getPasswordValidationError(
      password,
      passwordConfirmation
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasToken) {
      setError(TEXT.missingToken);
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithToken(token, password);
      setSuccess(true);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setSuccess(false);
      setError(formatApiError(err, TEXT.apiFallback));
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
          footer="Новый пароль применяется только после успешной проверки одноразовой ссылки."
        >
          <div className="space-y-3">
            <SecurityItem emphasized>{TEXT.securityOne}</SecurityItem>
            <SecurityItem>{TEXT.securityTwo}</SecurityItem>
            <SecurityItem>{TEXT.securityThree}</SecurityItem>
          </div>
        </AuthBrandPanel>
      }
    >
      <AuthCard title={TEXT.pageTitle} subtitle={TEXT.pageSubtitle}>
        {!hasToken && (
          <Alert title={TEXT.badLinkTitle} tone="red">
            {TEXT.badLinkBody}
          </Alert>
        )}

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
              <Alert title={TEXT.submitErrorTitle} tone="red">
                {error}
              </Alert>
            )}

            <PasswordField
              label={TEXT.newPassword}
              value={password}
              minLength={8}
              autoComplete="new-password"
              disabled={loading || !hasToken}
              onChange={(event) => setPassword(event.target.value)}
            />

            <PasswordField
              label={TEXT.repeatPassword}
              value={passwordConfirmation}
              minLength={8}
              autoComplete="new-password"
              disabled={loading || !hasToken}
              onChange={(event) =>
                setPasswordConfirmation(event.target.value)
              }
            />

            <button
              type="submit"
              className="portal-btn-primary w-full"
              disabled={loading || !hasToken}
            >
              {loading ? TEXT.loadingButton : TEXT.submitButton}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                onClick={() => onPageChange?.("forgot-password")}
                className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
              >
                {TEXT.requestAgain}
              </Link>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
