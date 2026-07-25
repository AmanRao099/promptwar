import "@testing-library/jest-dom/vitest";

// A provider key must exist for env validation to pass. Route tests stub the
// actual network call (see tests/routes.test.ts); this only satisfies getEnv().
process.env.GROQ_API_KEY ||= "gsk_test_key";
