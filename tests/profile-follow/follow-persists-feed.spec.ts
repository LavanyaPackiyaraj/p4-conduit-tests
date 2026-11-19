// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import {
  auth,
  createArticle,
  removeArticlesBy,
  signInPage,
  signUp,
  unfollowIfFollowing,
  type TestUser,
} from '../support/api';

// This test makes its own author and reader with the API, so it does not touch
// the shared practice users. test.afterEach removes what it made, even when a check fails.
let author: TestUser | null = null;
let reader: TestUser | null = null;

test.afterEach(async ({ request }) => {
  const a = author;
  const r = reader;
  author = null;
  reader = null;
  if (a && r) await unfollowIfFollowing(request, r, a.username);
  if (a) await removeArticlesBy(request, a);
});

test.describe('Profile follow', () => {
  test("Follow persists after reload and the author's article appears in Your Feed", async ({ page, request }) => {
    // Arrange: a new author with one article, and a new reader who follows nobody, signed in on the page.
    author = await signUp(request, 'author');
    const article = await createArticle(request, author, 'Follow feed article');
    reader = await signUp(request, 'reader');
    await signInPage(page, reader.token);

    const followButton = page.getByRole('button', { name: `Follow ${author.username}`, exact: true });
    const unfollowButton = page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true });

    // 1. Open the author's profile: the reader does not follow the author yet.
    await page.goto(`/profile/${encodeURIComponent(author.username)}`);
    await expect(followButton).toBeVisible();

    // 2. Follow the author.
    await followButton.click();
    await expect(unfollowButton).toBeVisible();

    // 3. Reload: the follow is kept.
    await page.reload();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // The API agrees: following is true for the reader.
    const profileResponse = await request.get(`/api/profiles/${encodeURIComponent(author.username)}`, {
      headers: auth(reader.token),
    });
    expect(profileResponse.status()).toBe(200);
    expect((await profileResponse.json()).profile.following).toBe(true);

    // 4. Your Feed shows the author's one article, by the author.
    await page.goto('/?feed=yours');
    const articles = page.getByRole('article');
    await expect(articles).toHaveCount(1);
    await expect(articles.getByRole('link', { name: article.title })).toBeVisible();
    await expect(articles.getByRole('link', { name: author.username })).toBeVisible();
    await expect(page.getByText('No articles are here... yet.')).toHaveCount(0);
  });
});
