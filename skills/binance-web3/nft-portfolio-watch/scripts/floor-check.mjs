#!/usr/bin/env node
/**
 * floor-check.mjs - Read-only snapshot of the best live Element listing for each
 * item in a watchlist (BNB Chain). No wallet, credentials or signing required.
 *
 * Usage:
 *   node floor-check.mjs --watchlist watchlist.json
 *
 * watchlist.json:
 *   [
 *     { "label": "My collection", "collection": "0x...", "tokenIds": ["123", "456"] }
 *   ]
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { ElementSDK } = require('element-sdk');
const { getChainMId } = require('@element-js/wallets');

const CHAIN_ID = 56;
const chainMId = getChainMId(CHAIN_ID);
const wallet = { chainId: CHAIN_ID, address: '0x0000000000000000000000000000000000000001' };
const sdk = new ElementSDK(wallet);

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) throw new Error(`Unexpected argument: ${k}`);
  args[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = process.argv[++i];
}
if (!args.watchlist) { console.error('Pass --watchlist <file.json>'); process.exit(2); }

const watchlist = JSON.parse(readFileSync(args.watchlist, 'utf8'));
const rows = [];
for (const entry of watchlist) {
  for (const tokenId of entry.tokenIds) {
    try {
      const best = await sdk.elementApi.getBestExchangeData({
        chainMId, standard: 'element-ex-v3',
        contractAddress: entry.collection.toLowerCase(), tokenId: String(tokenId), side: 1
      });
      const live = !!(best && best.isValid && Number(best.price) > 0);
      rows.push({
        label: entry.label || entry.collection,
        tokenId: String(tokenId),
        listed: live,
        priceBnb: live ? best.price : null,
        priceUsd: live ? best.priceUsd : null
      });
    } catch (e) {
      rows.push({ label: entry.label || entry.collection, tokenId: String(tokenId), listed: null, error: String(e.message || e) });
    }
  }
}
console.table(rows);
const listed = rows.filter(r => r.listed);
if (listed.length) {
  const floor = listed.reduce((a, b) => (a.priceBnb <= b.priceBnb ? a : b));
  console.log(`Lowest listed item: ${floor.label} #${floor.tokenId} at ${floor.priceBnb} BNB (~$${floor.priceUsd})`);
}
