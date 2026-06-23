/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obr: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          ink: "var(--color-ink)",
          muted: "var(--color-muted)",
          border: "var(--color-border)",
          primary: "var(--color-primary)",
          primaryHover: "var(--color-primary-hover)",
          primarySoft: "var(--color-primary-soft)",
          teal: "var(--color-teal)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
        shell: "var(--radius-shell)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        cardHover: "var(--shadow-card-hover)",
        publicCard: "var(--shadow-public-card)",
        shell: "var(--shadow-shell)",
        primary: "var(--shadow-primary)",
      },
    },
  },
  plugins: [],
};
