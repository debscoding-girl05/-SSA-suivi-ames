// Dirigeants / Assignés / Rapports API integration tests — node:test.
// Drives the real Express app over HTTP on an ephemeral port (port 0) via global fetch.
// Mirrors tests/auth.test.js: force the in-memory backend BEFORE requiring sources.
//
// NEW ROLE MODEL (CDC): pasteur, pr, leader, encadreur, leader_cellule.
//  "Dirigeants" = users whose role is NOT pasteur/pr.
//  Visibility scope: pasteur/pr → all; leader → own department; encadreur/
//  leader_cellule → self only.
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

// fetch helper → { status, body }.
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
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

// Login helper → token string. Uses the `identifier` field (new model).
async function login(identifier, password) {
  const { status, body } = await api("POST", "/api/auth/login", undefined, { identifier, password });
  assert.equal(status, 200, `login should succeed for ${identifier}`);
  assert.equal(typeof body.token, "string");
  return body.token;
}

// Login returning the full { token, user } so callers can grab the user id.
async function loginFull(identifier, password) {
  const { status, body } = await api("POST", "/api/auth/login", undefined, { identifier, password });
  assert.equal(status, 200, `login should succeed for ${identifier}`);
  return body;
}

// --- Shared lookups (resolved lazily, no hard-coded ids) -------------------
async function pasteurToken() {
  return login("pasteur@ssa.app", "pasteur1234");
}

async function findDirigeantByEmail(token, email) {
  // `search` matches email/name substrings, so we can locate any dirigeant.
  const local = email.split("@")[0];
  const { body } = await api("GET", `/api/dirigeants?search=${encodeURIComponent(local)}`, token);
  const match = body.data.find((d) => d.email === email);
  assert.ok(match, `dirigeant ${email} should be findable`);
  return match;
}

async function choraleDepartmentId(token) {
  const { status, body } = await api("GET", "/api/departments", token);
  assert.equal(status, 200);
  const list = body.data || body;
  const chorale = list.find((d) => d.name === "Chorale");
  assert.ok(chorale, "Chorale department should exist");
  return chorale.id;
}

// --- 1. List (pasteur) -----------------------------------------------------
test("1. GET /api/dirigeants (pasteur) → 200, 7 dirigeants, no pasteur/pr, shape + week", async () => {
  const token = await pasteurToken();
  const { status, body } = await api("GET", "/api/dirigeants", token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 7, "should be 7 dirigeants (pasteur/pr excluded)");
  assert.ok(!body.data.some((d) => d.role === "pasteur"), "no pasteur role in the list");
  assert.ok(!body.data.some((d) => d.role === "pr"), "no pr role in the list");
  for (const d of body.data) {
    assert.ok("fullName" in d, "item has fullName");
    assert.ok("departmentName" in d, "item has departmentName");
    assert.ok("assigneCount" in d, "item has assigneCount");
    assert.ok("reportStatus" in d, "item has reportStatus");
  }
  assert.ok(body.week && Number.isInteger(body.week.year) && Number.isInteger(body.week.week),
    "body.week has {year, week}");
});

// --- 2. List scoping: leader (Marie, Chorale) → 3 --------------------------
test("2. GET /api/dirigeants (leader Marie) → exactly 3 (Chorale: Marie, Jean, Paul)", async () => {
  const token = await login("leader@ssa.app", "leader1234");
  const { status, body } = await api("GET", "/api/dirigeants", token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 3, "leader sees only own department (Chorale)");
  for (const d of body.data) assert.equal(d.departmentName, "Chorale");
  const names = body.data.map((d) => d.fullName).sort();
  assert.deepEqual(names, ["Jean Mballa", "Marie Nkolo", "Paul Atangana"]);
});

// --- 3. List scoping: encadreur (Jean) → 1 (himself) -----------------------
test("3. GET /api/dirigeants (encadreur Jean) → exactly 1 (himself)", async () => {
  const token = await login("encadreur@ssa.app", "encadreur1234");
  const { status, body } = await api("GET", "/api/dirigeants", token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 1, "encadreur sees only himself");
  assert.equal(body.data[0].fullName, "Jean Mballa");
});

