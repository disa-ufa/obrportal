export function ActionButton({
  children,
  onClick,
  type = "button",
  tone = "dark",
  disabled = false,
}) {
  const tones = {
    dark: "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300",
    light: "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:text-slate-400",
    blue: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    red: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
