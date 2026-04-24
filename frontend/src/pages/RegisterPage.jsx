import { useState } from "react";
import { registerUser } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

export function RegisterPage({ onPageChange }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessEmail("");

    if (!consent) {
      setError("одтвердите ознакомление с политикой н.");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        email,
        password,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });

      setSuccessEmail(email.trim().toLowerCase());
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="егистрация"
        subtitle="ервый рабочий self-service signup для физического лица."
      >
        {error && (
          <Alert title="е удалось зарегистрироваться" tone="red">
            {error}
          </Alert>
        )}

        {successEmail && (
          <Alert title="ккаунт создан" tone="green">
            ользователь <strong>{successEmail}</strong> зарегистрирован. а этом
            этапе регистрация уже пишет данные в backend, а следующий шаг - автоматический
            вход и полноценный user-flow после signup.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="ванов ван ванович"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Телефон
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="инимум 8 символов"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              required
              minLength={8}
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Я подтверждаю ознакомление с публичной политикой н и соглашаюсь
              на обработку данных в рамках регистрации на платформе.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "егистрируем..." : "арегистрироваться"}
            </button>

            <button
              type="button"
              onClick={() => onPageChange("login")}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
               меня уже есть аккаунт
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="то будет на следующем этапе"
        subtitle="Следующий проход уже будет про полный self-service flow."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            втовход после успешной регистрации
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            ереход сразу в личный кабинет
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            алидация формы и человеко-понятные ошибки
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Связка с будущими пользовательскими программами и документами
          </div>

          <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
            ажное отличие от предыдущего шага: теперь регистрация уже реально создаёт
            пользователя через backend endpoint.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}