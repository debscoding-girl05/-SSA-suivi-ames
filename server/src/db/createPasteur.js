// Crée UNIQUEMENT le compte Pasteur initial — à utiliser en production à la
// place de `npm run seed`, qui insère aussi des comptes et des personnes de
// démonstration (mots de passe publics type `dirigeant1234`) que personne ne
// doit voir dans une vraie base de données d'église.
//
// Usage : node src/db/createPasteur.js <email> <mot-de-passe> "<Nom complet>"
const bcrypt = require("bcryptjs");
const db = require("./index");

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password || !fullName) {
    console.error('Usage : node src/db/createPasteur.js <email> <mot-de-passe> "<Nom complet>"'); // eslint-disable-line no-console
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères."); // eslint-disable-line no-console
    process.exit(1);
  }

  await db.init();

  const existing = await db.users.findByEmail(email);
  if (existing) {
    console.error(`Un compte existe déjà pour ${email}.`); // eslint-disable-line no-console
    process.exit(1);
  }

  const role = await db.roles.findByName("pasteur");
  if (!role) {
    console.error("Rôle 'pasteur' introuvable — le schéma a-t-il bien été initialisé ?"); // eslint-disable-line no-console
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.users.create({ email, passwordHash, fullName, phone: null, roleId: role.id, departmentId: null });

  console.log(`Compte Pasteur créé : ${user.email} (${user.fullName}).`); // eslint-disable-line no-console
  console.log("Connecte-toi puis invite le reste de l'équipe depuis l'application."); // eslint-disable-line no-console
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Échec de la création du compte Pasteur:", error); // eslint-disable-line no-console
    process.exit(1);
  });
