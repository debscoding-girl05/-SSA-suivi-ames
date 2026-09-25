const { test, expect } = require('@playwright/test');
const { login, uniq, logout } = require('./helpers');

test.describe('Authentification', () => {
  test('connexion par email → accueil, déconnexion → retour connexion', async ({ page }) => {
    await login(page, 'pasteur');
    await expect(page.locator('aside')).toContainText('Pasteur Emmanuel');
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('connexion par numéro de téléphone (espaces ignorés)', async ({ page }) => {
    await login(page, ['+237699112233', 'leader1234']);
    await expect(page.locator('aside')).toContainText('Marie Nkolo');
  });

  test('mauvais mot de passe → message d’erreur, reste sur /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#identifier').fill('pr@ssa.app');
    await page.locator('#password').fill('faux-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Identifiants invalides')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('blocage après 5 échecs sur un même identifiant', async ({ page }) => {
    const id = `${uniq('bloque')}@ssa.app`;
    await page.goto('/login');
    for (let i = 0; i < 5; i += 1) {
      await page.locator('#identifier').fill(id);
      await page.locator('#password').fill('mauvais');
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await expect(page.getByText('Identifiants invalides')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText(/Trop de tentatives/)).toBeVisible();
  });

  test('afficher / masquer le mot de passe', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#password').fill('secret');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });

  test('page protégée sans session → redirection vers /login', async ({ page }) => {
    await page.goto('/annuaire');
    await expect(page).toHaveURL(/\/login/);
  });

  test('mot de passe oublié → confirmation d’envoi (sans révéler si le compte existe)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    await page.getByLabel('Email').fill('inconnu@ssa.app');
    await page.getByRole('button', { name: 'Envoyer le lien' }).click();
    await expect(page.getByText('Email envoyé')).toBeVisible();
  });

  test('lien de réinitialisation invalide → message clair', async ({ page }) => {
    await page.goto('/reset-password/jeton-invalide');
    await page.locator('input[type=password]').first().fill('Nouveau#2026');
    await page.locator('input[type=password]').nth(1).fill('Nouveau#2026');
    await page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /invalide/ })).toBeVisible();
  });
});
