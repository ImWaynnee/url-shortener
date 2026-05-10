const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const simpleImportSort = require("eslint-plugin-simple-import-sort");
const unusedImports = require("eslint-plugin-unused-imports");
const stylistic = require("@stylistic/eslint-plugin");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["node_modules/**", "dist/**"],
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      "@stylistic": stylistic,
      "react": react,
      "react-hooks": reactHooks,
    },
    rules: {
      // Semicolons
      "semi": ["error", "always"],

      // Unused imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],

      // Import sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Object formatting
      "@stylistic/object-curly-newline": ["error", {
        "ObjectExpression": { "multiline": true, "consistent": true },
        "ObjectPattern": { "multiline": true, "consistent": true },
        "ImportDeclaration": "never",
        "ExportDeclaration": { "multiline": true, "minProperties": 3 },
      }],
      "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],

      // Indentation
      "@stylistic/indent": ["error", 2],

      // Whitespace
      "no-irregular-whitespace": "error",
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 1 }],

      // Misc
      "no-useless-escape": "warn",

      // Enforce path aliases over relative imports
      "no-restricted-imports": ["error", {
        "patterns": [{
          "group": ["./*", "../*"],
          "message": "Use path aliases (@src/, @components/, @config/) instead of relative imports.",
        }],
      }],

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports

      // React
      "react/jsx-uses-react": "off", // not needed with React 17+ JSX transform
      "react/react-in-jsx-scope": "off", // not needed with React 17+ JSX transform
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/main.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
