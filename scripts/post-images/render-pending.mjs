// Scheduled job: render every draft/scheduled autoposter post that has an
// asset_spec but no image yet, upload the PNG to content-assets and point
// asset_path at it. Refuses (asset_render_error) when a displayed number is
// not in the post text. Needs SUPABASE_ACCESS_TOKEN (Management API).
import { renderPng, truthGate, altText } from './render.mjs';

const REF = 'dmlxrvfyqsakyjomsvdj';
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const DRY = process.argv.includes('--dry-run');
if (!PAT) { console.error('SUPABASE_ACCESS_TOKEN is not set'); process.exit(1); }

const mgmt = (path, init = {}) => fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, { ...init, headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
async function sql(query) {
  const r = await mgmt('/database/query', { method: 'POST', body: JSON.stringify({ query }) });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const UUID = /^[0-9a-f-]{36}$/;
const lit = (s) => { const tag = `q${Math.random().toString(36).slice(2, 10)}`; return `$${tag}$${String(s)}$${tag}$`; };

const rows = await sql(`
  select p.id, p.hook, p.asset_spec,
         coalesce((select pp.content from autoposter_post_platforms pp where pp.post_id = p.id and pp.platform = 'linkedin' limit 1), p.content_brief, '') as text
  from autoposter_posts p
  where p.asset_spec is not null and p.asset_path is null and p.status in ('draft', 'scheduled')
  order by p.post_date limit 25`);
console.log(`pending: ${rows.length}`);
if (!rows.length) process.exit(0);

let serviceKey = null;
if (!DRY) {
  const r = await mgmt('/api-keys?reveal=true');
  if (!r.ok) throw new Error(`api-keys ${r.status}`);
  serviceKey = (await r.json()).find((k) => k.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('service_role key not returned');
}

let rendered = 0, refused = 0;
for (const row of rows) {
  if (!UUID.test(row.id)) continue;
  const spec = typeof row.asset_spec === 'string' ? JSON.parse(row.asset_spec) : row.asset_spec;
  const gate = truthGate(spec, `${row.hook ?? ''}\n${row.text}`);
  if (!gate.ok) {
    refused++;
    const why = `Numbers on the image are not in the post text: ${gate.missing.slice(0, 6).join('; ')}`;
    console.log(`REFUSED ${row.id}: ${why}`);
    if (!DRY) await sql(`update autoposter_posts set asset_render_error = ${lit(why)} where id = '${row.id}'`);
    continue;
  }
  try {
    const png = await renderPng(spec);
    if (DRY) { console.log(`ok (dry) ${row.id} ${png.length} bytes`); continue; }
    const path = `posts/${row.id}/${crypto.randomUUID()}.png`;
    const up = await fetch(`https://${REF}.supabase.co/storage/v1/object/content-assets/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: png });
    if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
    // Only claim the slot if nobody attached an image meanwhile.
    await sql(`update autoposter_posts set asset_path = ${lit(path)}, asset_alt = coalesce(asset_alt, ${lit(altText(spec, row.hook))}), asset_render_error = null where id = '${row.id}' and asset_path is null`);
    rendered++;
    console.log(`rendered ${row.id} -> ${path}`);
  } catch (e) {
    console.log(`FAILED ${row.id}: ${e.message}`);
    if (!DRY) await sql(`update autoposter_posts set asset_render_error = ${lit(`Render failed: ${e.message}`.slice(0, 500))} where id = '${row.id}'`);
  }
}
console.log(`rendered=${rendered} refused=${refused}`);
