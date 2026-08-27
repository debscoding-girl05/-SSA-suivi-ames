// Annuaire (directory of assignés) — pagination and RBAC scope.
// At real scale (thousands of souls tracked) this endpoint MUST be
// paginated: an unpaginated list would ship a huge payload and render
// thousands of DOM nodes on a phone every time someone searches.
delete process.env.DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const createApp = require("../src/app");
const { seed } = require("../src/db/seed");

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

async function findDirigeantByEmail(token, email) {
  const local = email.split("@")[0];
  const { body } = await api("GET", `/api/dirigeants?search=${encodeURIComponent(local)}`, token);
  const match = body.data.find((d) => d.email === email);
  assert.ok(match, `dirigeant ${email} should be findable`);
  return match;
}

test("1. GET /api/annuaire is paginated: default page size, total count, no full dump", async () => {
  const pasteurTok = await login("pasteur@ssa.app", "pasteur1234");
  const jean = await findDirigeantByEmail(pasteurTok, "encadreur@ssa.app");

  // Seed 5 extra assignés under Jean so we have enough rows to paginate through.
  for (let i = 0; i < 5; i += 1) {
    const created = await api("POST", `/api/dirigeants/${jean.id}/assignes`, pasteurTok, {
      firstName: `Pagination${i}`, lastName: "Test",
    });
    assert.equal(created.status, 201);
  }

  const page1 = await api("GET", "/api/annuaire?pageSize=2&page=1", pasteurTok);
  assert.equal(page1.status, 200);
  assert.equal(page1.body.data.length, 2, "page size is respected");
  assert.equal(page1.body.page, 1);
  assert.equal(page1.body.pageSize, 2);
  assert.ok(page1.body.total >= 5, `total should count every match, not just this page (got ${page1.body.total})`);

  const page2 = await api("GET", "/api/annuaire?pageSize=2&page=2", pasteurTok);
  assert.equal(page2.status, 200);
  const ids1 = page1.body.data.map((r) => r.id);
  const ids2 = page2.body.data.map((r) => r.id);
  assert.equal(new Set([...ids1, ...ids2]).size, ids1.length + ids2.length, "page 2 must not repeat page 1's rows");

  // pageSize is capped server-side (defensive against ?pageSize=999999).
  const huge = await api("GET", "/api/annuaire?pageSize=999999", pasteurTok);
  assert.ok(huge.body.pageSize <= 100, "pageSize must be capped");
});

test("2. GET /api/annuaire scope: encadreur only sees his own assignés", async () => {
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");
  const { body } = await api("GET", "/api/annuaire?pageSize=100", jeanTok);
  assert.ok(body.data.length > 0, "Jean should see at least his own assignés");
  assert.ok(body.data.every((r) => r.dirigeantName === "Jean Mballa"), "every row must belong to Jean, not other encadreurs");
});
