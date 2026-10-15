# Quantis motion authoring

Official tool: https://github.com/heygen-com/hyperframes
Version pinned to 0.8.160 (confirmed published in npm during preparation).
Verified locally: `npx --yes hyperframes@0.8.160 init --help` exits successfully.
No composition was rendered and no cloud service was configured in this patch.
Requires Node 22+ and FFmpeg; rendering also needs a supported Chrome runtime.
Keep this dependency isolated from the root application and edge functions.

From this directory:

```sh
npm install
npm run doctor
npm run init:project -- quantis-decision
```

Use the generated project's own pinned scripts for check/preview/render. Read
upstream authoring instructions before composing video: a timed root, seekable
animation timeline and local media are required. Review the final result before
any publishing. Local authoring does not imply free hosted/model generation.

For Claude Code, official optional plugin setup (user environment, not run here):

```sh
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```

## First production brief

- Audience: independent advisor considering a client's hire or expansion.
- Format: 1080 × 1350 LinkedIn master, then a deliberately recomposed 1080 × 1920.
- Subject: “Revenue is not cash.” 12 seconds, readable with sound off.
- 0–3s: title, approved Quantis mark, near-black navy and white.
- 3–8s: illustrative invoice and payment-date comparison; approved source
  values only, no animated count-up of financial results.
- 8–10s: “See the assumption before you fund the decision.”
- 10–12s: one CTA: “See a worked decision · aiwmcquantis.com/consultants”.
- Palette: navy #071426, blue #376BFF, white #F5F7FC. Match the current
  approved Sadewa tokens when building the actual composition.
- Label illustration throughout. Use no fake customer wall, ratings, urgency,
  stock finance characters or invented savings. No new pricing or sale.
- Validate frame readability, number consistency, local media/font loading,
  seek determinism and CTA destination. Preserve source and renderer version.

This commit adds the tool workspace and brief, not a rendered campaign or an
Autoposter video-upload integration. Follow the existing publisher's media
capabilities; do not upload MP4 through an image-only API path.
