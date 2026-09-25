// ADR 0001: the same lint spine as the pipeline (../Fonnus/eslint.config.js) —
// `js.configs.recommended` plus typescript-eslint's `strictTypeChecked` — with
// eslint-config-next's Next.js and React layers on top, because this repo also
// ships JSX and Next.js route conventions the pipeline has no equivalent of.
// `eslint-config-next/core-web-vitals` already carries the `next/typescript`
// layer, which registers the same `@typescript-eslint` plugin instance we do,
// so the plugin is defined once and there is nothing to deduplicate here.
//
// ESLint is pinned to 9.x, not the pipeline's 10.x: eslint-config-next depends
// on eslint-plugin-react, whose newest release (7.37.5) declares `eslint ^9.7`
// and crashes on ESLint 10 (`scopeManager.addGlobals is not a function`). Raise
// the pin the moment that plugin ships ESLint 10 support.
import { readdirSync } from 'node:fs';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

// The import direction of docs/architecture.md §2.1, as lint. Flat config gives
// a rule one set of options per file, so each layer is its own object over a
// disjoint set of files: two objects matching one file do not merge, the later
// replaces the earlier.
//
// The feature list is read from the tree, so a new feature directory is fenced
// in the moment it exists. A feature imports its own files relatively; what is
// caught is the alias into another feature and a relative path that climbs out
// into one (`../auth/…`, `../../features/auth/…`).
const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const NO_OTHER_FEATURE = 'Features never import each other (docs/architecture.md §2.1): move the shared part to api/, ui/ or design-system/.';
const NO_APP_LAYER = 'A shared directory never imports a feature, api/, session/ or shell/ (docs/architecture.md §2.1): take the data as props.';
const NO_FEATURE_FROM_FRAME = 'session/ and shell/ never import a feature (docs/architecture.md §2.1): a tab changes the frame through session.patchMe() or markSummaryStale().';
const MARKETING_STAYS_SERVER = "The landing page never imports ui/, session/ or shell/ (docs/architecture.md §2.1): they pull the app's client kit into a server-rendered page.";
const API_IMPORTS_ITSELF = 'api/ imports nothing outside itself (docs/architecture.md §2.1): the other direction is the cycle session → api → session.';

function restrictImports(files, patterns) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: patterns.map(([regex, message]) => ({ regex, message, caseSensitive: true })) },
      ],
    },
  };
}

function featureRules(feature) {
  const others = FEATURES.filter((name) => name !== feature);
  return restrictImports(
    [`src/features/${feature}/**`],
    [
      [`^@/features/(?!${feature}(/|$))`, NO_OTHER_FEATURE],
      ...(others.length > 0 ? [[`^(\\.\\./)+(features/)?(${others.join('|')})(/|$)`, NO_OTHER_FEATURE]] : []),
      ...(feature === 'marketing'
        ? [
            ['^@/(ui|session|shell)(/|$)', MARKETING_STAYS_SERVER],
            ['^(\\.\\./)+(ui|session|shell)(/|$)', MARKETING_STAYS_SERVER],
          ]
        : []),
    ],
  );
}

const importDirectionRules = [
  ...FEATURES.map(featureRules),
  restrictImports(
    ['src/ui/**', 'src/design-system/**'],
    [
      ['^@/(features|session|shell|api)(/|$)', NO_APP_LAYER],
      ['^(\\.\\./)+(features|session|shell|api)(/|$)', NO_APP_LAYER],
    ],
  ),
  restrictImports(
    ['src/session/**', 'src/shell/**'],
    [
      ['^@/features(/|$)', NO_FEATURE_FROM_FRAME],
      ['^(\\.\\./)+features(/|$)', NO_FEATURE_FROM_FRAME],
    ],
  ),
  restrictImports(
    ['src/api/**'],
    [
      // Only a path that climbs out of api/ is forbidden, so a future
      // api/contracts/<group>.ts may still import ../errors (architecture §2.3).
      ['^(\\.\\./)+(features|session|shell|ui|design-system|data|app|styles)(/|$)', API_IMPORTS_ITSELF],
      ['^@/(?!api(/|$))', API_IMPORTS_ITSELF],
    ],
  ),
];

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...nextVitals,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-fallthrough': 'error',
      // In ESLint 10's `recommended` set, which the pipeline runs; on the 9.x
      // pin they exist but are off, so they are switched on by hand to keep the
      // rule set equal to the pipeline's. Drop these three lines with the pin.
      'no-useless-assignment': 'error',
      'no-unassigned-vars': 'error',
      'preserve-caught-error': 'error',
    },
  },
  {
    // CLAUDE.md §Ground rules: one file reads the environment. Enforced here so
    // a new `process.env.X` fails lint instead of quietly bypassing
    // `src/api/env.ts` — the same gate the pipeline puts on `app/src/config/`.
    // It also protects a Next.js-specific trap: only a literal
    // `process.env.NEXT_PUBLIC_X` is inlined into the client bundle, so a value
    // read through a computed key is `undefined` in the browser and defined on
    // the server, which is the worst kind of bug to find later.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/api/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'only src/api/env.ts reads process.env' },
      ],
    },
  },
  ...importDirectionRules,
  {
    // eslint-config-next installs its own parser for every extension it claims,
    // including `.mts`, and that parser does not forward the TypeScript project
    // the type-aware rules need. Only `vitest.config.mts` is affected; hand it
    // back to typescript-eslint's parser.
    files: ['**/*.mts'],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    // Config files are plain ESM with no place in the TypeScript program.
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  { ignores: ['.next/', 'out/', 'next-env.d.ts', 'node_modules/'] },
);
