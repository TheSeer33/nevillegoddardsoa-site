import Zernio from '@zernio/node';
import { readFile } from 'node:fs/promises';

// Local/server operations only. Never import this module into the storefront.
const args = process.argv.slice(2);
const command = args[0] || 'preview';
const products = JSON.parse(await readFile(new URL('../docs/payhip-products.json', import.meta.url)));
const product = products.find(p => p.id === args[1]);
const content = product
  ? `${product.name}: ${product.desc}\n\n${product.points.join('\n')}\n\n${product.pages}-page PDF · $${product.price}\n${product.url}`
  : `Put Neville Goddard's teachings into a practical routine.\n\nThe SATS Protocol — $27\n30-Day Assumption Workbook — $37\nMoney & Self-Concept Guide — $37\n\nExplore the guides: https://nevillegoddardsoa.com/products/\nEducational exercises and reflection. Individual experiences vary.`;

async function run() {
  if (command === 'preview') return console.log(content);
  if (!['accounts', 'draft', 'publish', 'schedule'].includes(command)) throw new Error('Use preview, accounts, draft, publish, or schedule.');
  if (args[1] && !product) throw new Error('Unknown product ID.');
  if (!process.env.ZERNIO_API_KEY) throw new Error('Set ZERNIO_API_KEY securely in the server environment.');
  const client = new Zernio();
  const response = await client.accounts.listAccounts();
  if (response.error || !response.data) throw new Error('Zernio account lookup failed; no post was sent.');
  const accounts = response.data.accounts || [];
  const safe = accounts.map(a => ({ id: a._id || a.id, platform: a.platform, username: a.username }));
  if (command === 'accounts') return console.log(JSON.stringify(safe, null, 2));
  const ids = (process.env.ZERNIO_ACCOUNT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) throw new Error('Set ZERNIO_ACCOUNT_IDS to explicit brand account IDs; no post was sent.');
  const selected = safe.filter(a => ids.includes(a.id));
  if (selected.length !== new Set(ids).size) throw new Error('A selected account is not connected; no post was sent.');
  const body = { content, platforms: selected.map(({ id, platform }) => ({ accountId: id, platform })) };
  if (command === 'draft') body.isDraft = true;
  if (command === 'publish') body.publishNow = true;
  if (command === 'schedule') {
    const date = new Date(process.env.ZERNIO_SCHEDULED_FOR || '');
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Set ZERNIO_SCHEDULED_FOR to a future ISO timestamp.');
    body.scheduledFor = date.toISOString();
  }
  // Do not automatically retry mutations: a timeout may still have created a post.
  const result = await client.posts.createPost({ body });
  if (result.error || !result.data?.post) throw new Error('Post result is uncertain. Inspect Zernio before retrying to avoid duplicates.');
  const post = result.data.post;
  console.log(JSON.stringify({ id: post._id, status: post.status, platforms: post.platforms?.map(p => ({ platform: p.platform, status: p.status, url: p.platformPostUrl })) }, null, 2));
  if (['failed', 'partial'].includes(post.status)) process.exitCode = 1;
}
run().catch(error => {
  // SDK error objects can contain authorization headers; never print raw errors.
  const message = error instanceof Error && !error.message.includes(process.env.ZERNIO_API_KEY || '\u0000') ? error.message : 'Zernio request failed.';
  console.error(message.startsWith('Set ') || message.includes('no post') || message.includes('Use ') || message.includes('Unknown ') || message.includes('uncertain') ? message : 'Zernio request failed. Check provider status and configuration.');
  process.exitCode = 1;
});
