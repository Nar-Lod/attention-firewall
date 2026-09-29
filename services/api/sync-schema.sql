create table if not exists sync_vaults (
    account_id uuid primary key references accounts(id) on delete cascade,
    envelope jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- The server stores an encrypted envelope. It must not parse or index plaintext fields.
-- No behavioral history is synchronized through this table.