// --- 4. Search (pasteur) ---------------------------------------------------
test("4. GET /api/dirigeants?search=mballa (pasteur) → exactly 1 (Jean Mballa)", async () => {
  const token = await pasteurToken();
  const { status, body } = await api("GET", "/api/dirigeants?search=mballa", token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].fullName, "Jean Mballa");
});

// --- 5. Department filter (pasteur) ----------------------------------------
test("5. GET /api/dirigeants?departmentId=<Chorale> (pasteur) → 3 (Marie, Jean, Paul)", async () => {
  const token = await pasteurToken();
  const deptId = await choraleDepartmentId(token);
  const { status, body } = await api("GET", `/api/dirigeants?departmentId=${deptId}`, token);
  assert.equal(status, 200);
  assert.equal(body.data.length, 3);
  for (const d of body.data) assert.equal(d.departmentName, "Chorale");
  const names = body.data.map((d) => d.fullName).sort();
  assert.deepEqual(names, ["Jean Mballa", "Marie Nkolo", "Paul Atangana"]);
});

// --- 6. Detail (pasteur) ---------------------------------------------------
test("6. GET /api/dirigeants/:id (Marie, pasteur) → { dirigeant, assignes[], fiches[], reports[] }", async () => {
  const token = await pasteurToken();
  const marie = await findDirigeantByEmail(token, "leader@ssa.app");
  const { status, body } = await api("GET", `/api/dirigeants/${marie.id}`, token);
  assert.equal(status, 200);
  assert.ok(body.dirigeant, "has dirigeant");
  assert.equal(body.dirigeant.fullName, "Marie Nkolo");
  assert.ok(Array.isArray(body.assignes), "assignes is an array");
  assert.ok(Array.isArray(body.fiches), "fiches is an array");
  assert.ok(Array.isArray(body.reports), "reports is an array");
  assert.ok(body.assignes.length > 0, "Marie should have non-empty assignes");
});

// --- 7. No token → 401 -----------------------------------------------------
test("7. GET /api/dirigeants without token → 401", async () => {
  const { status } = await api("GET", "/api/dirigeants");
  assert.equal(status, 401);
});

