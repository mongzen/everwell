// Downloads the raster images used by the design from Figma into public/images.
// Run on your own machine:  npm run assets
// NOTE: Figma asset links are temporary (~7 days). If a download fails with 403/404,
// re-run "Implement design" in Figma/Claude to get fresh links, or export the frames
// manually (see README) and save them with the same file names.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://www.figma.com/api/mcp/asset/269a3247-dcf2-40f9-ada8-b2256c12474e';
const FILES = {
  'hero.png': 'ebe17.png',            // Hero background (15:14)
  'support-center.png': '0054e.png',  // Support outro — centre image 320x320
  'support-cursor.png': '55585.png',  // Support list — hover preview 280x380
  'how-bg.png': '36dd5.png',          // How it works — background
  'step-1.png': '66e34.png',          // Step visual 01
  'step-2.png': 'f1303.png',          // Step visual 02
  'step-3.png': '3a1a6.png',          // Step visual 03
  'photo-1.png': '7a71b.png',         // Dr. Natthida Wongsuwan
  'photo-2.png': '9f63e.png',         // Kritsada Chaiyasit
  'photo-3.png': 'dfaf2.png',         // Pimchanok Srisuk
  'photo-4.png': 'c8a85.png',         // Siriporn Thongdee
};
await mkdir('public/images', { recursive: true });
let failed = 0;
for (const [local, remote] of Object.entries(FILES)) {
  const res = await fetch(`${BASE}/${remote}`);
  if (!res.ok) { console.error(`✗ ${local} (${res.status})`); failed++; continue; }
  await writeFile(`public/images/${local}`, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${local}`);
}
if (failed) { console.error(`\n${failed} file(s) failed — see the note at the top of scripts/fetch-assets.mjs`); process.exit(1); }
