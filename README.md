# EasyDataTransfer

Wake a private live connection and send anything until it expires.

This repo is a production-shaped MVP foundation for a zero-storage transfer app:

- Next.js PWA frontend
- Live transfer dashboard
- Keep Live session UX, up to 12 hours
- WebRTC DataChannel client helper
- WebSocket signaling server
- Passkey/WebAuthn API surfaces
- PWA manifest, service worker, and share target

## Run locally

```bash
npm install
npm run dev
```

In a second terminal:

```bash
npm run signal:dev
```

Open:

```txt
http://localhost:3000
```

## Production architecture

```txt
Browser/PWA A
  -> HTTPS API for auth/session creation
  -> WebSocket signaling
  -> WebRTC DataChannel
Browser/PWA B

PostgreSQL:
  users, devices, passkey credentials, trusted contacts, audit events

Redis:
  expiring sessions, live presence, transfer progress, rate limits

TURN:
  coturn or managed TURN for difficult NAT pairs
```

Files should move browser-to-browser over WebRTC. The backend should store session metadata only.

## Before real launch

- Replace demo passkey verification routes with `@simplewebauthn/server` verification backed by PostgreSQL.
- Put Redis behind `/api/sessions` so session expiry is enforced outside the browser.
- Add TURN credentials from a managed provider or coturn.
- Add rate limits, user/device accounts, abuse reporting, and observability.
- Add Playwright tests for wake, receive, keep-live, share-target, and transfer states.
# easyTransfer
