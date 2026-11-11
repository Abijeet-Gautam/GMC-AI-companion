-- Enable UUID extension
create extension if not exists pgcrypto;

-- Approved leaves (public tree)
create table if not exists approved_leaves (
  id text primary key,
  idempotency_key text not null unique,
  category text not null check (category in ('nature','innovation','education','community','wellbeing','culture')),
  chamber_id integer not null check (chamber_id between 1 and 4),
  chamber_reason text not null,
  created_at timestamptz not null default now(),
  status text not null default 'approved' check (status in ('approved','hidden')),
  mode text not null default 'offline',
  is_demo integer not null default 0,
  payload_hash text not null default ''
);

create index if not exists leaves_public_order on approved_leaves(status, created_at desc, id desc);

-- App metadata (session secret, revision, tree settings)
create table if not exists app_meta (
  key text primary key,
  value text not null
);

-- Rate limiting
create table if not exists rate_limits (
  key text primary key,
  count integer not null,
  expires bigint not null
);

-- Audit events
create table if not exists audit_events (
  id serial primary key,
  action text not null,
  leaf_id text,
  created_at timestamptz not null default now()
);

-- Reflection cache
create table if not exists reflection_cache (
  id integer primary key check (id = 1),
  body text not null,
  mode text not null,
  created_at timestamptz not null default now(),
  source_revision integer not null
);

-- Metrics
create table if not exists metrics (
  key text primary key,
  count integer not null default 0
);

-- Visitor submissions (private history - encrypted messages)
create table if not exists visitor_submissions (
  id text primary key,
  idempotency_key text not null unique,
  leaf_id text,
  private_message text not null,
  selected_theme text not null,
  outcome text not null check (outcome in ('approved','rejected')),
  reason text not null default '',
  created_at timestamptz not null default now(),
  private_reply text not null default '',
  owner_key text not null default '',
  visit_kind text not null default 'first'
);

create index if not exists visitor_submissions_order on visitor_submissions(created_at desc, id desc);

-- Visitor profiles (CID/PIN auth - hashes only, no plaintext identifiers)
create table if not exists visitor_profiles (
  id text primary key,
  cid_hash text not null unique,
  pin_salt text not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists visitor_profile_leaves (
  leaf_id text primary key,
  profile_id text not null,
  linked_at timestamptz not null default now()
);

create index if not exists visitor_profile_leaves_profile on visitor_profile_leaves(profile_id, linked_at desc);

create table if not exists visitor_profile_sessions (
  token_hash text primary key,
  profile_id text not null,
  expires bigint not null
);

-- Seed initial metadata
insert into app_meta (key, value) values ('revision', '0') on conflict (key) do nothing;
insert into app_meta (key, value) values ('session_secret', gen_random_uuid()::text) on conflict (key) do nothing;
