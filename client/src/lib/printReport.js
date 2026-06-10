// Open a clean, printable view of a report in a new window and trigger the
// browser's print dialog (→ "Enregistrer en PDF"). Dependency-free.
export function printReport(report) {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <title>${esc(report.title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1a1530; margin: 0; padding: 40px; }
      .brand { color: #534ab7; font-weight: 700; letter-spacing: .02em; font-size: 13px; text-transform: uppercase; }
      h1 { font-size: 22px; margin: 6px 0 2px; }
      .meta { color: #6b6679; font-size: 13px; margin-bottom: 20px; }
      hr { border: none; border-top: 1px solid #e7e7ec; margin: 16px 0 20px; }
      .content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
      .footer { margin-top: 40px; color: #9a96a8; font-size: 11px; }
    </style></head><body>
    <div class="brand">Cathédrale des Signes et Prodiges · Suivi des Âmes</div>
    <h1>${esc(report.title)}</h1>
    <div class="meta">
      ${report.departmentName ? esc(report.departmentName) + ' · ' : ''}Semaine ${esc(report.week)} / ${esc(report.year)}
      ${report.authorName ? ' · ' + esc(report.authorName) : ''}
      ${report.status === 'transmis' ? ' · Transmis' : ' · Brouillon'}
    </div>
    <hr />
    <div class="content">${esc(report.content) || '<em>(vide)</em>'}</div>
    <div class="footer">Document généré depuis SSA — ${new Date().toLocaleDateString('fr-FR')}</div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
