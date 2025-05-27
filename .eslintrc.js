module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended"],
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off", // 允许console，因为这是日志SDK
    "no-undef": "off", // TypeScript处理这个
    "no-unused-vars": "off", // 使用TypeScript版本
  },
  ignorePatterns: ["dist/", "node_modules/", "*.js", "*.config.js"],
};
