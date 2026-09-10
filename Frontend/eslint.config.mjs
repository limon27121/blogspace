import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Avatars are 32-80px files served from the API host. next/image would need
    // that host declared in next.config and routes every avatar through the
    // optimiser for no gain, so this one file uses a plain <img>.
    files: ["components/Avatar.jsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
]);

export default eslintConfig;
