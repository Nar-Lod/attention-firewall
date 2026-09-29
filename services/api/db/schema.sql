create table if not exists auth_challenges (
  id text primary key,
  challenge text not null,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null
);

create index if not exists idx_auth_challenges_expiry on auth_challenges(expires_at);

create index if not exists idx_sessions_token_hash on sessions(token_hash);
