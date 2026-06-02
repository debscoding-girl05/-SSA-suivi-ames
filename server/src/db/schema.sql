-- SSA — Suivi des Âmes — Schéma DB v1
-- Tables de base : roles, users
-- Compatible PostgreSQL 13+ / Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

-- Départements (ministères de l'église).
CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membres suivis ("âmes").
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'nouveau'
                CHECK (status IN ('nouveau', 'actif', 'inactif')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_department ON members (department_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);

-- Rôles de base (idempotent).
INSERT INTO roles (name, description) VALUES
  ('admin',     'Administrateur — accès complet'),
  ('leader',    'Responsable / Leader — gestion de son périmètre'),
  ('volunteer', 'Bénévole — saisie de terrain')
ON CONFLICT (name) DO NOTHING;

-- Départements de base (idempotent).
INSERT INTO departments (name, description) VALUES
  ('Accueil',        'Équipe d''accueil et intégration'),
  ('Louange',        'Louange et musique'),
  ('Jeunesse',       'Ministère des jeunes'),
  ('Intercession',   'Groupe de prière et intercession'),
  ('Évangélisation', 'Évangélisation et suivi des nouveaux')
ON CONFLICT (name) DO NOTHING;
