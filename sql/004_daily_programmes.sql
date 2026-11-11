-- Individual day schedules imported from the Danfoss 2-channel programmer.
-- Each change appends a history row; legacy programme_history records remain intact.
CREATE TABLE IF NOT EXISTS programme_daily_history (
  id BIGSERIAL PRIMARY KEY,
  system TEXT NOT NULL CHECK (system IN ('heating','hot_water')),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  periods JSONB NOT NULL CHECK (jsonb_typeof(periods)='array' AND jsonb_array_length(periods)<=3),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','video')),
  review_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (review_status IN ('confirmed','partly_inferred')),
  note TEXT NOT NULL DEFAULT '',
  source_record_id TEXT UNIQUE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programme_daily_history_current_idx ON programme_daily_history (system,day_of_week,recorded_at DESC,id DESC);
