const { test, expect } = require('@playwright/test');
const { login, sidebar, logout } = require('./helpers');

// Menu attendu par rôle (barre latérale desktop).
const NAV = {
  pasteur: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Cellules', 'Profil', 'Connexions'],
  pr: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Cellules', 'Profil', 'Connexions'],
  secretaire: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Rapports', 'Fiches hebdo', 'Cellules', 'Profil'],
  leader: ['Accueil', 'Leaders', 'Départements', 'Annuaire', 'Fiches', 'Rapports', 'Fiches hebdo', 'Profil'], // Chorale : pas FD
  encadreur: ['Accueil', 'Annuaire', 'Fiches', 'Fiches hebdo', 'Profil'],
  suivi: ['Accueil', 'Annuaire', 'Nouveaux venus', 'Fiches', 'Fiches hebdo', 'Profil'], // encadreur FD
  esther: ['Accueil', 'Annuaire', 'Fiches', 'Profil'], // Jeunes : pas de fiche papier
  cellule: ['Accueil', 'Fiches hebdo', 'Cellules', 'Profil'],
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

  test('encadreur : accueil personnel, pas de statistiques de l’église', async ({ page, request }) => {
    await login(page, 'esther');
    await expect(page.getByText(/Ma fiche · semaine \d+/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Mes membres/ })).toBeVisible();
    for (const t of ['Fiches de la semaine', 'Soumission par département', 'À relancer']) {
      await expect(page.getByText(t, { exact: true })).toHaveCount(0);
    }
    // Même en tapant l'adresse : aucun département, et « Leaders » ne montre que lui-même.
    await page.goto('/departements');
    await expect(page.getByText('Aucun département')).toBeVisible();
    await page.goto('/dirigeants');
    await expect(page.getByText('Jean Mballa')).toHaveCount(0);
    const tok = (await (await request.post('http://127.0.0.1:3998/api/auth/login', { data: { identifier: 'esther@ssa.app', password: 'dirigeant1234' } })).json()).token;
    const ov = await (await request.get('http://127.0.0.1:3998/api/departments/overview', { headers: { Authorization: `Bearer ${tok}` } })).json();
    expect(ov.data).toEqual([]);
  });

  test('leader : un seul département dans « Départements »', async ({ page }) => {
    await login(page, 'leader');
    await page.goto('/departements');
    await expect(page.getByText('Chorale').first()).toBeVisible();
    await expect(page.getByText('Audiovisuel')).toHaveCount(0);
  });

  test('leader : lit les fiches hebdo de son équipe sans pouvoir les modifier', async ({ page, request }) => {
    const tok = (await (await request.post('http://127.0.0.1:3998/api/auth/login', { data: { identifier: 'encadreur@ssa.app', password: 'encadreur1234' } })).json()).token;
    await request.post('http://127.0.0.1:3998/api/rapports-hebdo', { headers: { Authorization: `Bearer ${tok}` },
      data: { type: 'choristes', entete: { encadreur: 'Jean Mballa', groupe: 'Groupe E2E' }, lignes: [{ membre: 'Sandrine Abena', croissance: { lundi: { bible: true } }, presence: {} }], status: 'soumis' } });
    await login(page, 'leader');
    await page.goto('/rapports-hebdo');
    const row = page.locator('li', { hasText: 'par Jean Mballa' }).first();
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    await row.getByRole('button', { name: 'Voir' }).click();
    await expect(page.getByRole('dialog')).toContainText('Groupe E2E');
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
