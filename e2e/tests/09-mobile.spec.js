const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

// Projet « mobile » (390×844, tactile) — voir playwright.config.js.
const bottomNav = (page) => page.locator('nav.fixed.bottom-0');

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `défilement horizontal sur ${page.url()}`).toBeLessThanOrEqual(1);
}

test.describe('Mobile (iPhone ~390 px)', () => {
  test('leader : barre du bas, barre du haut, pas de barre latérale', async ({ page }) => {
    await login(page, 'leader');
    await expect(page.locator('aside')).toBeHidden();
    await expect(bottomNav(page).getByRole('link')).toHaveText(['Accueil', 'Annuaire', 'Fiches', 'Rapports', 'Profil']);
    await expect(page.locator('header').getByText('CSP-SSA')).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: /Notifications/ })).toBeVisible();
  });

  test('encadreur : 4 onglets (pas de Rapports)', async ({ page }) => {
    await login(page, 'encadreur');
    await expect(bottomNav(page).getByRole('link')).toHaveText(['Accueil', 'Annuaire', 'Fiches', 'Profil']);
  });

  test('aucune page clé ne déborde horizontalement', async ({ page }) => {
    await login(page, 'pasteur');
    for (const url of ['/dashboard', '/annuaire', '/fiches', '/rapports-hebdo', '/dirigeants', '/departements', '/departements/2', '/notifications', '/profile', '/rapports']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await noHorizontalScroll(page);
    }
  });

  test('onglets du bas et choix de remplissage : cibles ≥ 44 px', async ({ page }) => {
    await login(page, 'leader');
    for (const box of await bottomNav(page).getByRole('link').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
    await page.goto('/rapports-hebdo');
    await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
    await page.getByText("Rapport d'assiduité (Huissier)").click();
    const manual = page.getByRole('button', { name: /Remplir manuellement/ });
    expect((await manual.boundingBox()).height).toBeGreaterThanOrEqual(44);
  });

  test('navigation par la barre du bas', async ({ page }) => {
    await login(page, 'leader');
    await bottomNav(page).getByRole('link', { name: 'Annuaire' }).click();
    await expect(page.getByRole('heading', { name: 'Annuaire' })).toBeVisible();
    await bottomNav(page).getByRole('link', { name: 'Profil' }).click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
