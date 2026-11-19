# Profile page and following an author

## Application Overview

Conduit practice app at http://127.0.0.1:3000. Profile page /profile/practice-author shows the heading, bio "I write about testing and quality.", a follow button (only when signed in as another user) and the author's 7 articles. Observed: with fresh data, practice-reader already follows practice-author. Signed out, no follow button is shown. Sign-in form fields: textbox "Email", textbox "Password", button "Sign in". Sign in with practice-reader@example.com / Practice123. Data persists until the app restarts.

## Test Scenarios

### 1. Profile follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Unfollow persists after reload and empties Your Feed

**File:** `tests/profile-follow/unfollow-persists.spec.ts`

**Steps:**
  1. Starting state: fresh app data (practice-reader follows practice-author), signed out. Open /login, fill textbox 'Email' with practice-reader@example.com and textbox 'Password' with Practice123, click button 'Sign in'.
    - expect: Redirected to / with nav link 'practice-reader' visible.
  2. Open /profile/practice-author, then click button 'Unfollow practice-author'.
    - expect: Before the click the button 'Unfollow practice-author' is visible.
    - expect: After the click button 'Follow practice-author' is visible and 'Unfollow practice-author' is not.
  3. Reload /profile/practice-author.
    - expect: Button 'Follow practice-author' is still visible (state persisted); 'Unfollow practice-author' is absent.
  4. Open /?feed=yours (link 'Your Feed' on Home).
    - expect: Text 'No articles are here... yet.' is shown and no article by practice-author appears.
  5. Clean-up: open /profile/practice-author and click button 'Follow practice-author'.
    - expect: Button 'Unfollow practice-author' is visible again (fresh state restored).

#### 1.2. Follow persists after reload and author's articles appear in Your Feed

**File:** `tests/profile-follow/follow-persists-feed.spec.ts`

**Steps:**
  1. Starting state: fresh app data, signed out. Sign in as practice-reader (same fields as scenario 1), open /profile/practice-author. Set-up: because the reader already follows the author, click button 'Unfollow practice-author' and confirm button 'Follow practice-author' appears.
    - expect: Button 'Follow practice-author' is visible.
  2. Click button 'Follow practice-author'.
    - expect: Button changes to 'Unfollow practice-author'.
  3. Reload /profile/practice-author.
    - expect: Button 'Unfollow practice-author' is still visible after reload.
  4. Open /?feed=yours.
    - expect: Your Feed lists 7 articles, all by practice-author, including 'Your first end-to-end test', 'Boundary values in practice', 'Accessible names and locators', 'Exploratory testing in 30 minutes', 'Why tests become flaky', 'Five checks before a release', 'How to write a good bug report'.
    - expect: 'No articles are here... yet.' is not shown.
  5. Clean-up: none needed, the end state equals the fresh state (reader follows author).
    - expect: Scenario can be repeated.
