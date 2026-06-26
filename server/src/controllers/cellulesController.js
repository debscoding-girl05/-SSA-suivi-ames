const bcrypt = require("bcryptjs");
const db = require("../db");
const ApiError = require("../utils/ApiError");
const { parseWeek, currentWeek } = require("../utils/week");
const { validateLeaderCellule } = require("../utils/validators");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);
const PRESENCE = ["present", "absent", "justifie"];
const str = (v) => (typeof v === "string" ? v.trim() : "");

function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader_cellule") return { leaderId: user.sub };
  return { leaderId: "__none__" }; // autres rôles : aucune cellule
}

function canManage(user, cellule) {
  return isAdmin(user.role) || (user.role === "leader_cellule" && cellule.leaderCelluleId === user.sub);
}

async function loadCellule(id) {
  const cellule = await db.cellules.findById(id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  return cellule;
}

// GET /api/cellules
async function list(req, res) {
  const { year, week } = currentWeek();
  const data = await db.cellules.list({ year, week, scope: scopeFor(req.user) });
  res.json({ data });
}

// GET /api/cellules/leaders — leaders de cellule (admin) : nom, tél, nb de cellules.
async function leaders(_req, res) {
  res.json({ data: await db.cellules.leadersDisponibles() });
}

// POST /api/cellules/leaders — créer un compte leader de cellule (Pasteur/PR).
async function createLeader(req, res) {
  const { fullName, phone, email, password } = validateLeaderCellule(req.body);

  // Email = celui fourni, sinon généré depuis le téléphone (login possible par tél.).
  const finalEmail = email || `cellule.${phone.replace(/\D/g, "")}@ssa.local`;

  if (await db.users.findByEmail(finalEmail)) {
    throw new ApiError(409, "EMAIL_EXISTS", "Un compte avec cet email existe déjà");
  }
  const byPhone = await db.users.findByIdentifier(phone);
  if (byPhone) {
    throw new ApiError(409, "PHONE_EXISTS", "Un compte avec ce numéro existe déjà");
  }

  const role = await db.roles.findByName("leader_cellule");
  if (!role) throw ApiError.badRequest("Rôle leader_cellule introuvable");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.users.create({ email: finalEmail, passwordHash, fullName, phone, roleId: role.id, departmentId: null });
  res.status(201).json({ id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, celluleCount: 0 });
}

// POST /api/cellules — créer (Pasteur/PR).
async function create(req, res) {
  const nom = str(req.body.nom);
  if (!nom) throw ApiError.badRequest("Le nom de la cellule est requis");
  const cellule = await db.cellules.create({
    nom,
    quartier: str(req.body.quartier) || null,
    leaderCelluleId: req.body.leaderCelluleId || null,
  });
  res.status(201).json(cellule);
}

// PUT /api/cellules/:id — éditer (Pasteur/PR).
async function update(req, res) {
  await loadCellule(req.params.id);
  const fields = {};
  if (req.body.nom !== undefined) {
    const nom = str(req.body.nom);
    if (!nom) throw ApiError.badRequest("Le nom est requis");
    fields.nom = nom;
  }
  if (req.body.quartier !== undefined) fields.quartier = str(req.body.quartier) || null;
  if (req.body.leaderCelluleId !== undefined) fields.leaderCelluleId = req.body.leaderCelluleId || null;
  res.json(await db.cellules.update(req.params.id, fields));
}

// GET /api/cellules/:id — détail + membres + fiche de la semaine.
async function getOne(req, res) {
  const cellule = await loadCellule(req.params.id);
  if (!canManage(req.user, cellule)) throw ApiError.forbidden("Accès refusé");
  const { year, week } = parseWeek(req.query);
  const [membres, fiche] = await Promise.all([
    db.cellules.listMembres(cellule.id),
    db.cellules.getFiche(cellule.id, year, week),
  ]);
  res.json({ cellule, membres, fiche, week: { year, week } });
}

// POST /api/cellules/:id/membres — ajouter un membre (leader de la cellule / admin).
async function addMembre(req, res) {
  const cellule = await loadCellule(req.params.id);
  if (!canManage(req.user, cellule)) throw ApiError.forbidden("Action refusée");
  const nom = str(req.body.nom);
  if (!nom) throw ApiError.badRequest("Le nom est requis");
  const membre = await db.cellules.addMembre(cellule.id, {
    nom,
    telephone: str(req.body.telephone) || null,
    estMembreEglise: Boolean(req.body.estMembreEglise),
  });
  res.status(201).json(membre);
}

// DELETE /api/cellules/:id/membres/:membreId
async function removeMembre(req, res) {
  const cellule = await loadCellule(req.params.id);
  if (!canManage(req.user, cellule)) throw ApiError.forbidden("Action refusée");
  const membre = await db.cellules.findMembre(req.params.membreId);
  if (!membre || membre.celluleId !== cellule.id) throw ApiError.notFound("Membre introuvable");
  await db.cellules.removeMembre(req.params.membreId);
  res.status(204).end();
}

// POST /api/cellules/:id/fiche — enregistrer/soumettre la fiche de présence.
async function submitFiche(req, res) {
  const cellule = await loadCellule(req.params.id);
  if (!canManage(req.user, cellule)) throw ApiError.forbidden("Action refusée");
  const { year, week } = parseWeek(req.body);
  const status = req.body.status === "brouillon" ? "brouillon" : "soumis";

  const membres = await db.cellules.listMembres(cellule.id);
  const ids = new Set(membres.map((m) => m.id));
  const presences = (Array.isArray(req.body.presences) ? req.body.presences : []).map((p) => {
    if (!p || !ids.has(p.membreId)) throw ApiError.badRequest("Membre invalide");
    if (!PRESENCE.includes(p.statut)) throw ApiError.badRequest("Statut de présence invalide");
    return { membreId: p.membreId, statut: p.statut };
  });

  const fiche = await db.cellules.submitFiche({
    celluleId: cellule.id, year, week, status,
    remarques: str(req.body.remarques) || null, presences,
  });
  res.status(201).json(fiche);
}

module.exports = { list, leaders, createLeader, create, update, getOne, addMembre, removeMembre, submitFiche };
