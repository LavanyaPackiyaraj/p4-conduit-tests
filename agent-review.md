# Tests from Playwright's agents, and my review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-19

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there. (The agents first stopped with "Playwright Test did not expect test.describe() to be called here"; they ran after I started Claude with `cd C:\qa-ai-coach\portfolio\P4`.)

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Each test must verify the actual outcome of the action, not just that the button was clicked or a success message appeared.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios, 5 steps each)
- **The test files the generator wrote:** `tests/profile-follow/unfollow-persists.spec.ts`, `tests/profile-follow/follow-persists-feed.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says the data is back in its starting state. So we can keep this test in our suite as it is, right?"
- **My answer:** "Not necessarily. The `finally` block restores the follow relationship, but it doesn't verify that the follow actually persists after a page reload. We should check persistence explicitly before keeping this test in the suite."
- "Follow persists after reload and author's articles appear in Your Feed" · **changed**, because: The test checks useful functionality (following an author and verifying persistence after reload), but it modifies a shared practice user's data. It should create its own test user through the API to avoid affecting other tests or teammates' data.
- "Unfollow persists after reload and empties Your Feed" · **changed**, because: The test verifies useful functionality: unfollowing an author, persistence after reload, and checking that Your Feed becomes empty. However: it modifies the shared `practice-reader` account; it should create its own test user through the API; it hardcodes `BASE_URL` instead of using the Playwright configuration; test credentials should be stored in a reusable configuration file. The test is worth keeping after these changes.
- In my first fault run, both tests failed with no fault on. Run alone, the unfollow test failed at line 24: `expect(unfollowButton).toBeVisible()`, element(s) not found (the shared practice-reader did not follow practice-author at the start).

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/follow-persists-feed.spec.ts: Changed - The test checks useful functionality (following an author and verifying persistence after reload), but it modifies a shared practice user's data. It should create its own test user through the API to avoid affecting other tests or teammates' data. In @P4/tests/profile-follow/unfollow-persists.spec.ts: Changed. It modifies the shared `practice-reader` account. It should create its own test user through the API. It hardcodes `BASE_URL` instead of using the Playwright configuration. Test credentials should be stored in a reusable configuration file.
- **Result:** No fault: 22 passed, 0 failed (my second fault run). Both agent tests pass, with their own users made by API.
