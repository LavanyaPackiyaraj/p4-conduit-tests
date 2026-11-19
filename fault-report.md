# My practice fault report (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-19
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** "All 17 tests passing doesn't guarantee that our application is bug-free. It only confirms that the existing test scenarios are working. We can measure the suite's effectiveness through Mutation Testing by intentionally introducing bugs and checking whether our tests detect them. A green test suite is good, but its real value lies in how many actual defects it can catch."

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts` (9 tests), `contract.spec.ts` (5), `e2e.spec.ts` (2), `example.spec.ts` (1), `seed.spec.ts` (1), and the 2 agent tests in `profile-follow/`
- **No fault:** 18 passed, 2 failed (the 2 agent tests failed with no fault, so they are not counted below)
- **F1:** caught (9 tests failed)
- **F2:** caught (5 tests failed)
- **F3:** caught (4 tests failed)
- **F4:** caught (1 test failed: "a signed-in user posts a comment on an article, and the API has it with the right text and author")
- **F5:** stayed green
- **F6:** caught (1 test failed: "a signed-in user posts a comment on an article, and the API has it with the right text and author")

## 3. The weak spot I chose, and why
F4 – Comments list is always empty

Only one test catches this fault. This is a weak spot because if that test breaks or is removed, the fault could go undetected. We should add more tests to verify that comments are displayed correctly.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Claude should add more tests for the comments functionality. Create API tests to verify that comments are displayed correctly and that the comments API returns the correct comment text and author after a signed-in user posts a comment.
- **New or changed test file:** new `tests/comments/comments-api.spec.ts` (2 tests); changed `tests/profile-follow/follow-persists-feed.spec.ts` and `tests/profile-follow/unfollow-persists.spec.ts`; new help files `tests/support/api.ts` and `tests/support/test-config.ts`

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4`
- **No fault:** 22 passed, 0 failed
- **The fault I chose:** F4: caught (3 tests failed: the 2 new comments tests and the end-to-end comment test)

## 6. What changed
"Initially, only 1 test caught the F4 comments defect. After adding more API tests, 3 tests now catch it. All 22 tests pass without faults, and the two agent tests now work with independent users.

This shows that our test suite has improved coverage and is more effective at detecting real defects. A green suite is important, but its ability to catch defects is what truly measures its quality."
