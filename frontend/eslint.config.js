import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Базовый lint-gate для текущего этапа:
      // ESLint должен запускаться и парсить проект.
      // React Hooks plugin подключен, чтобы существующие eslint-disable комментарии
      // не падали с ошибкой "rule was not found".
      //
      // Строгие hook-правила включим отдельным этапом, чтобы не смешивать
      // старый технический долг с дизайн-правками.
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
