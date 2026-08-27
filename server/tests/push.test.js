// Web Push subscriptions — public key, subscribe, unsubscribe, and the
// notification digest job running safely with push wired in (even when
// VAPID isn't configured, which is the default in this test environment).
delete process.env.DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const createApp = require("../src/app");
const { seed } = require("../src/db/seed");
const { runNotificationDigest } = require("../src/jobs/notificationDigest");

let server;
let baseUrl;

before(async () => {
  await seed({ silent: true });
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function api(method, path, token, json) {
  const headers = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: res.status, body };
}

async function login(identifier, password) {
  const { status, body } = await api("POST", "/api/auth/login", undefined, { identifier, password });
  assert.equal(status, 200, `login should succeed for ${identifier}`);
  return body.token;
}

test("1. GET /api/push/public-key — public, reports not configured (no VAPID env in tests)", async () => {
  const { status, body } = await api("GET", "/api/push/public-key");
  assert.equal(status, 200);
  assert.equal(body.configured, false);
});

test("2. POST /api/push/subscribe requires auth + a valid subscription shape", async () => {
  const noAuth = await api("POST", "/api/push/subscribe", undefined, { endpoint: "https://example.com/x", keys: { p256dh: "a", auth: "b" } });
  assert.equal(noAuth.status, 401);

  const tok = await login("encadreur@ssa.app", "encadreur1234");
  const missingKeys = await api("POST", "/api/push/subscribe", tok, { endpoint: "https://example.com/x" });
  assert.equal(missingKeys.status, 400);

  const ok = await api("POST", "/api/push/subscribe", tok, {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    keys: { p256dh: "fake-p256dh", auth: "fake-auth" },
  });
  assert.equal(ok.status, 201);

  // Unsubscribe cleans it up.
  const un = await api("POST", "/api/push/unsubscribe", tok, { endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint" });
  assert.equal(un.status, 204);
});

test("3. Notification digest runs cleanly with push wired in but unconfigured (no VAPID)", async () => {
  const result = await runNotificationDigest();
  assert.equal(typeof result.checked, "number");
  assert.equal(typeof result.emailsSent, "number");
  assert.equal(typeof result.pushSent, "number");
  assert.equal(result.pushSent, 0, "no VAPID configured in tests -> push always skipped, never throws");
});
