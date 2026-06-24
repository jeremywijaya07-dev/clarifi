-- ============================================================
-- Clarifi — initial schema migration
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier       TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-insert a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── watchlist ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.watchlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  market     TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- ── portfolio ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolio (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  market     TEXT NOT NULL DEFAULT 'US',
  shares     NUMERIC NOT NULL DEFAULT 0,
  avg_price  NUMERIC NOT NULL DEFAULT 0,
  lot_size   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- ── alerts ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  market     TEXT NOT NULL DEFAULT 'US',
  name       TEXT,
  currency   TEXT NOT NULL DEFAULT 'IDR',
  condition  TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  price      NUMERIC NOT NULL,
  base_price NUMERIC,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  triggered  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- watchlist
CREATE POLICY "watchlist_select_own" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlist_insert_own" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_delete_own" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- portfolio
CREATE POLICY "portfolio_select_own" ON public.portfolio
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "portfolio_insert_own" ON public.portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "portfolio_update_own" ON public.portfolio
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "portfolio_delete_own" ON public.portfolio
  FOR DELETE USING (auth.uid() = user_id);

-- alerts
CREATE POLICY "alerts_select_own" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "alerts_insert_own" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_update_own" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "alerts_delete_own" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);
