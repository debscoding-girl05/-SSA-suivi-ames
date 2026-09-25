const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// Logo officiel de la Cathédrale (en-tête de tous les PDF).
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-csp.jpg");

// L'emblème est rond sur fond noir : on le découpe en cercle.
function drawLogo(doc, x, y, size) {
  if (!fs.existsSync(LOGO_PATH)) return;
  doc.save();
  doc.circle(x + size / 2, y + size / 2, size / 2 - 0.5).clip();
  doc.image(LOGO_PATH, x, y, { width: size, height: size });
  doc.restore();
}

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

// Rend le PDF en mémoire avant d'écrire quoi que ce soit sur `res` : si un
// renderer plante en cours de route (entete/lignes malformées), la réponse
// n'a encore rien reçu et l'appelant peut renvoyer une erreur JSON propre
// plutôt qu'un PDF tronqué/corrompu (ce qui arrivait avec un pipe direct).
function renderToBuffer(renderFn, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", layout: opts.layout || "portrait", margin: opts.margin || 40 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      renderFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function churchHeader(doc, sousTitre) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // Logo officiel (repli : pastille « CSP » si le fichier manque).
  const logoR = 24;
  const logoCx = left + logoR;
  const logoCy = doc.y + logoR;
  if (fs.existsSync(LOGO_PATH)) {
    drawLogo(doc, left, doc.y, logoR * 2);
  } else {
    doc.save();
    doc.circle(logoCx, logoCy, logoR).lineWidth(1.5).strokeColor(INDIGO).stroke();
    doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(13)
      .text("CSP", logoCx - logoR, logoCy - 6, { width: logoR * 2, align: "center" });
    doc.restore();
  }

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
function drawRow(doc, x, y, widths, cells, { header = false, minHeight = 18, aligns = [], fills = null, border = LINE } = {}) {
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
    if (!header && fills && fills[i]) doc.rect(cx, y, widths[i], h).fill(fills[i]);
    doc.rect(cx, y, widths[i], h).strokeColor(border).lineWidth(0.7).stroke();
    doc.fillColor(header ? INDIGO : INK)
      .text(String(c ?? ""), cx + padX, y + 4, { width: widths[i] - padX * 2, align: aligns[i] || "left" });
    cx += widths[i];
  });
  // Le curseur texte suit le tableau : ce qui vient après (pied de page,
  // sections) ne chevauche plus la dernière ligne.
  doc.y = y + h + 4;
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
    .text(`Généré depuis CSP-SSA — ${new Date().toLocaleDateString("fr-FR")}`, doc.page.margins.left, doc.y);
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

// ---- Fiche des ENCADREURS (DÉPARTEMENT DU SUIVI) --------------------------
// Anciennement « Fiche des Superviseurs » : le type reste `superviseur` en
// base (compatibilité des fiches existantes), seul le libellé change.
function renderSuperviseur(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Fiche des Encadreurs");

  infoBox(doc, [
    ["Département", "Suivi (Encadreurs)"],
    ["Noms & prénoms de l'encadreur", e.nomSuperviseur || "—"],
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

// ---- Fiche CELLULE DE PRIÈRE (questionnaire bilingue) ---------------------
function sectionTitle(doc, txt) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  if (doc.y > doc.page.height - 90) { doc.addPage(); }
  doc.moveDown(0.4);
  const y = doc.y;
  doc.save();
  doc.rect(left, y, right - left, 16).fill(HEADFILL);
  doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(9.5)
    .text(txt, left + 6, y + 3.5, { width: right - left - 12 });
  doc.restore();
  doc.y = y + 16 + 6;
}

// Une question numérotée bilingue + sa réponse.
function qLine(doc, num, labelFr, labelEn, value) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  if (doc.y > doc.page.height - 70) { doc.addPage(); }
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5)
    .text(`${num}.  `, left, doc.y, { continued: true })
    .font("Helvetica").text(labelFr, { width: w });
  if (labelEn) {
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8)
      .text(labelEn, left + 14, doc.y, { width: w - 14 });
  }
  doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(11)
    .text(value != null && value !== "" ? String(value) : "—", left + 14, doc.y + 1, { width: w - 14 });
  doc.moveDown(0.5);
}

