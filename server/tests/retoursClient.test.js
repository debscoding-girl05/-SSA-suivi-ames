// Retours client (sept. 2026) : annuaire restreint, objectif avec période,
// équipe du leader, création de compte, fiches vides bloquées, fiche des
// encadreurs → annuaire sans doublon, rapport mensuel réservé aux leaders.
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
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function api(method, path, token, json) {
  const headers = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  const text = await res.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, body };
}

async function login(identifier, password) {
  const { status, body } = await api("POST", "/api/auth/login", undefined, { identifier, password });
  assert.equal(status, 200, `login should succeed for ${identifier}`);
  return body.token;
}

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test("Annuaire complet : Pasteur, Secrétaire et Faiseurs de Disciples uniquement", async () => {
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");
  const secretaire = await login("secretaire@ssa.app", "secretaire1234");
  const suivi = await login("suivi@ssa.app", "dirigeant1234"); // encadreur, dépt Suivi
  const esther = await login("esther@ssa.app", "dirigeant1234"); // encadreur, dépt Jeunes

  const all = await api("GET", "/api/annuaire?pageSize=100", pasteur);
  assert.equal(all.status, 200);
  assert.ok(all.body.total > 5);

  assert.equal((await api("GET", "/api/annuaire?pageSize=100", secretaire)).body.total, all.body.total);
  assert.equal((await api("GET", "/api/annuaire?pageSize=100", suivi)).body.total, all.body.total);

  const own = await api("GET", "/api/annuaire?pageSize=100", esther);
  assert.ok(own.body.total < all.body.total);
  const me = await api("GET", "/api/auth/me", esther);
  assert.ok(own.body.data.every((m) => m.dirigeantId === (me.body.user?.id ?? me.body.id)));

  // La secrétaire lit mais n'administre pas.
  assert.equal((await api("POST", "/api/departments", secretaire, { name: "Test" })).status, 403);
});

test("Objectif : période + comptage des ajouts à l'annuaire sur la période", async () => {
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");

  const inRange = await api("PUT", "/api/objectif", pasteur, { target: 100, debut: day(-1), fin: day(60) });
  assert.equal(inRange.status, 200);
  assert.ok(inRange.body.achieved > 0);
  assert.equal(inRange.body.debut, day(-1));
  assert.ok(inRange.body.timeline);
  assert.equal(inRange.body.timeline.status, "en_cours");
  assert.ok(inRange.body.timeline.perWeekNeeded > 0);
  assert.ok(inRange.body.monthly.length >= 2);

  const past = await api("PUT", "/api/objectif", pasteur, { target: 100, debut: day(-60), fin: day(-30) });
  assert.equal(past.body.achieved, 0);
  assert.equal(past.body.timeline.status, "termine");

  assert.equal((await api("PUT", "/api/objectif", pasteur, { target: 10, debut: day(5), fin: day(1) })).status, 400);
  assert.equal((await api("PUT", "/api/objectif", pasteur, { target: 10, debut: "31/12/2026" })).status, 400);
});

test("Équipe du leader : ses encadreurs + tous leurs membres", async () => {
  const leader = await login("leader@ssa.app", "leader1234");
  const res = await api("GET", "/api/dirigeants/equipe", leader);
  assert.equal(res.status, 200);
  const names = res.body.encadreurs.map((e) => e.fullName).sort();
  assert.deepEqual(names, ["Jean Mballa", "Paul Atangana"]);
  assert.ok(res.body.encadreurs.every((e) => e.leaderName === "Marie Nkolo"));
  const expected = 3 /* à elle */ + res.body.encadreurs.reduce((s, e) => s + e.assigneCount, 0);
  assert.equal(res.body.membresTotal, expected);

  const enc = await login("encadreur@ssa.app", "encadreur1234");
  assert.equal((await api("GET", "/api/dirigeants/equipe", enc)).status, 403);
});

test("Création de compte : leader rattaché, comptes bureau réservés au Pasteur", async () => {
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");
  const pr = await login("pr@ssa.app", "pr1234");
  const leader = await login("leader@ssa.app", "leader1234");
  const leaderId = (await api("GET", "/api/auth/me", leader)).body.user?.id ?? (await api("GET", "/api/auth/me", leader)).body.id;
  const deps = (await api("GET", "/api/departments", pr)).body.data;
  const chorale = deps.find((d) => d.name === "Chorale").id;

  const enc = await api("POST", "/api/dirigeants", pr, {
    fullName: "Nouvel Encadreur", email: "nouvel.enc@ssa.app", phone: "+237 6 12 12 12 12",
    role: "encadreur", departmentId: chorale, leaderId,
  });
  assert.equal(enc.status, 201);
  assert.ok(enc.body.tempPassword);
  assert.equal(enc.body.leaderName, "Marie Nkolo");
  // Le nouveau compte peut se connecter avec le mot de passe provisoire.
  await login("nouvel.enc@ssa.app", enc.body.tempPassword);

  const bad = await api("POST", "/api/dirigeants", pr, {
    fullName: "X", email: "x.enc@ssa.app", role: "encadreur", departmentId: chorale, leaderId: enc.body.id,
  });
  assert.equal(bad.status, 400, "le leader doit être un compte leader");

  assert.equal((await api("POST", "/api/dirigeants", pr, { fullName: "S", email: "s1@ssa.app", role: "secretaire" })).status, 403);
  assert.equal((await api("POST", "/api/dirigeants", pasteur, { fullName: "S", email: "s1@ssa.app", role: "secretaire" })).status, 201);

  // Rattachement modifiable par l'admin.
  const unlink = await api("PUT", `/api/dirigeants/${enc.body.id}`, pr, { leaderId: null });
  assert.equal(unlink.status, 200);
  assert.equal(unlink.body.leaderId, null);
});

