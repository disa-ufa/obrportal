import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Home,
  LayoutDashboard,
  LibraryBig,
  LockKeyhole,
  Menu,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

const variants = {
  enterprise: {
    id: "enterprise",
    name: "Вариант A",
    title: "Trust / Enterprise",
    subtitle: "Спокойный, строгий, юридически надежный интерфейс для образовательной организации.",
    primary: "#155EEF",
    primaryHover: "#0B57D0",
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    subtle: "#EEF4FF",
    text: "#0F172A",
    muted: "#475467",
    border: "#D5DCE5",
    success: "#0F766E",
    warning: "#B54708",
    danger: "#B42318",
    radius: "24px",
    shadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
    hero: "Подберите программу и получите документ без лишней бюрократии",
    lead: "Каталог, обучение, оплата, документы, ЭДО и ФИС ФРДО — в едином понятном контуре.",
  },
  edtech: {
    id: "edtech",
    name: "Вариант B",
    title: "Modern EdTech",
    subtitle: "Более живой публичный слой: подходит, если важны конверсия, каталог и маркетинг курсов.",
    primary: "#6D28D9",
    primaryHover: "#5B21B6",
    bg: "#FBF8FF",
    surface: "#FFFFFF",
    subtle: "#F3E8FF",
    text: "#18181B",
    muted: "#52525B",
    border: "#DDD6FE",
    success: "#047857",
    warning: "#C2410C",
    danger: "#BE123C",
    radius: "28px",
    shadow: "0 16px 42px rgba(88, 28, 135, 0.12)",
    hero: "Учитесь онлайн, проходите аттестацию и получайте документы в личном кабинете",
    lead: "Для физических лиц и корпоративных групп: быстрый выбор курса, прозрачный прогресс и понятные статусы.",
  },
  ops: {
    id: "ops",
    name: "Вариант C",
    title: "Operations / Dense UI",
    subtitle: "Плотный рабочий интерфейс для операторов ЭДО, ФРДО, финансов и админки.",
    primary: "#0F766E",
    primaryHover: "#115E59",
    bg: "#F6F8FA",
    surface: "#FFFFFF",
    subtle: "#E6FFFA",
    text: "#111827",
    muted: "#4B5563",
    border: "#CBD5E1",
    success: "#047857",
    warning: "#B45309",
    danger: "#B91C1C",
    radius: "18px",
    shadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
    hero: "Рабочее место оператора: реестры, статусы, ошибки и контроль сроков",
    lead: "Плотные таблицы, фильтры, карточка сущности справа, журнал событий и действия без потери контекста.",
  },
};

const contexts = [
  { id: "public", label: "Публичный контур", icon: Home },
  { id: "user", label: "Кабинеты", icon: GraduationCap },
  { id: "operations", label: "Back-office", icon: Database },
  { id: "uikit", label: "UI-kit", icon: LayoutDashboard },
];

const courses = [
  {
    title: "Цифровая образовательная среда",
    hours: "72 часа",
    price: "12 900 ₽",
    format: "Дистанционно",
    document: "Удостоверение",
    tag: "ДПО",
    progress: 68,
  },
  {
    title: "Охрана труда для руководителей",
    hours: "40 часов",
    price: "8 500 ₽",
    format: "Онлайн + тест",
    document: "Протокол + удостоверение",
    tag: "Корпоративный",
    progress: 42,
  },
  {
    title: "Инклюзивное обучение",
    hours: "108 часов",
    price: "16 400 ₽",
    format: "LMS",
    document: "Сертификат",
    tag: "Популярное",
    progress: 100,
  },
];

const opsRows = [
  { id: "FRDO-124", type: "ФРДО", object: "Иванова М.С. / УПК-000124", status: "validated", label: "Проверено", deadline: "12 дней", issue: "—" },
  { id: "FRDO-125", type: "ФРДО", object: "Петров А.О. / УПК-000125", status: "error", label: "XSD ошибка", deadline: "5 дней", issue: "Дата выдачи" },
  { id: "EDO-824", type: "ЭДО", object: "Договор №24-ЮЛ/2026", status: "signed", label: "Подписан", deadline: "—", issue: "—" },
  { id: "PAY-1025", type: "Финансы", object: "ООО «Вектор» / 84 000 ₽", status: "pending", label: "Сверка", deadline: "сегодня", issue: "Webhook" },
];

