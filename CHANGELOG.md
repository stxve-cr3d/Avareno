# Changelog

## 0.1.0-beta.1 — 2026-07-13

First closed-beta release candidate.

### Product

- Private Memory OS vertical slice: dashboard → create object (with type
  picker) → object profile → Memory Health → search/filter, with a
  first-value notice after creating an object
- Resolve is a real open-loops center derived from object data (warranty
  risk, missing receipts, incomplete profiles, open service points)
- Document archive on the Hausakte page (type, linked object, receipt
  context from extracted data)
- Home Assistant connector: connect a self-hosted instance with URL +
  long-lived token, import entities, safe power on/off for
  light/switch/media_player, device→object linking with rule-based
  suggestions and non-destructive unlink
- Connect page clarifies providers, live devices and memory-only device
  passports

- Objects can be deleted: removes the object with its documents (files
  included), cascades reminders/repairs, unlinks devices; audited and
  behind a two-step confirmation

### Reliability & data integrity

- Fresh-install fix: the first household-dependent request no longer 404s
  (household is created on demand)
- Re-sync never duplicates imported devices; unlink preserves both the
  object and the device
- Uploads validate size, extension, MIME type and empty files; documents
  download through short-lived signed tickets

### Privacy & security

- Production refuses to boot without authentication or with static
  uploads enabled (regression-tested against real process boots)
- Provider tokens are stored Fernet-encrypted only; setup refuses to
  store credentials when no encryption key is configured
- Home Assistant URLs are validated (http/https only, no credentials in
  URL, metadata endpoints blocked; LAN hosts allowed by design for
  self-hosted mode)
- Local JSON/ZIP data export; document deletion; deletion requests are
  recorded (full account deletion is not executed yet — see limitations)

### Testing

- New backend test suite (33 tests): items workflow, upload validation,
  signed downloads, connector security, device linking, privacy export,
  and production boot guards — `npm run test:backend`

### Known limitations

- AI receipt extraction is mocked and labeled "in Vorbereitung"
- Photo capture is planned, not implemented
- Account deletion executes as a recorded request only
- Single-machine SQLite deployment; manual backups (see docs/deploy-fly.md)
- E-mail/push notifications do not exist yet (reminders are in-app)
