// Ouvre une vue imprimable propre d'un rapport et déclenche la boîte
// d'impression du navigateur (→ « Enregistrer en PDF »). Sans dépendance.
//
// iOS : `window.open('', '_blank')` est bloqué par Safari (fenêtre surgissante
// non déclenchée par une navigation) et `document.write` dans une fenêtre
// about:blank y est peu fiable — l'export PDF ne faisait donc rien du tout sur
// iPhone. On imprime depuis une iframe cachée de la page courante, ce qui
// fonctionne sur Safari iOS comme sur les navigateurs de bureau.

function buildHtml(report) {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <title>${esc(report.title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1a1530; margin: 0; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .brand { color: #534ab7; font-weight: 700; letter-spacing: .02em; font-size: 13px; text-transform: uppercase; }
      h1 { font-size: 22px; margin: 6px 0 2px; }
      .meta { color: #6b6679; font-size: 13px; margin-bottom: 20px; }
      hr { border: none; border-top: 1px solid #e7e7ec; margin: 16px 0 20px; }
      .content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
      .footer { margin-top: 40px; color: #9a96a8; font-size: 11px; }
      @page { margin: 16mm; }
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
  </body></html>`;
}

export function printReport(report) {
  const html = buildHtml(report);

  const frame = document.createElement('iframe');
  // Hors écran plutôt que display:none — Safari n'imprime pas une iframe
  // qui n'a pas de boîte de rendu.
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;';
  document.body.appendChild(frame);

  const cleanup = () => {
    // Laisser à Safari le temps de récupérer le document avant de le retirer.
    setTimeout(() => frame.remove(), 1000);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    try {
      win.focus();
      win.print();
    } catch {
      // Impression indisponible — on retire simplement l'iframe.
    }
    if (typeof win.onafterprint !== 'undefined') win.onafterprint = cleanup;
    else cleanup();
  };

  // srcdoc évite document.write et reste sur la même origine.
  frame.srcdoc = html;
}
