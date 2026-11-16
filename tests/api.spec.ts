import { test, expect, type APIRequestContext } from '@playwright/test';

// Article tests for the Conduit API. Every expected value comes from P4/API.md.
// Each test signs up its own user and creates its own article, so no test depends on another.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// A unique text for each user and article, so tests do not clash.
function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

// POST /api/users: signs up a new user and returns its username and token.
async function signUp(request: APIRequestContext) {
  const id = unique();
  const username = `author${id}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `author${id}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

// The article each test creates.
function newArticle() {
  const id = unique();
  return {
    title: `API test article ${id}`,
    // ASSUMPTION: the slug is the title in lower case with dashes, like API.md's example "my-title".
    slug: `api-test-article-${id}`,
    description: 'An article made by a Playwright API test',
    body: 'This is the body of the article.',
    tagList: ['testing', 'api'],
  };
}

// POST /api/articles: creates the article and returns its slug.
async function createArticle(request: APIRequestContext, token: string, article: ReturnType<typeof newArticle>) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: {
      article: {
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tagList,
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article.slug as string;
}

// --- Positive tests ---

test('a signed-in user can create an article and gets 201 with all its fields', async ({ request }) => {
  const user = await signUp(request);
  const article = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(user.token),
    data: {
      article: {
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tagList,
      },
    },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.article).toEqual({
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: ['testing', 'api'],
    createdAt: expect.stringMatching(ISO_DATE),
    updatedAt: expect.stringMatching(ISO_DATE),
    favorited: false,
    favoritesCount: 0,
    author: { username: user.username, bio: null, image: null, following: false },
  });
});

test('anyone can read an article by its slug and gets 200 with the saved fields', async ({ request }) => {
  const user = await signUp(request);
  const article = newArticle();
  const slug = await createArticle(request, user.token, article);

  // No token: reading an article does not need one.
  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article).toEqual({
    slug,
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: ['testing', 'api'],
    createdAt: expect.stringMatching(ISO_DATE),
    updatedAt: expect.stringMatching(ISO_DATE),
    favorited: false,
    favoritesCount: 0,
    author: { username: user.username, bio: null, image: null, following: false },
  });
});

test('the author can change the body and description, and the other fields stay the same', async ({ request }) => {
  // The app removes existing tags when updating an article, but API.md says omitted fields must retain their values.
  test.fail();
  const user = await signUp(request);
  const article = newArticle();
  const slug = await createArticle(request, user.token, article);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(user.token),
    data: { article: { description: 'A changed description', body: 'A changed body.' } },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article).toMatchObject({
    slug, // The title did not change, so the slug stays the same.
    title: article.title,
    description: 'A changed description',
    body: 'A changed body.',
    tagList: ['testing', 'api'],
    author: { username: user.username },
  });

  // Read it again: the change was saved.
  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  const saved = await readBack.json();
  expect(saved.article.description).toBe('A changed description');
  expect(saved.article.body).toBe('A changed body.');
});

test('the author can delete an article: 204 with no body, then reading it gives 404', async ({ request }) => {
  const user = await signUp(request);
  const slug = await createArticle(request, user.token, newArticle());

  const response = await request.delete(`/api/articles/${slug}`, { headers: auth(user.token) });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe('');

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(404);
  expect(await readBack.json()).toEqual({ errors: { article: ['not found'] } });
});

// --- Negative tests ---

test('creating an article without a token gives 401 "token is missing"', async ({ request }) => {
  const article = newArticle();

  const response = await request.post('/api/articles', {
    data: { article: { title: article.title, description: article.description, body: article.body } },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('creating an article without a title gives 422 "title can\'t be blank"', async ({ request }) => {
  const user = await signUp(request);
  const article = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(user.token),
    data: { article: { description: article.description, body: article.body } },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
});

test('reading an article that does not exist gives 404 "article not found"', async ({ request }) => {
  const response = await request.get(`/api/articles/no-such-article-${unique()}`);

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});

test('another user cannot change the article: 403 "article forbidden", and the article stays the same', async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const article = newArticle();
  const slug = await createArticle(request, author.token, article);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(other.token),
    data: { article: { body: 'Changed by someone else.' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  const saved = await readBack.json();
  expect(saved.article.body).toBe(article.body);
});

test('deleting an article with a wrong token gives 401 "token is invalid", and the article is still there', async ({ request }) => {
  const user = await signUp(request);
  const article = newArticle();
  const slug = await createArticle(request, user.token, article);

  const response = await request.delete(`/api/articles/${slug}`, { headers: auth('not-a-real-token') });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  const saved = await readBack.json();
  expect(saved.article.title).toBe(article.title);
});
