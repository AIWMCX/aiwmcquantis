import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
/**
 * Bot Detection Edge Function
 * 
 * Filters bot traffic using:
 * 1. User-Agent analysis (known bot signatures)
 * 2. Rate limiting (IP-based burst detection)
 * 3. Honeypot validation (hidden field check)
 * 
 * Returns { isBot: boolean, confidence: number, reason?: string }
 */

const KNOWN_BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /facebookexternalhit/i, /twitterbot/i,
  /linkedinbot/i, /whatsapp/i, /telegrambot/i, /discordbot/i,
  /applebot/i, /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /petalbot/i, /bytespider/i, /gptbot/i, /claudebot/i,
  /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
  /playwright/i, /scrapy/i, /wget/i, /curl/i, /httpie/i,
  /python-requests/i, /python-urllib/i, /go-http-client/i,
  /java\//i, /apache-httpclient/i, /okhttp/i,
  /bot/i, /crawler/i, /spider/i, /scraper/i,
];

const SUSPICIOUS_PATTERNS = [
  /^mozilla\/4\.0$/i,  // Very old UA
  /^$/,                 // Empty UA
  /^-$/,               // Dash UA
];

// In-memory rate limit store (resets on function cold start)
const ipRequestLog = new Map<string, { count: number; firstSeen: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 30; // 30 requests per minute per IP

function analyzeUserAgent(ua: string): { isBot: boolean; confidence: number; reason?: string } {
  if (!ua || ua.length < 5) {
    return { isBot: true, confidence: 90, reason: 'empty_or_minimal_ua' };
  }

  for (const pattern of KNOWN_BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return { isBot: true, confidence: 95, reason: `known_bot_pattern: ${pattern.source}` };
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(ua)) {
      return { isBot: true, confidence: 75, reason: 'suspicious_ua_pattern' };
    }
  }

  // Check for missing typical browser indicators
  const hasBrowserIndicators = /mozilla|chrome|safari|firefox|edge|opera/i.test(ua);
  if (!hasBrowserIndicators) {
    return { isBot: true, confidence: 70, reason: 'no_browser_indicators' };
  }

  return { isBot: false, confidence: 10 };
}

function checkRateLimit(ip: string): { exceeded: boolean; count: number } {
  const now = Date.now();
  const entry = ipRequestLog.get(ip);

  if (!entry || now - entry.firstSeen > RATE_WINDOW_MS) {
    ipRequestLog.set(ip, { count: 1, firstSeen: now });
    return { exceeded: false, count: 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return { exceeded: true, count: entry.count };
  }

  return { exceeded: false, count: entry.count };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequestLog.entries()) {
    if (now - entry.firstSeen > RATE_WINDOW_MS * 2) {
      ipRequestLog.delete(ip);
    }
  }
}, RATE_WINDOW_MS);

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const ua = req.headers.get("user-agent") || "";

    // 1. User-Agent analysis
    const uaResult = analyzeUserAgent(ua);

    // 2. Rate limiting
    const rateResult = checkRateLimit(ip);

    // 3. Honeypot check (if POST body provided)
    let honeypotTriggered = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        // If honeypot field has value, it's a bot
        if (body.honeypot_field && body.honeypot_field.trim() !== '') {
          honeypotTriggered = true;
        }
      } catch {
        // No body or invalid JSON — not a honeypot trigger
      }
    }

    // Compute final verdict
    let isBot = uaResult.isBot;
    let confidence = uaResult.confidence;
    let reason = uaResult.reason || 'passed';

    if (honeypotTriggered) {
      isBot = true;
      confidence = Math.max(confidence, 99);
      reason = 'honeypot_triggered';
    }

    if (rateResult.exceeded) {
      isBot = true;
      confidence = Math.max(confidence, 85);
      reason = `rate_limit_exceeded: ${rateResult.count} requests in window`;
    }

    const response = {
      isBot,
      confidence,
      reason,
      timestamp: new Date().toISOString(),
      requestCount: rateResult.count,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ isBot: false, confidence: 0, reason: 'detection_error', error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
