// AIWMC Quantis post poster: spec -> satori element tree (runtime-agnostic: Node or Deno).
// Every number and label on the image comes from the spec. Nothing is invented here.
export const W = 1080, H = 1350;
export const C = { bg0: '#050b16', bg1: '#0a1830', ink: '#f5f3ee', mute: '#9fb0c8', blue: '#2f9bff', blueHi: '#7cc4ff', amber: '#f5a524', red: '#ff6b6b', line: 'rgba(124,196,255,0.18)', card: 'rgba(12,28,56,0.55)', cardLine: 'rgba(47,155,255,0.35)' };
const tone = (t) => (t === 'amber' ? C.amber : t === 'mute' ? C.mute : t === 'ink' ? C.ink : C.blueHi);
const toneStroke = (t) => (t === 'amber' ? C.amber : t === 'mute' ? '#5d7290' : C.blue);

const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c !== null && c !== false && c !== undefined) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- SVG chart primitives (labels are collected and drawn by satori) ----------
let LABELS = [];
const label = (x, y, s, o = {}) => { LABELS.push({ x, y, s, size: 22, fill: C.mute, anchor: 'start', weight: 500, family: 'Mono', ls: 2, ...o }); return ''; };
const glow = (id, color, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="460"><feGaussianBlur stdDeviation="${sd}" result="b"/><feFlood flood-color="${color}" flood-opacity="0.9"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const defs = (extra = '') => `<defs>${glow('gb', C.blue, 7)}${glow('ga', C.amber, 7)}${glow('gm', '#5d7290', 4)}${extra}</defs>`;
function catmull(p) { let d = `M${p[0][0]},${p[0][1]}`; for (let i = 0; i < p.length - 1; i++) { const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c; d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`; } return d; }
const svg = (w, hh, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}">${body}</svg>`;

// gap: flat cost line vs ramping revenue; hatched area = cash carried until they cross
function gap({ months, cost, revenue, costLabel, revLabel, gapLabel }) {
  const w = 1000, hh = 420, x0 = 30, x1 = 960, yTop = 60, yBot = 330;
  const max = Math.max(...cost, ...revenue) * 1.15;
  const X = (i) => x0 + (i / (months.length - 1)) * (x1 - x0), Y = (v) => yBot - (v / max) * (yBot - yTop);
  const cross = revenue.findIndex((r, i) => r >= cost[i]); const end = cross > 0 ? cross : months.length - 1;
  let shade = `M${X(0)},${Y(cost[0])}`; for (let i = 1; i <= end; i++) shade += ` L${X(i)},${Y(cost[i])}`; for (let i = end; i >= 0; i--) shade += ` L${X(i)},${Y(revenue[i])}`; shade += 'Z';
  months.forEach((m, i) => label(X(i), yBot + 48, m.toUpperCase(), { anchor: 'middle', fill: C.ink, size: 20 }));
  label(X(0) + 20, Y(cost[0]) - 26, costLabel.toUpperCase(), { fill: C.amber, size: 24, weight: 700, family: 'Inter', ls: 1.5 });
  label(x1, yTop - 34, revLabel.toUpperCase(), { fill: C.blueHi, size: 24, weight: 700, family: 'Inter', anchor: 'end', ls: 1.5 });
  if (gapLabel) label((X(0) + X(end)) / 2, (Y(cost[1]) + Y(revenue[1])) / 2 + 30, gapLabel.toUpperCase(), { fill: C.amber, size: 26, weight: 700, family: 'Inter', anchor: 'middle', ls: 1.5 });
  const cx = cross > 0 ? X(cross) : null;
  return [svg(w, hh, `${defs(`<pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${C.amber}" stroke-opacity="0.35" stroke-width="2"/></pattern><linearGradient id="sf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0.04"/></linearGradient>`)}
  ${months.map((_, i) => `<line x1="${X(i)}" y1="${yTop - 20}" x2="${X(i)}" y2="${yBot}" stroke="${C.line}" stroke-dasharray="4 8"/>`).join('')}
  <line x1="0" y1="${yBot}" x2="${x1 + 20}" y2="${yBot}" stroke="${C.ink}" stroke-opacity="0.8" stroke-width="2"/>
  <path d="${shade}" fill="url(#sf)"/><path d="${shade}" fill="url(#hatch)"/>
  <polyline points="${cost.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${C.amber}" stroke-width="5" filter="url(#ga)"/>
  <path d="${catmull(revenue.map((v, i) => [X(i), Y(v)]))}" fill="none" stroke="${C.blue}" stroke-width="5" filter="url(#gb)"/>
  <circle cx="${X(0)}" cy="${Y(cost[0])}" r="9" fill="${C.amber}"/>
  ${cx ? `<line x1="${cx}" y1="${yTop - 20}" x2="${cx}" y2="${yBot}" stroke="${C.ink}" stroke-opacity="0.7" stroke-dasharray="6 6" stroke-width="2"/><circle cx="${cx}" cy="${Y(cost[cross])}" r="13" fill="${C.ink}" stroke="${C.blue}" stroke-width="5" filter="url(#gb)"/>` : ''}`), hh];
}

// cumulative: running total of monthlyNet; marks monthly break-even (first non-negative month) and payback (zero crossing)
function cumulative({ months, monthlyNet, labels, lowLabel }) {
  const w = 1000, hh = 440, x0 = 70, x1 = 960, yTop = 40, yBot = 380;
  const n0 = months.length; const xs = months.map((_, i) => i); let c = 0; const cum = monthlyNet.map((v) => (c += v)); months = [...months];
  const lo = Math.min(0, ...cum), hi = Math.max(0, ...cum), pad = (hi - lo) * 0.12;
  const X = (i) => x0 + (xs[i] / (n0 - 1)) * (x1 - x0), Y = (v) => yBot - ((v - (lo - pad)) / (hi + 2 * pad - lo)) * (yBot - yTop);
  const be = monthlyNet.findIndex((v, i) => v >= 0 && (i === 0 || monthlyNet[i - 1] < 0));
  let pb = cum.findIndex((v, i) => i > 0 && v >= 0 && cum[i - 1] < 0);
  if (pb > 0 && cum[pb] > 0) { const t = -cum[pb - 1] / (cum[pb] - cum[pb - 1]); cum.splice(pb, 0, 0); months.splice(pb, 0, ''); xs.splice(pb, 0, pb - 1 + t); }
  const path = (a, b) => catmull(cum.slice(a, b + 1).map((v, k) => [X(a + k), Y(v)]));
  const neg = pb > 0 ? pb : cum.length - 1, zero = Y(0);
  const step = n0 > 8 ? 2 : 1;
  months.forEach((m, i) => { if (m && xs[i] % step === 0) label(X(i), yBot + 40, m.toUpperCase(), { anchor: 'middle', size: 18 }); });
  label(x0 - 34, zero - 14, '0', { fill: C.ink, anchor: 'end' });
  if (lowLabel && lo < 0) label(x0 - 34, Y(lo) - 14, lowLabel, { fill: C.amber, anchor: 'end', size: 18 });
  const mark = (i, color, glowId, text) => { if (i < 0) return ''; const right = X(i) > 820, left = X(i) < 180; label(right ? X(i) + 30 : left ? X(i) - 30 : X(i), yTop - 32, text, { fill: color, size: 22, weight: 700, family: 'Inter', anchor: right ? 'end' : left ? 'start' : 'middle', ls: 1.5 }); return `<line x1="${X(i)}" y1="${yTop}" x2="${X(i)}" y2="${yBot}" stroke="${color}" stroke-dasharray="6 6" stroke-width="2"/><circle cx="${X(i)}" cy="${Y(cum[i])}" r="11" fill="${C.bg0}" stroke="${color}" stroke-width="5" filter="url(#${glowId})"/>`; };
  return [svg(w, hh, `${defs(`<linearGradient id="nf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.05"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0.45"/></linearGradient>`)}
  ${months.map((m, i) => (m ? `<line x1="${X(i)}" y1="${yTop}" x2="${X(i)}" y2="${yBot}" stroke="${C.line}" stroke-dasharray="3 9"/>` : '')).join('')}
  <line x1="${x0 - 20}" y1="${zero}" x2="${x1 + 20}" y2="${zero}" stroke="${C.ink}" stroke-opacity="0.7" stroke-width="2"/>
  <path d="${path(0, neg)} L${X(neg)},${zero} L${X(0)},${zero}Z" fill="url(#nf)"/>
  <path d="${path(0, neg)}" fill="none" stroke="${C.amber}" stroke-width="5" filter="url(#ga)"/>
  ${neg < cum.length - 1 ? `<path d="${path(neg, cum.length - 1)}" fill="none" stroke="${C.blue}" stroke-width="5" filter="url(#gb)"/>` : ''}
  ${labels.breakEven && be !== pb ? mark(be, C.blueHi, 'gb', labels.breakEven) : ''}${mark(pb, C.amber, 'ga', labels.payback)}`), hh];
}

// bars: vertical bars with value labels; optional reference line (e.g. an average)
function bars({ bars: B, ref, max: forcedMax, height = 400 }) {
  const w = 1000, hh = height, x0 = ref ? 190 : 20, x1 = 980, yTop = 58, yBot = hh - 64;
  const max = (forcedMax ?? Math.max(...B.map((b) => b.value), ref?.value ?? 0)) * 1.08;
  const slot = (x1 - x0) / B.length, bw = Math.min(150, slot * 0.58);
  const Y = (v) => yBot - (v / max) * (yBot - yTop);
  let body = '';
  B.forEach((b, i) => {
    const cx = x0 + slot * (i + 0.5), y = Y(b.value), col = toneStroke(b.tone);
    body += `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${yBot - y}" rx="6" fill="url(#bf_${b.tone ?? 'blue'})" stroke="${col}" stroke-width="2.5" filter="url(#${b.tone === 'amber' ? 'ga' : b.tone === 'mute' ? 'gm' : 'gb'})"/>`;
    label(cx, y - 46, b.valueLabel, { anchor: 'middle', fill: b.tone === 'mute' ? C.mute : tone(b.tone), size: B.length > 6 ? 22 : 30, weight: 700, family: 'Inter', ls: 0.5 });
    label(cx, yBot + 44, b.label.toUpperCase(), { anchor: 'middle', fill: C.ink, size: B.length > 6 ? 17 : 19 });
  });
  if (ref) { const y = Y(ref.value); body += `<line x1="0" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.ink}" stroke-opacity="0.85" stroke-width="2.5" stroke-dasharray="10 8"/>`; label(0, y - 62, ref.label.toUpperCase(), { fill: C.ink, size: 19, weight: 700, family: 'Inter', ls: 1.5 }); label(0, y - 36, ref.valueLabel, { fill: C.ink, size: 24, weight: 700, family: 'Inter', ls: 0.5 }); }
  const grad = (k, c) => `<linearGradient id="bf_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0.55"/><stop offset="1" stop-color="${c}" stop-opacity="0.08"/></linearGradient>`;
  return [svg(w, hh, `${defs(grad('blue', C.blue) + grad('amber', C.amber) + grad('mute', '#5d7290'))}<line x1="0" y1="${yBot}" x2="${w}" y2="${yBot}" stroke="${C.ink}" stroke-opacity="0.7" stroke-width="2"/>${body}`), hh];
}

// fan: several labelled lines from a shared start (scenarios)
function fan({ months, series }) {
  const w = 1000, hh = 420, x0 = 30, x1 = 800, yTop = 40, yBot = 340;
  const all = series.flatMap((s) => s.values); const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.1;
  const X = (i) => x0 + (i / (months.length - 1)) * (x1 - x0), Y = (v) => yBot - ((v - lo + pad) / (hi - lo + 2 * pad)) * (yBot - yTop);
  months.forEach((m, i) => label(X(i), yBot + 44, m.toUpperCase(), { anchor: 'middle', size: 18 }));
  const body = series.map((s) => { const col = toneStroke(s.tone); const last = s.values.length - 1; label(X(last) + 26, Y(s.values[last]) - 16, s.label.toUpperCase(), { fill: tone(s.tone), size: 22, weight: 700, family: 'Inter', ls: 1.5 }); return `<path d="${catmull(s.values.map((v, i) => [X(i), Y(v)]))}" fill="none" stroke="${col}" stroke-width="${s.tone === 'mute' ? 4 : 5}" ${s.dashed ? 'stroke-dasharray="12 10"' : ''} filter="url(#${s.tone === 'amber' ? 'ga' : s.tone === 'mute' ? 'gm' : 'gb'})"/><circle cx="${X(last)}" cy="${Y(s.values[last])}" r="9" fill="${C.bg0}" stroke="${col}" stroke-width="4"/>`; }).join('');
  return [svg(w, hh, `${defs()}${months.map((_, i) => `<line x1="${X(i)}" y1="${yTop}" x2="${X(i)}" y2="${yBot}" stroke="${C.line}" stroke-dasharray="3 9"/>`).join('')}<line x1="0" y1="${yBot}" x2="${x1 + 20}" y2="${yBot}" stroke="${C.ink}" stroke-opacity="0.7" stroke-width="2"/><circle cx="${X(0)}" cy="${Y(series[0].values[0])}" r="10" fill="${C.ink}"/>${body}`), hh];
}

const CHARTS = { gap, cumulative, bars, fan };
const b64 = (s) => (typeof Buffer !== 'undefined' ? Buffer.from(s).toString('base64') : btoa(unescape(encodeURIComponent(s))));
function chartBlock(spec) {
  LABELS = [];
  const [s, hh0] = CHARTS[spec.type](spec);
  const k = 0.94, w = 1000 * k, hh = hh0 * k;
  const labels = LABELS.map((l) => { const box = 520, top = l.y * k; const left = l.anchor === 'middle' ? l.x * k - box / 2 : l.anchor === 'end' ? l.x * k - box : l.x * k; return h('div', { position: 'absolute', left, top, width: box, justifyContent: l.anchor === 'middle' ? 'center' : l.anchor === 'end' ? 'flex-end' : 'flex-start', fontFamily: l.family, fontWeight: l.weight, fontSize: l.size * k, letterSpacing: l.ls, color: l.fill }, esc(l.s)); });
  return h('div', { position: 'relative', width: w, height: hh, marginTop: 20 }, img('data:image/svg+xml;base64,' + b64(s), { position: 'absolute', left: 0, top: 0, width: w, height: hh }), ...labels);
}

// ---------- non-chart blocks ----------
const stats = (items) => h('div', { gap: 20, marginTop: 26 }, ...items.map((it) => h('div', { flex: 1, flexDirection: 'column', padding: '22px 24px', border: `1.5px solid ${it.tone === 'amber' ? 'rgba(245,165,36,0.45)' : C.cardLine}`, borderRadius: 14, background: C.card },
  h('div', { fontFamily: 'Mono', fontSize: 18, letterSpacing: 3, color: C.mute }, it.label.toUpperCase()),
  h('div', { fontFamily: 'Anton', fontSize: items.length > 2 ? 60 : 74, lineHeight: 1.05, color: tone(it.tone), marginTop: 8, whiteSpace: 'nowrap' }, it.value),
  it.note ? h('div', { fontFamily: 'Inter', fontSize: 21, color: C.mute, marginTop: 4 }, it.note) : null)));

const rows = (title, items) => h('div', { flexDirection: 'column', marginTop: 26, padding: '22px 28px', border: `1.5px solid ${C.cardLine}`, borderRadius: 14, background: C.card },
  title ? h('div', { fontFamily: 'Mono', fontSize: 19, letterSpacing: 3, color: C.blueHi, marginBottom: 6 }, title.toUpperCase()) : null,
  ...items.map((r, i) => h('div', { justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i ? `1px solid ${C.line}` : 'none' },
    h('div', { fontFamily: 'Inter', fontSize: 28, color: C.ink }, r.label),
    h('div', { fontFamily: 'Inter', fontWeight: 700, fontSize: 32, color: tone(r.tone) }, r.value))));

const cards = (items, { numbered = false, columns } = {}) => {
  const cols = columns ?? (items.length === 4 ? 2 : items.length);
  const rowsOf = []; for (let i = 0; i < items.length; i += cols) rowsOf.push(items.slice(i, i + cols));
  return h('div', { flexDirection: 'column', gap: 20, marginTop: 26 }, ...rowsOf.map((row, r) => h('div', { gap: 20 }, ...row.map((c, j) => h('div', { flex: 1, gap: 18, padding: '22px 24px', border: `1.5px solid ${c.tone === 'amber' ? 'rgba(245,165,36,0.45)' : C.cardLine}`, borderRadius: 14, background: C.card },
    numbered ? h('div', { fontFamily: 'Anton', fontSize: 54, lineHeight: 1, color: tone(c.tone) }, String(r * cols + j + 1)) : null,
    h('div', { flexDirection: 'column', flex: 1 },
      h('div', { fontFamily: 'Inter', fontWeight: 700, fontSize: 23, letterSpacing: 2, color: tone(c.tone) }, c.title.toUpperCase()),
      h('div', { fontFamily: 'Inter', fontSize: 25, lineHeight: 1.35, color: C.ink, marginTop: 8 }, c.body)))))));
};

const CONTENT_W = 940;
export function fitHeadline(lines, max, measure) {
  // One size for all lines (cohesive block), largest that keeps every line on one row.
  let size = max;
  for (const l of lines) { const w = measure(l.text, max) + l.text.length; size = Math.min(size, Math.floor((CONTENT_W - 6) * max / w)); }
  return size;
}
export function poster(spec, assets) {
  const size = fitHeadline(spec.headline, spec.headlineSize ?? 132, assets.measure);
  const kids = [
    h('div', { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { alignItems: 'center', gap: 22 }, h('div', { fontFamily: 'Mono', fontSize: 22, letterSpacing: 6, color: C.ink }, spec.kicker.toUpperCase()), h('div', { width: 80, height: 2, backgroundColor: C.ink, opacity: 0.7 })),
      h('div', { alignItems: 'center', gap: 24 },
        img(assets.logo, { width: 200, height: 76 }),
        h('div', { width: 1.5, height: 70, backgroundColor: C.mute, opacity: 0.5 }),
        h('div', { flexDirection: 'column', fontFamily: 'Mono', fontSize: 15, letterSpacing: 4, color: C.mute, lineHeight: 1.5 }, ...['FINANCIAL', 'DECISIONS', 'CLEARER', 'PERSPECTIVE'].map((t) => h('div', {}, t))))),
    h('div', { flexDirection: 'column', marginTop: 30 }, ...spec.headline.map((line) => h('div', { fontFamily: 'Anton', fontSize: size, lineHeight: 0.98, whiteSpace: 'nowrap', color: line.accent ? C.blue : C.ink, letterSpacing: 1, textShadow: line.accent ? '0 0 28px rgba(47,155,255,0.45)' : 'none' }, line.text))),
  ];
  if (spec.sub) kids.push(h('div', { fontFamily: 'Inter', fontSize: 32, lineHeight: 1.32, color: C.ink, marginTop: 24, maxWidth: 930 }, spec.sub));
  for (const b of spec.blocks ?? []) {
    if (b.chart) kids.push(chartBlock(b.chart));
    if (b.stats) kids.push(stats(b.stats));
    if (b.rows) kids.push(rows(b.rowsTitle, b.rows));
    if (b.cards) kids.push(cards(b.cards, b));
  }
  if (spec.cta) kids.push(h('div', { flexDirection: 'column', alignItems: 'center', marginTop: 24, gap: 12 },
    h('div', { alignItems: 'center', justifyContent: 'center', padding: '18px 52px', borderRadius: 999, background: 'linear-gradient(180deg,#2f8dff,#1765e0)', boxShadow: '0 0 40px rgba(47,141,255,0.55)', fontFamily: 'Inter', fontWeight: 600, fontSize: 32, color: '#fff' }, `${spec.cta}  →`),
    spec.url ? h('div', { fontFamily: 'Mono', fontSize: 21, letterSpacing: 1, color: C.blueHi }, spec.url) : null));
  kids.forEach((k) => { k.props.style.flexShrink = 0; });
  kids.push(h('div', { flexGrow: 1, minHeight: 20 }));
  kids.push(h('div', { alignItems: 'center', justifyContent: 'space-between', gap: 30, fontFamily: 'Mono', fontSize: 20, letterSpacing: 3, color: C.mute },
    h('div', { alignItems: 'center', gap: 18 }, h('div', { width: 56, height: 2, backgroundColor: C.mute }), spec.footnote ?? 'Illustrative example.'),
    h('div', { alignItems: 'center', gap: 18 }, 'www.aiwmcquantis.com', h('div', { width: 56, height: 2, backgroundColor: C.mute }))));
  return h('div', { width: W, height: H, flexDirection: 'column', padding: '56px 70px 46px', backgroundColor: C.bg0, backgroundImage: `radial-gradient(circle at 85% 8%, rgba(47,155,255,0.22), transparent 45%), radial-gradient(circle at 10% 95%, rgba(47,155,255,0.12), transparent 40%), linear-gradient(180deg, ${C.bg1}, ${C.bg0})` }, ...kids);
}
