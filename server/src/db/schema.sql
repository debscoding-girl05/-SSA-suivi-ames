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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  date_naissance  DATE,
  sexe            TEXT CHECK (sexe IN ('M', 'F')),
  adresse         TEXT,
  zone_residence  TEXT,
  dirigeant_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes           TEXT,
  statut          TEXT NOT NULL DEFAULT 'regulier'
                  CHECK (statut IN ('nouveau', 'regulier', 'inactif')),
  first_seen_at   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignes_dirigeant ON assignes (dirigeant_id);
CREATE INDEX IF NOT EXISTS idx_assignes_statut ON assignes (statut);

-- Parcours des 7 leçons (Faiseurs de Disciples / Suivi). Une ligne = leçon validée.
CREATE TABLE IF NOT EXISTS progressions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigne_id   UUID NOT NULL REFERENCES assignes(id) ON DELETE CASCADE,
  lecon        INTEGER NOT NULL CHECK (lecon BETWEEN 1 AND 7),
  statut       TEXT NOT NULL DEFAULT 'validee' CHECK (statut IN ('en_cours', 'validee')),
  validated_at TIMESTAMPTZ,
  validant_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (assigne_id, lecon)
);

CREATE INDEX IF NOT EXISTS idx_progressions_assigne ON progressions (assigne_id);

-- Rapports hebdomadaires soumis par les dirigeants.
CREATE TABLE IF NOT EXISTS rapports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dirigeant_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  week           INTEGER NOT NULL,
  present_count  INTEGER NOT NULL DEFAULT 0,
  absents        TEXT,
  remarques      TEXT,
  status         TEXT NOT NULL DEFAULT 'soumis'
                 CHECK (status IN ('brouillon', 'soumis', 'valide', 'a_corriger')),
  review_comment TEXT,
  reviewed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- Rapports (documents) : synthèses narratives qui remontent leader → PR → Pasteur.
-- Distinct des fiches de présence ; contenu libre (ou agrégé), exportable PDF.
CREATE TABLE IF NOT EXISTS reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level          TEXT NOT NULL DEFAULT 'departement'
                 CHECK (level IN ('departement', 'synthese')),
  department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  year           INTEGER NOT NULL,
  week           INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'brouillon'
                 CHECK (status IN ('brouillon', 'transmis')),
  transmitted_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_author ON reports (author_id);
CREATE INDEX IF NOT EXISTS idx_reports_week ON reports (year, week);

-- Notifications in-app (Module 7). dedup_key évite les doublons par destinataire.
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL DEFAULT '',
  link         TEXT,
  dedup_key    TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id);

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

-- =============================================================
-- Module 8 — Cellules de prière (migration 0003)
-- =============================================================
CREATE TABLE IF NOT EXISTS cellules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           TEXT NOT NULL,
  leader_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  jour_reunion  TEXT,
  lieu          TEXT,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cellules_leader     ON cellules(leader_id);
CREATE INDEX IF NOT EXISTS idx_cellules_department ON cellules(department_id);

ALTER TABLE assignes ADD COLUMN IF NOT EXISTS cellule_id UUID REFERENCES cellules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assignes_cellule ON assignes(cellule_id);

CREATE TABLE IF NOT EXISTS fiches_cellule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cellule_id    UUID NOT NULL REFERENCES cellules(id) ON DELETE CASCADE,
  year          INT  NOT NULL,
  week          INT  NOT NULL,
  present_count INT  NOT NULL DEFAULT 0,
  effectif      INT  NOT NULL DEFAULT 0,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'brouillon'
                CHECK (status IN ('brouillon', 'soumis', 'valide', 'a_corriger')),
  submitted_at  TIMESTAMPTZ,
  validated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cellule_id, year, week)
);
CREATE INDEX IF NOT EXISTS idx_fiches_cellule_cellule ON fiches_cellule(cellule_id);

ALTER TABLE cellules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches_cellule ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Invitations de compte (migration 0004)
-- =============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email  ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;