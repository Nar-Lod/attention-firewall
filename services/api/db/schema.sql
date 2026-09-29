create table if not exists sessions (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_sessions_account on sessions(account_id);
create index if not exists idx_sessions_device on sessions(device_id);
