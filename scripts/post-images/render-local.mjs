// Local preview: render every spec in a {key: spec} JSON file to <outDir>/<key>.png.
// Optional third arg: a {key: postText} JSON file; each spec must pass the truth gate against it.
// Usage: node render-local.mjs specs.json outDir [texts.json]
import fs from 'node:fs';
import path from 'node:path';
import { renderPng, truthGate } from './render.mjs';

const [specFile, outDir, textFile] = process.argv.slice(2);
if (!specFile || !outDir) { console.error('usage: node render-local.mjs specs.json outDir [texts.json]'); process.exit(1); }
const specs = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const texts = textFile ? JSON.parse(fs.readFileSync(textFile, 'utf8')) : null;
fs.mkdirSync(outDir, { recursive: true });
let bad = 0;
for (const [key, spec] of Object.entries(specs)) {
  if (texts) {
    const g = truthGate(spec, texts[key] ?? '');
    if (!g.ok) { bad++; console.log(`GATE FAIL ${key}: ${g.missing.join('; ')}`); continue; }
  }
  fs.writeFileSync(path.join(outDir, `${key}.png`), await renderPng(spec));
}
console.log(`rendered ${Object.keys(specs).length - bad}, gate failures ${bad}`);
process.exit(bad ? 1 : 0);