function themeVars(theme) {
  return {
    "--primary": theme.primary,
    "--primary-hover": theme.primaryHover,
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--subtle": theme.subtle,
    "--text": theme.text,
    "--muted": theme.muted,
    "--border": theme.border,
    "--success": theme.success,
    "--warning": theme.warning,
    "--danger": theme.danger,
    "--radius": theme.radius,
    "--shadow": theme.shadow,
  };
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ children, className = "", compact = false }) {
  return (
    <div
      className={cx("border bg-[var(--surface)]", compact ? "p-4" : "p-5", className)}
      style={{ borderColor: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", icon: Icon, className = "", type = "button" }) {
  const styles = {
    primary: "border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    secondary: "border-[var(--border)] bg-white text-[var(--text)] hover:bg-slate-50",
    ghost: "border-transparent bg-transparent text-[var(--text)] hover:bg-black/5",
    danger: "border-transparent bg-[var(--danger)] text-white hover:brightness-95",
  };
  return (
    <button
      type={type}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:scale-[0.99]",
        styles[variant],
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function Badge({ children, tone = "neutral" }) {
  const map = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
  };
  return <span className={cx("inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-bold", map[tone])}>{children}</span>;
}

function StatusBadge({ status, label }) {
  const tone = status === "signed" || status === "validated" ? "success" : status === "error" ? "danger" : status === "pending" ? "warning" : "info";
  return <Badge tone={tone}>{label}</Badge>;
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black tracking-tight text-[var(--text)] lg:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint, tone = "info" }) {
  return (
    <Card compact>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-2xl font-black text-[var(--text)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
        </div>
        <div className="rounded-2xl bg-[var(--subtle)] p-3 text-[var(--primary)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

function VariantPicker({ selected, setSelected }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3" role="list" aria-label="Варианты дизайна">
      {Object.values(variants).map((item) => {
        const active = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            className={cx(
              "min-h-[112px] rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
              active ? "bg-[var(--surface)]" : "bg-white/70 hover:bg-white"
            )}
            style={{ borderColor: active ? item.primary : "var(--border)", boxShadow: active ? item.shadow : "none" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: item.primary }}>{item.name}</p>
                <p className="mt-1 text-lg font-black text-[var(--text)]">{item.title}</p>
              </div>
              {active ? <CheckCircle2 className="h-5 w-5" style={{ color: item.primary }} aria-hidden="true" /> : null}
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{item.subtitle}</p>
          </button>
        );
      })}
    </div>
  );
}

function ContextTabs({ selected, setSelected }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 rounded-3xl border bg-white p-2" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="Контуры макета">
      {contexts.map((item) => {
        const Icon = item.icon;
        const active = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            className={cx(
              "inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
              active ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-slate-50 hover:text-[var(--text)]"
            )}
            role="tab"
            aria-selected={active}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function AppShell({ children, variant, setVariant, context, setContext }) {
  const theme = variants[variant];
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={themeVars(theme)}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-[var(--primary)]">
        Перейти к основному содержимому
      </a>
      <header className="border-b bg-white/90 backdrop-blur" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl text-white" style={{ background: "var(--primary)", borderRadius: "calc(var(--radius) - 8px)" }}>
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">ОбрПортал</div>
              <div className="text-base font-black text-[var(--text)]">UX/UI Stage 5</div>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Сервисная навигация">
            <Badge tone="info">Кликабельный прототип</Badge>
            <Button variant="secondary" icon={Bell}>Уведомления</Button>
            <Button variant="secondary" icon={UserRound}>Профиль</Button>
          </nav>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 md:hidden" aria-label="Открыть меню">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <Card className="mb-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">Дизайн-варианты</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] lg:text-3xl">Макеты с вариантами визуального направления</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted)]">
                  Исправления внесены по аудиту: разделены контуры, усилены токены, семантика, CTA, формы, таблицы, состояния ошибок, focus и responsive-first логика.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">AA-aware</Badge>
                <Badge tone="neutral">Public / User / Ops shells</Badge>
                <Badge tone="neutral">Design tokens</Badge>
              </div>
            </div>
            <VariantPicker selected={variant} setSelected={setVariant} />
            <ContextTabs selected={context} setSelected={setContext} />
          </div>
        </Card>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${variant}-${context}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function SearchForm() {
  return (
    <form className="grid gap-3 rounded-3xl border bg-white p-3 lg:grid-cols-[1fr_220px_180px]" style={{ borderColor: "var(--border)" }} role="search" aria-label="Поиск программы">
      <div className="grid gap-1">
        <label htmlFor="course-search" className="px-1 text-sm font-bold text-[var(--text)]">Название программы или тема</label>
        <div className="flex min-h-12 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "var(--border)" }}>
          <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          <input id="course-search" name="q" type="search" className="w-full bg-transparent text-sm outline-none" placeholder="Например: охрана труда" autoComplete="off" />
        </div>
      </div>
      <div className="grid gap-1">
        <label htmlFor="format" className="px-1 text-sm font-bold text-[var(--text)]">Формат</label>
        <select id="format" className="min-h-12 rounded-2xl border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" style={{ borderColor: "var(--border)" }}>
          <option>Любой формат</option>
          <option>Дистанционно</option>
          <option>Онлайн + тест</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button type="submit" icon={Search} className="w-full">Найти</Button>
      </div>
    </form>
  );
}

function PublicMockup({ theme }) {
  const isEdtech = theme.id === "edtech";
  const isOps = theme.id === "ops";
  return (
    <div>
      <SectionHeader
        eyebrow="Public shell"
        title={theme.hero}
        description={theme.lead}
        action={
          <>
            <Button icon={Search}>{isOps ? "Открыть реестр" : "Подобрать программу"}</Button>
            <Button variant="secondary" icon={FileCheck2}>Проверить документ</Button>
          </>
        }
      />
      <section className={cx("grid gap-5", isEdtech ? "lg:grid-cols-[0.95fr_1.05fr]" : "lg:grid-cols-[1.15fr_0.85fr]")}> 
        <Card className="overflow-hidden">
          <div className="rounded-[calc(var(--radius)-6px)] bg-[var(--subtle)] p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="info">Физическим лицам</Badge>
              <Badge tone="violet">Организациям</Badge>
              <Badge tone="neutral">ДПО</Badge>
            </div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight text-[var(--text)] lg:text-5xl">
              {isEdtech ? "Учебный путь от выбора курса до документа" : isOps ? "Операторский контроль без потери статусов" : "Единая платформа для обучения и документов"}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              {isOps
                ? "Этот вариант показывает, как публичный слой может быть спокойнее, а рабочие разделы — плотнее и быстрее."
                : "Главный экран теперь говорит о пользе для пользователя, а не перечисляет внутренние модули системы."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button icon={ArrowRight}>Начать подбор</Button>
              <Button variant="secondary" icon={Building2}>Для организаций</Button>
            </div>
          </div>
          <div className="mt-5">
            <SearchForm />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Популярные программы</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Карточки с одной основной CTA и понятным итоговым документом.</p>
            </div>
            <Button variant="ghost" icon={Filter}>Фильтры</Button>
          </div>
          <div className="space-y-3">
            {courses.map((course) => (
              <article key={course.title} className="rounded-3xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge tone="neutral">{course.tag}</Badge>
                    <h3 className="mt-3 text-lg font-black text-[var(--text)]">{course.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{course.hours} · {course.format} · {course.document}</p>
                  </div>
                  <div className="text-lg font-black text-[var(--text)]">{course.price}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1">Подробнее</Button>
                  <Button variant="secondary" icon={CreditCard}>Купить</Button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function UserMockup({ theme }) {
  return (
    <div>
      <SectionHeader
        eyebrow="User shell"
        title="Личный кабинет без лишнего шума"
        description="Здесь показывается не вся система сразу, а следующий лучший шаг: продолжить обучение, пройти аттестацию, подтвердить данные или скачать документ."
        action={<Button icon={BookOpen}>Продолжить обучение</Button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={BookOpen} label="Активные курсы" value="2" hint="1 курс почти завершен" />
        <Metric icon={ClipboardIcon} label="Прогресс" value="68%" hint="средний по курсам" />
        <Metric icon={FileCheck2} label="Документы" value="1" hint="готов к скачиванию" />
        <Metric icon={CreditCard} label="Оплаты" value="3" hint="чеки доступны" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Мои курсы</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Карточки не конкурируют: одна основная кнопка — следующий шаг.</p>
            </div>
            <Badge tone="info">/app/courses</Badge>
          </div>
          <div className="space-y-4">
            {courses.map((course) => (
              <article key={course.title} className="rounded-3xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[var(--text)]">{course.title}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{course.document} · {course.hours}</p>
                  </div>
                  <Badge tone={course.progress === 100 ? "success" : "warning"}>{course.progress === 100 ? "Завершен" : "В процессе"}</Badge>
                </div>
                <div className="mt-4" aria-label={`Прогресс ${course.progress} процентов`}>
                  <div className="mb-1 flex justify-between text-xs font-bold text-[var(--muted)]">
                    <span>Прогресс</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Документ и ФРДО-статус</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Пользователь видит безопасный понятный статус, но не служебный реестр ФРДО.</p>
          <div className="mt-5 space-y-4">
            {[
              ["Аттестация пройдена", "success"],
              ["Данные подтверждены", "success"],
              ["PDF сформирован", "success"],
              ["Сведения готовятся к передаче", "warning"],
            ].map(([label, tone], idx) => (
              <div key={label} className="flex gap-3">
                <div className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {tone === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}
                </div>
                <div>
                  <p className="font-bold text-[var(--text)]">{label}</p>
                  <p className="text-sm text-[var(--muted)]">Шаг {idx + 1}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            <Button icon={Download}>Скачать документ</Button>
            <Button variant="secondary" icon={Eye}>Открыть карточку документа</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ClipboardIcon(props) {
  return <CheckCircle2 {...props} />;
}

function OperationsMockup({ theme }) {
  const dense = theme.id === "ops";
  return (
    <div>
      <SectionHeader
        eyebrow="Operations shell"
        title="Back-office: таблица + фильтры + карточка справа"
        description="В операторских разделах важна скорость: сохраненные представления, sticky-заголовки, массовые действия, детали без ухода со списка и журнал событий."
        action={
          <>
            <Button icon={RefreshCcw}>Обновить</Button>
            <Button variant="secondary" icon={Download}>Экспорт</Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Database} label="Staging ФРДО" value="142" hint="ожидают проверки" />
        <Metric icon={XCircle} label="Ошибки" value="9" hint="XSD / бизнес-валидация" />
        <Metric icon={FileText} label="ЭДО" value="18" hint="документов в пути" />
        <Metric icon={Clock3} label="Дедлайн ≤ 7 дней" value="18" hint="риск просрочки" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card compact={dense}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <form className="grid flex-1 gap-2 md:grid-cols-[1fr_160px_160px]" role="search" aria-label="Поиск в операционном реестре">
              <div>
                <label htmlFor="ops-search" className="mb-1 block text-sm font-bold text-[var(--text)]">Поиск</label>
                <div className="flex min-h-11 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "var(--border)" }}>
                  <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                  <input id="ops-search" type="search" className="w-full bg-transparent text-sm outline-none" placeholder="ФИО, документ, заказ" />
                </div>
              </div>
              <div>
                <label htmlFor="module" className="mb-1 block text-sm font-bold text-[var(--text)]">Модуль</label>
                <select id="module" className="min-h-11 w-full rounded-2xl border bg-white px-3 text-sm" style={{ borderColor: "var(--border)" }}>
                  <option>Все</option>
                  <option>ФРДО</option>
                  <option>ЭДО</option>
                  <option>Финансы</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" icon={Filter} className="w-full">Применить</Button>
              </div>
            </form>
          </div>
          <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Операционный реестр ФРДО, ЭДО и финансовых событий</caption>
              <thead className="bg-slate-50 text-[var(--muted)]">
                <tr>
                  <th scope="col" className={cx("px-4", dense ? "py-2" : "py-3")}>ID</th>
                  <th scope="col" className={cx("px-4", dense ? "py-2" : "py-3")}>Контур</th>
                  <th scope="col" className={cx("px-4", dense ? "py-2" : "py-3")}>Объект</th>
                  <th scope="col" className={cx("px-4", dense ? "py-2" : "py-3")}>Статус</th>
                  <th scope="col" className={cx("px-4", dense ? "py-2" : "py-3")}>Дедлайн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opsRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className={cx("px-4 font-black", dense ? "py-2" : "py-3")}>{row.id}</td>
                    <td className={cx("px-4", dense ? "py-2" : "py-3")}>{row.type}</td>
                    <td className={cx("px-4", dense ? "py-2" : "py-3")}>{row.object}</td>
                    <td className={cx("px-4", dense ? "py-2" : "py-3")}><StatusBadge status={row.status} label={row.label} /></td>
                    <td className={cx("px-4", dense ? "py-2" : "py-3")}>{row.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-3xl border border-dashed p-4 text-sm text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>
            Mobile strategy: на малых экранах эта таблица превращается в карточки с раскрытием вторичных полей, а не в бесконечный горизонтальный скролл.
          </div>
        </Card>

        <Card compact={dense}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">Details panel</p>
              <h2 className="mt-2 text-xl font-black">FRDO-125</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Петров А.О. / УПК-000125</p>
            </div>
            <StatusBadge status="error" label="XSD ошибка" />
          </div>
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
              <div>
                <h3 className="font-black text-rose-900">Ошибка валидации</h3>
                <p className="mt-1 text-sm leading-6 text-rose-700">Поле “Дата выдачи документа” не соответствует версии XSD. Исправьте запись и запустите проверку повторно.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {["Источник: GeneratedDocument", "Версия схемы: XSD 2026.04", "Дедлайн: 5 дней", "Связь: УПК-000125"].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-[var(--text)]">{item}</div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            <Button icon={FileCheck2}>Исправить запись</Button>
            <Button variant="secondary" icon={Eye}>Открыть историю</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function UiKitMockup({ theme }) {
  const tokenRows = [
    ["Primary", theme.primary],
    ["Background", theme.bg],
    ["Surface", theme.surface],
    ["Text", theme.text],
    ["Muted", theme.muted],
    ["Border", theme.border],
    ["Success", theme.success],
    ["Warning", theme.warning],
    ["Danger", theme.danger],
  ];
  return (
    <div>
      <SectionHeader
        eyebrow="Design system"
        title="UI-kit v1: токены, формы, состояния"
        description="Этот экран показывает основу дизайн-системы: цвета, типографику, кнопки, формы, error summary, статусы и пустые состояния."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Токены варианта</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tokenRows.map(([name, color]) => (
              <div key={name} className="rounded-3xl border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="h-14 rounded-2xl border" style={{ background: color, borderColor: "var(--border)" }} />
                <p className="mt-2 text-sm font-black">{name}</p>
                <p className="text-xs text-[var(--muted)]">{color}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Кнопки и статусы</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="success">Принято</Badge>
            <Badge tone="warning">В обработке</Badge>
            <Badge tone="danger">Ошибка</Badge>
            <Badge tone="info">Информация</Badge>
            <Badge tone="neutral">Черновик</Badge>
          </div>
          <div className="mt-6 rounded-3xl border border-dashed p-4 text-sm leading-6 text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>
            Все интерактивные элементы имеют минимальную высоту 44px и явный focus-visible контур.
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Форма с ошибками</h2>
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4" role="alert" aria-labelledby="error-summary-title">
            <h3 id="error-summary-title" className="font-black text-rose-900">Проверьте поля формы</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-rose-700">
              <li>Email указан неверно.</li>
              <li>Не выбрана программа обучения.</li>
            </ul>
          </div>
          <form className="mt-5 grid gap-4" noValidate>
            <div className="grid gap-2">
              <label htmlFor="email-demo" className="text-sm font-bold">Email</label>
              <input id="email-demo" type="email" aria-invalid="true" aria-describedby="email-error" autoComplete="email" className="min-h-12 rounded-2xl border border-rose-300 px-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" />
              <p id="email-error" className="text-sm font-semibold text-rose-700">Введите корректный email.</p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="program-demo" className="text-sm font-bold">Программа</label>
              <select id="program-demo" className="min-h-12 rounded-2xl border px-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" style={{ borderColor: "var(--border)" }}>
                <option>Выберите программу</option>
              </select>
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Пустое состояние</h2>
          <div className="mt-4 rounded-3xl border border-dashed bg-slate-50 p-8 text-center" style={{ borderColor: "var(--border)" }}>
            <LibraryBig className="mx-auto h-10 w-10 text-[var(--muted)]" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-black">Курсы еще не добавлены</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Создайте первый курс или импортируйте структуру программы из шаблона.</p>
            <Button className="mt-5" icon={LibraryBig}>Создать курс</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActiveMockup({ context, theme }) {
  if (context === "public") return <PublicMockup theme={theme} />;
  if (context === "user") return <UserMockup theme={theme} />;
  if (context === "operations") return <OperationsMockup theme={theme} />;
  return <UiKitMockup theme={theme} />;
}

export default function ObrPortalStage5DesignVariants() {
  const [variant, setVariant] = useState("enterprise");
  const [context, setContext] = useState("public");
  const theme = useMemo(() => variants[variant], [variant]);

  return (
    <AppShell variant={variant} setVariant={setVariant} context={context} setContext={setContext}>
      <ActiveMockup context={context} theme={theme} />
    </AppShell>
  );
}
