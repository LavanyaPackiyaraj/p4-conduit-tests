# My end-to-end tests and review (week 4, project P4)

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-18

## 1. My first look
- **After I published an article by hand, I would check:** Verify that the user can log in successfully, create a new article, and publish it without any errors. Ensure the newly published article appears in the Global Feed with the correct title, content, and author details.
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No, line 19 does not prove that the like worked. It only verifies that the article heading is visible.A proper check should verify that the like count increases or the button changes to Unfavorite Article after clicking.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end of each test, verify the result using the API: for the publish test, confirm the newly created article exists with the correct title and content; for the comment test, confirm the comment is saved with the correct text and author.
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed.

## 5. The teammate's question
- **Claude said:** Each test makes its own user with the API, gives the page that user's token, does the journey in the page, and checks the result with the API at the end.
- **My answer:** No. Each test creates separate data, but users, articles, and comments may remain in the database. Cleanup logic is needed to remove test data after execution.

## 6. What I saw on the home page
- E2E comment article 179501141711487477, E2E article 179501141668594004

## 7. My change
- **My line to Claude:** In @P4/tests/e2e.spec.ts, the publish test leaves an article and the comment test leaves a comment on the home page. Remove both in test.afterEach so cleanup runs even when a check fails. Do not run the tests.
- **After the first proof run:** The teardown deletes the comment made by the reader but leaves the article created by the author in the database.
- **My second line to Claude:** In @P4/tests/e2e.spec.ts, the comment test also leaves the article created by the author. Delete that article in test.afterEach so cleanup runs even when a check fails. Do not run the tests.
- **The clean-up Claude added:** `test.afterEach` deletes the reader's comments, then every article by the user who wrote it (the publish test's article and the comment test's article).

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → first time: 4 passed, but the first title was E2E comment article 179501210998386230. After my second line: 4 passed.
- **The newest article on the home page after the run:** Your first end-to-end test