// --- 8. Assigné CRUD as encadreur (Jean) on his OWN id ---------------------
test("8. Assigné CRUD as encadreur Jean (own id): POST 201 → PUT 200 → DELETE 204", async () => {
  const jean = await loginFull("encadreur@ssa.app", "encadreur1234");
  const jeanTok = jean.token;
  const jeanId = jean.user.id;

  const created = await api("POST", `/api/dirigeants/${jeanId}/assignes`, jeanTok, {
    firstName: "Test", lastName: "Assigne", phone: "+237 6 00 00 00 00",
  });
  assert.equal(created.status, 201);
  assert.ok(created.body.id, "created assigné has id");
  const assigneId = created.body.id;

  const updated = await api("PUT", `/api/dirigeants/${jeanId}/assignes/${assigneId}`, jeanTok, {
    firstName: "Updated",
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.firstName, "Updated");

  const deleted = await api("DELETE", `/api/dirigeants/${jeanId}/assignes/${assigneId}`, jeanTok);
  assert.equal(deleted.status, 204);
  assert.equal(deleted.body, null, "204 has no body");
});

// --- 9. Assigné validation -------------------------------------------------
test("9. Assigné validation: missing firstName → 400; invalid email → 400", async () => {
  const jean = await loginFull("encadreur@ssa.app", "encadreur1234");
  const jeanTok = jean.token;
  const jeanId = jean.user.id;

  const missing = await api("POST", `/api/dirigeants/${jeanId}/assignes`, jeanTok, {
    lastName: "NoFirst",
  });
  assert.equal(missing.status, 400);

  const badEmail = await api("POST", `/api/dirigeants/${jeanId}/assignes`, jeanTok, {
    firstName: "Bad", lastName: "Email", email: "not-an-email",
  });
  assert.equal(badEmail.status, 400);
});

// --- 10. Assigné RBAC ------------------------------------------------------
test("10. Assigné RBAC: Jean→Esther 403; Marie→Jean(same dept) 201; Marie→Esther(other dept) 403", async () => {
  const pasteurTok = await pasteurToken();
  const esther = await findDirigeantByEmail(pasteurTok, "esther@ssa.app");
  const jean = await findDirigeantByEmail(pasteurTok, "encadreur@ssa.app");

  // Encadreur Jean → POST assigné to ANOTHER dirigeant (Esther) → 403.
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234");
  const jeanToEsther = await api("POST", `/api/dirigeants/${esther.id}/assignes`, jeanTok, {
    firstName: "Hack", lastName: "Attempt",
  });
  assert.equal(jeanToEsther.status, 403);

  // Leader Marie → POST assigné to Jean (same department Chorale) → 201.
  const marieTok = await login("leader@ssa.app", "leader1234");
  const marieToJean = await api("POST", `/api/dirigeants/${jean.id}/assignes`, marieTok, {
    firstName: "Same", lastName: "Dept",
  });
  assert.equal(marieToJean.status, 201);
  // Clean up so other tests' assigné counts are unaffected.
  const cleanup = await api("DELETE", `/api/dirigeants/${jean.id}/assignes/${marieToJean.body.id}`, marieTok);
  assert.equal(cleanup.status, 204);

  // Leader Marie → POST assigné to Esther (other department Jeunes) → 403.
  const marieToEsther = await api("POST", `/api/dirigeants/${esther.id}/assignes`, marieTok, {
    firstName: "Other", lastName: "Dept",
  });
  assert.equal(marieToEsther.status, 403);
});

// --- 11. PUT dirigeant RBAC ------------------------------------------------
test("11. PUT /api/dirigeants/:id: encadreur → 403; pasteur (change departmentId) → 200", async () => {
  const pasteurTok = await pasteurToken();
  const jean = await loginFull("encadreur@ssa.app", "encadreur1234");

  const asEncadreur = await api("PUT", `/api/dirigeants/${jean.user.id}`, jean.token, {
    fullName: "Hacked Name",
  });
  assert.equal(asEncadreur.status, 403);

  const choraleId = await choraleDepartmentId(pasteurTok);
  const asPasteur = await api("PUT", `/api/dirigeants/${jean.user.id}`, pasteurTok, {
    departmentId: choraleId,
  });
  assert.equal(asPasteur.status, 200);
  assert.equal(asPasteur.body.departmentId, choraleId);
});

// --- 12. Rapports overview (pasteur) ---------------------------------------
test("12. GET /api/rapports (pasteur) → summary total=6 soumis=3 manquant=3", async () => {
  const token = await pasteurToken();
  const { status, body } = await api("GET", "/api/rapports", token);
  assert.equal(status, 200);
  assert.equal(body.summary.total, 7);
  assert.equal(body.summary.soumis, 3);
  assert.equal(body.summary.manquant, 4);
  for (const d of body.dirigeants) {
    assert.ok(["soumis", "manquant"].includes(d.status), "status is soumis|manquant");
  }
});

// --- 13. Rapports overview scoping (leader Marie, Chorale) -----------------
test("13. GET /api/rapports (leader Marie) → scoped to Chorale total=3 soumis=2 manquant=1", async () => {
  const token = await login("leader@ssa.app", "leader1234");
  const { status, body } = await api("GET", "/api/rapports", token);
  assert.equal(status, 200);
  // Chorale: Marie (soumis), Jean (soumis), Paul (manquant).
  assert.equal(body.summary.total, 3);
  assert.equal(body.summary.soumis, 2);
  assert.equal(body.summary.manquant, 1);
});

// --- 14. Submit validation -------------------------------------------------
test("14. POST /api/rapports {presentCount:-1} → 400", async () => {
  const danielTok = await login("daniel@ssa.app", "dirigeant1234");
  const { status } = await api("POST", "/api/rapports", danielTok, { presentCount: -1 });
  assert.equal(status, 400);
});

// ===========================================================================
// STATE-MUTATING TESTS — ordered LAST. They submit reports for Daniel and Paul
// (both seeded as "manquant"), changing the global soumis/manquant counts.
// node:test runs tests in file order, so these run after 1–14 and in sequence.
// ===========================================================================

// --- 15. Daniel submits → 201; overview soumis 3→4, manquant 3→2 -----------
// First mutation: Daniel (seeded manquant) becomes soumis. Seed has 3 soumis.
test("15. Daniel submits → 201; overview soumis 3→4, manquant 3→2", async () => {
  const pasteurTok = await pasteurToken();
  const danielTok = await login("daniel@ssa.app", "dirigeant1234");

  const submit = await api("POST", "/api/rapports", danielTok, { presentCount: 2 });
  assert.equal(submit.status, 201);
  assert.equal(submit.body.status, "soumis");

  const { body } = await api("GET", "/api/rapports", pasteurTok);
  assert.equal(body.summary.total, 7);
  assert.equal(body.summary.soumis, 4);
  assert.equal(body.summary.manquant, 3);
});

// --- 16. Submit RBAC: Daniel→Paul 403; pasteur→Paul 201 --------------------
// Runs after test 15. Daniel may NOT submit for another dirigeant (Paul);
// the pasteur may. This makes Paul soumis (soumis 4→5), but we only assert
// the status codes here per the spec.
test("16. Submit RBAC: Daniel for Paul → 403; pasteur for Paul → 201", async () => {
  const pasteurTok = await pasteurToken();
  const paul = await findDirigeantByEmail(pasteurTok, "paul@ssa.app");
  const danielTok = await login("daniel@ssa.app", "dirigeant1234");

  const forbidden = await api("POST", "/api/rapports", danielTok, {
    dirigeantId: paul.id, presentCount: 1,
  });
  assert.equal(forbidden.status, 403);

  const asPasteur = await api("POST", "/api/rapports", pasteurTok, {
    dirigeantId: paul.id, presentCount: 1,
  });
  assert.equal(asPasteur.status, 201);
  assert.equal(asPasteur.body.status, "soumis");
});

// --- 17. /me after submit (Daniel) -----------------------------------------
test("17. GET /api/rapports/me as Daniel → rapport not null", async () => {
  const danielTok = await login("daniel@ssa.app", "dirigeant1234");
  // Idempotent upsert — ensure Daniel has a report.
  await api("POST", "/api/rapports", danielTok, { presentCount: 2 });
  const { status, body } = await api("GET", "/api/rapports/me", danielTok);
  assert.equal(status, 200);
  assert.notEqual(body.rapport, null, "rapport should not be null after submit");
});

test("Fiche: présences, brouillon→soumis, validation des données + verrou", async () => {
  const token = await login("grace@ssa.app", "dirigeant1234"); // leader, manquant au seed
  const me = await api("GET", "/api/auth/me", token);
  const ass = await api("GET", `/api/dirigeants/${me.body.user.id}/assignes`, token);
  const ids = ass.body.data.map((a) => a.id);
  assert.ok(ids.length >= 2);

  // Validation (aucune fiche encore) : statut invalide → 400 ; assigné d'un autre → 400
  assert.equal((await api("POST", "/api/rapports", token, { presences: [{ assigneId: ids[0], statut: "xxx" }] })).status, 400);
  assert.equal((await api("POST", "/api/rapports", token, { presences: [{ assigneId: "not-mine", statut: "present" }] })).status, 400);

  // Brouillon (1 présent / 1 absent)
  const draft = await api("POST", "/api/rapports", token, { status: "brouillon", presences: [{ assigneId: ids[0], statut: "present" }, { assigneId: ids[1], statut: "absent" }] });
  assert.equal(draft.status, 201);
  assert.equal(draft.body.status, "brouillon");
  assert.equal(draft.body.presentCount, 1);

  // Soumettre (2 présents)
  const sub = await api("POST", "/api/rapports", token, { status: "soumis", presences: [{ assigneId: ids[0], statut: "present" }, { assigneId: ids[1], statut: "present" }] });
  assert.equal(sub.status, 201);
  assert.equal(sub.body.status, "soumis");
  assert.equal(sub.body.presentCount, 2);

  // /me reflète la fiche + présences
  const mine = await api("GET", "/api/rapports/me", token);
  assert.equal(mine.body.rapport.status, "soumis");
  assert.equal(mine.body.presences.length, 2);

  // Verrou : re-soumettre une fiche soumise → 403
  assert.equal((await api("POST", "/api/rapports", token, { status: "soumis", presences: [{ assigneId: ids[0], statut: "present" }] })).status, 403);
});

test("Validation: leader valide / demande correction, RBAC + self-validation interdite", async () => {
  const marie = await login("leader@ssa.app", "leader1234");      // leader Chorale
  const jeanTok = await login("encadreur@ssa.app", "encadreur1234"); // encadreur Chorale (soumis au seed)
  const paul = await login("paul@ssa.app", "dirigeant1234");      // encadreur (non-reviewer)
  const jeanId = (await api("GET", "/api/auth/me", jeanTok)).body.user.id;

  // Marie (leader même dépt) voit la fiche de Jean
  const fiche = await api("GET", `/api/rapports/fiche/${jeanId}`, marie);
  assert.equal(fiche.status, 200);
  const ficheId = fiche.body.rapport.id;
  assert.ok(ficheId);

  // Paul (encadreur) ne peut pas valider → 403
  assert.equal((await api("POST", `/api/rapports/${ficheId}/validate`, paul)).status, 403);
  // Demande de correction sans commentaire → 400
  assert.equal((await api("POST", `/api/rapports/${ficheId}/request-changes`, marie, {})).status, 400);
  // Demande de correction → a_corriger
  const rc = await api("POST", `/api/rapports/${ficheId}/request-changes`, marie, { comment: "À revoir" });
  assert.equal(rc.status, 200);
  assert.equal(rc.body.status, "a_corriger");

  // Jean voit le retour
  const jm = await api("GET", "/api/rapports/me", jeanTok);
  assert.equal(jm.body.rapport.status, "a_corriger");
  assert.equal(jm.body.rapport.reviewComment, "À revoir");

  // Jean corrige et re-soumet
  const aid = (await api("GET", `/api/dirigeants/${jeanId}/assignes`, jeanTok)).body.data[0].id;
  const resub = await api("POST", "/api/rapports", jeanTok, { status: "soumis", presences: [{ assigneId: aid, statut: "present" }] });
  assert.equal(resub.status, 201);
  assert.equal(resub.body.status, "soumis");

  // Marie valide
  const val = await api("POST", `/api/rapports/${ficheId}/validate`, marie, { comment: "OK" });
  assert.equal(val.status, 200);
  assert.equal(val.body.status, "valide");

  // Marie ne peut pas valider sa PROPRE fiche
  const mm = await api("GET", "/api/rapports/me", marie);
  if (mm.body.rapport) {
    assert.equal((await api("POST", `/api/rapports/${mm.body.rapport.id}/validate`, marie, { comment: "x" })).status, 403);
  }
});

test("Rapports (documents): agrégation, création, transmission, scoping + lecture Pasteur", async () => {
  const marie = await login("leader@ssa.app", "leader1234");
  const pr = await login("pr@ssa.app", "pr1234");
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");
  const jean = await login("encadreur@ssa.app", "encadreur1234");

  // Agrégation depuis les fiches (leader) → titre + contenu suggérés
  const agg = await api("GET", "/api/reports/aggregate", marie);
  assert.equal(agg.status, 200);
  assert.match(agg.body.title, /Rapport/);
  assert.ok(agg.body.content.length > 0);

  // Encadreur ne peut pas rédiger → 403 ; sa liste est vide
  assert.equal((await api("POST", "/api/reports", jean, { title: "x" })).status, 403);
  assert.equal((await api("GET", "/api/reports", jean)).body.data.length, 0);

  // Marie crée un rapport (brouillon) puis le transmet
  const created = await api("POST", "/api/reports", marie, { title: "Rapport Chorale", content: "RAS" });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "brouillon");
  const id = created.body.id;

  const tx = await api("POST", `/api/reports/${id}/transmit`, marie);
  assert.equal(tx.status, 200);
  assert.equal(tx.body.status, "transmis");

  // Édition après transmission → 400
  assert.equal((await api("PUT", `/api/reports/${id}`, marie, { content: "modif" })).status, 400);

  // PR voit tout ; Pasteur lit le rapport
  assert.ok((await api("GET", "/api/reports", pr)).body.data.length >= 1);
  const read = await api("GET", `/api/reports/${id}`, pasteur);
  assert.equal(read.status, 200);
  assert.equal(read.body.title, "Rapport Chorale");
});

