const js = require("@eslint/js");
const globals = require("globals");
const stylistic = require("@stylistic/eslint-plugin");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      "@stylistic/comma-style": ["error", "last"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/no-extra-semi": "error",
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/semi": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "comma-dangle": ["error", "always-multiline"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
);