function renderCellulePriere(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Rapport hebdomadaire de cellule de prière");

  infoBox(doc, [
    ["Date", formatDateFr(e.date) || "—"],
    ["Nom de la cellule", e.nomCellule || "—"],
    ["Leader", e.leader || "—"],
    ["Téléphone", e.telephone || "—"],
  ]);

  const totalPresents = e.totalPresents != null && e.totalPresents !== ""
    ? e.totalPresents
    : ((Number(e.hommes) || 0) + (Number(e.femmes) || 0) + (Number(e.adolescents) || 0) + (Number(e.enfants) || 0));

  sectionTitle(doc, "I — ASSIDUITÉ AUX RÉUNIONS / DILIGENCE TO HOUSE CELL AND SERVICES");
  qLine(doc, 1, "Combien d'hommes ont assisté à la cellule de prière ?", "How many men attended to the house cell ?", e.hommes);
  qLine(doc, 2, "Combien de femmes ont assisté à la cellule de prière ?", "How many women attended to the house cell ?", e.femmes);
  qLine(doc, 3, "Combien d'adolescents (10-19 ans) ont assisté ?", "How many teenagers (10-19 years old) attended ?", e.adolescents);
  qLine(doc, 4, "Combien d'enfants (0-9 ans) ont assisté ?", "How many children (0-9 years old) attended ?", e.enfants);
  qLine(doc, 5, "Total des personnes présentes à la cellule de prière", "Total of people who attended to the house cell", totalPresents);
  qLine(doc, 6, "Dévotionnel : Thème du jour", "Meditation booklet: Title of the day", e.themeDevotionnel);
  qLine(doc, 7, "Total des membres de la cellule présents au culte du dimanche", "Total of members who attended to the service of Sunday", e.totalMembresCulte);
  qLine(doc, 8, "Cas à signaler", "Case to signal", e.casASignaler);

  sectionTitle(doc, "II — ÉVANGÉLISATION / EVANGELISM");
  qLine(doc, 1, "Avez-vous évangélisé cette semaine ? (Oui / Non)", "Did you go out for evangelization this week ?", e.aEvangelise);
  qLine(doc, 2, "Si oui, combien d'âmes avez-vous évangélisées ?", "If yes, how many souls did you win for Christ ?", e.nbAmes);
  qLine(doc, 3, "Total des âmes évangélisées présentes au culte du dimanche", "Total of souls evangelized who attended to the service of Sunday", e.totalAmesCulte);
  qLine(doc, 4, "Si non, pourquoi n'avez-vous pas évangélisé ?", "If no, why did you not evangelize ?", e.raisonNon);

  doc.moveDown(1);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.fillColor(INK).font("Helvetica").fontSize(9)
    .text(`Date et signature du Leader / Date and signature of the Leader : ${e.leader || ""}`, left, doc.y, { width: right - left });
  doc.moveDown(0.3);
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Contrôlé par / Checked by : ______________________", left, doc.y);

  pdfFooter(doc);
}

// ---- Fiche de SUIVI DES CHORISTES (Chorale) — format paysage --------------
const CH_DAYS = [
  ["lundi", "Lundi"], ["mardi", "Mardi"], ["mercredi", "Mercredi"], ["jeudi", "Jeudi"],
  ["vendredi", "Vendredi"], ["samedi", "Samedi"], ["dimanche", "Dimanche"],
];
// Même ordre et mêmes libellés que la fiche papier officielle.
const CH_PRES = [
  ["mardi", "Mardi"], ["jeudi", "Jeudi"],
  ["vendredi", "Vendredi (nuit de solutions ou nuit de prière des ouvriers)"], ["dimanche", "Dimanche"],
];

