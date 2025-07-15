const { dirname } = require("path");
const { fileURLToPath } = require("url");
const { FlatCompat } = require("@eslint/eslintrc");

const createEslintConfig = (baseDirectory) => {
  const compat = new FlatCompat({
    baseDirectory,
  });

  return [
    ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
    {
      rules: {
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-explicit-any": "warn",
        "prefer-const": "error",
        "no-var": "error",
      },
    },
  ];
};

module.exports = { createEslintConfig };
