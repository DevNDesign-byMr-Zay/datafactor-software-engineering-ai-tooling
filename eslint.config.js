export default [
  {
    files: [
      "src/**/*.js",
      "tests/js/**/*.js",
      "tests/js/**/*.mjs",
      "Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js",
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
      "Software Engineering & AI Tooling/Authentication & Security/Token Authentication Regression/06 FINAL CORRECTED CODE/auth_middleware.mjs",
      "Software Engineering & AI Tooling/API Foundations/Express Gemini Backend Foundation/06 FINAL CORRECTED CODE/cors_policy.mjs",
      "Software Engineering & AI Tooling/Storage & File Services/GCS Upload Pipeline/06 FINAL CORRECTED CODE/upload_route.mjs",
      "Software Engineering & AI Tooling/Storage & File Services/Signed URL File Access/06 FINAL CORRECTED CODE/sign_route.mjs",
      "Software Engineering & AI Tooling/AI Model Integration/Gemini File Aware Chat Pipeline/06 FINAL CORRECTED CODE/chat_route.mjs",
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
