# EasyDataTransfer Production Blueprint

## Core services

| Service | Responsibility |
| --- | --- |
| Web PWA | Wake session, receive mode, passkey prompts, transfer UX, share target, live widget |
| API | Users, devices, passkeys, trusted contacts, session tokens, audit events |
| Signaling | WebSocket SDP/ICE exchange only |
| Redis | TTL session state, live presence, progress events, rate limits |
| PostgreSQL | Durable account/device/passkey metadata |
| TURN | Encrypted relay fallback when direct WebRTC fails |

## PostgreSQL tables

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  platform text,
  trusted_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table passkey_credentials (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table transfer_sessions (
  id text primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  owner_device_id uuid references devices(id) on delete set null,
  receiver_user_id uuid references users(id) on delete set null,
  mode text not null check (mode in ('send', 'receive')),
  status text not null check (status in ('waiting', 'live', 'expired', 'ended')),
  keep_live boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table transfer_events (
  id bigserial primary key,
  session_id text not null references transfer_sessions(id) on delete cascade,
  event_type text not null,
  asset_kind text,
  asset_name text,
  asset_size bigint,
  content_sha256 text,
  created_at timestamptz not null default now()
);
```

## Redis keys

```txt
session:{sessionId}                 TTL 1h or 12h
session:{sessionId}:presence        TTL 30s heartbeat
session:{sessionId}:progress        TTL session lifetime
rate:user:{userId}:wake             sliding window
rate:ip:{ip}:join                   sliding window
```

## Required production hardening

- Replace the demo passkey verification routes with `@simplewebauthn/server` and replay-protected challenges.
- Store only metadata and hashes, never transferred content.
- Rotate per-session encryption keys and verify file SHA-256 on receipt.
- Add Redis-backed TTL enforcement so expired sessions cannot signal.
- Require same-account, trusted-contact, QR, or short code pairing. Do not auto-match strangers.
- Add upload-size limits, transfer cancellation, retry, and backpressure for very large files.
- Add Sentry, OpenTelemetry traces, structured logs, and a privacy-preserving audit trail.
- Put Cloudflare or another WAF in front of the API and signaling service.
