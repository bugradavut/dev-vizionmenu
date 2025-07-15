const createJestConfig = (options = {}) => {
  const {
    displayName = "test",
    testEnvironment = "jsdom",
    setupFilesAfterEnv = [],
    moduleNameMapping = {},
    testMatch = [
      "**/__tests__/**/*.(ts|tsx|js)",
      "**/*.(test|spec).(ts|tsx|js)",
    ],
    collectCoverageFrom = [
      "src/**/*.{ts,tsx,js,jsx}",
      "!src/**/*.d.ts",
      "!src/**/*.stories.{ts,tsx,js,jsx}",
    ],
  } = options;

  return {
    displayName,
    testEnvironment,
    setupFilesAfterEnv,
    moduleNameMapping: {
      "^@/(.*)$": "<rootDir>/src/$1",
      ...moduleNameMapping,
    },
    testMatch,
    collectCoverageFrom,
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    transform: {
      "^.+\\.(ts|tsx)$": [
        "ts-jest",
        {
          useESM: true,
        },
      ],
    },
    moduleDirectories: ["node_modules", "<rootDir>/"],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  };
};

module.exports = { createJestConfig };
