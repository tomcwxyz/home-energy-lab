CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('weather','bright')),
  status TEXT NOT NULL CHECK (status IN ('ok','error','needs_setup','waiting')),
  imported INTEGER NOT NULL DEFAULT 0 CHECK (imported >= 0),
  message TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingestion_runs_source_started_idx ON ingestion_runs(source,started_at DESC);