test("Nouveaux venus / 7 leçons: scope FD, séquentiel, promotion", async () => {
  const ruth = await login("suivi@ssa.app", "dirigeant1234"); // encadreur dépt Suivi
  const jean = await login("encadreur@ssa.app", "encadreur1234"); // hors FD

  // Liste FD (Ruth voit ses 3 nouveaux venus du seed)
  const list = await api("GET", "/api/integration/nouveaux", ruth);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length >= 3);

  // Hors FD : liste vide + enregistrement interdit
  assert.equal((await api("GET", "/api/integration/nouveaux", jean)).body.data.length, 0);
  assert.equal((await api("POST", "/api/integration/nouveaux", jean, { firstName: "X", lastName: "Y" })).status, 403);

  // Enregistrement (FD) → statut nouveau
  const created = await api("POST", "/api/integration/nouveaux", ruth, { firstName: "Test", lastName: "Venu" });
  assert.equal(created.status, 201);
  assert.equal(created.body.statut, "nouveau");
  const id = created.body.id;

  // Séquentiel : leçon 2 d'emblée → 400 ; leçon 1 → ok
  assert.equal((await api("POST", `/api/integration/nouveaux/${id}/valider`, ruth, { lecon: 2 })).status, 400);
  const v1 = await api("POST", `/api/integration/nouveaux/${id}/valider`, ruth, { lecon: 1 });
  assert.equal(v1.status, 200);
  assert.equal(v1.body.validated, 1);

  // Promotion avant 7/7 → 400
  assert.equal((await api("POST", `/api/integration/nouveaux/${id}/promouvoir`, ruth)).status, 400);

  // Clarisse (6/7 au seed) : valider la 7ᵉ puis promouvoir → régulier + sort de la liste
  const clarisse = list.body.data.find((v) => v.firstName === "Clarisse");
  assert.ok(clarisse, "Clarisse présente");
  await api("POST", `/api/integration/nouveaux/${clarisse.id}/valider`, ruth, { lecon: 7 });
  const promo = await api("POST", `/api/integration/nouveaux/${clarisse.id}/promouvoir`, ruth);
  assert.equal(promo.status, 200);
  assert.equal(promo.body.statut, "regulier");
  const after = await api("GET", "/api/integration/nouveaux", ruth);
  assert.ok(!after.body.data.some((v) => v.id === clarisse.id), "Clarisse n'est plus un nouveau venu");

  // Détection de doublon : même numéro → 409 DUPLICATE ; force → 201
  const phone = "+237 6 99 88 77 66";
  const first = await api("POST", "/api/integration/nouveaux", ruth, { firstName: "Doublon", lastName: "Un", phone });
  assert.equal(first.status, 201);
  const dup = await api("POST", "/api/integration/nouveaux", ruth, { firstName: "Doublon", lastName: "Deux", phone });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, "DUPLICATE");
  assert.equal(dup.body.existing.firstName, "Doublon");
  const forced = await api("POST", "/api/integration/nouveaux", ruth, { firstName: "Doublon", lastName: "Deux", phone, force: true });
  assert.equal(forced.status, 201);
});

