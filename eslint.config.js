export default [
  {
    files: ["tests/js/**/*.js", "tests/js/**/*.mjs", "Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        globalThis: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
      },
    },
    rules: {
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-constant-condition": "error"
    }
  }
];
