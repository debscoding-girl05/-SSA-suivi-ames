const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers');

test.describe('Fiche de présence hebdomadaire (Fiches)', () => {
  test('encadreur soumet → leader demande une correction → encadreur corrige → leader valide', async ({ page }) => {
    // 1. Paul (encadreur Chorale) remplit sa fiche.
    await login(page, 'paul');
    await page.goto('/fiches');
    await expect(page.getByText(/Suivi des présences · semaine \d+/)).toBeVisible();
    await page.getByRole('button', { name: 'Soumettre ma fiche' }).click();
    let dialog = page.getByRole('dialog', { name: 'Ma fiche de la semaine' });
    await expect(dialog.getByText('Sylvie Ze')).toBeVisible();
    await dialog.getByRole('button', { name: 'Présent' }).first().click();
    await expect(dialog.getByText('1 présent')).toBeVisible();
    await dialog.locator('#remarques').fill('Bonne répétition');
    await dialog.getByRole('button', { name: 'Soumettre' }).click();
    await expect(page.getByRole('button', { name: 'Ma fiche' })).toBeVisible();
    await page.getByRole('button', { name: 'Ma fiche' }).click();
    await expect(page.getByText('Fiche soumise — en attente de validation.')).toBeVisible();
    await page.keyboard.press('Escape');
    await logout(page);

    // 2. Marie (leader) demande une correction — commentaire obligatoire.
    await login(page, 'leader');
    await page.goto('/fiches');
    const aValider = page.locator('div', { has: page.getByRole('heading', { name: /^À valider/ }) }).last();
    await aValider.getByRole('button', { name: /Paul Atangana/ }).click();
    dialog = page.getByRole('dialog', { name: 'Valider la fiche' });
    await dialog.getByRole('button', { name: 'Demander une correction' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Un commentaire est requis');
    await dialog.locator('#comment').fill('Merci de pointer aussi les absents');
    await dialog.getByRole('button', { name: 'Demander une correction' }).click();
    await expect(page.getByRole('heading', { name: /^À corriger/ })).toBeVisible();
    await logout(page);

    // 3. Paul voit la demande (notification) et resoumet.
    await login(page, 'paul');
    await page.goto('/notifications');
    await expect(page.getByText('Fiche à corriger')).toBeVisible();
    await page.goto('/fiches');
    await page.getByRole('button', { name: 'Ma fiche' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Merci de pointer aussi les absents/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Soumettre' }).click();
    await logout(page);

    // 4. Marie valide.
    await login(page, 'leader');
    await page.goto('/fiches');
    await page.getByRole('button', { name: /Paul Atangana/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Valider', exact: true }).click();
    const valides = page.locator('div', { has: page.getByRole('heading', { name: /^Validés/ }) }).last();
    await expect(valides.getByText('Paul Atangana')).toBeVisible();
  });

  test('la fiche validée n’est plus modifiable par l’encadreur', async ({ page }) => {
    await login(page, 'paul');
    await page.goto('/fiches');
    await page.getByRole('button', { name: 'Ma fiche' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Fiche validée ✅')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Soumettre' })).toHaveCount(0);
  });
});

test.describe('Fiche de présence : vide ou incomplète refusée', () => {
  test('encadreur sans membre : impossible de soumettre', async ({ page, request }) => {
    const { API } = require('./helpers');
    const tok = (await (await request.post(`${API}/api/auth/login`, { data: { identifier: 'pr@ssa.app', password: 'pr1234' } })).json()).token;
    const deps = (await (await request.get(`${API}/api/departments`, { headers: { Authorization: `Bearer ${tok}` } })).json()).data;
    const email = `vide${Date.now()}@ssa.app`;
    const created = await (await request.post(`${API}/api/dirigeants`, { headers: { Authorization: `Bearer ${tok}` }, data: { fullName: 'Encadreur Vide', email, role: 'encadreur', departmentId: deps.find((x) => x.name === 'Jeunes').id } })).json();
    await login(page, [email, created.tempPassword]);
    await page.goto('/fiches');
    await page.getByRole('button', { name: 'Soumettre ma fiche' }).click();
    const d = page.getByRole('dialog');
    await expect(d.getByText('Aucun assigné à pointer.')).toBeVisible();
    await d.getByRole('button', { name: 'Soumettre' }).click();
    await expect(d.getByRole('alert')).toContainText('Aucun membre à pointer');
  });

  test('membres non pointés : soumission refusée avec le nombre manquant', async ({ page }) => {
    await login(page, 'grace');
    await page.goto('/fiches');
    await page.getByRole('button', { name: 'Soumettre ma fiche' }).click();
    const d = page.getByRole('dialog');
    await expect(d.getByText(/\d+ non pointés?/)).toBeVisible();
    await d.getByRole('button', { name: 'Soumettre' }).click();
    await expect(d.getByRole('alert')).toContainText('Fiche incomplète');
    await d.getByRole('button', { name: 'Brouillon' }).click();
    await expect(d).toHaveCount(0); // un brouillon partiel reste possible
  });
});
