// Lit le rapport collé depuis WhatsApp : rubriques « ➡️Pastors / Minister &
// Leaders / Members / … not connected » puis une personne par ligne,
// « Nom (2/3) » ou « Nom ( remarque ) ». On ne garde que les noms et les
// catégories : les présences de la nouvelle semaine restent à cocher.
export function parseWhatsAppReport(text) {
  const rows = [];
  const header = {};
  let categorie = 'membres';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/[*_]/g, '').replace(/^[\s~•-]+/, '').trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    const tranche = /cha[iî]ne de pri[eè]re\s+(.+)$/i.exec(line);
    if (tranche) { header.tranche = tranche[1].trim(); continue; }
    const semaine = /semaine du\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i.exec(line);
    if (semaine) {
      const y = semaine[3].length === 2 ? `20${semaine[3]}` : semaine[3];
      header.semaineDu = `${y}-${semaine[2].padStart(2, '0')}-${semaine[1].padStart(2, '0')}`;
      continue;
    }
    if (/^(those who prayed|ont pri[eé])/i.test(line) || /^(monday|lundi)\b.*t\s*:?\s*\d/i.test(line)) continue;
    const isHeading = /^(➡️|➡|→|->)/.test(line) || /^(pastors?|pasteurs?|ministers?|ministres?|members?|membres?)\b[^()]*$/i.test(line);
    if (isHeading) {
      if (/not connected|non connect/.test(lower)) categorie = 'non_connectes';
      else if (/minist|leader/.test(lower)) categorie = 'leaders';
      else if (/pastor|pasteur/.test(lower)) categorie = 'pasteurs';
      else if (/member|membre/.test(lower)) categorie = 'membres';
      continue;
    }
    const nom = line.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    if (nom) rows.push({ nom, categorie, presence: {}, note: '' });
  }
  return { header, rows };
}
