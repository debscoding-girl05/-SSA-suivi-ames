const { test, expect } = require('@playwright/test');
const { login, sidebar, logout } = require('./helpers');

// Menu attendu par rôle (barre latérale desktop).
const NAV = {
  pasteur: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Cellules', 'Profil', 'Connexions'],
  pr: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Cellules', 'Profil', 'Connexions'],
  secretaire: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Fiches', 'Fiches hebdo', 'Profil'],
  leader: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Profil'],
  encadreur: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Fiches hebdo', 'Profil'],
  cellule: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Fiches', 'Fiches hebdo', 'Cellules', 'Profil'],
};

test.describe('Menus et droits par rôle', () => {
  for (const [who, items] of Object.entries(NAV)) {
    test(`menu du rôle ${who}`, async ({ page }) => {
      await login(page, who);
      await expect(sidebar(page).getByRole('link')).toHaveText(items);
    });
  }

  test('seul le Pasteur voit la carte « Objectif d’évangélisation »', async ({ page }) => {
    await login(page, 'pasteur');
    await expect(page.getByText("Objectif d'évangélisation")).toBeVisible();
    await logout(page);
    await login(page, 'pr');
    await expect(page.getByText("Objectif d'évangélisation")).toHaveCount(0);
  });

  test('la Secrétaire lit tout mais ne peut pas créer de compte ni de département', async ({ page }) => {
    await login(page, 'secretaire');
    await page.goto('/dirigeants');
    await expect(page.getByRole('heading', { name: 'Leaders' })).toBeVisible();
    await expect(page.getByText('Jean Mballa')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un compte' })).toHaveCount(0);
    await page.goto('/departements');
    await expect(page.getByRole('button', { name: 'Nouveau département' })).toHaveCount(0);
    // Vue d'ensemble des fiches de la semaine : tout le monde, sans bouton de validation.
    await page.goto('/fiches');
    await expect(page.getByRole('heading', { name: /^Manquants/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Soumettre ma fiche' })).toHaveCount(0);
  });

  test('un encadreur ne voit que lui-même dans « Leaders »', async ({ page }) => {
    await login(page, 'esther');
    await page.goto('/dirigeants');
    await expect(page.getByText('Esther Fotso')).toBeVisible();
    await expect(page.getByText('Jean Mballa')).toHaveCount(0);
  });

  test('un encadreur ne peut pas ouvrir la fiche d’un autre (URL forcée)', async ({ page, request }) => {
    await login(page, 'esther');
    await page.goto('/dirigeants');
    // Id de Jean via l'API en tant que Pasteur, puis accès direct par URL.
    const tok = (await (await request.post('http://127.0.0.1:3998/api/auth/login', { data: { identifier: 'pasteur@ssa.app', password: 'pasteur1234' } })).json()).token;
    const list = await (await request.get('http://127.0.0.1:3998/api/dirigeants', { headers: { Authorization: `Bearer ${tok}` } })).json();
    const jean = list.data.find((d) => d.fullName === 'Jean Mballa');
    await page.goto(`/dirigeants/${jean.id}`);
    await expect(page.getByRole('alert')).toContainText(/introuvable/i);
  });
});