// ---- Fiche de suivi hebdomadaire des CHORISTES ------------------------------
// Reproduit la fiche papier : logo à gauche, bandeau titre gris foncé, ligne
// « Encadreur / Groupe de croissance / Semaine du », puis le tableau en
// en-têtes gris / noir alternés et une colonne noire entre les deux blocs.
function renderChoristes(doc, r) {
  const e = r.entete || {};
  const GREY = "#595959";
  const BLACK = "#111111";
  const BAND = "#3f3f3f";
  const BORDER = "#000000";
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const totalW = right - left;

  // En-tête : logo + bandeau titre + ligne d'informations.
  const top = doc.y;
  const logoSize = 62;
  drawLogo(doc, left + 20, top, logoSize);
  const bandX = left + 170;
  const bandW = right - bandX;
  doc.rect(bandX, top + 4, bandW, 30).fill(BAND);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15)
    .text("FICHE DE SUIVI HEBDOMADAIRE DES CHORISTES", bandX, top + 12, { width: bandW, align: "center" });
  const infoY = top + 44;
  const field = (label, value, x, w) => {
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9).text(label, x, infoY, { continued: false });
    const lw = doc.widthOfString(label) + 4;
    doc.moveTo(x + lw, infoY + 10).lineTo(x + w - 10, infoY + 10).dash(1, { space: 1.5 }).strokeColor(MUTED).lineWidth(0.6).stroke().undash();
    doc.fillColor(INK).font("Helvetica-Oblique").fontSize(10).text(value || "", x + lw + 4, infoY - 1, { width: w - lw - 16, lineBreak: false });
  };
  const third = bandW / 3;
  field("Encadreur :", e.encadreur, bandX, third);
  field("Groupe de croissance :", e.groupe, bandX + third, third);
  field("Semaine du :", e.date ? formatDateFr(e.date).replace(/^\w+ /, "") : "", bandX + 2 * third, third);

  // Géométrie du tableau (A4 paysage, marges 30).
  const wNum = 22, wMembres = 96, wTel = 70, cCell = 24, wSep = 8;
  const presW = [36, 34, 70, 50];
  const xN = left, xMembres = xN + wNum, xTel = xMembres + wMembres, xDays = xTel + wTel;
  const xSep = xDays + CH_DAYS.length * 2 * cCell;
  const xPres = xSep + wSep;
  const xRem = xPres + presW.reduce((a, b) => a + b, 0);
  const wRem = right - xRem;

  const hBand = 14, hDay = 13, hHead = 34;
  const y0 = infoY + 26;
  const tint = (i) => (i % 2 === 0 ? GREY : BLACK);
  const cell = (cx, cy, w, h, label, fill, size = 7) => {
    if (fill) doc.rect(cx, cy, w, h).fill(fill);
    doc.rect(cx, cy, w, h).strokeColor(BORDER).lineWidth(0.6).stroke();
    if (label) {
      doc.fillColor(fill ? "#ffffff" : INK).font("Helvetica-Bold").fontSize(size);
      const th = doc.heightOfString(label, { width: w - 3 });
      doc.text(label, cx + 1.5, cy + Math.max(1.5, (h - th) / 2), { width: w - 3, align: "center", lineGap: -1 });
    }
  };

  // Bandeaux de section.
  cell(xDays, y0, CH_DAYS.length * 2 * cCell, hBand, "CROISSANCE SPIRITUELLE", BAND, 9);
  cell(xPres, y0, xRem + wRem - xPres, hBand, "PRÉSENCE À L'ÉGLISE", BAND, 9);
  // Ligne des jours (croissance).
  CH_DAYS.forEach(([, label], i) => cell(xDays + i * 2 * cCell, y0 + hBand, 2 * cCell, hDay, label, tint(i), 8));
  // En-têtes de colonnes.
  const yH = y0 + hBand + hDay;
  cell(xN, yH, wNum, hHead, "N°", GREY, 8);
  cell(xMembres, yH, wMembres, hHead, "Membres", GREY, 9);
  cell(xTel, yH, wTel, hHead, "Téléphone", GREY, 8.5);
  CH_DAYS.forEach((_, i) => {
    cell(xDays + i * 2 * cCell, yH, cCell, hHead, "Bible", tint(i), 5.8);
    cell(xDays + i * 2 * cCell + cCell, yH, cCell, hHead, "Livret", tint(i), 5.8);
  });
  let px = xPres;
  CH_PRES.forEach(([, label], i) => { cell(px, yH, presW[i], hHead, label, tint(i), i === 2 ? 5.8 : 7); px += presW[i]; });
  cell(xRem, yH, wRem, hHead, "Remarques", GREY, 9);

  // Lignes de données.
  const widths = [wNum, wMembres, wTel, ...Array(CH_DAYS.length * 2).fill(cCell), wSep, ...presW, wRem];
  const aligns = ["center", "center", "center", ...Array(CH_DAYS.length * 2).fill("center"), "center", ...Array(CH_PRES.length).fill("center"), "left"];
  const fills = [null, null, null, ...Array(CH_DAYS.length * 2).fill(null), BLACK, ...Array(CH_PRES.length).fill(null), null];
  let y = yH + hHead;
  const sepTop = y0 + hBand;
  const rows = Array.isArray(r.lignes) && r.lignes.length ? r.lignes : [];
  // Toujours au moins 10 lignes, comme la fiche imprimée (lignes vides à la main).
  const padded = rows.concat(Array(Math.max(0, 10 - rows.length)).fill(null));
  padded.forEach((row, idx) => {
    if (y > doc.page.height - 50) { doc.addPage(); y = doc.page.margins.top; }
    const cr = row?.croissance || {};
    const pr = row?.presence || {};
    const cells = [String(idx + 1), row?.membre || "", row?.telephone || ""];
    CH_DAYS.forEach(([key]) => { cells.push(cr[key]?.bible ? "X" : ""); cells.push(cr[key]?.livret ? "X" : ""); });
    cells.push("");
    CH_PRES.forEach(([key]) => cells.push(pr[key] ? "X" : ""));
    cells.push(row?.remarques || "");
    y = drawRow(doc, left, y, widths, cells, { aligns, minHeight: 20, fills, border: BORDER });
  });
  // Colonne noire de séparation sur toute la hauteur (bandeau → dernière ligne).
  doc.rect(xSep, sepTop, wSep, yH + hHead - sepTop).fill(BLACK);
  void totalW;

  doc.y = y + 6;
  pdfFooter(doc);
}

