---
name: nft-portfolio-watch
description: |
  Read-only monitoring of BNB Chain NFT holdings and listings on Element: best live
  listing per item, floor moves, sale activity across held collections. Use when the user
  asks to watch floors, track their NFT portfolio, check whether sales have started in a
  collection, or get alerted to price moves. Covers only reads; use element-nft-listing
  for any write.
metadata:
  author: monaqr
  version: "1.0.0"
  license: MIT
---

# Watch an NFT portfolio on Element (BNB Chain)

All checks here are read-only API calls. They need no wallet connection, no signing and
no credentials: `element-sdk` attaches its own bundled application credential to reads.

## What to check and where

- Best live listing for a specific token: `getBestExchangeData` (wrapped by
  `scripts/floor-check.mjs`). Returns price in BNB and USD and whether the order is valid.
- All live listings for one token: `getItemFullOrderDataList` (paged).
- A known order by id: `getOrderExchangeDataByOrderId`.
- Element's chain id mapping differs from raw chain ids: BSC (chain id 56) is chainMId
  201. Use `getChainMId` from `@element-js/wallets` instead of hardcoding.

Run `npm install` in this skill's `scripts/` directory once, copy
`watchlist.example.json` to `watchlist.json`, fill in the collections and token ids, then:

```bash
node scripts/floor-check.mjs --watchlist watchlist.json
```

## Look beyond Element

Not every collection trades on Element. Many agent-NFT projects run their own market or
time-limited selling windows announced on their site or X account. For each held
collection, keep a note of its official market and announcement channel, and check those
before concluding there are no sales. Verify the payment currency before quoting any
price: a "0.02" listing priced in USDT is not 0.02 BNB.

## Reporting discipline

- Agree a minimum price threshold with the user (for example $1) and only report moves
  above it; silent cycles need no message.
- Report actual changes: a sale, a new floor, a listing that went live or expired. Do not
  send "nothing changed" digests on a timer.
- Keep checks to a sane cadence. Polling public endpoints aggressively can get rate
  limited; hourly is a safe default unless the user asks for faster.
