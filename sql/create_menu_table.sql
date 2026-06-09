-- Create menu table for persistent menu items
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS menu (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cat text,
  emoji text,
  name text NOT NULL,
  desc text,
  price numeric NOT NULL,
  avail boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_cat ON menu(cat);
CREATE INDEX IF NOT EXISTS idx_menu_avail ON menu(avail);
