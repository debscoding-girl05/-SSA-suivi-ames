// Auth API integration tests — Node built-in test runner (node:test).
// Drives the real Express app over HTTP on an ephemeral port (port 0)
// using global fetch. No supertest dependency.
//
// Force the in-memory DB backend BEFORE any source module is required,
// since `src/config/env` reads DATABASE_URL once at load time.
delete process.env.DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const createApp = require("../src/app");
const { seed } = require("../src/db/seed");

let server;
let baseUrl;

before(async () => {
  // Seed demo users so login works.
  await seed({ silent: true });

  const app = createApp();
  // Ephemeral port — never collide with other running servers.
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Small helper around fetch returning { status, body }.
async function api(method, path, { token, json } = {}) {
  const headers = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  // 204 has no body.
  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

test("GET /health → 200, status ok, memory backend", async () => {
  const { status, body } = await api("GET", "/health");
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.database.backend, "memory");
});

test("POST /api/auth/login (valid admin) → 200, token + admin user, no passwordHash", async () => {
  const { status, body } = await api("POST", "/api/auth/login", {
    json: { email: "admin@ssa.app", password: "admin1234" },
  });
  assert.equal(status, 200);
  assert.equal(typeof body.token, "string");
  assert.ok(body.token.length > 0, "token should be a non-empty string");
  assert.ok(body.user, "response should include a user object");
  assert.equal(body.user.role, "admin");
  assert.equal(body.user.email, "admin@ssa.app");
  assert.ok(
    !("passwordHash" in body.user),
    "user must NOT expose passwordHash"
  );
});

test("POST /api/auth/login (wrong password) → 401 UNAUTHORIZED", async () => {
  const { status, body } = await api("POST", "/api/auth/login", {
    json: { email: "admin@ssa.app", password: "wrong-password" },
  });
  assert.equal(status, 401);
  assert.equal(body.code, "UNAUTHORIZED");
});

test("POST /api/auth/login (missing fields) → 400 BAD_REQUEST", async () => {
  const { status, body } = await api("POST", "/api/auth/login", {
    json: { email: "admin@ssa.app" },
  });
  assert.equal(status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});

test("GET /api/auth/me (no Authorization header) → 401", async () => {
  const { status } = await api("GET", "/api/auth/me");
  assert.equal(status, 401);
});

test("GET /api/auth/me (valid token) → 200, correct email", async () => {
  const login = await api("POST", "/api/auth/login", {
    json: { email: "admin@ssa.app", password: "admin1234" },
  });
  assert.equal(login.status, 200);
  const token = login.body.token;

  const { status, body } = await api("GET", "/api/auth/me", { token });
  assert.equal(status, 200);
  assert.equal(body.user.email, "admin@ssa.app");
});

test("POST /api/auth/logout → 204", async () => {
  const { status, body } = await api("POST", "/api/auth/logout");
  assert.equal(status, 204);
  assert.equal(body, null, "204 should have no body");
});

test("GET unknown route → 404 NOT_FOUND", async () => {
  const { status, body } = await api("GET", "/api/does-not-exist");
  assert.equal(status, 404);
  assert.equal(body.code, "NOT_FOUND");
});
