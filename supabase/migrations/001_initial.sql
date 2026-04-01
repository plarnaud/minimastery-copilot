-- MiniMastery Copilot — Phase 1 Schema

CREATE TABLE paint_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL,
  paint_type  TEXT NOT NULL,
  hex_color   TEXT,
  color_name  TEXT,
  barcode     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_paint_catalog_brand ON paint_catalog(brand);
CREATE INDEX idx_paint_catalog_name ON paint_catalog(name);

CREATE TABLE user_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paint_id    UUID REFERENCES paint_catalog(id) ON DELETE CASCADE NOT NULL,
  status      TEXT DEFAULT 'owned' CHECK (status IN ('owned', 'empty', 'wishlist')),
  added_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, paint_id)
);

CREATE INDEX idx_user_inventory_user ON user_inventory(user_id);

CREATE TABLE session_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  input_text      TEXT,
  input_image_url TEXT,
  plan_json       JSONB NOT NULL,
  feedback        TEXT CHECK (feedback IN ('positive', 'negative')),
  feedback_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_plans_user ON session_plans(user_id);

CREATE TABLE usage_tracking (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month       TEXT NOT NULL,
  plan_count  INT DEFAULT 0,
  UNIQUE(user_id, month)
);

-- Row Level Security
ALTER TABLE paint_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Paint catalog: readable by all authenticated users
CREATE POLICY "paint_catalog_read" ON paint_catalog
  FOR SELECT TO authenticated USING (true);

-- User inventory: users access only their own
CREATE POLICY "user_inventory_all" ON user_inventory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session plans: users access only their own
CREATE POLICY "session_plans_all" ON session_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usage tracking: users access only their own
CREATE POLICY "usage_tracking_all" ON usage_tracking
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