test("Notifications: génération scopée + lire / tout marquer lu", async () => {
  const ruth = await login("suivi@ssa.app", "dirigeant1234"); // encadreur Suivi (fiche manquante + stagnations)
  const pasteur = await pasteurToken();

  // Encadreur : au moins une notification (fiche manquante / stagnation)
  const p1 = await api("GET", "/api/notifications", ruth);
  assert.equal(p1.status, 200);
  assert.ok(p1.body.unread >= 1);

  // Pasteur : synthèse globale + stagnation
  const adm = await api("GET", "/api/notifications", pasteur);
  assert.ok(adm.body.data.some((n) => n.type === "a_valider"));
  assert.ok(adm.body.data.some((n) => n.type === "stagnation"));

  // Marquer une notif lue → décrémente
  const first = p1.body.data[0];
  const r = await api("POST", `/api/notifications/${first.id}/read`, ruth);
  assert.equal(r.status, 204);
  const p2 = await api("GET", "/api/notifications", ruth);
  assert.equal(p2.body.unread, p1.body.unread - 1);

  // Tout marquer lu → 0
  await api("POST", "/api/notifications/read-all", ruth);
  const p3 = await api("GET", "/api/notifications", ruth);
  assert.equal(p3.body.unread, 0);
});

test("Objectif (Pasteur only) + attribut visiteur", async () => {
  const pasteur = await pasteurToken();
  const pr = await login("pr@ssa.app", "pr1234");
  const ruth = await login("suivi@ssa.app", "dirigeant1234");

  // Objectif réservé au Pasteur
  assert.equal((await api("GET", "/api/objectif", pr)).status, 403);
  const set = await api("PUT", "/api/objectif", pasteur, { target: 100 });
  assert.equal(set.status, 200);
  assert.equal(set.body.target, 100);
  assert.ok(set.body.achieved >= 0);
  assert.equal(set.body.percent, Math.min(100, Math.round((set.body.achieved / 100) * 100)));

  // Nouveau venu avec attribut visiteur
  const v = await api("POST", "/api/integration/nouveaux", ruth, { firstName: "Vis", lastName: "Iteur", isVisiteur: true });
  assert.equal(v.status, 201);
  assert.equal(v.body.isVisiteur, true);
});

