// Members + Departments API integration tests — Node built-in test runner.
// Drives the real Express app over HTTP on an ephemeral port (port 0) using
// global fetch. No external dependencies.
//
// Force the in-memory DB backend BEFORE any source module is required, since
// `src/config/env` reads DATABASE_URL once at load time.
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
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Generic fetch wrapper returning { status, body }.
async function api(method, path, token, body) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

// Logs in and returns the JWT token.
async function login(email, password) {
  const { status, body } = await api("POST", "/api/auth/login", undefined, {
    email,
    password,
  });
  assert.equal(status, 200, `login failed for ${email}: ${JSON.stringify(body)}`);
  assert.equal(typeof body.token, "string");
  return body.token;
}

// 1. GET /api/departments (as admin) → 200, returns 5 departments.
test("GET /api/departments (admin) → 200, 5 departments", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("GET", "/api/departments", token);
  assert.equal(status, 200);
  // Controller returns an envelope: { data: [...] }.
  assert.ok(Array.isArray(body.data), "body.data should be an array");
  assert.equal(body.data.length, 5);
});

// 2. GET /api/members (as admin) → 200, paginated envelope, total === 8.
test("GET /api/members (admin) → 200, envelope + total 8", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("GET", "/api/members", token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data), "body.data should be an array");
  assert.equal(typeof body.total, "number");
  assert.equal(typeof body.page, "number");
  assert.equal(typeof body.limit, "number");
  assert.equal(body.total, 8);
});

// 3. Pagination: GET /api/members?limit=3 → data.length === 3, total === 8.
test("GET /api/members?limit=3 → 3 rows, total 8", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("GET", "/api/members?limit=3", token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 3);
  assert.equal(body.total, 8);
  assert.equal(body.limit, 3);
});

// 4. Search: GET /api/members?search=mballa → exactly 1 (Jean Mballa).
test("GET /api/members?search=mballa → 1 result (Jean Mballa)", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("GET", "/api/members?search=mballa", token);
  assert.equal(status, 200);
  assert.equal(body.total, 1);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].firstName, "Jean");
  assert.equal(body.data[0].lastName, "Mballa");
});

// 5. Status filter: GET /api/members?status=inactif → only inactif members.
test("GET /api/members?status=inactif → only inactif", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("GET", "/api/members?status=inactif", token);
  assert.equal(status, 200);
  assert.ok(body.data.length >= 1, "expected at least one inactif member");
  for (const m of body.data) {
    assert.equal(m.status, "inactif");
  }
});

// 6. Role visibility: volunteer only sees actif members.
test("GET /api/members (volunteer) → only actif members", async () => {
  const token = await login("volunteer@ssa.app", "volunteer1234");
  const { status, body } = await api("GET", "/api/members?limit=100", token);
  assert.equal(status, 200);
  assert.ok(body.data.length > 0, "volunteer should see some members");
  for (const m of body.data) {
    assert.equal(m.status, "actif");
  }
});

// 7. GET /api/members without token → 401.
test("GET /api/members (no token) → 401", async () => {
  const { status } = await api("GET", "/api/members");
  assert.equal(status, 401);
});

// 8. POST /api/members (admin, valid) → 201, generated id + departmentName.
test("POST /api/members (admin, valid) → 201 with id + departmentName", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("POST", "/api/members", token, {
    firstName: "Test",
    lastName: "Member",
    email: "test.member@example.com",
    departmentId: 2, // Louange
    status: "actif",
  });
  assert.equal(status, 201);
  assert.ok(body.id, "created member should have a generated id");
  assert.equal(body.firstName, "Test");
  assert.equal(body.lastName, "Member");
  assert.equal(body.departmentId, 2);
  assert.equal(body.departmentName, "Louange");
});

// 9. POST /api/members (admin, invalid email) → 400 BAD_REQUEST.
test("POST /api/members (admin, invalid email) → 400 BAD_REQUEST", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("POST", "/api/members", token, {
    firstName: "Bad",
    lastName: "Email",
    email: "not-an-email",
  });
  assert.equal(status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});

// 10. POST /api/members (missing firstName) → 400.
test("POST /api/members (missing firstName) → 400", async () => {
  const token = await login("admin@ssa.app", "admin1234");
  const { status, body } = await api("POST", "/api/members", token, {
    lastName: "NoFirst",
  });
  assert.equal(status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});

// 11. POST /api/members (volunteer) → 403.
test("POST /api/members (volunteer) → 403", async () => {
  const token = await login("volunteer@ssa.app", "volunteer1234");
  const { status } = await api("POST", "/api/members", token, {
    firstName: "Should",
    lastName: "Fail",
  });
  assert.equal(status, 403);
});

// 12. PUT /api/members/:id (leader, status change) → 200, status updated.
test("PUT /api/members/:id (leader, status change) → 200 updated", async () => {
  const adminToken = await login("admin@ssa.app", "admin1234");
  // Pick any existing member.
  const list = await api("GET", "/api/members?limit=1", adminToken);
  assert.equal(list.status, 200);
  const target = list.body.data[0];
  assert.ok(target, "expected an existing member to update");

  const newStatus = target.status === "actif" ? "inactif" : "actif";
  const leaderToken = await login("leader@ssa.app", "leader1234");
  const { status, body } = await api(
    "PUT",
    `/api/members/${target.id}`,
    leaderToken,
    { status: newStatus }
  );
  assert.equal(status, 200);
  assert.equal(body.status, newStatus);
  assert.equal(body.id, target.id);
});

// 13. DELETE — volunteer 403, admin 204, then GET → 404.
test("DELETE /api/members/:id — volunteer 403, admin 204, then 404", async () => {
  const adminToken = await login("admin@ssa.app", "admin1234");
  // Create a throwaway member to delete.
  const created = await api("POST", "/api/members", adminToken, {
    firstName: "Delete",
    lastName: "Me",
  });
  assert.equal(created.status, 201);
  const id = created.body.id;

  // Volunteer cannot delete.
  const volunteerToken = await login("volunteer@ssa.app", "volunteer1234");
  const forbidden = await api("DELETE", `/api/members/${id}`, volunteerToken);
  assert.equal(forbidden.status, 403);

  // Admin can delete.
  const deleted = await api("DELETE", `/api/members/${id}`, adminToken);
  assert.equal(deleted.status, 204);
  assert.equal(deleted.body, null, "204 should have no body");

  // Now gone.
  const after = await api("GET", `/api/members/${id}`, adminToken);
  assert.equal(after.status, 404);
});
