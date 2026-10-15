"""Render the 4-week Autoposter images (1080x1350) from posts.json.

Usage: python build.py <path-to-chrome.exe>
Writes html/<date>.html and png/<date>-<id8>.png next to this file.
"""
import html
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, '..', '2026-10-cost-starts', 'logo.png')

CSS = """
:root{--space:#050a1a;--ink:#eef2fb;--ink2:#c8d1e6;--muted:#8e9bb8;--line:#1f2c57;--blue:#4f86ff;--bluehi:#8fb1ff;--amber:#f2a93b;--green:#5fc79a}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:var(--space)}
body{font-family:'Satoshi',system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.c{position:relative;width:1080px;height:1350px;padding:72px 88px 64px;display:flex;flex-direction:column;overflow:hidden;
 background:radial-gradient(900px 520px at 85% -6%,rgba(42,98,255,.20),transparent 62%),linear-gradient(180deg,#050a1a,#060c20)}
.rule{display:flex;height:3px}.rule span{display:block;height:3px}.rule span:first-child{width:120px;background:var(--blue)}.rule span:last-child{flex:1;background:var(--line)}
h1{margin-top:44px;font-weight:900;font-size:84px;line-height:.98;letter-spacing:-.035em;text-transform:uppercase}
h1 .b{color:var(--blue)}
.sub{margin-top:30px;max-width:860px;font-size:31px;line-height:1.32;font-weight:500;color:var(--ink2)}
.mono{font-family:'IBM Plex Mono',monospace;letter-spacing:.1em;font-weight:600}
.block{margin-top:52px}
.q{margin-top:auto;font-size:46px;font-weight:700;letter-spacing:-.02em;color:var(--bluehi)}
.note{margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:20px;color:var(--ink2)}
footer{margin-top:30px;padding-top:26px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}
footer img{height:54px}footer p{font-size:25px;font-weight:500;color:var(--ink2)}
/* timeline */
.tl .row{position:relative;height:118px}
.tl .lab{font-size:22px;color:var(--ink2);position:relative;z-index:3}
.tl .lab span{background:var(--space);padding-right:12px}
.tl .track{position:absolute;left:0;right:0;top:42px;height:30px}
.tl .track:before{content:'';position:absolute;left:0;right:0;top:14px;height:2px;background:var(--line)}
.tl .bar{position:absolute;right:0;top:0;height:30px}
.tl .white{background:var(--ink)}.tl .blue{background:var(--blue);clip-path:polygon(0 100%,100% 0,100% 100%)}
.tl .gap{position:absolute;top:42px;bottom:28px;z-index:1;border-left:2px solid var(--amber);border-right:2px solid var(--amber);
 background:repeating-linear-gradient(135deg,rgba(242,169,59,.2) 0 12px,rgba(242,169,59,.06) 12px 24px)}
.tl .gaplab{margin-top:18px;font-size:22px;color:var(--amber)}
/* list */
.list .lab{font-size:21px;color:var(--muted);margin-bottom:22px}
.list ol{list-style:none;display:flex;flex-direction:column;gap:16px}
.list li{display:flex;align-items:center;gap:24px;padding:24px 28px;border:1px solid var(--line);background:#0b1430;font-size:33px;font-weight:600}
.list li b{font-family:'IBM Plex Mono',monospace;color:var(--blue);font-size:24px}
/* compare */
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cmp div{padding:30px;border:1px solid var(--line);background:#0b1430}
.cmp .r{border-color:var(--blue)}
.cmp .k{font-size:20px;color:var(--muted)}
.cmp .v{margin-top:14px;font-size:58px;font-weight:900;letter-spacing:-.02em}
.cmp .r .v{color:var(--bluehi)}
.cmp .d{margin-top:6px;font-size:24px;color:var(--ink2)}
.cmpfoot{margin-top:22px;font-size:27px;color:var(--amber);font-weight:600}
/* evidence */
.ev{display:flex;flex-direction:column;gap:16px}
.ev div{display:flex;justify-content:space-between;align-items:center;padding:26px 30px;border:1px solid var(--line);background:#0b1430;font-size:33px;font-weight:600}
.ev span{font-family:'IBM Plex Mono',monospace;font-size:21px;letter-spacing:.1em;padding:8px 14px;border:1px solid}
.ev .STRONG{color:var(--green)}.ev .MEDIUM{color:var(--bluehi)}.ev .ASSUMPTION{color:var(--amber)}
/* invite */
.inv{display:flex;flex-direction:column;gap:14px}
.inv div{font-size:32px;font-weight:600;padding:22px 28px;border-left:4px solid var(--blue);background:#0b1430}
"""


