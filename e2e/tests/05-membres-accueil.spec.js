const { test, expect } = require('@playwright/test');
const { login, uniq } = require('./helpers');

const day = (o) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);

test.describe('Accueil du leader, membres, départements, objectif', () => {
  test('accueil leader : cartes Membres/Encadreurs + listes', async ({ page }) => {
    await login(page, 'leader');
    await expect(page.getByText('Mes encadreurs')).toBeVisible();
    const enc = page.locator('div.rounded-2xl', { hasText: 'Mes encadreurs' });
    await expect(enc.getByText('Jean Mballa')).toBeVisible();
    await expect(enc.getByText('Paul Atangana')).toBeVisible();
    const membres = page.locator('div.rounded-2xl', { has: page.getByRole('heading', { name: /^Membres \(\d+\)$/ }) });
    await expect(membres.getByText('Suivi par moi').first()).toBeVisible();
    await expect(membres.getByText('Suivi par Jean Mballa').first()).toBeVisible();
  });

  test('ajouter un membre : formulaire sans email / naissance / adresse', async ({ page }) => {
    await login(page, 'leader');
    await page.getByRole('button', { name: 'Ajouter' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter un membre' });
    await expect(dialog.getByText("Déjà dans l'annuaire ?")).toBeVisible();
    for (const absent of ['Email', 'Date de naissance', 'Adresse']) {
      await expect(dialog.getByText(absent, { exact: true })).toHaveCount(0);
    }
    const last = uniq('Membre');
    await dialog.locator('#firstName').fill('Test');
    await dialog.locator('#lastName').fill(last);
    await dialog.locator('#phone').fill(`+237 6 5${Date.now().toString().slice(-7)}`);
    await dialog.locator('#zoneResidence').fill('Bastos');
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(`Test ${last}`)).toBeVisible();
  });

  test('doublon de téléphone → avertissement + proposition de rattacher', async ({ page }) => {
    await login(page, 'leader');
    await page.getByRole('button', { name: 'Ajouter' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#firstName').fill('Autre');
    await dialog.locator('#lastName').fill('Personne');
    await dialog.locator('#phone').fill('+237 6 90 12 34 56'.replace('90 12 34 56', '98 76 54 32')); // Brigitte Essomba
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog.getByText('Doublon possible')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Rattacher cette personne à moi' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Créer un doublon quand même' })).toBeVisible();
  });

  test('département → son annuaire (leaders, encadreurs, membres, appel)', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/departements');
    await page.getByRole('button', { name: /Chorale/ }).first().click();
    await expect(page).toHaveURL(/\/departements\/\d+/);
    await expect(page.getByRole('heading', { name: 'Chorale' })).toBeVisible();
    await expect(page.getByText(/Leaders \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/Encadreurs \(\d+\)/)).toBeVisible();
    await expect(page.getByText('Annuaire du département')).toBeVisible();
    await expect(page.getByText('Sandrine Abena')).toBeVisible();
    await expect(page.getByText('Brigitte Essomba')).toHaveCount(0);
    await page.getByRole('link', { name: /Départements/ }).or(page.getByRole('button', { name: /Départements/ })).first().click();
    await expect(page).toHaveURL(/\/departements$/);
  });

  test('un département sans leader reste cliquable et affiche un état vide', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/departements');
    await page.getByRole('button', { name: /Ecodim/ }).first().click();
    await expect(page.getByText('Aucun membre', { exact: true })).toBeVisible();
  });

  test('objectif : cible + période → progression, frise, rythme ; dates incohérentes refusées', async ({ page }) => {
    await login(page, 'pasteur');
    const card = page.locator('div.rounded-2xl', { hasText: "Objectif d'évangélisation" });
    await card.getByRole('button', { name: "Modifier l'objectif" }).click();
    await card.getByLabel('Nombre de personnes à atteindre').fill('40');
    await card.getByLabel('Date de début').fill(day(5));
    await card.getByLabel('Date de fin').fill(day(1));
    await card.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(card.getByRole('alert')).toContainText('La date de fin doit être après la date de début');

    await card.getByLabel('Date de début').fill(day(-30));
    await card.getByLabel('Date de fin').fill(day(90));
    await card.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(card.getByText('/40')).toBeVisible();
    await expect(card.getByText(/personnes ajoutées à l'annuaire du/)).toBeVisible();
    await expect(card.getByText('Période écoulée')).toBeVisible();
    await expect(card.getByText(/jours restants/)).toBeVisible();
    await expect(card.getByText(/Rythme nécessaire/)).toBeVisible();
    await expect(card.getByText('Personnes ajoutées par mois')).toBeVisible();
    await expect(card.getByRole('meter', { name: 'Temps écoulé' })).toBeVisible();

    // Période passée : 0 ajout, « Période terminée ».
    await card.getByRole('button', { name: "Modifier l'objectif" }).click();
    await card.getByLabel('Date de début').fill(day(-90));
    await card.getByLabel('Date de fin').fill(day(-60));
    await card.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(card.getByText('Terminée', { exact: true })).toBeVisible();
    await expect(card.getByText(/^0\/40$/)).toBeVisible();
  });
});