// ---- Fiche RAPPORT D'ASSIDUITÉ DES OUVRIERS (Audiovisuel) -----------------
function renderAudiovisuel(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Rapport d'assiduité des ouvriers");

  const semaine = (e.semaineDu || e.semaineAu)
    ? `Du ${e.semaineDu || "…"} au ${e.semaineAu || "…"}`
    : "—";
  infoBox(doc, [
    ["Département", "Audiovisuel"],
    ["Mois", e.mois || "—"],
    ["Semaine", semaine],
    ["Nom de l'encadreur", e.encadreur || "—"],
    ["Nombre de membres sous le leadership", e.nombreMembres != null && e.nombreMembres !== "" ? String(e.nombreMembres) : "—"],
  ]);

  // Légende
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.5)
    .text("Légende : ", doc.page.margins.left, doc.y, { continued: true })
    .font("Helvetica")
    .text("P = Présent  ·  R = Retard  ·  A = Absent  ·  E = Excusé  ·  M = Mission spéciale");
  doc.moveDown(0.5);

  const x0 = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // No, Nom, Téléphone, M, J, Nuits de prières, Prog.Spécial, Dim., Remarques
  const wNo = 20, wNom = 88, wTel = 62, wM = 20, wJ = 20, wNuits = 44, wProg = 44, wDim = 24;
  const wRem = totalW - wNo - wNom - wTel - wM - wJ - wNuits - wProg - wDim;
  const widths = [wNo, wNom, wTel, wM, wJ, wNuits, wProg, wDim, wRem];
  const headers = ["N°", "Nom des ouvriers", "Téléphone", "M", "J", "Nuits de prières", "Prog. Spécial", "Dim.", "Remarques / Observations"];
  const aligns = ["center", "left", "left", "center", "center", "center", "center", "center", "left"];
  let y = drawRow(doc, x0, doc.y, widths, headers, { header: true, aligns, minHeight: 28 });

  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  rows.forEach((row, i) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; }
    const rem = [
      `C.P & Samedi = ${row.cpSamedi || ""}   Devo = ${row.devo || ""}   Service = ${row.service || ""}`,
      `Xtère = ${row.xtere || ""}`,
    ].join("\n");
    y = drawRow(doc, x0, y, widths, [
      String(i + 1),
      row.nom || "",
      row.telephone || "",
      row.m || "",
      row.j || "",
      row.nuitsPrieres || "",
      row.progSpecial || "",
      row.dim || "",
      rem,
    ], { aligns, minHeight: 26 });
  });

  // Section libre
  doc.moveDown(1.2);
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(11)
    .text("REMARQUE PARTICULIÈRE CONCERNANT CERTAINS CAS", doc.page.margins.left, doc.y);
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor(INK)
    .text(e.remarquesParticulieres || "—", { width: totalW, lineGap: 3 });

  pdfFooter(doc);
}

