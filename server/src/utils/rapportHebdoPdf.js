const PDFDocument = require("pdfkit");

const INDIGO = "#534ab7";
const INK = "#1a1530";
const MUTED = "#6b6679";
const LINE = "#c9c7d1";
const HEADFILL = "#ece9fb";

function safeName(s, fallback) {
  return (
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .slice(0, 60) || fallback
  );
}

// Formate une date ISO (YYYY-MM-DD, venant du calendrier) en français long ;
// laisse la valeur telle quelle si ce n'est pas une date ISO.
function formatDateFr(v) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  if (!m) return String(v);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function beginPdf(res, filename) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);
  return doc;
}

function churchHeader(doc, sousTitre) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // Pastille ronde en guise de logo (initiales CSP).
  const logoR = 20;
  const logoCx = left + logoR;
  const logoCy = doc.y + logoR;
  doc.save();
  doc.circle(logoCx, logoCy, logoR).lineWidth(1.5).strokeColor(INDIGO).stroke();
  doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(13)
    .text("CSP", logoCx - logoR, logoCy - 6, { width: logoR * 2, align: "center" });
  doc.restore();

  // Bloc texte à droite du logo.
  const tx = left + logoR * 2 + 14;
  const tw = right - tx;
  doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(15)
    .text("CATHÉDRALE DES SIGNES ET PRODIGES", tx, doc.y + 2, { width: tw });
  doc.fillColor(INK).font("Helvetica").fontSize(8.5)
    .text("Mission évangélique — Assemblée de Living Water — Living Water Ministry", tx, doc.y + 1, { width: tw });
  doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
    .text("Tél : +237 653 11 47 66  /  690 48 65 20", tx, doc.y + 1, { width: tw });

  // Filet double sous l'en-tête.
  const lineY = Math.max(doc.y, logoCy + logoR) + 8;
  doc.strokeColor(INDIGO).lineWidth(1.5).moveTo(left, lineY).lineTo(right, lineY).stroke();
  doc.strokeColor(INDIGO).lineWidth(0.5).moveTo(left, lineY + 2.5).lineTo(right, lineY + 2.5).stroke();

  // Bandeau titre (pilule pleine).
  doc.y = lineY + 12;
  const titleH = 24;
  const ty = doc.y;
  doc.save();
  doc.roundedRect(left, ty, width, titleH, 5).fill(INDIGO);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12)
    .text(sousTitre.toUpperCase(), left, ty + 6, { width, align: "center", characterSpacing: 0.5 });
  doc.restore();
  doc.y = ty + titleH + 12;
}

// Dessine une ligne de tableau ; renvoie la nouvelle position Y.
function drawRow(doc, x, y, widths, cells, { header = false, minHeight = 18, aligns = [] } = {}) {
  const padX = 4;
  doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(header ? 8.5 : 9);
  // hauteur nécessaire (multi-lignes éventuelles)
  let h = minHeight;
  cells.forEach((c, i) => {
    const wText = widths[i] - padX * 2;
    const th = doc.heightOfString(String(c ?? ""), { width: wText });
    h = Math.max(h, th + 8);
  });
  if (header) {
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), h).fill(HEADFILL);
  }
  doc.fillColor(INK);
  let cx = x;
  cells.forEach((c, i) => {
    doc.rect(cx, y, widths[i], h).strokeColor(LINE).lineWidth(0.7).stroke();
    doc.fillColor(header ? INDIGO : INK)
      .text(String(c ?? ""), cx + padX, y + 4, { width: widths[i] - padX * 2, align: aligns[i] || "left" });
    cx += widths[i];
  });
  return y + h;
}

// Cadre d'en-tête réutilisable : liste de paires [label, valeur].
function infoBox(doc, pairs) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const boxW = right - left;
  const rowH = 17;
  const boxH = rowH * pairs.length + 10;
  const boxY = doc.y;
  doc.save();
  doc.roundedRect(left, boxY, boxW, boxH, 5).fillAndStroke(HEADFILL, LINE);
  doc.restore();
  let iy = boxY + 6;
  for (const [label, val] of pairs) {
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9).text(`${label}`, left + 10, iy + 2, { width: 150 });
    doc.fillColor(INK).font("Helvetica").fontSize(10).text(val ?? "—", left + 165, iy + 1, { width: boxW - 175 });
    iy += rowH;
  }
  doc.y = boxY + boxH + 12;
}

// Pied de page commun.
function pdfFooter(doc) {
  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`Généré depuis SSA — ${new Date().toLocaleDateString("fr-FR")}`, doc.page.margins.left, doc.y);
}

// ---- Fiche HUISSIER (rapport d'assiduité) ---------------------------------
function renderHuissier(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Rapport d'assiduité");

  infoBox(doc, [
    ["Département", e.departement || r.departmentName || "—"],
    ["Date", formatDateFr(e.date) || "—"],
    ["Nom du leader", e.nomLeader || "—"],
    ["Total de membres présents", e.totalPresents != null && e.totalPresents !== "" ? String(e.totalPresents) : "—"],
  ]);

  // Tableau
  const x = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // N°, Nom, Téléphone, Lieu, N° Culte, Présent, Absent
  const widths = [26, totalW - 26 - 90 - 80 - 55 - 50 - 50, 90, 80, 55, 50, 50];
  let y = drawRow(doc, x, doc.y, widths, ["N°", "Nom", "Téléphone", "Lieu", "N° Culte", "Présent", "Absent"], { header: true, aligns: ["center", "left", "left", "left", "center", "center", "center"] });

  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  rows.forEach((row, i) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; }
    y = drawRow(doc, x, y, widths, [
      String(i + 1),
      row.nom || "",
      row.telephone || "",
      row.lieu || "",
      row.numeroCulte || "",
      row.present ? "X" : "",
      row.present === false ? "X" : "",
    ], { aligns: ["center", "left", "left", "left", "center", "center", "center"] });
  });

  pdfFooter(doc);
}

