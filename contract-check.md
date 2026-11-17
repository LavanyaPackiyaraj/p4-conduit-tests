# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-17

## 1. My first look
How I would check that an article answer has the right shape: I would check that the response contains the `article` object and that it includes all the required fields mentioned in API.md. I would also verify that each field has the correct data type and that nested fields inside `author` are present. This ensures the API response structure remains consistent after a new version is released.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):**
  1. Missing bio: Fails — bio is missing from the answer.
  2. New field password: Fails — an unexpected field is present.
  3. token is a number: Passes — the key token still exists; the key list check does not validate data types.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. In every schema test, check all required fields, their data types, and the exact list of keys; in every auth test, verify the expected status code and error response.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
My own article test already had an exact key list (from my rule), so the question was about an article test from another run.
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape" (checked with toMatchObject only)
- **Claude said:** "an anonymous reader gets 200 and the full Article shape."
- **My answer:** No. toMatchObject checks only the fields listed in the test. If the API adds an unexpected field like password, the test will still pass. To catch unexpected fields, we also need an exact key list check using Object.keys().

## 6. My change
My article test and user test already had exact key lists, so `contract.spec.ts` needed no change. My line for the other run's test:
- **What I asked Claude:** "In @P4/tests/articles.spec.ts, the article shape test allows extra fields. Add an exact key list check using the Article fields defined in @P4/API.md. Do not run the tests."
- **The run after it:** no change in my file; 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** Only the GET /api/articles/:slug Article shape test will fail. Why: F2 removes one field from the article response. The contract test checks the Article shape against the expected fields, so it will detect the missing field.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed ("GET /api/articles/:slug answers with the Article shape" and "PUT /api/articles/:slug on someone else's article gives 403 and changes nothing")
- **What Playwright showed:** the article test's key list: `-   "body",` (Expected - 1, Received + 0). The 403 test, line 164: Expected "Contract test body", Received undefined.
- **My answer about a red test:** It failed because F2 removed the body field from the article response. The test expected the body to remain unchanged (Contract test body), but the GET request after the PUT returned undefined for article.body. So, the test exposed the same missing-field issue caused by F2, not necessarily an authentication or permission problem.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
