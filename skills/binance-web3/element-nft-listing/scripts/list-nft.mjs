#!/usr/bin/env node
/**
 * list-nft.mjs - Build, sign and post a gasless ERC-721 listing on Element (BNB Chain).
 *
 * Default mode is DRY RUN: it builds the exact order payload and writes it to ./out/
 * so a human can review price, fees and net proceeds. Nothing is signed or posted
 * unless you pass --execute.
 *
 * Signing is done by the Binance Agentic Wallet CLI (`baw`), never by this script.
 * No private keys, seed phrases or API credentials are used or accepted here:
 * element-sdk attaches its own bundled application credential to API requests.
 *
 * Usage:
 *   node list-nft.mjs --collection 0x... --token-id 1234 --price-bnb 0.0011 --maker 0xYourWallet
 *   node list-nft.mjs --collection 0x... --token-id 1234 --price-bnb 0.0011 --maker 0xYourWallet --execute
 *
 * Options:
 *   --days N            Listing validity in days (default 4)
 *   --counter N         Maker hashNonce override (otherwise read from chain)
 *   --royalty-recipient 0x.. --royalty-bps N   Add a collection royalty line
 *   --execute           Sign via baw and post the order (requires confirmation in the Binance app flow)
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ethers } from 'ethers';

const require = createRequire(import.meta.url);
const { ElementSDK } = require('element-sdk');
const { createBSOrder } = require('element-sdk/lib/src/elementEx/batchSignedERC721Orders/makeOrders.js');
const { getTypedData } = require('element-sdk/lib/src/elementEx/batchSignedERC721Orders/batchSignedERC721EIP712Orders.js');
const { ElementExAddress, ElementExHelperAddress } = require('element-sdk/lib/src/contracts/config.js');
const { getChainMId } = require('@element-js/wallets');

const CHAIN_ID = 56; // BNB Chain mainnet
const ZERO = '0x0000000000000000000000000000000000000000';

// Element's platform fee. Orders without it are rejected by the exchange API
// (observed on element-sdk 5.3.3, BSC mainnet, 2026-11). Verify against any
// live order before relying on it: fetch one with check-listing.mjs and read
// platformFee / platformFeeRecipient from its exchange data.
const PLATFORM_FEE_BPS = 200; // 2%
const PLATFORM_FEE_RECIPIENT = '0x67c0a1fc3ec90aaa393adaea9cbe7230df3ec7ad';

const PUBLIC_BSC_RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc.publicnode.com',
  'https://bsc-dataseed1.defibit.io'
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--execute') { args.execute = true; continue; }
    if (!k.startsWith('--')) throw new Error(`Unexpected argument: ${k}`);
    args[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  return args;
}

function required(args, ...names) {
  for (const n of names) {
    if (args[n] == null || args[n] === '') {
      console.error(`Missing --${n.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}`);
      process.exit(2);
    }
  }
}

function baw(cmdArgs) {
  const out = execFileSync('baw', [...cmdArgs, '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(out);
}

async function getHashNonce(maker) {
  const helperAbi = ['function getHashNonce(address) view returns (uint256)'];
  const helperAddr = ElementExHelperAddress({ chainId: CHAIN_ID });
  for (const rpc of PUBLIC_BSC_RPCS) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpc, CHAIN_ID);
      const helper = new ethers.Contract(helperAddr, helperAbi, provider);
      const nonce = await helper.getHashNonce(maker);
      return nonce.toString();
    } catch (e) {
      // try the next public RPC
    }
  }
  throw new Error('Could not read hashNonce from any public BSC RPC. Pass --counter manually.');
}

const args = parseArgs(process.argv);
required(args, 'collection', 'tokenId', 'priceBnb', 'maker');

const priceBnb = Number(args.priceBnb);
if (!(priceBnb > 0)) { console.error('--price-bnb must be a positive number'); process.exit(2); }
const days = args.days ? Number(args.days) : 4;
const now = Math.floor(Date.now() / 1000);
const expirationTime = now + Math.round(days * 86400);

const maker = args.maker.toLowerCase();
const collection = args.collection.toLowerCase();
const tokenId = String(args.tokenId);

const feeBps = PLATFORM_FEE_BPS + (args.royaltyBps ? Number(args.royaltyBps) : 0);
const netBnb = priceBnb * (1 - feeBps / 10000);

console.log('--- Listing summary (review before executing) ---');
console.log(`Collection:   ${collection}`);
console.log(`Token ID:     ${tokenId}`);
console.log(`Price:        ${priceBnb} BNB`);
console.log(`Platform fee: ${PLATFORM_FEE_BPS / 100}% to ${PLATFORM_FEE_RECIPIENT}`);
if (args.royaltyBps) console.log(`Royalty:      ${args.royaltyBps / 100}% to ${args.royaltyRecipient}`);
console.log(`Net on sale:  ~${netBnb} BNB`);
console.log(`Expires:      ${new Date(expirationTime * 1000).toISOString()} (${days} days)`);
console.log(`Maker:        ${maker}`);

const wallet = { chainId: CHAIN_ID, address: maker };
const sdk = new ElementSDK(wallet);
const exchange = ElementExAddress({ chainId: CHAIN_ID });

// 1. Read the maker nonce and oracle config from Element's API.
const nonceData = await sdk.elementApi.getMakerNonceAndConfigData({
  exchange, maker, schema: 'erc721', count: 1
});
if (nonceData == null || nonceData.nonce == null) {
  console.error('Failed to read maker nonce from Element API. Check connectivity and try again.');
  process.exit(1);
}

// 2. Read the on-chain hashNonce (order-cancel counter) unless overridden.
const counter = args.counter != null ? String(args.counter) : await getHashNonce(maker);

// 3. Build the batch-signed order (same shape the Element exchange accepts).
const collectionFee = {
  protocolFeeAddress: PLATFORM_FEE_RECIPIENT,
  protocolFeePoints: PLATFORM_FEE_BPS
};
if (args.royaltyRecipient && args.royaltyBps) {
  collectionFee.royaltyFeeAddress = args.royaltyRecipient.toLowerCase();
  collectionFee.royaltyFeePoints = Number(args.royaltyBps);
}
const params = {
  paymentToken: { address: ZERO, decimal: 18 }, // native BNB
  listingTime: now - 60,
  expirationTime,
  items: [{
    tokenAddress: collection,
    tokenId,
    paymentAmount: priceBnb,
    collection: collectionFee
  }]
};
const order = createBSOrder(params, CHAIN_ID);
order.maker = maker;
order.exchange = exchange;
order.startNonce = Number(nonceData.nonce);
order.oracleSignature = nonceData.oracleSignature;
order.hashNonce = counter;

const typedData = getTypedData(order, CHAIN_ID);
const hash = ethers.utils._TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);

mkdirSync('out', { recursive: true });
const outFile = `out/listing-${tokenId}-${now}.json`;
writeFileSync(outFile, JSON.stringify({ order, typedData, hash }, null, 2));
console.log(`\nOrder payload written to ${outFile}`);
console.log(`Order hash: ${hash}`);

if (!args.execute) {
  console.log('\nDRY RUN - nothing signed or posted. Re-run with --execute to sign and list.');
  process.exit(0);
}

// 4. Sign with the Binance Agentic Wallet CLI (user confirms in the Binance app flow).
let status;
try {
  status = baw(['wallet', 'status']);
} catch {
  console.error('`baw` CLI not found or not working. Install @binance/agentic-wallet and sign in first.');
  process.exit(1);
}
if (!status?.data?.connected && status?.data?.status !== 'CONNECTED') {
  console.error('baw wallet is not connected. Run the baw-session-recovery flow, then retry.');
  process.exit(1);
}

const signMessage = JSON.stringify({
  method: 'eth_signTypedData_v4',
  params: [maker, JSON.stringify(typedData)]
});

const preview = baw(['sign-message', 'preview', '--binanceChainId', String(CHAIN_ID), '--signType', 'EIP712', '--message', signMessage]);
const requestId = preview?.data?.requestId;
if (!requestId) {
  console.error('sign-message preview failed:', JSON.stringify(preview));
  process.exit(1);
}
const risks = preview.data?.risks?.riskDetails?.length ?? 0;
console.log(`\nPreview OK (requestId ${requestId}), ${risks} risk finding(s).`);

const execRes = baw(['sign-message', 'execute', '--requestId', requestId]);
let sigData = execRes?.data;
if (sigData?.status === 'PENDING_CONFIRMATION') {
  console.log('Waiting for confirmation in the Binance app...');
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = baw(['sign-message', 'result', '--order-id', sigData.orderId]);
    if (poll?.data?.status === 'COMPLETED') { sigData = poll.data; break; }
  }
}
if (!sigData?.signature) {
  console.error('No signature returned:', JSON.stringify(sigData));
  process.exit(1);
}

// 5. Attach the signature and post the order.
const rawSig = (sigData.signature.startsWith('0x') ? sigData.signature.slice(2) : sigData.signature);
const recovery = parseInt(sigData.signatureRecovery ?? rawSig.slice(128, 130), 16);
order.v = 27 + recovery;
order.r = '0x' + rawSig.slice(0, 64);
order.s = '0x' + rawSig.slice(64, 128);
order.signatureType = 0; // EOA EIP-712
order.hash = hash;

const postRes = await sdk.postBatchSignedERC721Order(order);
console.log('\nPost response:', JSON.stringify(postRes));
const ok = postRes?.success === true || postRes?.data?.success === true;
if (!ok) {
  console.error('Order was not accepted. See the response above (failList / message).');
  process.exit(1);
}

// 6. Verify the listing is live.
const chainMId = getChainMId(CHAIN_ID);
const best = await sdk.elementApi.getBestExchangeData({
  chainMId, standard: 'element-ex-v3', contractAddress: collection, tokenId, side: 1
});
if (best && best.isValid) {
  console.log(`\nLIVE: best listing for token ${tokenId} is ${best.price} BNB (~$${best.priceUsd}), orderId ${best.orderId}`);
} else {
  console.log('\nPosted, but the listing did not show up on verification. Re-check in a minute.');
}