def esc(s):
    return html.escape(s, quote=True)


def block(p):
    k = p['kind']
    if k == 'timeline':
        # Bars live in the right 52% so no label (max ~45% wide) ever sits under the shading.
        place = lambda pos: 48 + pos * 0.52
        rows = ''.join(
            f'<div class="row"><p class="lab mono"><span>{esc(l)}</span></p>'
            f'<div class="track"><div class="bar {c}" style="left:{place(pos):.1f}%"></div></div></div>'
            for l, pos, c in p['rows'])
        first, last = place(p['rows'][0][1]), place(p['rows'][-1][1])
        return (f'<div class="block tl" style="position:relative">{rows}'
                f'<div class="gap" style="top:72px;left:{first:.1f}%;width:{last-first:.1f}%"></div>'
                f'<p class="gaplab mono" style="text-align:right">{esc(p["gap"])}</p></div>')
    if k == 'list':
        items = ''.join(f'<li><b>{i+1:02d}</b>{esc(t)}</li>' for i, t in enumerate(p['items']))
        return f'<div class="block list"><p class="lab mono">{esc(p["listlabel"])}</p><ol>{items}</ol></div>'
    if k == 'compare':
        L, R = p['left'], p['right']
        return (f'<div class="block"><div class="cmp">'
                f'<div><p class="k mono">{esc(L[0])}</p><p class="v">{esc(L[1])}</p><p class="d">{esc(L[2])}</p></div>'
                f'<div class="r"><p class="k mono">{esc(R[0])}</p><p class="v">{esc(R[1])}</p><p class="d">{esc(R[2])}</p></div>'
                f'</div><p class="cmpfoot">{esc(p["foot"])}</p></div>')
    if k == 'evidence':
        rows = ''.join(f'<div>{esc(a)}<span class="{b}">{b}</span></div>' for a, b in p['items'])
        return f'<div class="block ev">{rows}</div>'
    if k == 'invite':
        rows = ''.join(f'<div>{esc(t)}</div>' for t in
                       ['Walk through an illustrative decision', 'Question every assumption', 'See where it fits your client work — or doesn’t'])
        return f'<div class="block inv">{rows}</div>'
    return ''


def page(p):
    note = f'<p class="note">{esc(p["note"])}</p>' if p.get('note') else ''
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(p['l1'])}</title>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700,900&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>{CSS}</style></head><body><div class="c">
<div class="rule"><span></span><span></span></div>
<h1>{esc(p['l1'])}<br><span class="b">{esc(p['l2'])}</span></h1>
<p class="sub">{esc(p['sub'])}</p>
{block(p)}
<p class="q">{esc(p['q'])}</p>{note}
<footer><img src="file:///{LOGO.replace(os.sep, '/')}" alt="AIWMC Quantis"><p>Model the decision before you fund it.</p></footer>
</div></body></html>"""


def main():
    chrome = sys.argv[1]
    posts = json.load(open(os.path.join(HERE, 'posts.json'), encoding='utf-8'))
    os.makedirs(os.path.join(HERE, 'html'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'png'), exist_ok=True)
    for p in posts:
        h = os.path.join(HERE, 'html', f"{p['date']}.html")
        open(h, 'w', encoding='utf-8').write(page(p))
        out = os.path.join(HERE, 'png', f"{p['date']}-{p['id'][:8]}.png")
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                        '--window-size=1080,1350', '--virtual-time-budget=6000', f'--screenshot={out}',
                        'file:///' + h.replace(os.sep, '/')], capture_output=True)
        print(('ok  ' if os.path.exists(out) else 'FAIL ') + os.path.basename(out))


if __name__ == '__main__':
    main()
