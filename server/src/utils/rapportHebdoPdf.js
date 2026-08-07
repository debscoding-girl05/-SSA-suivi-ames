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

function beginPdf(res, filename, opts = {}) {
  const doc = new PDFDocument({ size: "A4", layout: opts.layout || "portrait", margin: opts.margin || 40 });
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
function drawRow(doc, x, y, widths, cells, { header = false, minHeight = 18, aligns = [], fills = null } = {}) {
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
  ["lundi", "Lun"], ["mardi", "Mar"], ["mercredi", "Mer"], ["jeudi", "Jeu"],
  ["vendredi", "Ven"], ["samedi", "Sam"], ["dimanche", "Dim"],
];
const CH_PRES = [
  ["mardi", "Mardi"], ["jeudi", "Jeudi"], ["dimanche", "Dimanche"], ["vendredi", "Vendredi\n(nuit de prière)"],
];

function renderChoristes(doc, r) {
  const e = r.entete || {};
  churchHeader(doc, "Fiche de suivi hebdomadaire des choristes");

  infoBox(doc, [
    ["Département", "Chorale"],
    ["Encadreur", e.encadreur || "—"],
    ["Groupe de croissance", e.groupe || "—"],
    ["Semaine du", formatDateFr(e.date) || "—"],
  ]);

  // Couleurs alternées par jour (pour ne pas s'emmêler au remplissage).
  const DAY_LIGHT = "#efedfb";
  const DAY_DARK = "#d7d1f4";
  const dayTint = (i) => (i % 2 === 0 ? DAY_LIGHT : DAY_DARK);

  const x0 = doc.page.margins.left;
  const cCell = 29, pCell = 42;
  const wNum = 18, wMembres = 75, wTel = 56, wRem = 51;
  const xN = x0, xMembres = xN + wNum, xTel = xMembres + wMembres;
  const xCroissance = xTel + wTel;
  const xPresence = xCroissance + CH_DAYS.length * 2 * cCell;
  const xRemarques = xPresence + CH_PRES.length * pCell;

  const hA = 16, hB = 14, hC = 14;
  const y0 = doc.y;

  // fillArg : true -> HEADFILL ; chaîne -> couleur ; false -> aucun
  const cell = (cx, cy, w, h, label, { size = 7, fill = true, color = INDIGO } = {}) => {
    const fillColor = fill === true ? HEADFILL : fill || null;
    if (fillColor) doc.rect(cx, cy, w, h).fill(fillColor);
    doc.rect(cx, cy, w, h).strokeColor(LINE).lineWidth(0.6).stroke();
    doc.fillColor(color).font("Helvetica-Bold").fontSize(size)
      .text(label, cx + 1, cy + Math.max(2, (h - size) / 2 - 1), { width: w - 2, align: "center", lineGap: -1 });
  };

  // Tier A
  cell(xN, y0, wNum, hA + hB + hC, "N°");
  cell(xMembres, y0, wMembres, hA + hB + hC, "Membres", { size: 8 });
  cell(xTel, y0, wTel, hA + hB + hC, "Téléphone", { size: 7 });
  cell(xCroissance, y0, CH_DAYS.length * 2 * cCell, hA, "CROISSANCE SPIRITUELLE", { size: 8 });
  cell(xPresence, y0, CH_PRES.length * pCell, hA, "PRÉSENCE À L'ÉGLISE", { size: 8 });
  cell(xRemarques, y0, wRem, hA + hB + hC, "Remarques", { size: 7.5 });

  // Tier B (jour) + Tier C (Bible / Livret), couleur alternée par jour
  CH_DAYS.forEach(([, abbr], i) => {
    const dx = xCroissance + i * 2 * cCell;
    const tint = dayTint(i);
    cell(dx, y0 + hA, 2 * cCell, hB, abbr, { size: 8, fill: tint });
    cell(dx, y0 + hA + hB, cCell, hC, "Bible", { size: 5.8, fill: tint });
    cell(dx + cCell, y0 + hA + hB, cCell, hC, "Livret", { size: 5.8, fill: tint });
  });
  CH_PRES.forEach(([, label], i) => {
    cell(xPresence + i * pCell, y0 + hA, pCell, hB + hC, label, { size: 6.5 });
  });

  // Lignes de données
  const widths = [wNum, wMembres, wTel, ...Array(CH_DAYS.length * 2).fill(cCell), ...Array(CH_PRES.length).fill(pCell), wRem];
  // Teintes de fond par colonne (jours alternés), pour guider l'oeil.
  const dayFills = [];
  CH_DAYS.forEach((_, i) => { const t = dayTint(i); dayFills.push(t, t); });
  const fills = [null, null, null, ...dayFills, ...Array(CH_PRES.length).fill(null), null];

  let y = y0 + hA + hB + hC;
  const rows = Array.isArray(r.lignes) ? r.lignes : [];
  rows.forEach((row, idx) => {
    if (y > doc.page.height - 50) { doc.addPage(); y = doc.page.margins.top; }
    const cr = row.croissance || {};
    const pr = row.presence || {};
    const cells = [String(idx + 1), row.membre || "", row.telephone || ""];
    CH_DAYS.forEach(([key]) => {
      cells.push(cr[key]?.bible ? "X" : "");
      cells.push(cr[key]?.livret ? "X" : "");
    });
    CH_PRES.forEach(([key]) => { cells.push(pr[key] ? "X" : ""); });
    cells.push(row.remarques || "");
    const aligns = ["center", "left", "left", ...Array(CH_DAYS.length * 2 + CH_PRES.length).fill("center"), "left"];
    y = drawRow(doc, x0, y, widths, cells, { aligns, minHeight: 16, fills });
  });

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

const RENDERERS = {
  huissier: { title: "rapport_assiduite", render: renderHuissier },
  faiseur_disciples: { title: "rapport_faiseur_disciples", render: renderFaiseurDisciples },
  superviseur: { title: "fiche_superviseurs", render: renderSuperviseur },
  cellule_priere: { title: "rapport_cellule_priere", render: renderCellulePriere },
  choristes: { title: "fiche_choristes", render: renderChoristes, layout: "landscape", margin: 30 },
  audiovisuel: { title: "rapport_assiduite_ouvriers", render: renderAudiovisuel },
};

function streamRapportHebdoPdf(rapport, res) {
  const conf = RENDERERS[rapport.type];
  const filename = safeName(conf ? conf.title : rapport.type, "rapport");
  const doc = beginPdf(res, filename, { layout: conf?.layout, margin: conf?.margin });
  if (conf) conf.render(doc, rapport);
  else {
    churchHeader(doc, "Rapport hebdomadaire");
    doc.fillColor(INK).text("Type de rapport non pris en charge.");
  }
  doc.end();
}

module.exports = { streamRapportHebdoPdf, RENDERERS };