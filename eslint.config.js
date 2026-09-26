export default [
  {
    files: [
      "src/**/*.js",
      "tests/js/**/*.js",
      "tests/js/**/*.mjs",
      "src/promoted/adaptive-duration-progress.js",
    ],
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
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-constant-condition": "error",
    },
  },
  {
    files: [
      "src/promoted/auth-middleware.mjs",
      "src/promoted/cors-policy.mjs",
      "src/promoted/gcs-upload-route.mjs",
      "src/promoted/signed-url-route.mjs",
      "src/promoted/file-aware-chat-route.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        app: "readonly",
        cors: "readonly",
        process: "readonly",
        multer: "readonly",
        bucket: "readonly",
        geminiModel: "readonly",
        generateReply: "readonly",
      },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-constant-condition": "error",
    },
  },
];
