const db = require("../db");
const ApiError = require("../utils/ApiError");
const { parseWeek, currentWeek } = require("../utils/week");
const { streamRapportHebdoPdf, RENDERERS } = require("../utils/rapportHebdoPdf");
const storage = require("../utils/storage");
const { hasFicheContent } = require("../utils/ficheContent");
const { sendPushToUser } = require("../utils/push");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 Mo — largement suffisant pour une photo de registre

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);
const readsAll = (role) => db.READ_ALL_ROLES.includes(role);

// Types de fiches pris en charge (un modèle par département/rôle).
const TYPES = new Set(Object.keys(RENDERERS));
// Fiche mensuelle remise au Pasteur : réservée aux leaders.
const LEADER_ONLY_TYPES = new Set(["leader_mensuel"]);

function scopeFor(user) {
  if (readsAll(user.role)) return undefined; // Pasteur/PR/Secrétaire voient tout
  return { authorId: user.sub };
}

function canRead(user, rapport) {
  if (readsAll(user.role)) return true;
  return rapport.authorId === user.sub;
}

const EMPTY_FICHE_MESSAGE =
  "La fiche est vide : remplissez au moins une ligne ou ajoutez une photo de la fiche papier avant de la soumettre.";

// Push immédiat au Pasteur / à la PR quand une fiche est soumise (en plus du
// récapitulatif planifié). Best-effort : n'échoue jamais la requête.
function notifySubmitted(rapport, user) {
  (async () => {
    const admins = (await db.users.listAllActive()).filter((u) => db.ADMIN_ROLES.includes(u.role) && u.id !== user.sub);
    const mensuel = rapport.type === "leader_mensuel";
    await Promise.all(admins.map((a) => sendPushToUser(a.id, {
      title: mensuel ? "Rapport mensuel reçu" : "Nouvelle fiche soumise",
      body: `${rapport.authorName || "Un responsable"}${rapport.departmentName ? " · " + rapport.departmentName : ""}`,
      url: "/rapports-hebdo",
    })));
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[push] notification de soumission échouée :", err.message);
  });
}

// « NOM Prénom(s) » tel qu'écrit sur les fiches papier → { lastName, firstName }.
function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  return { lastName: parts[0] || "", firstName: parts.slice(1).join(" ") };
}

// Fiche des encadreurs : chaque âme saisie dans le tableau entre directement
// dans l'annuaire (rattachée à l'auteur de la fiche), sauf si elle y est déjà
// — même numéro de téléphone ou, à défaut de numéro, même nom.
async function syncEncadreursToAnnuaire(rapport) {
  const result = { added: 0, existing: 0 };
  if (rapport.type !== "superviseur" || !rapport.authorId) return result;
  for (const row of rapport.lignes || []) {
    const nom = String(row.nomsAme || "").trim();
    const phone = String(row.telephone || "").trim();
    if (!nom) continue;
    const found = (phone && (await db.assignes.findByPhone(phone))) || (await db.assignes.findByFullName(nom));
    if (found) { result.existing += 1; continue; }
    const { lastName, firstName } = splitName(nom);
    await db.assignes.create({
      firstName,
      lastName,
      phone: phone || null,
      dirigeantId: rapport.authorId,
      statut: "nouveau",
      firstSeenAt: new Date().toISOString().slice(0, 10),
      notes: row.faiseur ? `Ajouté depuis la fiche des encadreurs — faiseur de disciples : ${row.faiseur}` : "Ajouté depuis la fiche des encadreurs",
    });
    result.added += 1;
  }
  return result;
}

// GET /api/rapports-hebdo?type&year&week
async function list(req, res) {
  const { type, year, week } = req.query;
  const data = await db.rapportsHebdo.list({
    type: type || undefined,
    year: year || undefined,
    week: week || undefined,
    scope: scopeFor(req.user),
  });
  res.json({ data });
}

// GET /api/rapports-hebdo/:id
async function getOne(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  res.json(rapport);
}

// POST /api/rapports-hebdo — crée un rapport (brouillon ou soumis).
async function create(req, res) {
  const type = String(req.body.type || "");
  if (!TYPES.has(type)) throw ApiError.badRequest("Type de rapport inconnu");
  if (LEADER_ONLY_TYPES.has(type) && req.user.role !== "leader") {
    throw ApiError.forbidden("La fiche mensuelle est réservée aux leaders");
  }

  const { year, week } = req.body.year && req.body.week ? parseWeek(req.body) : currentWeek();
  const entete = req.body.entete && typeof req.body.entete === "object" ? req.body.entete : {};
  const lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  const status = req.body.status === "soumis" ? "soumis" : "brouillon";
  if (status === "soumis" && !hasFicheContent({ type, entete, lignes })) {
    throw ApiError.badRequest(EMPTY_FICHE_MESSAGE);
  }

  const rapport = await db.rapportsHebdo.create({
    type,
    authorId: req.user.sub,
    departmentId: req.body.departmentId ?? req.user.departmentId ?? null,
    year, week, entete, lignes, status,
  });
  const annuaire = status === "soumis" ? await syncEncadreursToAnnuaire(rapport) : undefined;
  if (status === "soumis") notifySubmitted(rapport, req.user);
  res.status(201).json(annuaire ? { ...rapport, annuaire } : rapport);
}

