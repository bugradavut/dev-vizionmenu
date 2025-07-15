const { createEslintConfig } = require("./eslint.config");
const { createTailwindConfig } = require("./tailwind.config");
const { createJestConfig } = require("./jest.config");

module.exports = {
  createEslintConfig,
  createTailwindConfig,
  createJestConfig,
};
