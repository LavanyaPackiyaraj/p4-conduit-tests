import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// End-to-end tests for the Conduit practice app: API and page together.
// Each test makes its own user with the API, gives the page that user's token,
// does the journey in the page, and checks the result with the API at the end.
// Labels and button names come from P4/app/public/app.js. API rules come from P4/API.md.

// A unique text for each user, article and comment, so tests do not clash.
function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

// POST /api/users: signs up a new user and returns its username and token.
async function signUp(request: APIRequestContext, prefix: string) {
  const id = unique();
  const username = `${prefix}${id}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${prefix}${id}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

// The page keeps the sign-in token in localStorage, key "jwtToken".
// This puts the token there before any page script runs, so the page starts signed in.
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
}

// What a test leaves behind. Each test fills this in as soon as it knows the user,
// so test.afterEach can remove it even when a check in the test fails.
let articlesToRemove: { username: string; token: string } | null = null;
let commentsToRemove: { username: string; token: string; slug: string } | null = null;

test.afterEach(async ({ request }) => {
  const articles = articlesToRemove;
  const comments = commentsToRemove;
  articlesToRemove = null;
  commentsToRemove = null;

  // Comment test: remove every comment by the reader on the article (DELETE /api/articles/:slug/comments/:id, comment author only, 204).
  // This runs before the articles are removed, while the article still exists.
  if (comments) {
    const listResponse = await request.get(`/api/articles/${encodeURIComponent(comments.slug)}/comments`);
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    for (const c of list.comments) {
      if (c.author.username !== comments.username) continue;
      const response = await request.delete(`/api/articles/${encodeURIComponent(comments.slug)}/comments/${c.id}`, {
        headers: auth(comments.token),
      });
      expect(response.status()).toBe(204);
    }
  }

  // Both tests: remove every article by the user who wrote it (DELETE /api/articles/:slug, author only, 204).
  // Publish test: the writer's article. Comment test: the author's article.
  if (articles) {
    const listResponse = await request.get(`/api/articles?author=${encodeURIComponent(articles.username)}`);
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    for (const a of list.articles) {
      const response = await request.delete(`/api/articles/${encodeURIComponent(a.slug)}`, { headers: auth(articles.token) });
      expect(response.status()).toBe(204);
    }
  }
});

test('a signed-in user publishes a new article in the editor, and the API has it with the right title and content', async ({ page, request }) => {
  // Arrange: a new user, signed in on the page.
  const user = await signUp(request, 'writer');
  articlesToRemove = { username: user.username, token: user.token };
  await signInPage(page, user.token);
  const id = unique();
  const article = {
    title: `E2E article ${id}`,
    description: 'An article made by a Playwright end-to-end test',
    body: `This is the body of the end-to-end article ${id}.`,
    tags: 'e2e, testing',
  };

  // Act: write and publish the article in the editor.
  await page.goto('/editor');
  await expect(page.getByRole('heading', { level: 1, name: 'New Article' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(article.title);
  await page.getByRole('textbox', { name: "What's this article about?" }).fill(article.description);
  await page.getByRole('textbox', { name: 'Write your article' }).fill(article.body);
  await page.getByRole('textbox', { name: 'Tags' }).fill(article.tags);
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // The page opens the new article: its title is the main heading, and its body is shown.
  await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
  await expect(page.getByText(article.body, { exact: true })).toBeVisible();

  // Assert with the API: this user has exactly one article, the one just published.
  const listResponse = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}`);
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  expect(list.articlesCount).toBe(1);
  expect(list.articles).toHaveLength(1);
  const slug = list.articles[0].slug as string;

  // The page is on that article's address.
  expect(new URL(page.url()).pathname).toBe(`/article/${encodeURIComponent(slug)}`);

  // Read the article (the list has no body): the title and content were saved as typed.
  const readResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}`, { headers: auth(user.token) });
  expect(readResponse.status()).toBe(200);
  const saved = await readResponse.json();
  expect(saved.article).toMatchObject({
    slug,
    title: article.title,
    description: article.description,
    body: article.body,
    // The editor splits the tags at the commas; API.md: tags keep the order they were sent in.
    tagList: ['e2e', 'testing'],
    author: { username: user.username },
  });
});

test('a signed-in user posts a comment on an article, and the API has it with the right text and author', async ({ page, request }) => {
  // Arrange: an author makes an article with the API; a second user (the reader) is signed in on the page.
  const author = await signUp(request, 'author');
  articlesToRemove = { username: author.username, token: author.token };
  const reader = await signUp(request, 'reader');
  const id = unique();
  const createResponse = await request.post('/api/articles', {
    headers: auth(author.token),
    data: {
      article: {
        title: `E2E comment article ${id}`,
        description: 'An article to comment on',
        body: 'This article is here so a test can comment on it.',
      },
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  const slug = created.article.slug as string;
  const title = created.article.title as string;
  commentsToRemove = { username: reader.username, token: reader.token, slug };
  await signInPage(page, reader.token);
  const commentText = `E2E comment ${id}`;

  // Act: open the article and post a comment.
  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.getByRole('textbox', { name: 'Write a comment' }).fill(commentText);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  // The page shows the comment, with the reader's name next to it.
  const shownComment = page.getByRole('listitem').filter({ hasText: commentText });
  await expect(shownComment).toBeVisible();
  await expect(shownComment.getByRole('link', { name: reader.username })).toBeVisible();

  // Assert with the API: the article has exactly one comment, with the right text and author.
  const commentsResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(commentsResponse.status()).toBe(200);
  const json = await commentsResponse.json();
  expect(json.comments).toHaveLength(1);
  expect(json.comments[0]).toMatchObject({
    body: commentText,
    author: { username: reader.username },
  });
});
