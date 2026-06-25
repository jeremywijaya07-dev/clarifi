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

// Builds the SVG string for a given pixel size and icon scale.
// iconScale=0.65 shrinks the chart to 65% of canvas and centers it with equal
// padding on all sides — ensures nothing is clipped when cropped to a circle.
function buildSvg(size, iconScale = 1.0) {
  const rx = Math.round((11 / 52) * size);
  const pad = size * (1 - iconScale) / 2;
  const s   = (size * iconScale) / 52;

  const sw1 = (3 / 52) * size * iconScale;
  const sw2 = (2.5 / 52) * size * iconScale;

  const pts = [
    [12, 36], [20, 16], [27, 28], [34, 8], [40, 5],
  ].map(([x, y]) => `${(x * s + pad).toFixed(2)},${(y * s + pad).toFixed(2)}`).join(' ');

  const cx  = (40 * s + pad).toFixed(2);
  const cy1 = (5  * s + pad).toFixed(2);
  const cy2 = (14 * s + pad).toFixed(2);
  const r   = (3.5 * s).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#00A86B"/>
  <polyline points="${pts}" stroke="white" stroke-width="${sw1.toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${cy1}" r="${r}" fill="white"/>
  <line x1="${cx}" x2="${cx}" y1="${cy1}" y2="${cy2}" stroke="white" stroke-width="${sw2.toFixed(2)}" stroke-linecap="round"/>
</svg>`;
}

async function generate() {
  const specs = [
    { name: 'logo-ig.png',    size: 500, iconScale: 0.65 },
    { name: 'logo-sm.png',    size: 200, iconScale: 0.65 },
    { name: 'favicon.png',    size: 192 },
    { name: 'favicon-32.png', size: 32  },
  ];

  for (const { name, size, iconScale = 1.0 } of specs) {
    const svg = Buffer.from(buildSvg(size, iconScale));
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
