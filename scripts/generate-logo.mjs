// Generates Clarifi logo PNGs and favicon files from the inline SVG definition.
// The SVG matches exactly what's rendered in components/Navbar.tsx and app/page.tsx.
// Run: node scripts/generate-logo.mjs

import sharp from 'sharp';
import toIco from 'to-ico';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Builds the SVG string for a given pixel size.
// rx scales proportionally from the original rx=11 on a 52x52 canvas.
function buildSvg(size) {
  const rx = Math.round((11 / 52) * size);
  // Stroke widths scale with size
  const sw1 = (3 / 52) * size;
  const sw2 = (2.5 / 52) * size;

  // All coordinates scaled from the original 52x52 viewBox
  const s = size / 52;
  const pts = [
    [12, 36], [20, 16], [27, 28], [34, 8], [40, 5],
  ].map(([x, y]) => `${(x * s).toFixed(2)},${(y * s).toFixed(2)}`).join(' ');

  const cx = (40 * s).toFixed(2);
  const cy1 = (5 * s).toFixed(2);
  const cy2 = (14 * s).toFixed(2);
  const r  = (3.5 * s).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#00A86B"/>
  <polyline points="${pts}" stroke="white" stroke-width="${sw1.toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${cy1}" r="${r}" fill="white"/>
  <line x1="${cx}" x2="${cx}" y1="${cy1}" y2="${cy2}" stroke="white" stroke-width="${sw2.toFixed(2)}" stroke-linecap="round"/>
</svg>`;
}

async function generate() {
  const specs = [
    { name: 'logo-ig.png',  size: 500 },
    { name: 'logo-sm.png',  size: 200 },
    { name: 'favicon.png',  size: 192 },
    { name: 'favicon-32.png', size: 32 },
  ];

  for (const { name, size } of specs) {
    const svg = Buffer.from(buildSvg(size));
    const outPath = path.join(publicDir, name);
    await sharp(svg).png().toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Build favicon.ico (multi-size: 16, 32, 48) from the 32px PNG
  const png32 = await fs.readFile(path.join(publicDir, 'favicon-32.png'));
  const ico = await toIco([png32]);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), ico);
  console.log('✓ favicon.ico');

  // Clean up temp file
  await fs.unlink(path.join(publicDir, 'favicon-32.png'));
}

generate().catch(err => { console.error(err); process.exit(1); });
