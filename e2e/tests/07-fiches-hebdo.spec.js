const path = require('path');
const { test, expect } = require('@playwright/test');
const { login, logout, uniq } = require('./helpers');

const PHOTO = path.join(__dirname, 'fixtures', 'fiche-papier.png');

async function newFiche(page, typeLabel) {
  await page.goto('/rapports-hebdo');
  await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
  await page.getByRole('dialog').getByText(typeLabel, { exact: true }).click();
  await expect(page.getByText('Comment voulez-vous remplir cette fiche ?')).toBeVisible();
}

test.describe('Fiches hebdo & rapport mensuel', () => {
  test('chacun ne voit que les modèles de son département / rôle', async ({ page }) => {
    const expectTypes = async (who, labels) => {
      await login(page, who);
      await page.goto('/rapports-hebdo');
      await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
      await expect(page.getByRole('dialog').locator('li')).toHaveText(labels);
      await logout(page);
    };
    await expectTypes('encadreur', ['Fiche de suivi hebdomadaire des choristes']);
    await expectTypes('leader', ['Fiche de suivi hebdomadaire des choristes', 'Rapport mensuel du leader (au Pasteur)']);
    await expectTypes('suivi', ['Rapport du Faiseur de Disciples', 'Fiche des Encadreurs']);
    await expectTypes('daniel', ['Rapport de la chaîne de prière']);
    await expectTypes('cellule', ['Rapport de cellule de prière']);
    await expect(page.getByText(/Superviseurs/)).toHaveCount(0);
  });

  test('département sans fiche papier : pas de menu Fiches hebdo', async ({ page }) => {
    await login(page, 'esther'); // Jeunes
    await expect(page.locator('aside nav').getByRole('link', { name: 'Fiches hebdo' })).toHaveCount(0);
    await page.goto('/fiches');
    await expect(page.getByRole('link', { name: 'Fiches hebdo' })).toHaveCount(0);
    await page.goto('/rapports-hebdo');
    await expect(page.getByText(/Aucune fiche hebdo ne concerne votre département/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouveau rapport' })).toHaveCount(0);
  });

  test('3 façons de remplir + retour au choix du type', async ({ page }) => {
    await login(page, 'protocole');
    await newFiche(page, "Rapport d'assiduité (Huissier)");
    const d = page.getByRole('dialog');
    await expect(d.getByText('Prendre une photo de la fiche')).toBeVisible();
    await expect(d.getByText('Importer une image')).toBeVisible();
    await expect(d.getByText('Remplir manuellement')).toBeVisible();
    await expect(d.locator('input[type=file][capture]')).toHaveCount(1);
    await expect(d.locator('input[type=file][multiple]')).toHaveCount(1);
    await d.getByRole('button', { name: 'Changer de type' }).click();
    await expect(page.getByRole('dialog', { name: 'Quel type de rapport ?' })).toBeVisible();
  });

  test('fiche vide : soumission bloquée ; une présence cochée suffit', async ({ page }) => {
    await login(page, 'protocole');
    await newFiche(page, "Rapport d'assiduité (Huissier)");
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog');
    await d.getByLabel(/Nom du leader/).fill('Jean Mballa');
    // La liste est pré-remplie avec les membres suivis : cela ne compte pas comme contenu.
    await expect(d.locator('tbody tr input').first()).not.toHaveValue('');
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(d.getByRole('alert')).toContainText('La fiche est vide');

    await d.locator('tbody tr').first().getByRole('button', { name: 'P', exact: true }).click();
    await expect(d.getByText(/^1calculé automatiquement$/)).toBeVisible();
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(page.getByText('Fiche soumise avec succès')).toBeVisible();
  });

  test('fiche par photo importée → soumise sans saisie, visible avec la photo', async ({ page }) => {
    await login(page, 'encadreur');
    await newFiche(page, 'Fiche de suivi hebdomadaire des choristes');
    await page.getByRole('dialog').locator('input[type=file][multiple]').setInputFiles(PHOTO);
    const d = page.getByRole('dialog', { name: 'Fiche de suivi hebdomadaire des choristes' });
    await expect(d.getByText('Photo(s) de la fiche')).toBeVisible();
    await expect(d.getByRole('img', { name: 'Fiche papier' })).toBeVisible();
    await d.getByRole('button', { name: 'Soumettre la fiche' }).click();
    await expect(page.getByText('Fiche soumise avec succès')).toBeVisible();
    const row = page.locator('li', { hasText: 'Fiche de suivi hebdomadaire des choristes' }).first();
    await expect(row).toContainText('Soumis');
  });

  test('fiche des encadreurs : les âmes du tableau entrent dans l’annuaire, sans doublon', async ({ page }) => {
    const nom = uniq('AME').toUpperCase();
    await login(page, 'suivi');
    await newFiche(page, 'Fiche des Encadreurs');
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog');
    await d.getByLabel(/Noms & prénoms de l'encadreur/).fill('Ruth Onana');
    const rows = d.locator('tbody tr');
    // Ligne 1 : nouvelle âme, faiseur choisi dans la liste.
    await rows.nth(0).locator('select').selectOption({ label: 'Ruth Onana' });
    let cells = rows.nth(0).locator('input');
    await cells.nth(0).fill('690 11 22 99');
    await cells.nth(1).fill(`${nom} Claire`);
    // Ligne 2 : Samuel Eboa, déjà connu, sans faiseur → reste où il est.
    cells = rows.nth(1).locator('input');
    await cells.nth(0).fill('+237 6 55 66 77 88');
    await cells.nth(1).fill('Samuel Eboa');
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(page.getByText(/1 âme ajoutée à l'annuaire, 1 déjà suivie/)).toBeVisible();

    await page.goto('/annuaire');
    await page.getByPlaceholder('Rechercher un nom, un numéro…').fill(nom);
    await expect(page.locator('li', { hasText: nom })).toHaveCount(1);
  });

  test('fiche des encadreurs : choisir une âme de l’annuaire et l’assigner à un Faiseur de Disciples', async ({ page }) => {
    await login(page, 'suivi');
    await newFiche(page, 'Fiche des Encadreurs');
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog', { name: 'Fiche des Encadreurs' });
    await d.getByLabel(/Noms & prénoms de l'encadreur/).fill('Ruth Onana');
    const row = d.locator('tbody tr').first();
    // Une ligne avec seulement le faiseur = fiche vide.
    await row.locator('select').selectOption({ label: 'Ruth Onana' });
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(d.getByRole('alert')).toContainText('La fiche est vide');
    // Choisir l'âme dans l'annuaire.
    await row.getByRole('button', { name: /Choisir l'âme de la ligne 1/ }).click();
    const picker = page.getByRole('dialog', { name: "Choisir dans l'annuaire" });
    await picker.getByPlaceholder(/Nom ou numéro/).fill('Kamga');
    await picker.locator('li', { hasText: 'Pierre Kamga' }).getByRole('button', { name: 'Choisir' }).click();
    await expect(row.getByText("Déjà dans l'annuaire")).toBeVisible();
    await expect(row.locator('input').nth(1)).toHaveValue('Pierre Kamga');
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(page.getByText(/1 rattachée à son faiseur/)).toBeVisible();
    // Pierre Kamga est désormais suivi par Ruth Onana.
    await page.goto('/annuaire');
    await page.getByPlaceholder('Rechercher un nom, un numéro…').fill('Kamga');
    await expect(page.locator('li', { hasText: 'Pierre Kamga' })).toContainText('Ruth Onana');
  });

  test('rapport mensuel du leader : pré-rempli, vide refusé, remis au Pasteur', async ({ page }) => {
    await login(page, 'leader');
    await newFiche(page, 'Rapport mensuel du leader (au Pasteur)');
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog');
    await expect(d.getByLabel('Nom du leader')).toHaveValue('Marie Nkolo');
    await expect(d.getByLabel('Département')).toHaveValue('Chorale');
    await expect(d.getByLabel('Membres suivis')).not.toHaveValue('');
    await expect(d.locator('tbody tr input').first()).toHaveValue(/Jean Mballa|Paul Atangana/);
    await d.getByRole('button', { name: 'Remettre au Pasteur' }).click();
    await expect(d.getByRole('alert')).toContainText('La fiche est vide');
    await d.getByLabel('Activités réalisées').fill('Deux répétitions, un concert');
    await d.getByRole('button', { name: 'Remettre au Pasteur' }).click();
    await expect(page.getByText('Fiche soumise avec succès')).toBeVisible();
    await logout(page);

    await login(page, 'pasteur');
    await page.goto('/rapports-hebdo');
    const row = page.locator('li', { hasText: 'Rapport mensuel du leader (au Pasteur)' }).first();
    await expect(row).toContainText('par Marie Nkolo');
    await page.goto('/notifications');
    await expect(page.getByText('Rapport mensuel soumis').first()).toBeVisible();
  });

  test('téléchargement PDF d’une fiche', async ({ page }) => {
    await login(page, 'protocole');
    await page.goto('/rapports-hebdo');
    const row = page.locator('li', { hasText: "Rapport d'assiduité (Huissier)" }).first();
    const [download] = await Promise.all([page.waitForEvent('download'), row.getByRole('button').nth(0).click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('brouillon : modifiable puis supprimable', async ({ page }) => {
    await login(page, 'audiovisuel');
    await newFiche(page, "Rapport d'assiduité des ouvriers (Audiovisuel)");
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog');
    await d.getByLabel(/Nom de l'encadreur|Encadreur/).first().fill('Jean Mballa');
    await d.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await page.keyboard.press('Escape');
    const row = page.locator('li', { hasText: "Rapport d'assiduité des ouvriers (Audiovisuel)" }).first();
    await expect(row).toContainText('Brouillon');
    page.once('dialog', (x) => x.accept());
    const before = await page.locator('li', { hasText: 'Brouillon' }).count();
    await row.getByRole('button').nth(2).click();
    await expect(page.locator('li', { hasText: 'Brouillon' })).toHaveCount(before - 1);
  });

  test('chaîne de prière : import depuis WhatsApp, pointage, totaux et soumission', async ({ page }) => {
    await login(page, 'daniel');
    await newFiche(page, 'Rapport de la chaîne de prière');
    await page.getByText('Remplir manuellement').click();
    const d = page.getByRole('dialog', { name: 'Rapport de la chaîne de prière' });
    await d.getByRole('button', { name: 'Importer depuis WhatsApp' }).click();
    const imp = page.getByRole('dialog', { name: 'Importer depuis WhatsApp' });
    await imp.locator('#cp-import').fill(['*Rapport de la chaîne de prière 23h -00h*', '*La semaine du 21/09/26*', '*Those who prayed online*', '*Monday T:25/ Tuesday T:23/Wednesday T29:*',
      '*➡️Pastors*', 'Prophet Samuel lonsti', 'Pasteur Etoundi (3/3)', '*➡️Minister & Leaders*', 'Min Olivia (3/3)', 'L- Flore Ntamack ( prob avec son téléphone)',
      '*➡️Members*', 'Philomène (1/3)', 'Ngoa Juliette (3/3)', '*➡️Pastors and leader not connected*', 'Pasteur Solange (0/3)'].join('\n'));
    await imp.getByRole('button', { name: 'Importer les noms' }).click();
    await expect(d.getByRole('heading', { name: 'Pasteurs (2)' })).toBeVisible();
    await expect(d.getByRole('heading', { name: 'Ministres & leaders (2)' })).toBeVisible();
    await expect(d.getByRole('heading', { name: 'Membres (2)' })).toBeVisible();
    await expect(d.getByRole('heading', { name: 'Pasteurs et leaders non connectés (1)' })).toBeVisible();
    await expect(d.getByLabel('Nom, Ministres & leaders 2')).toHaveValue('L- Flore Ntamack');
    await expect(d.getByLabel('Tranche horaire')).toHaveValue('23h -00h');

    // Vide → refusé ; une présence cochée → totaux et score à jour.
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(d.getByRole('alert')).toContainText('La fiche est vide');
    await d.getByRole('button', { name: /Lun — Pasteur Etoundi/ }).click();
    await d.getByRole('button', { name: /Mar — Pasteur Etoundi/ }).click();
    await d.getByRole('button', { name: /Lun — Philomène/ }).click();
    await expect(d.getByText('T:2').first()).toBeVisible();
    await expect(d.locator('tr', { has: page.getByLabel('Nom, Pasteurs 2') }).getByText('2/3')).toBeVisible();
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(page.getByText('Fiche soumise avec succès')).toBeVisible();
  });
});
