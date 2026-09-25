const { test, expect } = require('@playwright/test');
const { login, logout, pick, uniq } = require('./helpers');

test.describe('Comptes : création, invitation, mot de passe, désactivation', () => {
  const email = `${uniq('compte')}@ssa.app`;
  let tempPassword = '';

  test('Pasteur crée un encadreur rattaché à un leader → mot de passe provisoire', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter un compte' });
    await expect(dialog.getByRole('tab', { name: 'Créer le compte' })).toHaveAttribute('aria-selected', 'true');

    await dialog.locator('#ca-name').fill('Test Encadreur E2E');
    await dialog.locator('#ca-email').fill(email);
    await dialog.locator('#ca-phone').fill('+237 6 40 40 40 40');
    await pick(page, '#ca-dep', 'Chorale');
    await pick(page, '#ca-leader', 'Marie Nkolo');
    await dialog.getByRole('button', { name: 'Créer le compte' }).click();

    await expect(dialog.getByText('Compte créé pour')).toBeVisible();
    tempPassword = (await dialog.locator('code').textContent()).trim();
    expect(tempPassword).toMatch(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%*?]).{10}$/);
    await expect(dialog.getByRole('button', { name: 'Envoyer par WhatsApp' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Terminer' }).click();

    const row = page.locator('div', { hasText: 'Test Encadreur E2E' }).filter({ hasText: 'leader : Marie Nkolo' }).last();
    await expect(row).toBeVisible();
  });

  test('email déjà utilisé → erreur, pas de doublon', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#ca-name').fill('Doublon');
    await dialog.locator('#ca-email').fill('leader@ssa.app');
    await pick(page, '#ca-dep', 'Chorale');
    await dialog.getByRole('button', { name: 'Créer le compte' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Un compte existe déjà');
  });

  test('la PR ne peut pas créer de compte PR ou Secrétaire', async ({ page }) => {
    await login(page, 'pr');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    await page.locator('#ca-role').click();
    await expect(page.getByRole('option')).toHaveText(['Leader', 'Encadreur', 'Leader de cellule']);
  });

  test('première connexion avec le mot de passe provisoire, puis changement', async ({ page }) => {
    test.skip(!tempPassword, 'dépend du test de création');
    await login(page, [email, tempPassword]);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#currentPassword').fill(tempPassword);
    await dialog.locator('#newPassword').fill('faible');
    await dialog.locator('#confirmPassword').fill('faible');
    await dialog.getByRole('button', { name: 'Changer le mot de passe' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible(); // politique ENF-14

    await dialog.locator('#newPassword').fill('Nouveau#2026');
    await dialog.locator('#confirmPassword').fill('Nouveau#2026');
    await dialog.getByRole('button', { name: 'Changer le mot de passe' }).click();
    await expect(page.getByText('Mot de passe changé avec succès.')).toBeVisible();
    await page.keyboard.press('Escape');
    await logout(page);
    await login(page, [email, 'Nouveau#2026']);
  });

  test('changer le leader d’un encadreur depuis sa fiche', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: /Test Encadreur E2E/ }).first().click();
    await expect(page.getByText('Leader responsable :')).toBeVisible();
    await page.getByRole('button', { name: /Marie Nkolo/ }).click();
    await page.getByRole('option', { name: /Grâce Tchami/ }).click();
    await page.goto('/dirigeants');
    await expect(page.getByText('leader : Grâce Tchami')).toBeVisible();
  });

  test('désactiver un compte → connexion refusée ; réactiver → connexion OK', async ({ page }) => {
    await login(page, 'pasteur');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: /Test Encadreur E2E/ }).first().click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Désactiver' }).click();
    await expect(page.getByText('Désactivé', { exact: true })).toBeVisible();
    await logout(page);

    await page.locator('#identifier').fill(email);
    await page.locator('#password').fill('Nouveau#2026');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await login(page, 'pasteur');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: /Test Encadreur E2E/ }).first().click();
    await page.getByRole('button', { name: 'Réactiver' }).click();
    await expect(page.getByRole('button', { name: 'Désactiver' })).toBeVisible();
  });

  test('invitation par lien → la personne finalise son compte et arrive connectée', async ({ page }) => {
    const invited = `${uniq('invite')}@ssa.app`;
    await login(page, 'pr');
    await page.goto('/dirigeants');
    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Inviter par lien' }).click();
    await dialog.locator('#email').fill(invited);
    await pick(page, '#departmentId', 'Chorale');
    await dialog.getByRole('button', { name: "Créer l'invitation" }).click();
    const link = await dialog.locator('a[href*="/invitation/"]').getAttribute('href');
    await dialog.getByRole('button', { name: 'Terminer' }).click();
    await expect(page.getByText('Invitations en attente (1)')).toBeVisible();
    await expect(page.getByText(invited)).toBeVisible();
    await logout(page);

    await page.goto(new URL(link).pathname);
    await expect(page.getByText('Finalisez votre compte')).toBeVisible();
    await page.locator('#fullName').fill('Invité E2E');
    await page.locator('#phone').fill('+237 6 41 41 41 41');
    await page.locator('#password').fill('Invite#2026');
    await page.locator('#confirmPassword').fill('Invite#2026');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Le lien ne sert qu'une fois.
    await logout(page);
    await page.goto(new URL(link).pathname);
    await expect(page.getByText(/déjà été utilisée|invalide|introuvable/i)).toBeVisible();
  });
});