test("Cellules de prière: scope, création (admin), membres & fiche (leader)", async () => {
  const pasteur = await pasteurToken();
  const pierre = await login("cellule@ssa.app", "dirigeant1234"); // leader_cellule
  const jean = await login("encadreur@ssa.app", "encadreur1234");

  // Scope : Pasteur voit tout, Pierre voit la sienne, Jean (encadreur) rien
  assert.ok((await api("GET", "/api/cellules", pasteur)).body.data.length >= 1);
  assert.ok((await api("GET", "/api/cellules", pierre)).body.data.length >= 1);
  assert.equal((await api("GET", "/api/cellules", jean)).body.data.length, 0);
  assert.equal((await api("POST", "/api/cellules", jean, { nom: "X" })).status, 403);

  // Création par le Pasteur
  const created = await api("POST", "/api/cellules", pasteur, { nom: "Cellule Test", quartier: "Nlongkak" });
  assert.equal(created.status, 201);

  // Pierre gère sa cellule : membre + fiche de présence
  const mine = (await api("GET", "/api/cellules", pierre)).body.data[0];
  const m = await api("POST", `/api/cellules/${mine.id}/membres`, pierre, { nom: "Invité Test", estMembreEglise: false });
  assert.equal(m.status, 201);
  assert.equal(m.body.estMembreEglise, false);

  const detail = await api("GET", `/api/cellules/${mine.id}`, pierre);
  const membres = detail.body.membres;
  const fiche = await api("POST", `/api/cellules/${mine.id}/fiche`, pierre, {
    status: "soumis",
    presences: membres.map((mm, i) => ({ membreId: mm.id, statut: i === 0 ? "absent" : "present" })),
  });
  assert.equal(fiche.status, 201);
  assert.equal(fiche.body.status, "soumis");
  assert.equal(fiche.body.presentCount, Math.max(0, membres.length - 1));
});

