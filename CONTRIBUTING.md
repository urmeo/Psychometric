# Contributing to Psychometric

Thanks for your interest in improving Psychometric. This is a small, offline-first
web app that scores five standardized instruments in English and French. Contributions
that fix a scoring bug, tighten a clinical band, add a translation, or improve
accessibility are especially welcome.

## Development setup

The app itself needs no build step or server -- open `en/index.html` or
`fr/index.html` in any browser. Tooling is only needed to run the headless test suite.

Tests run under Node 22 (see `.nvmrc`; the lockfile pins `node >=22.12.0`). Install
the pinned dependencies from the committed lockfile for a reproducible tree:

```bash
npm ci
```

`npm ci` installs exactly what `package-lock.json` specifies (Puppeteer, which pulls
a bundled Chromium on first install). Use `npm install` only when you are deliberately
changing a dependency, and commit the updated lockfile with it.

## Running the tests

```bash
npm test
```

This runs `scripts/run-tests.js`, which loads `tests/test-scoring.html` (English) and
`tests/test-scoring-fr.html` (French) in headless Chromium and fails the process if any
scoring assertion fails. Every push and pull request runs the same command against both
languages via GitHub Actions (`.github/workflows/test.yml`).

You can also open either `tests/test-scoring*.html` file directly in a browser -- the
assertions render on page load, with pass/fail colour-coded in the results table.

There is no separate linter or formatter configured; the test suite is the gate. CI also
runs `npm audit --audit-level=high` (advisory) on the dependency tree.

## Code style

- Application code is vanilla ES5 -- no build step, no framework, no transpiler. Keep it
  that way so the app runs from `file://` with everything bundled.
- Keep functions short and single-purpose. Let names carry the meaning; comment only where
  intent is non-obvious.
- Scoring rules, item mappings, reverse-scoring keys, and clinical band thresholds live in
  `lang/en.js` and `lang/fr.js`. If you change any of them, add or update an assertion in
  `tests/test-scoring.js` -- untested scoring changes will not be merged.
- Keep the two languages in parity: a change to one instrument's keying or bands almost
  always needs the matching edit in the other locale.
- Vendored libraries under `lib/` are third-party (Bootstrap, jsPDF) -- don't hand-edit them.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) with a terse description:

```
feat: add resume-session banner
fix: correct FQ blood-injury reverse keying
docs: add CONTRIBUTING
test: cover HADS borderline band boundary
refactor: extract band-colour helper
build: bump puppeteer to 25.2
chore: ignore generated export files
```

Prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `build:`, `chore:`. Keep one
logical change per commit.

## Filing an issue

Open an issue at https://github.com/urme-b/Psychometric/issues. For a scoring bug, please
include the instrument (HADS, STAI-S, STAI-T, BFI-10, FQ), the language, the item responses,
the score you got, and the score you expected -- that maps directly onto a test case.

## Opening a pull request

1. Branch off `main`.
2. Make your change and keep commits focused.
3. Run `npm test` locally; both language suites must pass.
4. If you touched scoring or bands, confirm a corresponding assertion exists.
5. Open a pull request against `main`. CI must be green before merge.

## A note on the instruments

The MIT license covers the software only. The instruments themselves are copyright of their
respective owners, and STAI and HADS are commercial. Please read [NOTICE.md](NOTICE.md)
before contributing item text or deploying the app.

By contributing you agree your work is released under the project's MIT license.
