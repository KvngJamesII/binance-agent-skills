---
name: agent-mint-discovery
description: |
  Find and vet new agent-themed NFT mints and token claims in the Binance Web3 / BNB
  Chain ecosystem. Use when the user asks to discover new agent NFT mints, watch for free
  mints or airdrop claims, or evaluate whether a mint link is legitimate. Covers research
  and vetting; minting itself is a wallet write and always needs explicit user approval.
metadata:
  author: KvngJamesII
  version: "1.0.0"
  license: MIT
---

# Discover and vet agent-NFT mints

## Where candidates come from

- New mint contracts surfaced by community scanners (for example open-source
  agent-NFT sniper tools on GitHub). Treat scanner output as leads, not verdicts.
- Project X accounts, Binance Square posts and community chats. Look for the project's
  own announcement of the mint window, not secondhand links.
- Launchpads and reward portals tied to Binance Web3 Agent IDs.

## Vet every candidate before touching a wallet

1. Cross-check the contract address against the project's official site and official X
   account. A matching address in two independent official places is the minimum.
2. Read the contract on BscScan: verified source, sane mint price and supply, per-wallet
   limits, no unrestricted mint or drain functions.
3. Confirm the real cost: mint price, gas estimate, and whether claiming later requires
   another transaction. "Free" mints still cost gas.
4. Check resale routes before minting for resale: does the collection trade on Element,
   on its own market, or nowhere yet? No market means no exit.
5. Look at deadline mechanics: many mints and claims are time-limited windows.

## Rules for the agent

- Minting, claiming and approvals are wallet writes: always get the user's explicit
  approval with the exact cost shown first. Never mint autonomously.
- Never call `setApprovalForAll` or sign permits as part of a mint flow unless the user
  approved that exact approval. Mint sites that demand broad approvals are a red flag.
- Never present expected profit. State facts: cost, supply, window, current resale
  liquidity, and your confidence in the source.
- Report a lead as: contract address, what it is, cost to mint, window/deadline, resale
  route, and vetting status. Let the user decide.
- Phishing clones of popular mints are common. If the link came from a DM, a reply guy or
  a "too fast" countdown, treat it as hostile until cross-checked.
