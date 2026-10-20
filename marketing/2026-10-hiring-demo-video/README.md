# Hiring decision demo video (22 s, 1080×1350)

Rendered with HyperFrames 0.8.160 + FFmpeg 9.0.2; published to `public/video/hiring-decision-demo.mp4`, shown on `/demo/hiring-decision`.

**Numbers are not hand-typed.** `WITH`/`WITHOUT` in `index.html` are the base-case cash series exported from
`src/lib/demo/hiring-decision-demo.ts` (hiring-demo-v1): payback month 11, lowest cash $39,957 in month 4;
+1 month collection → payback month 14; 0.7 clients/mo → no payback in 18 months. If the demo fixture changes,
re-export and re-render — the video must match the live demo.

Re-render (from a copy of this folder, outside the app; isolated from the web build):

```sh
npm install                      # hyperframes@0.8.160 only
HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes check
HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render --output out/hiring-demo.mp4 --fps 30 --quality delivery
ffmpeg -ss 14.5 -i out/hiring-demo.mp4 -frames:v 1 -q:v 3 out/poster.jpg
```
