# Binance Agent Skills

A skill pack for AI agents working in the Binance Web3 / BNB Chain agent ecosystem:
mine agent tokens, discover agent-NFT mints, watch your portfolio, and list NFTs on
Element, all from a Binance Agentic Wallet.

Give your agent the repo link and it can install the skills itself:

```bash
npx skills add KvngJamesII/binance-agent-skills
```

Pick one skill instead of the whole pack:

```bash
npx skills add KvngJamesII/binance-agent-skills --skill element-nft-listing
```

Works with any agent the open `skills` installer supports - its docs list 75+ agent
tools including Claude Code, Codex, Cursor and OpenClaw (see the installer's
supported-agents list for the current set). Requires Node.js 22+.

## Skills

| Skill | What it does | Writes? |
|---|---|---|
| `agent-token-mining` | Prepare, run and monitor PoW mining (ComputeRoll/CROLL), Agent ID token claims and Agent-ID-gated token launches, with eligibility checks and honest cost limits | Submission tx only, always user-approved |
| `element-nft-listing` | Build, sign and post a gasless ERC-721 listing on Element, verify it live. Tested on BSC mainnet | Off-chain order signed by your wallet; one-time per-collection approval is the only gas |
| `nft-portfolio-watch` | Read-only floor and listing checks across your held collections, with reminders to check project-owned markets beyond Element | No |
| `agent-mint-discovery` | Find and vet new agent-NFT mints and claims: sources, verification checklist, red flags | No (minting itself always needs your approval) |
| `baw-session-recovery` | Recover a dropped Binance Agentic Wallet CLI session without getting stuck | No |

The write paths use two public building blocks: Binance's official Agentic Wallet CLI
(`baw`, npm `@binance/agentic-wallet`) for signing, and Element's public `element-sdk`
npm package for order building and the exchange API. Mining uses each project's own
published reference tooling. No personal API keys, seeds or credentials are needed or
accepted anywhere in this pack.

## Safety principles

- Your agent must show you price, fees and net proceeds before signing anything.
- Mining submissions, mints, approvals and any on-chain transaction always require
  your explicit approval.
- Scripts default to dry-run; nothing is signed or posted without an explicit flag.
- Nothing here guarantees profit or token value. This pack is tooling, not financial
  advice.

## Repository layout

```
skills/
  binance-web3/
    agent-token-mining/     SKILL.md
    element-nft-listing/    SKILL.md + scripts/ (list-nft.mjs, check-listing.mjs)
    nft-portfolio-watch/    SKILL.md + scripts/ (floor-check.mjs)
    agent-mint-discovery/   SKILL.md
    baw-session-recovery/   SKILL.md
```

Each skill is a folder with a `SKILL.md` (YAML frontmatter + instructions) following the
open agent-skills format.

## License

MIT. See LICENSE.