test("Fiche vide : soumission bloquée, brouillon autorisé, photo suffisante", async () => {
  const jean = await login("protocole@ssa.app", "dirigeant1234"); // Protocole → Huissier
  const roster = [{ nom: "Pierre Kamga", telephone: "677445566", lieu: "", numeroCulte: "", present: null }];

  assert.equal((await api("POST", "/api/rapports-hebdo", jean, { type: "huissier", entete: { nomLeader: "Jean" }, lignes: roster, status: "soumis" })).status, 400);

  const draft = await api("POST", "/api/rapports-hebdo", jean, { type: "huissier", entete: { nomLeader: "Jean" }, lignes: roster, status: "brouillon" });
  assert.equal(draft.status, 201);
  assert.equal((await api("PUT", `/api/rapports-hebdo/${draft.body.id}`, jean, { status: "soumis" })).status, 400);

  const form = new FormData();
  form.append("file", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2])], { type: "image/jpeg" }), "fiche.jpg");
  const up = await fetch(`${baseUrl}/api/rapports-hebdo/${draft.body.id}/attachments`, { method: "POST", headers: { Authorization: `Bearer ${jean}` }, body: form });
  assert.equal(up.status, 201);
  assert.equal((await api("PUT", `/api/rapports-hebdo/${draft.body.id}`, jean, { status: "soumis" })).status, 200);

  const filled = await api("POST", "/api/rapports-hebdo", jean, { type: "huissier", entete: {}, lignes: [{ ...roster[0], present: true }], status: "soumis" });
  assert.equal(filled.status, 201);
});

test("Fiche des encadreurs : les âmes entrent dans l'annuaire sans doublon", async () => {
  const ruth = await login("suivi@ssa.app", "dirigeant1234");
  const lignes = [
    { faiseur: "Ruth", telephone: "699 88 77 66", nomsAme: "MVONDO Claire", commentaires: "" },
    { faiseur: "Ruth", telephone: "", nomsAme: "NGONO Paul", commentaires: "" },
    { faiseur: "Ruth", telephone: "+237 6 55 66 77 88", nomsAme: "Samuel Eboa", commentaires: "déjà suivi" }, // numéro existant
  ];
  const first = await api("POST", "/api/rapports-hebdo", ruth, { type: "superviseur", entete: { nomSuperviseur: "Ruth" }, lignes, status: "soumis" });
  assert.equal(first.status, 201);
  assert.deepEqual(first.body.annuaire, { added: 2, assigned: 0, existing: 1 });

  const again = await api("PUT", `/api/rapports-hebdo/${first.body.id}`, ruth, { lignes, status: "soumis" });
  assert.equal(again.status, 200);
  assert.deepEqual(again.body.annuaire, { added: 0, assigned: 0, existing: 3 });

  const found = await api("GET", "/api/annuaire?search=mvondo", ruth);
  assert.equal(found.body.total, 1);
  assert.equal(found.body.data[0].lastName, "MVONDO");
});

test("Rapport mensuel : réservé aux leaders", async () => {
  const jean = await login("encadreur@ssa.app", "encadreur1234");
  const leader = await login("leader@ssa.app", "leader1234");
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");
  const payload = { type: "leader_mensuel", entete: { mois: "2026-09", activites: "Répétitions, concert" }, lignes: [], status: "soumis" };

  assert.equal((await api("POST", "/api/rapports-hebdo", jean, payload)).status, 403);
  const ok = await api("POST", "/api/rapports-hebdo", leader, payload);
  assert.equal(ok.status, 201);

  const seen = await api("GET", "/api/rapports-hebdo?type=leader_mensuel", pasteur);
  assert.ok(seen.body.data.some((r) => r.id === ok.body.id));
});

