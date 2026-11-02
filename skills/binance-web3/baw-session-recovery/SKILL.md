---
name: baw-session-recovery
description: |
  Recover a dropped Binance Agentic Wallet (baw) CLI session. Use when wallet writes fail
  with auth errors, `baw wallet status` shows the wallet unconnected, or a signing request
  cannot start because the session expired. Covers the reconnect flow, stale pairing
  codes, and the "app says connected but CLI is not" intermediate state.
metadata:
  author: KvngJamesII
  version: "1.0.0"
  license: MIT
---

# Recover a dropped baw wallet session

Sessions between the `baw` CLI and the Binance app expire. Existing listings and on-chain
assets are unaffected; only new writes (signing, sending) stop working. The fix is a
fresh pairing; there is no local repair.

## Flow

1. Confirm the state with `baw wallet status --json`. The CLI status is the source of
   truth, never what the Binance app screen shows.
2. Run `baw auth signin --json`. Show the user the returned `pairingCode` verbatim and
   give them the `urlForWeb` link exactly as returned. Do not modify or reconstruct the
   link.
3. Run `baw auth verify --qrCodeId <qrCodeId> --json` and keep it running: it blocks
   until the user confirms in the Binance app (about 5 minutes). If the process is
   killed, the sign-in may not land locally even if the app showed success; start over.
4. Confirm with `baw wallet status --json` before resuming any write.

## Failure modes

- Pairing codes expire after about 5 minutes. If `verify` reports the code expired, do
  not retry the same `qrCodeId`: run `auth signin` again for a fresh code.
- App shows "signed in" but CLI still says unconnected: restart from `auth signin` and
  finish `verify`; then trust `wallet status` only.
- If the user is mid-task (for example a listing signing), pause the write step,
  reconnect, then re-run from the step that needed the signature. Do not retry a signed
  payload produced before the disconnect without rebuilding it if it embeds
  time-sensitive fields.

## Operational habits

- Check `baw wallet status --json` before any batch of writes, not after one fails.
- When asking the user to reconnect, send the fresh link immediately; do not ask whether
  to send it.
- Do not attempt to keep sessions alive with automated pings; Binance controls session
  lifetime server-side.
