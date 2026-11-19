import { test, expect } from '@playwright/test';
import {
  auth,
  createArticle,
  removeArticlesBy,
  removeCommentsBy,
  signUp,
  unique,
  type TestUser,
} from '../support/api';

// API tests for comments. Rules come from P4/API.md, section "Comments".
// Each test makes its own users and article with the API, and test.afterEach removes
// the comments first (while the article still exists), then the article.
let author: TestUser | null = null;
let slug: string | null = null;
let commenters: TestUser[] = [];

test.afterEach(async ({ request }) => {
  const a = author;
  const s = slug;
  const cs = commenters;
  author = null;
  slug = null;
  commenters = [];
  if (s) {
    for (const c of cs) await removeCommentsBy(request, c, s);
  }
  if (a) await removeArticlesBy(request, a);
});

test.describe('Comments API', () => {
  test('a signed-in user posts a comment, and the comments API returns it with the right text and author', async ({ request }) => {
    // Arrange: an author with an article, and a second user (the reader).
    author = await signUp(request, 'author');
    const article = await createArticle(request, author, 'Comment API article');
    slug = article.slug;
    const reader = await signUp(request, 'reader');
    commenters.push(reader);
    const commentText = `API comment ${unique()}`;

    // Act: the reader posts a comment (POST /api/articles/:slug/comments, 201).
    const postResponse = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
      headers: auth(reader.token),
      data: { comment: { body: commentText } },
    });
    expect(postResponse.status()).toBe(201);
    const posted = (await postResponse.json()).comment;
    expect(posted).toMatchObject({ body: commentText, author: { username: reader.username } });

    // Assert: GET /api/articles/:slug/comments (200) has exactly that one comment.
    const listResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    expect(list.comments).toHaveLength(1);
    const comment = list.comments[0];
    // Comment: {"id","createdAt","updatedAt","body","author"}; author is a Profile.
    expect(comment).toMatchObject({
      id: posted.id,
      body: commentText,
      author: { username: reader.username },
    });
    expect(comment.author).toHaveProperty('bio');
    expect(comment.author).toHaveProperty('image');
    expect(comment.author).toHaveProperty('following');
    // Dates are ISO 8601 text.
    expect(typeof comment.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(comment.createdAt))).toBe(false);
    expect(typeof comment.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(comment.updatedAt))).toBe(false);
  });

  test('comments by two users are listed oldest first, each with the right text and author, without a token', async ({ request }) => {
    // Arrange: an author with an article, and two readers.
    author = await signUp(request, 'author');
    const article = await createArticle(request, author, 'Comment list article');
    slug = article.slug;
    const firstReader = await signUp(request, 'readerone');
    const secondReader = await signUp(request, 'readertwo');
    commenters.push(firstReader, secondReader);
    const id = unique();
    const firstText = `First comment ${id}`;
    const secondText = `Second comment ${id}`;

    // Act: the first reader comments, then the second reader comments.
    for (const [user, body] of [
      [firstReader, firstText],
      [secondReader, secondText],
    ] as const) {
      const response = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        headers: auth(user.token),
        data: { comment: { body } },
      });
      expect(response.status()).toBe(201);
    }

    // Assert: the list (token is optional; none sent) has both comments,
    // oldest first (this app), each with its own text and author.
    const listResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    expect(list.comments).toHaveLength(2);
    expect(list.comments[0]).toMatchObject({ body: firstText, author: { username: firstReader.username } });
    expect(list.comments[1]).toMatchObject({ body: secondText, author: { username: secondReader.username } });
  });
});
