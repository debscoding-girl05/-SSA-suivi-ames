const { test, expect } = require('@playwright/test');
const { login, logout, uniq } = require('./helpers');

test.describe('Cellules, nouveaux venus, rapports, notifications, journal, profil', () => {
  test('cellule : le leader de cellule ajoute un membre et soumet la fiche → le Pasteur valide', async ({ page }) => {
    const nom = uniq('Membre cellule ');
    await login(page, 'cellule');
    await page.goto('/cellules');
    await page.getByText('Cellule Bastos').first().click();
    await expect(page.getByText('Leader : Frère Pierre')).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.locator('#m-nom').fill(nom);
    await page.locator('#m-tel').fill('+237 6 93 00 11 22');
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByText(nom)).toBeVisible();

    await page.getByRole('button', { name: 'Fiche de présence' }).click();
    const d = page.getByRole('dialog');
    await d.getByRole('button', { name: 'Présent' }).first().click();
    await d.getByRole('button', { name: 'Soumettre' }).click();
    await logout(page);

    await login(page, 'pasteur');
    await page.goto('/cellules');
    await page.getByText('Cellule Bastos').first().click();
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await expect(page.getByText(/Validé/).first()).toBeVisible();
  });

  test('nouveaux venus : un Faiseur de Disciples enregistre une personne et valide la leçon 1', async ({ page }) => {
    const last = uniq('Venu');
    await login(page, 'suivi');
    await page.goto('/nouveaux-venus');
    await page.getByRole('button', { name: /Enregistrer un nouveau venu/ }).click();
    const d = page.getByRole('dialog');
    await expect(d.getByText('Date de naissance')).toHaveCount(0);
    await d.locator('#fn').fill('Nouvelle');
    await d.locator('#ln').fill(last);
    await d.locator('#ph').fill(`+237 6 6${Date.now().toString().slice(-7)}`);
    await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByText(`Nouvelle ${last}`).click();
    const detail = page.getByRole('dialog');
    await detail.getByRole('button', { name: 'Valider' }).first().click();
    await expect(detail.getByText(/1\s*\/\s*7|1 leçon/).first()).toBeVisible();
  });

  test('nouveaux venus : même numéro → doublon signalé', async ({ page }) => {
    await login(page, 'suivi');
    await page.goto('/nouveaux-venus');
    await page.getByRole('button', { name: /Enregistrer un nouveau venu/ }).click();
    const d = page.getByRole('dialog');
    await d.locator('#fn').fill('Aline');
    await d.locator('#ln').fill('Bis');
    await d.locator('#ph').fill('+237 6 12 00 00 01');
    await d.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(d.getByText(/Doublon|existe déjà/).first()).toBeVisible();
  });

  test('rapport (document) : le leader rédige et transmet → visible par le Pasteur', async ({ page }) => {
    const title = uniq('Rapport Chorale ');
    await login(page, 'leader');
    await page.goto('/rapports');
    await page.getByRole('button', { name: 'Nouveau rapport' }).first().click();
    await page.locator('#r-title').fill(title);
    await page.locator('#r-content').fill('Synthèse de la semaine : 2 fiches reçues.');
    await page.getByRole('button', { name: 'Transmettre' }).click();
    await expect(page.locator('li, button', { hasText: title }).first()).toContainText('Transmis');
    await logout(page);
    await login(page, 'pasteur');
    await page.goto('/rapports');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('notifications : cloche avec compteur, page, « Tout marquer comme lu »', async ({ page }) => {
    await login(page, 'pasteur');
    const bell = page.locator('aside').getByRole('link', { name: /Notifications/ });
    await expect(bell).toHaveAttribute('aria-label', /non lues/);
    await bell.click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByText(/non lue/)).toBeVisible();
    await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
    await expect(page.getByText('0 non lue')).toBeVisible();
  });

  test('journal de connexions : réussites et échecs visibles pour le Pasteur', async ({ page }) => {
    // Un échec de connexion pour alimenter le journal.
    await page.goto('/login');
    await page.locator('#identifier').fill('pr@ssa.app');
    await page.locator('#password').fill('erreur');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Identifiants invalides')).toBeVisible();
    await login(page, 'pasteur');
    await page.goto('/connexions');
    await expect(page.getByRole('heading', { name: 'Journal de connexions' })).toBeVisible();
    await expect(page.getByText('Réussie').first()).toBeVisible();
    await expect(page.getByText('Échouée').first()).toBeVisible();
  });

  test('profil : infos du compte + section notifications push', async ({ page }) => {
    await login(page, 'leader');
    await page.goto('/profile');
    await expect(page.getByText('Marie Nkolo').first()).toBeVisible();
    await expect(page.getByText('Notifications sur cet appareil')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer le mot de passe' })).toBeVisible();
  });

  test('page inconnue → écran 404', async ({ page }) => {
    await login(page, 'leader');
    await page.goto('/cette-page-n-existe-pas');
    await expect(page.getByText(/introuvable|404/i).first()).toBeVisible();
  });
});
