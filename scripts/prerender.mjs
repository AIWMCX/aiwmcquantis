// =============================================================================
// scripts/prerender.mjs — Renders every public route to REAL static HTML.
//
// WHY THIS EXISTS: inner pages fetch content after React mounts, so the HTML
// Google receives is the homepage shell. This step loads each route in a real
// headless browser, WAITS for the content to render, and writes the fully
// rendered DOM to dist/<route>/index.html. Crawlers now see what users see.
//
// RUNTIME: dual-path. On CI/serverless (Vercel build container, VERCEL=1)
// we use puppeteer-core + @sparticuz/chromium — the serverless-optimized
// Chromium build that ships all necessary system libs bundled in. On local
// dev (a normal workstation) we use the full puppeteer package whose
// bundled Chromium is already downloaded to node_modules. Both code paths
// end at the exact same page.content() capture, so output is identical.
// This is the standard Vercel-safe pattern for Puppeteer-in-build-step and
// avoids the "shared library missing" failure mode that kills puppeteer's
// bundled Chromium on serverless containers by default.
// =============================================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES } from "./seo.routes.mjs";

const IS_SERVERLESS =
  !!process.env.VERCEL || !!process.env.CI || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

async function loadPuppeteer() {
  if (IS_SERVERLESS) {
    // Serverless path: puppeteer-core + @sparticuz/chromium.
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return {
      launch: async () =>
        puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }),
    };
  }
  // Local path: full puppeteer with its bundled Chromium.
  const { default: puppeteer } = await import("puppeteer");
  return {
    launch: async () =>
      puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      }),
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const PORT = 4321;

// Puppeteer waits for this selector before snapshotting. The RenderedFlag
// component in App.tsx sets this attribute after Suspense resolves.
const READY_SELECTOR = '[data-rendered="true"]';
const SETTLE_MS = 800;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      let filePath = path.join(DIST, urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      // SPA fallback — let the client router resolve the route.
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(path.join(DIST, "index.html")).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.error("✗ dist/index.html not found. Run `vite build` first.");
    process.exit(1);
  }
  const server = await startServer();
  console.log(`▶ prerender: environment = ${IS_SERVERLESS ? "serverless (puppeteer-core + @sparticuz/chromium)" : "local (puppeteer bundled Chromium)"}`);
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch();

  let ok = 0;
  const failed = [];
  for (const route of PUBLIC_ROUTES) {
    const page = await browser.newPage();
    try {
      await page.goto(`http://localhost:${PORT}${route.path}`, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });
      await page.waitForSelector(READY_SELECTOR, { timeout: 15000 });
      await new Promise((r) => setTimeout(r, SETTLE_MS));

      const html = "<!DOCTYPE html>\n" + (await page.content());
      const outDir = route.path === "/" ? DIST : path.join(DIST, route.path);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
      ok++;
      process.stdout.write(`  ✓ ${route.path}\n`);
    } catch (e) {
      failed.push({ path: route.path, error: e.message });
      process.stdout.write(`  ✗ ${route.path} — ${e.message}\n`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\nPrerendered ${ok}/${PUBLIC_ROUTES.length} routes.`);
  if (failed.length) {
    console.error(`✗ ${failed.length} route(s) failed to prerender. Build must not ship.`);
    process.exit(1);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