test("Leaders de cellule: création de compte (admin) + connexion + RBAC", async () => {
  const pasteur = await pasteurToken();
  const jean = await login("encadreur@ssa.app", "encadreur1234");

  // Réservé au Pasteur/PR
  assert.equal((await api("POST", "/api/cellules/leaders", jean, { fullName: "X", phone: "+237 6 00 00 00 11", password: "secret12" })).status, 403);

  // Champs requis
  assert.equal((await api("POST", "/api/cellules/leaders", pasteur, { fullName: "Sans tél", password: "secret12" })).status, 400);
  assert.equal((await api("POST", "/api/cellules/leaders", pasteur, { fullName: "Court mdp", phone: "+237 6 00 00 00 12", password: "123" })).status, 400);

  // Création OK → apparaît dans la liste avec celluleCount = 0
  const phone = "+237 6 55 44 33 22";
  const created = await api("POST", "/api/cellules/leaders", pasteur, { fullName: "Sœur Grâce", phone, password: "grace1234" });
  assert.equal(created.status, 201);
  assert.equal(created.body.fullName, "Sœur Grâce");
  assert.equal(created.body.celluleCount, 0);

  const list = await api("GET", "/api/cellules/leaders", pasteur);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((l) => l.id === created.body.id && l.phone === phone));

  // Le nouveau leader peut se connecter (par téléphone) et n'a aucune cellule
  const grace = await login(phone, "grace1234");
  assert.equal((await api("GET", "/api/cellules", grace)).body.data.length, 0);

  // Doublon de téléphone → 409
  assert.equal((await api("POST", "/api/cellules/leaders", pasteur, { fullName: "Doublon", phone, password: "autre1234" })).status, 409);
});

