import {
  ADMIN_FILTER_CONTROL_SOFT_CLASS,
  ADMIN_FILTER_CONTROL_SUBTLE_DISABLED_CLASS,
} from "../../utils/adminClasses";

const VARIANT_CLASS_NAMES = {
  soft: ADMIN_FILTER_CONTROL_SOFT_CLASS,
  subtleDisabled: ADMIN_FILTER_CONTROL_SUBTLE_DISABLED_CLASS,
};

export function AdminTextInput({ className = "", variant = "soft", ...props }) {
  const baseClassName = VARIANT_CLASS_NAMES[variant] || VARIANT_CLASS_NAMES.soft;
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return <input {...props} className={mergedClassName} />;
}

export function AdminSubtleTextInput(props) {
  return <AdminTextInput {...props} variant="subtleDisabled" />;
}
