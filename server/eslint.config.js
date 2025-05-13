import {defineConfig, globalIgnores} from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores(["dist/"]),

    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        plugins: {js},
        extends: ["js/recommended"],
    },

    // Spread typescript-eslint configs (array of objects)
    ...tseslint.configs.recommended,

    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {argsIgnorePattern: "^_", varsIgnorePattern: "^_"},
            ],
        },
    },

]);