import js from "@eslint/js";
import tseslint from "typescript-eslint";

// One flat config for every workspace: root `bun run lint` lints the whole repo.
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/.expo/**",
      "**/playwright-report/**",
      "**/test-results/**",
      // Workflow scripts: `agent`/`phase`/`parallel`/`log` are runtime globals
      // injected by the Claude Code workflow host, not app code to lint.
      "**/.claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
