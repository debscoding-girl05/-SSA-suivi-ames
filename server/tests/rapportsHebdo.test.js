// Rapports hebdomadaires (fiches structurées) — création, statut, PDF.
// Drives the real Express app over HTTP on an ephemeral port (port 0).
delete process.env.DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const createApp = require("../src/app");
const { seed } = require("../src/db/seed");
const { RENDERERS } = require("../src/utils/rapportHebdoPdf");

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

// One minimal (mostly empty) payload per type, close to what a user submits
// right after opening a brand-new form — the case most likely to crash a
// pdfkit renderer that assumes a field is always present.
const MINIMAL_PAYLOAD = {
  huissier: { entete: { nomLeader: "Jean Mballa" }, lignes: [] },
  faiseur_disciples: { entete: { nomFaiseur: "Jean Mballa" }, lignes: [{ nom: "Ame Test", telephone: "690000000", present: true }] },
  superviseur: { entete: { nomSuperviseur: "Jean Mballa" }, lignes: [] },
  cellule_priere: { entete: { nomCellule: "Cellule Test", leader: "Jean Mballa" }, lignes: [] },
  choristes: { entete: { encadreur: "Jean Mballa" }, lignes: [] },
  audiovisuel: { entete: { encadreur: "Jean Mballa" }, lignes: [] },
};

// --- 1. Create + PDF for every report type -----------------------------
test("1. Every rapport-hebdo type: create (201) -> GET /pdf returns a real PDF", async () => {
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");

  for (const type of Object.keys(RENDERERS)) {
    const payload = MINIMAL_PAYLOAD[type];
    assert.ok(payload, `no fixture payload for type ${type}`);

    const created = await api("POST", "/api/rapports-hebdo", jeanTok, { type, ...payload, status: "brouillon" });
    assert.equal(created.status, 201, `create ${type} should succeed`);
    assert.equal(created.body.type, type);

    const res = await fetch(`${baseUrl}/api/rapports-hebdo/${created.body.id}/pdf`, {
      headers: { Authorization: `Bearer ${jeanTok}` },
    });
    assert.equal(res.status, 200, `GET pdf for ${type} should be 200`);
    assert.equal(res.headers.get("content-type"), "application/pdf");

    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length > 200, `${type} PDF should have real content (got ${buf.length} bytes)`);
    assert.equal(buf.subarray(0, 5).toString("latin1"), "%PDF-", `${type} PDF should start with the PDF magic bytes`);
  }
});

