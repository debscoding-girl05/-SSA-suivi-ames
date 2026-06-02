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

-- Rôles de base (idempotent).
INSERT INTO roles (name, description) VALUES
  ('admin',     'Administrateur — accès complet'),
  ('leader',    'Responsable / Leader — gestion de son périmètre'),
  ('volunteer', 'Bénévole — saisie de terrain')
ON CONFLICT (name) DO NOTHING;
