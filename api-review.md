# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- POST method and 201 Created

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 Created. Body contains a comment object with the submitted body: "Clear and useful." The app answered 201, {"comment":{"id":5,"body":"Clear and useful.","author":{"username":"practice-reader",...}}}
- **B** (the same comment, with no token): I predicted 401 Unauthorized. Body contains {"errors":{"token":["is missing"]}} The app answered 401, {"errors":{"token":["is missing"]}}
- **C** (a comment on an article that does not exist): I predicted 404 Not Found. Body contains {"errors":{"article":["not found"]}} The app answered 404, {"errors":{"article":["not found"]}}

The answer that surprised me: B surprised me. The app returned 401 Unauthorized because the endpoint requires an authentication token, and the request did not include one. The error message clearly identifies the missing token.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check both the HTTP status code and the response body, including the expected article fields and values.
```

## 4. The run
- **Result:** 9 tests: 8 passed, 1 failed.
- **A red test, and who is wrong** (only if a test failed):
  - Test: "the author can change the body and description, and the other fields stay the same"
  - Expected: `tagList` ["testing", "api"]. Received: `tagList` [].
  - API.md says: "Updating: every field is optional. A field you do not send stays as it was."
  - My answer: The app is wrong, not the test. API.md says omitted fields must retain their values, but the app removed the existing tags. Keep the test and report the defect.
- **My note** (only if I kept a red test with `test.fail()`): The app removes existing tags when updating an article, but API.md says omitted fields must retain their values.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "creating an article without a title gives 422 "title can't be blank""
- **My answer:** No. It proves only that the app returned the correct 422 error. We need an additional check to confirm that no article was saved.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "creating an article without a token gives 401 "token is missing""
- **My decision:** Keep the test. It correctly checks that an unauthenticated request returns 401 with the expected error message. However, add a GET check to confirm that no article was created.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check both the status code and response body to confirm the API returns the expected result.
2. Verify the actual response values, not just whether the fields exist.
3. For negative tests, verify that no data was saved by making a GET request after the failed operation.
