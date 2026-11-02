---
name: element-nft-listing
description: |
  List, re-list, verify or cancel-readiness-check an ERC-721 NFT held in a Binance Web3
  (Agentic) wallet on the Element marketplace on BNB Chain. Use when the user asks to
  sell/list an NFT, check whether a listing is live, or build a batch of listings.
  Listings are off-chain signed orders: no gas and no Element account or personal API key.
metadata:
  author: KvngJamesII
  version: "1.0.0"
  license: MIT
---

# List an NFT on Element (BNB Chain)

Verified end to end on BSC mainnet in November 2026: order built, EIP-712 signed by a
Binance Agentic Wallet, accepted by Element's exchange API and visible on the asset page.

## Prerequisites

- Node.js 22 or newer.
- The Binance Agentic Wallet CLI (`baw`), signed in: `baw wallet status --json` must show
  the wallet connected. If it does not, run the `baw-session-recovery` skill first.
- Developer Mode enabled in the Binance app (required for `baw sign-message`). Check with
  `baw wallet settings --json`; if off, the user turns it on in the app under Agentic
  Wallet > Settings. This cannot be done from the CLI.
- The NFT must sit in the Binance Web3 wallet on BNB Chain (chain id 56).
- Run `npm install` in this skill's `scripts/` directory once. `element-sdk` is pinned to
  5.3.3 because the flow below is verified against that version. The `ox` package is
  declared explicitly because a transitive WalletConnect dependency fails without it.

## How authentication works (important)

`element-sdk` signs its API requests with its own bundled application credential
automatically. Do not pass an empty or invented API key: overriding the built-in auth
can break authentication. No personal Element API key and no Element account are needed.
This is observed behavior of element-sdk 5.3.3, not a guaranteed permanent interface;
if a request starts failing with auth errors, re-check against the current SDK before
assuming the flow broke elsewhere.

## Fees that must be in the order

Every sell order must carry Element's platform fee, currently 200 bps (2%) to Element's
platform fee recipient on BSC. A fee-zero order was rejected by the exchange API in
testing. The scripts set both values as constants; verify them against any live order
before relying on them (fetch one with `check-listing.mjs` and read the fee fields).

Some collections also set a creator royalty. Where one applies, it belongs in the order's
fee structure and is paid from proceeds: do not zero out or reduce a collection's
royalty to lower fees, because orders whose fees do not match the collection's registered
terms can be rejected. The verified test collection had no royalty (0 bps); the scripts'
royalty options exist so collections that have one are listed correctly.

## Steps

1. Confirm the collection approval. Listing itself is gasless, but Element's exchange
   contract needs a one-time `setApprovalForAll` per collection before the first listing
   from it. That approval is an on-chain transaction: it costs gas and must be confirmed
   by the user explicitly, like any on-chain write. If the collection was listed from
   before, the approval usually already exists.
2. Build the order (dry run, default):

   ```bash
   node scripts/list-nft.mjs --collection 0xCOLLECTION --token-id 1234 \
     --price-bnb 0.0011 --maker 0xYOUR_WALLET
   ```

   Review the printed summary: price, 2% platform fee, net proceeds, expiry, maker. The
   full order payload is written to `scripts/out/` for inspection.
3. Execute. Re-run the same command with `--execute`. The script checks the wallet
   connection, runs `baw sign-message preview`, then `execute`, waits for the Binance app
   confirmation if needed, attaches the signature and posts the order to Element.
4. Verify it is live:

   ```bash
   node scripts/check-listing.mjs --collection 0xCOLLECTION --token-id 1234
   ```

   or by order id: `node scripts/check-listing.mjs --order-id <id>`. Cross-check the
   asset page on element.market.

## Costs and limits

- Listing: free (off-chain signed order). One-time collection approval: gas. Sale: 2%
  platform fee plus any royalty, taken from proceeds. Cancelling a listing is an on-chain
  transaction (gas).
- Batch listing several tokens from one collection works with one signature; the example
  script lists a single token for clarity.

## Safety rules for the agent

- Never sign or post without showing the user the price, fees and net proceeds first.
- Never change an existing listing's price or cancel it without explicit user approval.
- Never accept or embed API keys, seeds or private keys; this flow needs none.
- Do not promise sale proceeds or floor outcomes. A listing is an offer, not a sale.

## Sources

- element-sdk on npm: https://www.npmjs.com/package/element-sdk (5.3.3 pinned)
- Element marketplace: https://element.market
- Binance Agentic Wallet CLI (`baw`): https://www.npmjs.com/package/@binance/agentic-wallet
- baw command reference (official skill docs): https://github.com/binance/binance-skills-hub/tree/main/skills/binance-web3/binance-agentic-wallet
