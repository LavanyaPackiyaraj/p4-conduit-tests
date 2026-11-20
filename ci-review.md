# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-20

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.16.0
- **My whole suite on my laptop:** `npx playwright test` → 22 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js: "Node.js v24.16.0."
  - Packages: "npm ci – It installs the exact dependency versions specified in package-lock.json, ensuring consistent results across environments."
  - Browser: Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. `npm ci` – It installs the exact dependency versions specified in `package-lock.json`, ensuring consistent results across environments.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** line 16, `node-version-file: package.json` (in the step "Set up Node.js")
- **Claude said:** "It takes the version from `engines.node` in `package.json` (`>=22.13`), so the version isn't typed twice."
- **My project needs:** Node.js v24.16.0, the version my suite was green on
- **My answer to the developer:** "Not yet. The workflow uses `node-version-file: package.json`, which reads the minimum requirement (`>=22.13`), not the exact version tested on our laptop (`v24.16.0`). We should explicitly set `node-version: 24.16.0` to ensure CI uses the same verified version before merging."
- **My line to Claude:** "In @P4/.github/workflows/playwright.yml, line 16, replace node-version-file: package.json with node-version: 24.16.0 because my laptop's verified Node.js version is v24.16.0. Change nothing else. Do not run anything."

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 1–16):**
  - Line 1: Names the workflow "Playwright tests".
  - Lines 3–4: Triggers the workflow whenever code is pushed to any branch.
  - Lines 6–7: Defines a job named `test`.
  - Line 8: Runs the job on a fresh Ubuntu Linux computer.
  - Lines 10–11: Checks out (copies) the repository code onto the GitHub computer.
  - Lines 13–14: Sets up Node.js.
  - Lines 15–16: Configures Node.js version `24.16.0`, matching the version tested on my laptop.
- **Packages, browser, tests and the report (lines 17–33):**
  - Line 17: Enables npm caching to make future workflow runs faster.
  - Lines 19–20: Installs the exact dependencies from `package-lock.json` using `npm ci`.
  - Lines 22–23: Installs Chromium and its required system dependencies.
  - Lines 25–26: Runs all Playwright tests.
  - Lines 28–30: Uploads the HTML report unless the workflow is cancelled.
  - Lines 31–33: Names the saved artifact `playwright-report` and specifies the report folder to upload.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "…": **kept / changed / removed**, because …

### Tuesday: `tests/contract.spec.ts`
- "…": **kept / changed / removed**, because …
