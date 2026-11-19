// Test data settings shared by the tests that make their own users.
// Change a value here, and every test that uses it picks it up.
// The address of the app is not here: it is baseURL in playwright.config.ts.

export const TEST_USER = {
  // API.md, this app's rules: passwords need at least 8 characters.
  password: 'password123',
  // Every test user gets a unique email at this domain.
  emailDomain: 'example.com',
};
