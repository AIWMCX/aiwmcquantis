# Paid video ads, set 1 (2026-10-30)

Three 9:16 ads, each a different concept, all on one brand system:
- the real AIWMC™ QUANTIS chrome logo (from the July 2026 master);
- Geist, Geist Mono and Instrument Serif;
- the navy stage.

Copy, audiences, tracked links and the spend plan are in `ADS_KIT.md`. Covers (frame 0) are in this folder.

| Ad | Concept | Landing |
|---|---|---|
| A `a1-month` | the hire was fine; the payment terms weren't. Cursor drag, crash through the $20K floor, magnifier dive | /demo/hiring-decision |
| B `b1-balance` | a rolling bank-balance odometer, month by month; invoices stamped UNPAID · 90 DAYS | /demo/hiring-decision |
| C `c1-clients` | raise prices 15%: 120 client dots switch off; ±$0 at 24 lost (x ÷ (m + x)) | /demo/price-change |

**Where the source lives:** on the founder's PC, in `C:\Users\AIWMC\Videos\quantis-ads\`.
- `_brandkit/`: brand.css / brand.js, the sfx.py sound library, master.sh, build.sh.
- One project folder per ad.
- `_deliver/`: the masters.

They are built with the licensed One File Studio skill. Its files are not redistributed here; the licence allows use, not sharing.

- **Rebuild an ad:** `bash _brandkit/build.sh <project>`. It renders frames, writes anchors, encodes the picture, runs the sound script, masters to −14 LUFS / ≤ −1.5 dBTP, and runs QA plus the hook check.
- **Truth:** every number is Quantis engine output on a published illustrative example (`runHiringDemo`, `runPriceChange`), and each end card says so.

**QA (all passed):**

| Ad | Loudness | True peak | Black / frozen frames | Hook check |
|---|---|---|---|---|
| A | −14.5 LUFS | −2.6 dBTP | 0 / 0 | ok |
| B | −14.2 LUFS | −2.4 dBTP | 0 / 0 | ok |
| C | −14.5 LUFS | −2.5 dBTP | 0 / 0 | ok |
