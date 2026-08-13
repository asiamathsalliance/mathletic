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
    // CLI bank tooling — not app runtime; keep out of CI gate noise.
    "scripts/**",
  ]),
  {
    rules: {
      // Intentional patterns: hydrate theme/progress from localStorage, reset UI
      // when props change, animate counters. Treat as warnings so CI stays green
      // while we gradually migrate to lazy useState / derived state.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
