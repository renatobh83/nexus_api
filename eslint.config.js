import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "prisma/**",
      "public/**",
      "vue/**",
      "app/**",
    ],
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
    },
  },
];
