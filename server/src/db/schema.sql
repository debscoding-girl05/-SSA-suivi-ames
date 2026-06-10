-- SSA — Suivi des Âmes — Schéma DB v2
-- Modèle : on gère les DIRIGEANTS (= comptes users) de l'église.
-- Chaque dirigeant a un département et des ASSIGNÉS (âmes suivies),
-- et soumet un RAPPORT hebdomadaire.
-- Compatible PostgreSQL 13+ / Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Départements (ministères de l'église).
CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dirigeants = comptes de connexion. Chacun a un rôle + un département.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users (department_id);

-- Assignés (âmes suivies) rattachés à un dirigeant.
CREATE TABLE IF NOT EXISTS assignes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  dirigeant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignes_dirigeant ON assignes (dirigeant_id);

-- Rapports hebdomadaires soumis par les dirigeants.
CREATE TABLE IF NOT EXISTS rapports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dirigeant_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  week          INTEGER NOT NULL,
  present_count INTEGER NOT NULL DEFAULT 0,
  absents       TEXT,
  remarques     TEXT,
  status        TEXT NOT NULL DEFAULT 'soumis' CHECK (status IN ('brouillon', 'soumis')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dirigeant_id, year, week)
);

CREATE INDEX IF NOT EXISTS idx_rapports_week ON rapports (year, week);
CREATE INDEX IF NOT EXISTS idx_rapports_dirigeant ON rapports (dirigeant_id);

-- Présence par assigné dans une fiche hebdomadaire (CDC EF-17/28).
CREATE TABLE IF NOT EXISTS presences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports(id) ON DELETE CASCADE,
  assigne_id UUID NOT NULL REFERENCES assignes(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'present' CHECK (statut IN ('present', 'absent', 'justifie')),
  UNIQUE (rapport_id, assigne_id)
);

CREATE INDEX IF NOT EXISTS idx_presences_rapport ON presences (rapport_id);

-- Rôles (hiérarchie pastorale — CDC v1.1 §3.1 / Annexe D, idempotent).
INSERT INTO roles (name, description) VALUES
  ('pasteur',        'Pasteur (Daddy) — super administrateur, lecture de tout'),
  ('pr',             'Première Responsable — admin secondaire, multi-départements'),
  ('leader',         'Leader principal — responsable d''un département'),
  ('encadreur',      'Encadreur / Sous-leader — groupe de 6 à 10 membres'),
  ('leader_cellule', 'Leader de cellule — anime une cellule de prière')
ON CONFLICT (name) DO NOTHING;

-- 13 départements officiels (CDC v1.1 Tableau 5, idempotent).
INSERT INTO departments (name, description) VALUES
  ('Faiseurs de Disciples',  'Intégration des nouveaux venus (7 leçons)'),
  ('Chorale',                'Animation musicale des cultes'),
  ('Audiovisuel',            'Captation et diffusion des services'),
  ('Protocole',              'Protocole et accueil des fidèles'),
  ('Intercession / Prière',  'Animation des temps de prière'),
  ('Évangélisation',         'Témoignage et recrutement'),
  ('Ecodim',                 'École du dimanche — encadrement des enfants'),
  ('Jeunes',                 'Animation et suivi des jeunes membres'),
  ('Femmes',                 'Encadrement du groupe des femmes'),
  ('Diaconesse',             'Diaconat féminin et soutien pastoral'),
  ('Nettoyage / Logistique', 'Nettoyage et gestion matérielle'),
  ('Sécurité Audiovisuelle', 'Sécurité audiovisuelle et technique'),
  ('Suivi',                  'Intégration des nouveaux venus et suivi des 7 leçons')
ON CONFLICT (name) DO NOTHING;
