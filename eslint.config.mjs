import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",  // ✅ any 허용
      "react-hooks/exhaustive-deps": "warn"         // 의존성 배열 경고만 표시
    },
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      ".firebase/**/*"
    ]
  }
];

export default eslintConfig;