// ---- Fiche MENSUELLE du LEADER (remise au Pasteur) ------------------------
function formatMonthFr(v) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v || "").trim());
  if (!m) return v ? String(v) : "";
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function renderLeaderMensuel(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Rapport mensuel du leader");
  const val = (v) => (v != null && v !== "" ? String(v) : "—");

  infoBox(doc, [
    ["Mois", formatMonthFr(e.mois) || "—"],
    ["Département", e.departement || r.departmentName || "—"],
    ["Nom du leader", e.nomLeader || "—"],
    ["Téléphone", e.telephone || "—"],
  ]);

  sectionTitle(doc, "I — EFFECTIFS DU MOIS");
  qLine(doc, 1, "Nombre de membres suivis", null, val(e.effectifMembres));
  qLine(doc, 2, "Nombre d'encadreurs", null, val(e.effectifEncadreurs));
  qLine(doc, 3, "Présence moyenne aux cultes", null, val(e.presenceMoyenne));
  qLine(doc, 4, "Nouveaux venus / nouvelles âmes du mois", null, val(e.nouveauxVenus));

  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  if (rows.length) {
    sectionTitle(doc, "II — SUIVI DES ENCADREURS");
    const x = doc.page.margins.left;
    const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const widths = [26, 150, 70, 80, totalW - 26 - 150 - 70 - 80];
    const aligns = ["center", "left", "center", "center", "left"];
    let y = drawRow(doc, x, doc.y, widths, ["N°", "Encadreur", "Membres", "Fiches remises", "Observations"], { header: true, aligns });
    rows.forEach((row, i) => {
      if (y > doc.page.height - 60) { doc.addPage(); y = doc.page.margins.top; }
      y = drawRow(doc, x, y, widths, [
        String(i + 1), row.encadreur || "", val(row.nbMembres), val(row.fichesRemises), row.observations || "",
      ], { aligns });
    });
    doc.y = y + 10;
  }

  sectionTitle(doc, rows.length ? "III — BILAN DU MOIS" : "II — BILAN DU MOIS");
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  for (const [label, v] of [
    ["Activités réalisées", e.activites],
    ["Difficultés rencontrées", e.difficultes],
    ["Besoins / sujets de prière", e.besoins],
    ["Projets pour le mois prochain", e.projets],
  ]) {
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc.fillColor(INDIGO).font("Helvetica-Bold").fontSize(10).text(label, left, doc.y);
    doc.moveDown(0.2);
    doc.fillColor(INK).font("Helvetica").fontSize(10).text(val(v), left, doc.y, { width, lineGap: 2 });
    doc.moveDown(0.6);
  }

  doc.moveDown(0.6);
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Visa du Pasteur : ______________________", left, doc.y);
  pdfFooter(doc);
}

const RENDERERS = {
  huissier: { title: "rapport_assiduite", render: renderHuissier },
  faiseur_disciples: { title: "rapport_faiseur_disciples", render: renderFaiseurDisciples },
  superviseur: { title: "fiche_encadreurs", render: renderSuperviseur },
  cellule_priere: { title: "rapport_cellule_priere", render: renderCellulePriere },
  choristes: { title: "fiche_choristes", render: renderChoristes, layout: "landscape", margin: 30 },
  audiovisuel: { title: "rapport_assiduite_ouvriers", render: renderAudiovisuel },
  leader_mensuel: { title: "rapport_mensuel_leader", render: renderLeaderMensuel },
};

async function streamRapportHebdoPdf(rapport, res) {
  const conf = RENDERERS[rapport.type];
  const filename = safeName(conf ? conf.title : rapport.type, "rapport");
  const buffer = await renderToBuffer(
    (doc) => {
      if (conf) conf.render(doc, rapport);
      else {
        churchHeader(doc, "Rapport hebdomadaire");
        doc.fillColor(INK).text("Type de rapport non pris en charge.");
      }
    },
    { layout: conf?.layout, margin: conf?.margin }
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
  res.send(buffer);
}

module.exports = { streamRapportHebdoPdf, RENDERERS };