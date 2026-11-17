import { test, expect, APIRequestContext } from '@playwright/test';

// Written from P4/API.md only.

type SignedUpUser = { username: string; email: string; password: string; token: string };

// Sign up a new user (POST /api/users -> 201 User) and return the token.
async function signUp(request: APIRequestContext, prefix: string): Promise<SignedUpUser> {
  const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const username = `${prefix}-${id}`;
  const email = `${prefix}-${id}@example.com`;
  const password = 'password123'; // this app: at least 8 characters

  const response = await request.post('/api/users', {
    data: { user: { username, email, password } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, email, password, token: json.user.token };
}

// Create an article (POST /api/articles -> 201 Article) and return its JSON.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: {
      article: {
        title: `Contract test ${Date.now()}`,
        description: 'Contract test description',
        body: 'Contract test body',
        tagList: ['testing', 'api'],
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article;
}

test.describe('Schema checks', () => {
  test('GET /api/articles/:slug answers with the Article shape', async ({ request }) => {
    const author = await signUp(request, 'schema-author');
    const created = await createArticle(request, author.token);

    const response = await request.get(`/api/articles/${created.slug}`);

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact list of keys: top level, article, author
    expect(Object.keys(json)).toEqual(['article']);
    expect(Object.keys(json.article).sort()).toEqual(
      [
        'author',
        'body',
        'createdAt',
        'description',
        'favorited',
        'favoritesCount',
        'slug',
        'tagList',
        'title',
        'updatedAt',
      ].sort(),
    );
    expect(Object.keys(json.article.author).sort()).toEqual(
      ['bio', 'following', 'image', 'username'].sort(),
    );

    // Required fields and their data types
    expect(json).toMatchObject({
      article: {
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        body: expect.any(String),
        tagList: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
          username: expect.any(String),
          // A new user has bio and image set to null
          bio: null,
          image: null,
          following: expect.any(Boolean),
        },
      },
    });

    // Every tag is text
    for (const tag of json.article.tagList) {
      expect(tag).toEqual(expect.any(String));
    }
  });

  test('GET /api/user answers with the User shape', async ({ request }) => {
    const user = await signUp(request, 'schema-user');

    const response = await request.get('/api/user', {
      headers: { Authorization: `Token ${user.token}` },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact list of keys: top level and user
    expect(Object.keys(json)).toEqual(['user']);
    expect(Object.keys(json.user).sort()).toEqual(
      ['bio', 'email', 'image', 'token', 'username'].sort(),
    );

    // Required fields and their data types
    expect(json).toMatchObject({
      user: {
        email: expect.any(String),
        token: expect.any(String),
        username: expect.any(String),
        // A new user has bio and image set to null
        bio: null,
        image: null,
      },
    });
  });
});

test.describe('Auth checks', () => {
  test('GET /api/user without a token gives 401 "token is missing"', async ({ request }) => {
    const response = await request.get('/api/user');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
  });

  test('GET /api/user with a wrong token gives 401 "token is invalid"', async ({ request }) => {
    const response = await request.get('/api/user', {
      headers: { Authorization: 'Token this-is-not-a-real-token' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
  });

  test("PUT /api/articles/:slug on someone else's article gives 403 and changes nothing", async ({
    request,
  }) => {
    const author = await signUp(request, 'auth-author');
    const otherUser = await signUp(request, 'auth-other');
    const created = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${created.slug}`, {
      headers: { Authorization: `Token ${otherUser.token}` },
      data: { article: { body: 'Changed by someone else' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    // The article stays as it was
    const after = await request.get(`/api/articles/${created.slug}`);
    expect(after.status()).toBe(200);
    const afterJson = await after.json();
    expect(afterJson.article.body).toBe('Contract test body');
  });
});
