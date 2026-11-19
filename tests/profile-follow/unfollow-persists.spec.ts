// spec: Profile follow
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
// the shared practice users. Page addresses are relative: they use baseURL from playwright.config.ts.
// test.afterEach removes what the test made, even when a check fails.
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
  test('Unfollow persists after reload and empties Your Feed', async ({ page, request }) => {
    // Arrange: a new author with one article, and a new reader who follows the author (API), signed in on the page.
    author = await signUp(request, 'author');
    await createArticle(request, author, 'Unfollow feed article');
    reader = await signUp(request, 'reader');
    const followResponse = await request.post(`/api/profiles/${encodeURIComponent(author.username)}/follow`, {
      headers: auth(reader.token),
    });
    expect(followResponse.status()).toBe(200);
    expect((await followResponse.json()).profile.following).toBe(true);

    // Before the unfollow, the reader's feed has the author's article, so an empty feed later means something.
    const feedBefore = await request.get('/api/articles/feed', { headers: auth(reader.token) });
    expect(feedBefore.status()).toBe(200);
    expect((await feedBefore.json()).articlesCount).toBe(1);

    await signInPage(page, reader.token);
    const followButton = page.getByRole('button', { name: `Follow ${author.username}`, exact: true });
    const unfollowButton = page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true });

    // 1. Open the author's profile, then unfollow.
    await page.goto(`/profile/${encodeURIComponent(author.username)}`);
    await expect(unfollowButton).toBeVisible();
    await unfollowButton.click();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    // 2. Reload: the unfollow is kept.
    await page.reload();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    // The API agrees: following is false for the reader.
    const profileResponse = await request.get(`/api/profiles/${encodeURIComponent(author.username)}`, {
      headers: auth(reader.token),
    });
    expect(profileResponse.status()).toBe(200);
    expect((await profileResponse.json()).profile.following).toBe(false);

    // 3. Your Feed is empty.
    await page.goto('/?feed=yours');
    await expect(page.getByText('No articles are here... yet.')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });
});
