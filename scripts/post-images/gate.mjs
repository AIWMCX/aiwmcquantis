// Truth gate for post images (no rendering deps, so tests can import it).
// Every number a reader can SEE on the image must also appear in the post text.
// Chart geometry (raw values, axis month labels) is shape, not a claim, and is skipped.
const NUM = /\d[\d,]*(?:\.\d+)?\s*[kK]?/g;
function numbersIn(text) {
  const out = new Set();
  for (const m of String(text).matchAll(NUM)) {
    const raw = m[0].replace(/[\s,]/g, '');
    const k = /k$/i.test(raw);
    const n = parseFloat(raw.replace(/k$/i, '')) * (k ? 1000 : 1);
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}
function displayedStrings(spec) {
  const s = [spec.kicker, spec.sub, spec.cta, spec.footnote, ...(spec.headline ?? []).map((l) => l.text)];
  for (const b of spec.blocks ?? []) {
    if (b.rowsTitle) s.push(b.rowsTitle);
    for (const r of b.rows ?? []) s.push(r.label, r.value);
    for (const c of b.cards ?? []) s.push(c.title, c.body);
    for (const t of b.stats ?? []) s.push(t.label, t.value, t.note);
    const ch = b.chart;
    if (ch) {
      for (const bar of ch.bars ?? []) s.push(bar.label, bar.valueLabel);
      if (ch.ref) s.push(ch.ref.label, ch.ref.valueLabel);
      if (ch.labels) s.push(...Object.values(ch.labels));
      s.push(ch.costLabel, ch.revLabel, ch.gapLabel, ch.lowLabel, ...(ch.series ?? []).map((x) => x.label));
    }
  }
  return s.filter(Boolean).map(String);
}
// Month/week axis markers like "M12", "W3", "Month 4" and list indexes are layout, not claims.
const LAYOUT_TOKEN = /\b(?:M|W|Q)\d{1,2}\b|#\d\b/g;
export function truthGate(spec, postText) {
  const allowed = numbersIn(postText);
  const missing = [];
  for (const str of displayedStrings(spec)) {
    for (const n of numbersIn(str.replace(LAYOUT_TOKEN, ''))) {
      if (!allowed.has(n) && !allowed.has(n * 1000) && !allowed.has(n / 1000)) missing.push(`${n} (in "${str}")`);
    }
  }
  return { ok: missing.length === 0, missing };
}

