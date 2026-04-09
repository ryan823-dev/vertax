import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "src/components/ui/**",
    // Ignore script files that use CommonJS
    "scripts/**",
    ".vercel-tmp/**",
    "playwright-report/**",
    "test-results/**",
    ".qoder/**",
    "export-candidates.cjs",
  ]),
  {
    files: ["playwright.config.js", "tests/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Relax some rules for better developer experience
  {
    rules: {
      // Allow unused vars that start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Relax any type warnings to warnings instead of errors
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
