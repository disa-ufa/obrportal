import {
  ADMIN_FILTER_CONTROL_SOFT_CLASS,
  ADMIN_FILTER_CONTROL_SUBTLE_DISABLED_CLASS,
} from "../../utils/adminClasses";

const ADMIN_FORM_TEXT_INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500";

const VARIANT_CLASS_NAMES = {
  soft: ADMIN_FILTER_CONTROL_SOFT_CLASS,
  subtleDisabled: ADMIN_FILTER_CONTROL_SUBTLE_DISABLED_CLASS,
  form: ADMIN_FORM_TEXT_INPUT_CLASS,
};

export function AdminTextInput({ className = "", variant = "soft", ...props }) {
  const baseClassName = VARIANT_CLASS_NAMES[variant] || VARIANT_CLASS_NAMES.soft;
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return <input {...props} className={mergedClassName} />;
}

export function AdminSubtleTextInput(props) {
  return <AdminTextInput {...props} variant="subtleDisabled" />;
}

export function AdminFormTextInput(props) {
  return <AdminTextInput {...props} variant="form" />;
}
