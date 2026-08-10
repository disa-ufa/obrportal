import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { setPasswordWithToken } from "../api/client";
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
  missingToken: "Ссылка установки пароля некорректна: отсутствует token.",
  apiFallback:
    "Не удалось установить пароль. Проверьте ссылку или запросите новое приглашение.",
  pageTitle: "Установка пароля",
  pageSubtitle: "Задайте пароль для входа в личный кабинет ОбрПортала.",
  badLinkTitle: "Некорректная ссылка",
  badLinkBody:
    "В ссылке отсутствует token. Откройте полную ссылку из приглашения или запросите новое приглашение у администратора.",
  successTitle: "Пароль успешно установлен.",
  successPrefix: "Аккаунт",
  successFallbackUser: "пользователя",
  successSuffix:
    "активирован. Теперь можно войти в систему с новым паролем.",
  goLogin: "Перейти ко входу",
  submitErrorTitle: "Не удалось установить пароль",
  newPassword: "Новый пароль",
  repeatPassword: "Повторите пароль",
  loadingButton: "Устанавливаем пароль...",
  submitButton: "Установить пароль",
  securityTitle: "Безопасность ссылки",
  securitySubtitle: "Одноразовая ссылка действует ограниченное время.",
  securityOne:
    "Ссылка используется только один раз. После успешной установки пароля повторно применить её нельзя.",
  securityTwo:
    "Если срок действия истёк или ссылка уже была использована, запросите новое приглашение у администратора.",
  securityThree:
    "Пароль должен содержать не менее 8 символов. Не используйте очевидные пароли и не передавайте их другим людям.",
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

export function SetPasswordPage({ onPageChange }) {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() || "",
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);
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
      const payload = await setPasswordWithToken(token, password);
      setSuccessPayload(payload);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setSuccessPayload(null);
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
          footer="Пароль активирует доступ к личному кабинету только после успешной проверки приглашения."
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

        {successPayload ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-green-50 p-5 text-sm leading-6 text-green-800 ring-1 ring-green-200">
              <div className="text-base font-bold text-green-900">
                {TEXT.successTitle}
              </div>
              <div className="mt-2">
                {TEXT.successPrefix}{" "}
                {successPayload.email || TEXT.successFallbackUser}{" "}
                {TEXT.successSuffix}
              </div>
            </div>

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
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
