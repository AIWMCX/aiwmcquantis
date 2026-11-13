// Shared render + truth gate for AIWMC Quantis post images.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import fs from 'node:fs';
import { poster, W, H } from './poster.mjs';
export { truthGate } from './gate.mjs';

const here = (p) => new URL(p, import.meta.url);
const font = (f) => fs.readFileSync(here(`./fonts/${f}`));
const FONTS = [['Anton', 'Anton-Regular.ttf', 400], ['Inter', 'inter-400.ttf', 400], ['Inter', 'inter-600.ttf', 600], ['Inter', 'inter-700.ttf', 700], ['Mono', 'mono-500.ttf', 500]]
  .map(([name, file, weight]) => ({ name, data: font(file), weight }));
const antonBuf = font('Anton-Regular.ttf');
const anton = opentype.parse(antonBuf.buffer.slice(antonBuf.byteOffset, antonBuf.byteOffset + antonBuf.byteLength));
const LOGO = 'data:image/png;base64,' + fs.readFileSync(here('../../src/assets/brand/aiwmc-quantis-logo.png')).toString('base64');
const ASSETS = { logo: LOGO, measure: (t, s) => anton.getAdvanceWidth(t, s) };

export async function renderPng(spec) {
  const svg = await satori(poster(spec, ASSETS), { width: W, height: H, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

export function altText(spec, fallback) {
  return (spec.alt || fallback || (typeof spec.headline === 'string' ? spec.headline : spec.headline?.map((l) => l.text).join(' ')) || spec.question || 'AIWMC Quantis').slice(0, 300);
}
