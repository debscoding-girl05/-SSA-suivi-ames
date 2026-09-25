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
  test('choix du type : l’encadreur ne voit pas le rapport mensuel, le leader si', async ({ page }) => {
    await login(page, 'encadreur');
    await page.goto('/rapports-hebdo');
    await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
    const types = page.getByRole('dialog').locator('li');
    await expect(types).toHaveCount(6);
    await expect(page.getByText('Fiche des Encadreurs')).toBeVisible();
    await expect(page.getByText(/Superviseurs/)).toHaveCount(0);
    await expect(page.getByText('Rapport mensuel du leader (au Pasteur)')).toHaveCount(0);
    await logout(page);
    await login(page, 'leader');
    await page.goto('/rapports-hebdo');
    await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
    await expect(page.getByRole('dialog').locator('li')).toHaveCount(7);
  });

  test('3 façons de remplir + retour au choix du type', async ({ page }) => {
    await login(page, 'encadreur');
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
    await login(page, 'encadreur');
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
    let cells = rows.nth(0).locator('input');
    await cells.nth(0).fill('Ruth');
    await cells.nth(1).fill('690 11 22 99');
    await cells.nth(2).fill(`${nom} Claire`);
    cells = rows.nth(1).locator('input');
    await cells.nth(0).fill('Ruth');
    await cells.nth(1).fill('+237 6 55 66 77 88'); // Samuel Eboa, déjà dans l'annuaire
    await cells.nth(2).fill('Samuel Eboa');
    await d.getByRole('button', { name: 'Soumettre le rapport' }).click();
    await expect(page.getByText(/1 personne ajoutée à l'annuaire, 1 déjà présente/)).toBeVisible();

    await page.goto('/annuaire');
    await page.getByPlaceholder('Rechercher un nom, un numéro…').fill(nom);
    await expect(page.locator('li', { hasText: nom })).toHaveCount(1);
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
    await login(page, 'encadreur');
    await page.goto('/rapports-hebdo');
    const row = page.locator('li', { hasText: "Rapport d'assiduité (Huissier)" }).first();
    const [download] = await Promise.all([page.waitForEvent('download'), row.getByRole('button').nth(0).click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('brouillon : modifiable puis supprimable', async ({ page }) => {
    await login(page, 'encadreur');
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
});