test("Fiche des encadreurs : l'âme choisie est rattachée au Faiseur de Disciples de la ligne", async () => {
  const ruth = await login("suivi@ssa.app", "dirigeant1234"); // Faiseur de Disciples (Suivi)
  const esther = await login("esther@ssa.app", "dirigeant1234"); // encadreur hors Suivi
  const pasteur = await login("pasteur@ssa.app", "pasteur1234");

  const fds = await api("GET", "/api/dirigeants/faiseurs", esther);
  assert.equal(fds.status, 200);
  const ruthFd = fds.body.data.find((u) => u.fullName === "Ruth Onana");
  assert.ok(ruthFd, "Ruth figure dans la liste des faiseurs");
  assert.ok(fds.body.data.every((u) => u.email === undefined), "pas d'email exposé");

  // Âme existante (Samuel Eboa, suivi par Marie) choisie dans l'annuaire.
  const samuel = (await api("GET", "/api/annuaire?search=Eboa", pasteur)).body.data[0];
  const lignes = [{ faiseur: "Ruth Onana", faiseurId: ruthFd.id, assigneId: samuel.id, nomsAme: "Samuel Eboa", telephone: samuel.phone, commentaires: "" }];

  // La fiche des encadreurs ne concerne que Suivi / Faiseurs de Disciples.
  const byEsther = await api("POST", "/api/rapports-hebdo", esther, { type: "superviseur", entete: { nomSuperviseur: "Esther" }, lignes, status: "soumis" });
  assert.equal(byEsther.status, 403);

  // Un Faiseur de Disciples peut : l'âme passe chez le faiseur choisi.
  const byRuth = await api("POST", "/api/rapports-hebdo", ruth, { type: "superviseur", entete: { nomSuperviseur: "Ruth" }, lignes, status: "soumis" });
  assert.deepEqual(byRuth.body.annuaire, { added: 0, assigned: 1, existing: 0 });
  const after = (await api("GET", "/api/annuaire?search=Eboa", pasteur)).body.data[0];
  assert.equal(after.dirigeantId, ruthFd.id);

  // Nouvelle âme + faiseur choisi : créée directement chez ce faiseur.
  const nouvelle = await api("POST", "/api/rapports-hebdo", ruth, { type: "superviseur", entete: {}, status: "soumis",
    lignes: [{ faiseur: "Ruth Onana", faiseurId: ruthFd.id, nomsAme: "BIYONG Rose", telephone: "699 45 45 45", commentaires: "" }] });
  assert.deepEqual(nouvelle.body.annuaire, { added: 1, assigned: 0, existing: 0 });
  const rose = (await api("GET", "/api/annuaire?search=biyong", pasteur)).body.data[0];
  assert.equal(rose.dirigeantId, ruthFd.id);

  // Une ligne avec seulement le faiseur ne suffit pas : fiche vide.
  const vide = await api("POST", "/api/rapports-hebdo", ruth, { type: "superviseur", entete: { nomSuperviseur: "Ruth" }, status: "soumis",
    lignes: [{ faiseur: "Ruth Onana", faiseurId: ruthFd.id, nomsAme: "", telephone: "", commentaires: "" }] });
  assert.equal(vide.status, 400);
});

test("Fiche de présence : ni vide, ni partielle ; brouillon partiel accepté", async () => {
  const pr = await login("pr@ssa.app", "pr1234");
  const deps = (await api("GET", "/api/departments", pr)).body.data;
  const created = await api("POST", "/api/dirigeants", pr, { fullName: "Sans Membre", email: "sans.membre@ssa.app", role: "encadreur", departmentId: deps.find((d) => d.name === "Jeunes").id });
  const vide = await login("sans.membre@ssa.app", created.body.tempPassword);
  const r0 = await api("POST", "/api/rapports", vide, { status: "soumis", presences: [] });
  assert.equal(r0.status, 400);
  assert.match(r0.body.message, /Aucun membre à pointer/);
  assert.equal((await api("POST", "/api/rapports", vide, { status: "soumis", presentCount: 0 })).status, 400);

  const grace = await login("grace@ssa.app", "dirigeant1234"); // leader sans fiche cette semaine
  const me = (await api("GET", "/api/auth/me", grace)).body.user;
  const ids = (await api("GET", `/api/dirigeants/${me.id}/assignes`, grace)).body.data.map((a) => a.id);
  assert.ok(ids.length >= 2);
  const partial = await api("POST", "/api/rapports", grace, { status: "soumis", presences: [{ assigneId: ids[0], statut: "present" }] });
  assert.equal(partial.status, 400);
  assert.match(partial.body.message, /non pointé/);
  assert.equal((await api("POST", "/api/rapports", grace, { status: "brouillon", presences: [{ assigneId: ids[0], statut: "present" }] })).status, 201);
  const full = await api("POST", "/api/rapports", grace, { status: "soumis", presences: ids.map((id, i) => ({ assigneId: id, statut: i ? "absent" : "present" })) });
  assert.equal(full.status, 201);
});

test("Fiche de cellule : soumission partielle refusée", async () => {
  const pierre = await login("cellule@ssa.app", "dirigeant1234");
  const mine = (await api("GET", "/api/cellules", pierre)).body.data[0];
  const membres = (await api("GET", `/api/cellules/${mine.id}`, pierre)).body.membres;
  assert.ok(membres.length >= 2);
  const partial = await api("POST", `/api/cellules/${mine.id}/fiche`, pierre, { status: "soumis", presences: [{ membreId: membres[0].id, statut: "present" }] });
  assert.equal(partial.status, 400);
  const full = await api("POST", `/api/cellules/${mine.id}/fiche`, pierre, { status: "soumis", presences: membres.map((m) => ({ membreId: m.id, statut: "present" })) });
  assert.equal(full.status, 201);
});
