create extension if not exists pgcrypto;

create table if not exists accounts (
    id uuid primary key default gen_random_uuid(),
    auth_subject text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists devices (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references accounts(id) on delete cascade,
    platform text not null check (platform in ('web','android','ios','desktop')),
    app_version text not null,
    public_key bytea not null,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz,
    revoked_at timestamptz
);

create unique index if not exists devices_public_key_unique
    on devices(public_key);

create table if not exists entitlements (
    account_id uuid primary key references accounts(id) on delete cascade,
    plan text not null,
    status text not null check (status in ('active','trial','past_due','canceled','expired')),
    expires_at timestamptz,
    updated_at timestamptz not null default now()
);

-- Deliberately absent: sessions, usage_events, browsing_history, attention_events.
