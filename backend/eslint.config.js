const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const simpleImportSort = require("eslint-plugin-simple-import-sort");
const unusedImports = require("eslint-plugin-unused-imports");
const stylistic = require("@stylistic/eslint-plugin");

module.exports = [
  {
    files: ["src/**/*.ts"],
    ignores: ["node_modules/**", "dist/**", "coverage/**", "src/generated/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      "@stylistic": stylistic,
    },
    rules: {
      // Semicolons
      "semi": ["error", "always"],

      // Commas
      "@/comma-dangle": ["error", "never"],

      // Unused imports (plugin: unused-imports)
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_" 
        },
      ],

      // Import sorting (plugin: simple-import-sort)
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Object formatting — enforce consistent braces and one property per line
      "@stylistic/object-curly-newline": ["error", {
        "ObjectExpression": {
          "multiline": true,
          "consistent": true 
        },
        "ObjectPattern": {
          "multiline": true,
          "consistent": true 
        },
        "ImportDeclaration":  {
          "multiline": true,
          "consistent": true 
        },
        "ExportDeclaration":  {
          "multiline": true,
          "consistent": true 
        },
      }],
      "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],

      // Indentation
      "@stylistic/indent": ["error", 2],

      // Whitespace
      "no-irregular-whitespace": "error",
      "object-curly-spacing": ["error", "always"],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-multiple-empty-lines": ["error", {
        max: 1,
        maxBOF: 0,
        maxEOF: 1 
      }],

      // Misc
      "no-useless-escape": "warn",

      // Enforce path aliases over relative imports
      "no-restricted-imports": ["error", {
        "patterns": [{
          "group": ["./*", "../*"],
          "message": "Use path aliases (@src/, @modules/, @config/, @guards/) instead of relative imports. Add into tsconfig.json paths if needed.",
        }],
      }],

      // TypeScript
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports
    },
  },
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "semi": ["error", "always"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/object-curly-newline": ["error", {
        "ObjectExpression": {
          "multiline": true,
          "consistent": true 
        },
        "ObjectPattern": {
          "multiline": true,
          "consistent": true 
        },
        "ImportDeclaration": {
          "multiline": true,
          "consistent": true 
        },
        "ExportDeclaration": {
          "multiline": true,
          "consistent": true 
        }
      }],
      "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],
      "no-irregular-whitespace": "error",
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-multiple-empty-lines": ["error", {
        max: 1,
        maxBOF: 0,
        maxEOF: 1 
      }],
      "no-useless-escape": "warn",
    },
  },
];