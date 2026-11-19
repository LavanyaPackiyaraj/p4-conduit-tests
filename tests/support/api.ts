import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { TEST_USER } from './test-config';

// API helpers for tests that make their own users and data, and clean up after.
// Every request uses a path that starts with /api, so it goes to baseURL from playwright.config.ts.
// API rules come from P4/API.md.

export type TestUser = { username: string; token: string };

// A unique text for each user, article and comment, so tests do not clash.
export function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

// Signed-in requests send the header Authorization: Token <token>.
export function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

// POST /api/users: signs up a new user (201) and returns its username and token.
export async function signUp(request: APIRequestContext, prefix: string): Promise<TestUser> {
  const id = unique();
  const username = `${prefix}${id}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${prefix}${id}@${TEST_USER.emailDomain}`, password: TEST_USER.password } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

// POST /api/articles: the user makes an article (201). Returns its slug and title.
export async function createArticle(request: APIRequestContext, user: TestUser, titlePrefix: string) {
  const id = unique();
  const response = await request.post('/api/articles', {
    headers: auth(user.token),
    data: {
      article: {
        title: `${titlePrefix} ${id}`,
        description: 'An article made by a Playwright test',
        body: `This article is here for a test (${id}).`,
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { slug: json.article.slug as string, title: json.article.title as string };
}

// The page keeps the sign-in token in localStorage, key "jwtToken" (as in tests/e2e.spec.ts).
// This puts the token there before any page script runs, so the page starts signed in.
export async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
}

// Clean-up: if `follower` follows `username`, unfollow (DELETE /api/profiles/:username/follow, 200).
export async function unfollowIfFollowing(request: APIRequestContext, follower: TestUser, username: string) {
  const path = `/api/profiles/${encodeURIComponent(username)}`;
  const profileResponse = await request.get(path, { headers: auth(follower.token) });
  expect(profileResponse.status()).toBe(200);
  const profile = await profileResponse.json();
  if (profile.profile.following) {
    const response = await request.delete(`${path}/follow`, { headers: auth(follower.token) });
    expect(response.status()).toBe(200);
  }
}

// Clean-up: remove every comment by `user` on the article (DELETE /api/articles/:slug/comments/:id, 204).
// Call this before the article is removed, while the article still exists.
export async function removeCommentsBy(request: APIRequestContext, user: TestUser, slug: string) {
  const listResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  for (const c of list.comments) {
    if (c.author.username !== user.username) continue;
    const response = await request.delete(`/api/articles/${encodeURIComponent(slug)}/comments/${c.id}`, {
      headers: auth(user.token),
    });
    expect(response.status()).toBe(204);
  }
}

// Clean-up: remove every article by `user` (DELETE /api/articles/:slug, author only, 204).
export async function removeArticlesBy(request: APIRequestContext, user: TestUser) {
  const listResponse = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}`);
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  for (const a of list.articles) {
    const response = await request.delete(`/api/articles/${encodeURIComponent(a.slug)}`, { headers: auth(user.token) });
    expect(response.status()).toBe(204);
  }
}
