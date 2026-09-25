const { test, expect } = require('@playwright/test');
const { login, API } = require('./helpers');

// Conditions de réseau mobile dégradées : l'appli doit s'ouvrir, ne jamais
// déconnecter sur une coupure, et expliquer ce qui se passe.
test.describe('Réseau mobile dégradé', () => {
  test('API injoignable au démarrage : l’appli s’ouvre quand même (profil en cache), sans déconnexion', async ({ page }) => {
    await login(page, 'leader');
    await page.route(`${API}/api/**`, (r) => r.abort('internetdisconnected'));
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('aside')).toContainText('Marie Nkolo');
    await page.unroute(`${API}/api/**`);
    await page.reload();
    await expect(page.getByText('Mes encadreurs')).toBeVisible();
  });

  test('sans profil en cache : écran « Serveur injoignable » + Réessayer, puis ouverture', async ({ page }) => {
    await login(page, 'leader');
    await page.evaluate(() => localStorage.removeItem('ssa.user'));
    await page.route(`${API}/api/**`, (r) => r.abort('internetdisconnected'));
    await page.reload();
    await expect(page.getByText('Serveur injoignable')).toBeVisible({ timeout: 15000 });
    await expect(page).not.toHaveURL(/\/login/);
    await page.unroute(`${API}/api/**`);
    await page.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  });

  test('coupure passagère : la lecture est rejouée automatiquement', async ({ page }) => {
    await login(page, 'pasteur');
    let failed = 0;
    await page.route(`${API}/api/annuaire**`, (r) => (failed++ < 1 ? r.abort('connectionreset') : r.continue()));
    await page.goto('/annuaire');
    await expect(page.getByText(/Âmes suivies · [1-9]\d* contact/)).toBeVisible();
    expect(failed).toBeGreaterThan(1);
  });

  test('page HTML d’un proxy / opérateur au lieu du JSON : message explicite', async ({ page }) => {
    await page.route(`${API}/api/auth/login`, (r) => r.fulfill({ status: 403, contentType: 'text/html', body: '<html>Just a moment...</html>' }));
    await page.goto('/login');
    await page.locator('#identifier').fill('pasteur@ssa.app');
    await page.locator('#password').fill('pasteur1234');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert')).toContainText('Réponse inattendue du réseau (code 403)');
  });

  test('session réellement expirée (401) : retour à la connexion', async ({ page }) => {
    await login(page, 'leader');
    await page.evaluate(() => localStorage.setItem('ssa.token', 'jeton-expire'));
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
  });
});