// --- 2. Full lifecycle: brouillon -> soumis, update, list scoping ------
test("2. Rapport hebdo lifecycle: brouillon -> soumis, update persists, scoped list", async () => {
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");
  const marieTok = await login("leader@ssa.app", "leader1234");

  const created = await api("POST", "/api/rapports-hebdo", jeanTok, {
    type: "huissier",
    entete: { nomLeader: "Jean Mballa" },
    lignes: [{ nom: "Membre Un", telephone: "690000001", present: true }],
    status: "brouillon",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "brouillon");

  const updated = await api("PUT", `/api/rapports-hebdo/${created.body.id}`, jeanTok, {
    status: "soumis",
    lignes: [
      { nom: "Membre Un", telephone: "690000001", present: true },
      { nom: "Membre Deux", telephone: "690000002", present: false },
    ],
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, "soumis");
  assert.equal(updated.body.lignes.length, 2);

  const own = await api("GET", "/api/rapports-hebdo?type=huissier", jeanTok);
  assert.equal(own.status, 200);
  assert.ok(own.body.data.some((r) => r.id === created.body.id));

  // Marie (leader) didn't author it and isn't admin -> can't see it in a
  // type-scoped list, nor fetch/update it directly.
  const marieList = await api("GET", "/api/rapports-hebdo?type=huissier", marieTok);
  assert.ok(!marieList.body.data.some((r) => r.id === created.body.id));

  const marieGet = await api("GET", `/api/rapports-hebdo/${created.body.id}`, marieTok);
  assert.equal(marieGet.status, 403);
});

// --- 3. PDF RBAC ---------------------------------------------------------
test("3. PDF access: author OK, unrelated encadreur 403, admin OK", async () => {
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");
  const estherTok = await login("esther@ssa.app", "dirigeant1234");
  const pasteurTok = await login("pasteur@ssa.app", "pasteur1234");

  const created = await api("POST", "/api/rapports-hebdo", jeanTok, {
    type: "choristes",
    entete: { encadreur: "Jean Mballa" },
    lignes: [],
    status: "brouillon",
  });
  assert.equal(created.status, 201);

  const asAuthor = await fetch(`${baseUrl}/api/rapports-hebdo/${created.body.id}/pdf`, { headers: { Authorization: `Bearer ${jeanTok}` } });
  assert.equal(asAuthor.status, 200);

  const asOther = await fetch(`${baseUrl}/api/rapports-hebdo/${created.body.id}/pdf`, { headers: { Authorization: `Bearer ${estherTok}` } });
  assert.equal(asOther.status, 403);

  const asAdmin = await fetch(`${baseUrl}/api/rapports-hebdo/${created.body.id}/pdf`, { headers: { Authorization: `Bearer ${pasteurTok}` } });
  assert.equal(asAdmin.status, 200);
});

// --- 4. Attachments: upload, list, download, delete, RBAC, MIME guard --
test("4. Attachment (photo de la fiche papier): upload -> list -> download -> delete, RBAC + MIME guard", async () => {
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");
  const estherTok = await login("esther@ssa.app", "dirigeant1234");

  const created = await api("POST", "/api/rapports-hebdo", jeanTok, {
    type: "huissier", entete: { nomLeader: "Jean Mballa" }, lignes: [], status: "brouillon",
  });
  assert.equal(created.status, 201);
  const rapportId = created.body.id;

  const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 1, 2, 3, 4, 5]);
  const form = new FormData();
  form.append("file", new Blob([fakeJpeg], { type: "image/jpeg" }), "registre.jpg");

  // Unrelated encadreur can't attach to someone else's rapport.
  const forbiddenUpload = await fetch(`${baseUrl}/api/rapports-hebdo/${rapportId}/attachments`, {
    method: "POST", headers: { Authorization: `Bearer ${estherTok}` }, body: form,
  });
  assert.equal(forbiddenUpload.status, 403);

  const uploaded = await fetch(`${baseUrl}/api/rapports-hebdo/${rapportId}/attachments`, {
    method: "POST", headers: { Authorization: `Bearer ${jeanTok}` }, body: form,
  });
  assert.equal(uploaded.status, 201);
  const uploadedBody = await uploaded.json();
  assert.ok(uploadedBody.id);
  assert.equal(uploadedBody.mimeType, "image/jpeg");
  assert.equal(uploadedBody.sizeBytes, fakeJpeg.length);

  // Disallowed MIME type is rejected.
  const badForm = new FormData();
  badForm.append("file", new Blob([Buffer.from("not an image")], { type: "text/plain" }), "notes.txt");
  const badUpload = await fetch(`${baseUrl}/api/rapports-hebdo/${rapportId}/attachments`, {
    method: "POST", headers: { Authorization: `Bearer ${jeanTok}` }, body: badForm,
  });
  assert.equal(badUpload.status, 400);

  const list = await api("GET", `/api/rapports-hebdo/${rapportId}/attachments`, jeanTok);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].id, uploadedBody.id);

  // Download (local disk backend in tests, no Supabase configured) returns the exact bytes back.
  const download = await fetch(`${baseUrl}/api/rapports-hebdo/${rapportId}/attachments/${uploadedBody.id}`, {
    headers: { Authorization: `Bearer ${jeanTok}` },
  });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "image/jpeg");
  const downloaded = Buffer.from(await download.arrayBuffer());
  assert.deepEqual(downloaded, fakeJpeg);

  // Unrelated encadreur can't download it either.
  const forbiddenDownload = await fetch(`${baseUrl}/api/rapports-hebdo/${rapportId}/attachments/${uploadedBody.id}`, {
    headers: { Authorization: `Bearer ${estherTok}` },
  });
  assert.equal(forbiddenDownload.status, 403);

  const deleted = await api("DELETE", `/api/rapports-hebdo/${rapportId}/attachments/${uploadedBody.id}`, jeanTok);
  assert.equal(deleted.status, 204);

  const listAfter = await api("GET", `/api/rapports-hebdo/${rapportId}/attachments`, jeanTok);
  assert.equal(listAfter.body.data.length, 0);
});
