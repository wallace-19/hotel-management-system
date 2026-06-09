-- Create extension (if needed) and table for staff password reset tokens
-- Run this in your Supabase SQL editor or via psql against your database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS staff_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_password_resets_token ON staff_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_staff_password_resets_staff_id ON staff_password_resets(staff_id);
