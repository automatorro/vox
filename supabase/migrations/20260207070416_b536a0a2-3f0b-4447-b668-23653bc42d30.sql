-- FAZA 1: Fundație Productivitate
-- Tabel pentru sesiunile de focus (Pomodoro)
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'work' CHECK (phase IN ('work', 'short_break', 'long_break')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS pentru focus_sessions
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus sessions"
ON focus_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions"
ON focus_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
ON focus_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions"
ON focus_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Realtime pentru focus_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE focus_sessions;

-- Index pentru query-uri frecvente
CREATE INDEX idx_focus_sessions_user_date ON focus_sessions(user_id, started_at);
CREATE INDEX idx_focus_sessions_item ON focus_sessions(item_id);

-- Tabel pentru statistici zilnice agregate
CREATE TABLE productivity_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  focus_minutes INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  most_productive_hour INTEGER CHECK (most_productive_hour >= 0 AND most_productive_hour <= 23),
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS pentru productivity_daily_stats
ALTER TABLE productivity_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own productivity stats"
ON productivity_daily_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own productivity stats"
ON productivity_daily_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productivity stats"
ON productivity_daily_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Index pentru statistici
CREATE INDEX idx_productivity_stats_user_date ON productivity_daily_stats(user_id, date DESC);

-- Trigger pentru updated_at pe productivity_daily_stats
CREATE TRIGGER update_productivity_daily_stats_updated_at
BEFORE UPDATE ON productivity_daily_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();