const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers');

// Nombre affiché sous le titre « Annuaire » : « Âmes suivies · N contacts ».
async function annuaireTotal(page) {
  const loaded = page.waitForResponse((r) => r.url().startsWith('http://127.0.0.1:3998/api/annuaire') && r.ok());
  await page.goto('/annuaire');
  const body = await (await loaded).json();
  const sub = page.getByText(new RegExp(`Âmes suivies · ${body.total} contact`));
  await expect(sub).toBeVisible();
  return body.total;
}

test.describe('Annuaire', () => {
  test('annuaire complet : Pasteur = Secrétaire = Faiseur de Disciples ; encadreur ordinaire = ses personnes', async ({ page }) => {
    await login(page, 'pasteur');
    const all = await annuaireTotal(page);
    expect(all).toBeGreaterThan(10);

    await logout(page);
    await login(page, 'secretaire');
    expect(await annuaireTotal(page)).toBe(all);

    await logout(page);
    await login(page, 'suivi');
    expect(await annuaireTotal(page)).toBe(all);

    await logout(page);
    await login(page, 'esther');
    const own = await annuaireTotal(page);
    expect(own).toBeLessThan(all);
    expect(own).toBe(3);
  });

  test('leader : annuaire limité à son département', async ({ page }) => {
    await login(page, 'leader');
    await page.goto('/annuaire');
    await expect(page.getByText('Sandrine Abena')).toBeVisible(); // Chorale
    await expect(page.getByText('Brigitte Essomba')).toHaveCount(0); // autre département
  });

  test('recherche par nom et par numéro, bouton Appeler en tel:', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/annuaire');
    await page.getByPlaceholder('Rechercher un nom, un numéro…').fill('Eboa');
    await expect(page.locator('li', { hasText: 'Samuel Eboa' })).toHaveCount(1);
    const call = page.locator('li', { hasText: 'Samuel Eboa' }).getByRole('link', { name: 'Appeler' });
    await expect(call).toHaveAttribute('href', 'tel:+237655667788');
    await page.getByPlaceholder('Rechercher un nom, un numéro…').fill('699 11');
    await expect(page.getByText('Aucun contact')).toBeVisible();
  });

  test('pas de lien email dans l’annuaire (champ retiré)', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/annuaire');
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });
});