test("Dirigeants: création de compte (admin) + RBAC + édition profil", async () => {
  const pasteur = await pasteurToken();
  const jean = await login("encadreur@ssa.app", "encadreur1234");
  const deptId = (await api("GET", "/api/departments", pasteur)).body.data[0].id;

  // Réservé au Pasteur/PR
  assert.equal((await api("POST", "/api/dirigeants", jean, { fullName: "X", role: "leader", phone: "+237 6 11 11 11 11", password: "secret12" })).status, 403);

  // Validation : rôle invalide / tél manquant / mdp court
  assert.equal((await api("POST", "/api/dirigeants", pasteur, { fullName: "Mauvais rôle", role: "pasteur", phone: "+237 6 11 11 11 12", password: "secret12" })).status, 400);
  assert.equal((await api("POST", "/api/dirigeants", pasteur, { fullName: "Sans tél", role: "leader", password: "secret12" })).status, 400);

  // Création OK (encadreur, avec département) → apparaît dans la liste
  const phone = "+237 6 77 66 55 44";
  const created = await api("POST", "/api/dirigeants", pasteur, { fullName: "Frère Élie", role: "encadreur", phone, password: "elie1234", departmentId: deptId });
  assert.equal(created.status, 201);
  assert.equal(created.body.role, "encadreur");
  assert.equal(created.body.departmentId, deptId);

  const list = await api("GET", "/api/dirigeants", pasteur);
  assert.ok(list.body.data.some((d) => d.id === created.body.id));

  // Le nouveau dirigeant peut se connecter (par téléphone) — login() assure le 200
  await login(phone, "elie1234");

  // Doublon de téléphone → 409 (avant de changer le numéro)
  assert.equal((await api("POST", "/api/dirigeants", pasteur, { fullName: "Doublon", role: "leader", phone, password: "autre1234" })).status, 409);

  // Édition du profil (Pasteur)
  const upd = await api("PUT", `/api/dirigeants/${created.body.id}`, pasteur, { fullName: "Frère Élie N.", phone: "+237 6 77 66 55 45" });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.fullName, "Frère Élie N.");
});
