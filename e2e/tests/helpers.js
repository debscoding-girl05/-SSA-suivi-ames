// Utilitaires partagés des tests E2E.
const { expect } = require('@playwright/test');

// Comptes de démo (server/src/db/seed.js).
const ACCOUNTS = {
  pasteur: ['pasteur@ssa.app', 'pasteur1234'],
  pr: ['pr@ssa.app', 'pr1234'],
  secretaire: ['secretaire@ssa.app', 'secretaire1234'],
  leader: ['leader@ssa.app', 'leader1234'], // Marie Nkolo, Chorale
  encadreur: ['encadreur@ssa.app', 'encadreur1234'], // Jean Mballa, Chorale (leader : Marie)
  paul: ['paul@ssa.app', 'dirigeant1234'], // encadreur Chorale, sans fiche cette semaine
  esther: ['esther@ssa.app', 'dirigeant1234'], // encadreur Jeunes
  suivi: ['suivi@ssa.app', 'dirigeant1234'], // Ruth Onana, encadreur Suivi (Faiseurs de Disciples)
  grace: ['grace@ssa.app', 'dirigeant1234'], // leader Évangélisation
  cellule: ['cellule@ssa.app', 'dirigeant1234'], // leader de cellule (Cellule Bastos)
};

const API = 'http://127.0.0.1:3998';

async function login(page, who) {
  const [email, password] = Array.isArray(who) ? who : ACCOUNTS[who];
  await page.goto('/login');
  await page.locator('#identifier').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Après connexion l'appli renvoie vers la page demandée avant (ou l'accueil).
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
}

// Jeton API direct (préparer des données sans passer par l'interface).
async function apiToken(request, who) {
  const [identifier, password] = ACCOUNTS[who];
  const res = await request.post(`${API}/api/auth/login`, { data: { identifier, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token;
}

const uniq = (p = 'e2e') => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

// Navigation latérale (desktop).
const sidebar = (page) => page.locator('aside nav');

module.exports = { ACCOUNTS, API, login, apiToken, uniq, sidebar };

// Sélection dans le composant <Select> maison (bouton + listbox).
async function pick(page, triggerSelector, optionText) {
  await page.locator(triggerSelector).click();
  await page.getByRole('option', { name: optionText }).first().click();
}

async function logout(page) {
  await page.keyboard.press('Escape'); // referme une éventuelle fenêtre
  if (!(await page.locator('aside').isVisible())) await page.goto('/dashboard');
  await page.locator('aside').getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForURL(/\/login/);
}

module.exports.pick = pick;
module.exports.logout = logout;
