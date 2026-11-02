---
name: agent-token-mining
description: |
  Prepare, run and monitor token-earning workflows in the Binance Web3 agent ecosystem:
  proof-of-work mining (ComputeRoll/CROLL), Agent ID token claims and Agent-ID-gated
  token launches. Use when the user asks to mine CROLL or similar agent tokens, check
  mining eligibility, run a CPU miner, or evaluate an Agent ID token claim. Mining
  submission is an on-chain transaction and always needs explicit user approval.
metadata:
  author: KvngJamesII
  version: "1.0.0"
  license: MIT
---

# Agent token mining on BNB Chain

"Mining" in this ecosystem covers three different things. Keep them separate: they have
different costs, risks and eligibility rules.

## 1. Proof-of-work mining (example: ComputeRoll / CROLL)

ComputeRoll is a live PoW token on BSC mainnet (chain id 56). Mechanics, per the
project's own documentation at computeroll.com/mining (verify there before acting -
this skill does not track live parameters):

- Eligibility: the exact wallet that submits a proof must hold an Agent ID (ERC-721) in
  the configured registry. A Binance wallet, a .ai name or a website login alone does
  not qualify. Eligibility checks are read-only: address, chain id, contract runtime
  hash, registry, miningState(address), walletCapacity(address), BNB balance. No wallet
  connection or signature is needed for checks.
- Work: the CPU searches nonce values with Keccak-256 against the wallet's personal
  challenge; a proof is valid while uint256(hash) < current target. Search time is
  probabilistic and the shared target tightens as issuance progresses.
- Reward: 10,000 CROLL per accepted proof; max supply 1,000,000,000; 100,000 proofs;
  zero premine. Ordinary receiving wallets are capped (8,000,000 CROLL) before 50%
  issuance; check walletCapacity before assuming a full reward can land.
- Submission: mine(personalRound, nonce, referenceEpoch) to the token contract with
  native value 0. It costs gas (BNB) and is the ONLY on-chain step. Failed submissions
  still burn gas.

## 2. Agent ID token claims and airdrops

Projects periodically offer free token claims to Agent ID holders (past examples
include BI and DOOR). Treat each claim like a mint: verify the contract against the
project's official channels, confirm the exact cost (claim tx gas vs. a priced
transaction), and check whether a liquidity pool or market exists before valuing the
tokens. Many claimed tokens have no pool and no exit.

## 3. Agent-ID-gated token launches

OpenFour (Four.meme) runs a "Binance Agent ID Exclusive" bonding preset: inner-market
buys require a Binance Agentic Wallet holding an Agent ID, and non-presale buys are
capped per address (1% of creation max supply at launch). Buying into a launch is a
purchase: show the user the exact cost, cap and tax mechanics and get explicit approval.
Treat every launch as high risk: most fail and liquidity can vanish.

## Workflow for PoW mining

1. Read-only eligibility check first: Agent ID at the exact submitting address, chain
   id 56, contract runtime hash and registry matching the project's official page,
   wallet capacity, BNB balance for gas. Report readiness before any hashing.
2. Agree limits with the user: run duration, reward-count limit and a gas budget in
   BNB. Stop at those limits; never extend them silently.
3. Use the project's own published reference miner (ComputeRoll publishes a readable
   CPU baseline at computeroll.com/agent-miner-source.txt with pinned dependencies).
   Read the source before running it. It must output an UNSIGNED candidate only; never
   run a miner that asks for keys or produces signed transactions.
4. Submit through the wallet's reviewed flow: with baw, `contract-call preview`, show
   the user the decoded call, destination, gas estimate and risks, get confirmation,
   then `execute`. Never grant token allowances or sign Permit/Permit2 for mining. No
   legitimate mining flow needs a registration deposit.
5. After a timeout or unclear result, do not submit twice: reconcile the pending
   transaction first. Count a reward only after a successful receipt and the matching
   mint events.

## Honest limitations (state these to the user)

- One measurement in late October 2026 estimated days per proof on an ordinary CPU at
  the difficulty seen then. That is a dated measurement, not a current prediction:
  difficulty rises as issuance progresses, so read the live target before setting
  expectations. There is no guaranteed time to reward and no guaranteed value for the
  reward.
- Gas, VPS and electricity costs are real and can exceed the value of mined tokens.
- A found proof is not reserved: it can be superseded before submission.
- Never move wallet credentials or sessions to a rented machine to mine faster. Hashing
  is local and unsigned; only the final submission touches the wallet.

## Sources

- ComputeRoll mining mechanics and official agent instructions: https://computeroll.com/mining
- ComputeRoll reference CPU miner source: https://computeroll.com/agent-miner-source.txt
- ComputeRoll protocol ABI/config: https://computeroll.com/agent-release.json
- OpenFour "Binance Agent ID Exclusive" launch mechanics: https://github.com/four-meme-community/openfour-docs/blob/main/docs/mechanisms/binance-agent-id-exclusive.md
- Binance Agentic Wallet CLI: https://www.npmjs.com/package/@binance/agentic-wallet