// ---- Fiche FAISEUR DE DISCIPLES (DÉPARTEMENT DU SUIVI) ---------------------
function renderFaiseurDisciples(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Rapport hebdomadaire — Faiseur de Disciples");

  infoBox(doc, [
    ["Département", "Suivi (Faiseurs de Disciples)"],
    ["Nom du faiseur de disciples", e.nomFaiseur || "—"],
    ["Rapport de la semaine du", formatDateFr(e.date) || "—"],
  ]);

  const x = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // N°, Noms & Prénoms, Quartier, Téléphone, Leçon, Observations, Prés./Abs.
  const wNum = 24, wQuartier = 62, wTel = 72, wLecon = 40, wPA = 58;
  const wObs = 130;
  const wNom = totalW - wNum - wQuartier - wTel - wLecon - wObs - wPA;
  const widths = [wNum, wNom, wQuartier, wTel, wLecon, wObs, wPA];
  const headers = ["N°", "Noms & Prénoms", "Quartier", "Téléphone", "Leçon", "Observations", "Prés./Abs."];
  const aligns = ["center", "left", "left", "left", "center", "left", "center"];
  let y = drawRow(doc, x, doc.y, widths, headers, { header: true, aligns });

  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  rows.forEach((row, i) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; }
    const pa = row.present === true ? "P" : row.present === false ? "A" : "";
    y = drawRow(doc, x, y, widths, [
      String(i + 1),
      row.nom || "",
      row.quartier || "",
      row.telephone || "",
      row.lecon || "",
      row.observations || "",
      pa,
    ], { aligns });
  });

  pdfFooter(doc);
}

// ---- Fiche des SUPERVISEURS (DÉPARTEMENT DU SUIVI) ------------------------
function renderSuperviseur(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Fiche des Superviseurs");

  infoBox(doc, [
    ["Département", "Suivi (Superviseurs)"],
    ["Noms & prénoms du superviseur", e.nomSuperviseur || "—"],
    ["Téléphone", e.telephone || "—"],
    ["Rapport de la semaine du", formatDateFr(e.date) || "—"],
  ]);

  const x = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // Faiseur | [ N° | Téléphone | Noms si nécessaire ] | Commentaires
  const wFaiseur = 130, wNum = 26, wTel = 74, wNoms = 118;
  const wComm = totalW - wFaiseur - wNum - wTel - wNoms;
  const widths = [wFaiseur, wNum, wTel, wNoms, wComm];
  const rowH = 18;

  // En-tête à deux niveaux.
  const y0 = doc.y;
  const drawCell = (cx, cy, w, h, label, fill) => {
    if (fill) doc.rect(cx, cy, w, h).fill(HEADFILL);
    doc.rect(cx, cy, w, h).strokeColor(LINE).lineWidth(0.7).stroke();
    doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(8.5)
      .text(label, cx + 3, cy + h / 2 - 5, { width: w - 6, align: "center" });
  };
  // tier haut
  drawCell(x, y0, wFaiseur, rowH * 2, "Faiseur de Disciples", true);
  drawCell(x + wFaiseur, y0, wNum + wTel + wNoms, rowH, "Informations sur l'âme", true);
  drawCell(x + wFaiseur + wNum + wTel + wNoms, y0, wComm, rowH * 2, "Commentaires / Observations", true);
  // tier bas (sous « Informations sur l'âme »)
  drawCell(x + wFaiseur, y0 + rowH, wNum, rowH, "N°", true);
  drawCell(x + wFaiseur + wNum, y0 + rowH, wTel, rowH, "Téléphone", true);
  drawCell(x + wFaiseur + wNum + wTel, y0 + rowH, wNoms, rowH, "Noms si nécessaire", true);

  let y = y0 + rowH * 2;
  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  rows.forEach((row, i) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; }
    y = drawRow(doc, x, y, widths, [
      row.faiseur || "",
      String(i + 1),
      row.telephone || "",
      row.nomsAme || "",
      row.commentaires || "",
    ], { aligns: ["left", "center", "left", "left", "left"] });
  });

  pdfFooter(doc);
}

const RENDERERS = {
  huissier: { title: "rapport_assiduite", render: renderHuissier },
  faiseur_disciples: { title: "rapport_faiseur_disciples", render: renderFaiseurDisciples },
  superviseur: { title: "fiche_superviseurs", render: renderSuperviseur },
};

function streamRapportHebdoPdf(rapport, res) {
  const conf = RENDERERS[rapport.type];
  const filename = safeName(conf ? conf.title : rapport.type, "rapport");
  const doc = beginPdf(res, filename);
  if (conf) conf.render(doc, rapport);
  else {
    churchHeader(doc, "Rapport hebdomadaire");
    doc.fillColor(INK).text("Type de rapport non pris en charge.");
  }
  doc.end();
}

module.exports = { streamRapportHebdoPdf, RENDERERS };