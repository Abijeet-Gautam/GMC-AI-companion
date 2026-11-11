import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@jsx-a11y/anchor-is-valid": "warn",
      "@jsx-a11y/click-events-have-key-events": "warn",
      "@jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },
];
