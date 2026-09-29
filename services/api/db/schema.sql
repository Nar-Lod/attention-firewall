create table if not exists accounts (
  id uuid primary key,
  auth_subject text not null unique,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table if not exists passkeys (
  id text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  webauthn_user_id text not null,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text,
  device_type text not null check (device_type in ('singleDevice','multiDevice')),
  backed_up boolean not null default false,
  created_at timestamptz not null default now(),
  unique(account_id, webauthn_user_id, id)
);

create index if not exists idx_passkeys_account on passkeys(account_id);

create table if not exists devices (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  platform text not null check (platform in ('web','android','ios','desktop')),
  app_version text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists entitlements (
  account_id uuid primary key references accounts(id) on delete cascade,
  plan text not null check (plan in ('free','premium','family','team')),
  status text not null check (status in ('active','inactive','past_due')),
  expires_at timestamptz
);

create table if not exists sync_vaults (
  account_id uuid primary key references accounts(id) on delete cascade,
  envelope jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No behavioral history belongs in this schema.