async function loadOwnEditable(req) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (rapport.authorId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez modifier que vos propres rapports");
  }
  return rapport;
}

// PUT /api/rapports-hebdo/:id — met à jour l'en-tête / les lignes / le statut.
async function update(req, res) {
  const rapport = await loadOwnEditable(req);
  const fields = {};
  if (req.body.entete !== undefined) fields.entete = req.body.entete;
  if (req.body.lignes !== undefined) fields.lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  if (req.body.status !== undefined) {
    if (!["brouillon", "soumis", "valide"].includes(req.body.status)) {
      throw ApiError.badRequest("Statut invalide");
    }
    fields.status = req.body.status;
  }
  if (fields.status === "soumis") {
    const attachments = await db.rapportAttachments.listByRapport(rapport.id);
    const ok = hasFicheContent({
      type: rapport.type,
      entete: fields.entete ?? rapport.entete,
      lignes: fields.lignes ?? rapport.lignes,
      attachmentCount: attachments.length,
    });
    if (!ok) throw ApiError.badRequest(EMPTY_FICHE_MESSAGE);
  }
  const updated = await db.rapportsHebdo.update(req.params.id, fields);
  const annuaire = updated.status === "soumis" ? await syncEncadreursToAnnuaire(updated) : undefined;
  if (fields.status === "soumis" && rapport.status !== "soumis") notifySubmitted(updated, req.user);
  res.json(annuaire ? { ...updated, annuaire } : updated);
}

// DELETE /api/rapports-hebdo/:id
async function remove(req, res) {
  await loadOwnEditable(req);
  await db.rapportsHebdo.remove(req.params.id);
  res.status(204).end();
}

// GET /api/rapports-hebdo/:id/pdf
async function pdf(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  await streamRapportHebdoPdf(rapport, res);
}

// GET /api/rapports-hebdo/:id/attachments — photo(s) de la fiche papier.
async function listAttachments(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  const data = await db.rapportAttachments.listByRapport(req.params.id);
  res.json({ data: data.map((a) => ({ id: a.id, mimeType: a.mimeType, sizeBytes: a.sizeBytes, createdAt: a.createdAt })) });
}

// POST /api/rapports-hebdo/:id/attachments — multipart, champ "file".
async function uploadAttachment(req, res) {
  await loadOwnEditable(req);
  if (!req.file) throw ApiError.badRequest("Aucun fichier reçu.");
  if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
    throw ApiError.badRequest("Seules les images (JPEG, PNG, WEBP, HEIC) sont acceptées.");
  }
  if (req.file.size > MAX_ATTACHMENT_BYTES) {
    throw ApiError.badRequest("Fichier trop volumineux (8 Mo maximum).");
  }

  const storagePath = await storage.uploadFile({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: `rapports-hebdo/${req.params.id}`,
  });
  const attachment = await db.rapportAttachments.create({
    rapportId: req.params.id,
    uploaderId: req.user.sub,
    storagePath,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
  res.status(201).json({ id: attachment.id, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, createdAt: attachment.createdAt });
}

// GET /api/rapports-hebdo/:id/attachments/:attachmentId — affiche le fichier
// (redirige vers un lien signé Supabase en prod, streame le fichier local en dev).
async function downloadAttachment(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  const attachment = await db.rapportAttachments.findById(req.params.attachmentId);
  if (!attachment || attachment.rapportId !== req.params.id) throw ApiError.notFound("Pièce jointe introuvable");

  if (storage.useSupabase) {
    const url = await storage.getSignedUrl(attachment.storagePath);
    return res.redirect(url);
  }
  const buffer = storage.readLocalFile(attachment.storagePath);
  res.setHeader("Content-Type", attachment.mimeType);
  res.send(buffer);
}

// DELETE /api/rapports-hebdo/:id/attachments/:attachmentId
async function removeAttachment(req, res) {
  await loadOwnEditable(req);
  const attachment = await db.rapportAttachments.findById(req.params.attachmentId);
  if (!attachment || attachment.rapportId !== req.params.id) throw ApiError.notFound("Pièce jointe introuvable");
  await storage.removeFile(attachment.storagePath);
  await db.rapportAttachments.remove(attachment.id);
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove, pdf, listAttachments, uploadAttachment, downloadAttachment, removeAttachment };