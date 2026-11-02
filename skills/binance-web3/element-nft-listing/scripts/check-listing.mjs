#!/usr/bin/env node
/**
 * check-listing.mjs - Read-only check that an Element listing is live (BNB Chain).
 *
 * No wallet, credentials or signing required: element-sdk attaches its own
 * bundled application credential to read requests.
 *
 * Usage:
 *   node check-listing.mjs --order-id 1234567890
 *   node check-listing.mjs --collection 0x... --token-id 1234
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ElementSDK } = require('element-sdk');
const { getChainMId } = require('@element-js/wallets');

const CHAIN_ID = 56;
const wallet = { chainId: CHAIN_ID, address: '0x0000000000000000000000000000000000000001' };
const sdk = new ElementSDK(wallet);

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) throw new Error(`Unexpected argument: ${k}`);
  args[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = process.argv[++i];
}

if (args.orderId) {
  const r = await sdk.elementApi.getOrderExchangeDataByOrderId([{ orderId: String(args.orderId) }]);
  if (!r || !r.length) { console.log('Order not found.'); process.exit(1); }
  const d = r[0];
  console.log(JSON.stringify({
    orderId: d.orderId, isValid: d.isValid, standard: d.standard,
    priceBnb: d.price, priceUsd: d.priceUsd,
    contract: d.contractAddress, tokenId: d.tokenId,
    listingTime: d.listingTime, expirationTime: d.expirationTime,
    expiresAt: d.expirationTime ? new Date(d.expirationTime * 1000).toISOString() : null
  }, null, 2));
} else if (args.collection && args.tokenId) {
  const chainMId = getChainMId(CHAIN_ID);
  const best = await sdk.elementApi.getBestExchangeData({
    chainMId, standard: 'element-ex-v3',
    contractAddress: args.collection.toLowerCase(), tokenId: String(args.tokenId), side: 1
  });
  if (!best) { console.log('No live listing for that item.'); process.exit(1); }
  console.log(JSON.stringify({
    orderId: best.orderId, isValid: best.isValid,
    priceBnb: best.price, priceUsd: best.priceUsd
  }, null, 2));
} else {
  console.error('Pass --order-id <id> or --collection <0x..> --token-id <id>');
  process.exit(2);
}
