/**
 * Run: deno test --allow-env supabase/functions/_shared/mail/mailbox-account.test.ts
 * Parses real-shaped messages through postal-mime and the routing rules.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseMail } from "./mailbox-account.ts";
import { bouncedRecipient, classifyInbound } from "./routing.ts";

const enc = new TextEncoder();
const crlf = (lines: string[]) => enc.encode(lines.join("\r\n"));

Deno.test("IONOS bounce: classified as bounce, failed recipient read from the delivery-status part", async () => {
  const m = await parseMail(crlf([
    "From: Mail Delivery System <MAILER-DAEMON@mout.perfora.net>",
    "To: market@aiwmcquantis.com",
    "Subject: Mail delivery failed: returning message to sender",
    "Message-ID: <bounce1@perfora.net>",
    'Content-Type: multipart/report; report-type=delivery-status; boundary="B"',
    "",
    "--B",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "This message was created automatically by mail delivery software.",
    "",
    "--B",
    "Content-Type: message/delivery-status",
    "",
    "Reporting-MTA: dns; mout.perfora.net",
    "",
    "Final-Recipient: rfc822; carlos@axispointcap.com",
    "Status: 5.1.1",
    "",
    "--B--",
    "",
  ]));
  const msg = { from: m.from, fromName: m.fromName, to: m.to, cc: m.cc, subject: m.subject, bodyText: m.text, headers: m.headers };
  assertEquals(classifyInbound(msg), "bounce");
  assertEquals(bouncedRecipient(msg), "carlos@axispointcap.com");
});

Deno.test("Outlook reply (quoted-printable HTML only): text extracted, threading headers kept, quoted opt-out line ignored", async () => {
  const m = await parseMail(crlf([
    "From: Carlos Ruiz <Carlos@AxisPointCap.com>",
    "To: \"AIWMC Quantis\" <market@aiwmcquantis.com>",
    "Subject: RE: Board judgment at inflection points",
    "Message-ID: <reply1@axispointcap.com>",
    "In-Reply-To: <orig1@aiwmcquantis.com>",
    "References: <orig1@aiwmcquantis.com>",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "<div>Yes =E2=80=94 send the example.</div><div><br></div><div>On Mon, Sep 28, 2026 at 9:02 AM Bogdan &lt;market@aiwmcquantis.com&gt; wrote:</div><blockquote>If this isn't relevant, just reply \"no\"</blockquote>",
    "",
  ]));
  assertEquals(m.from, "carlos@axispointcap.com");
  assertEquals(m.fromName, "Carlos Ruiz");
  assertEquals(m.to, ["market@aiwmcquantis.com"]);
  assertEquals(m.inReplyTo, "<orig1@aiwmcquantis.com>");
  assert(m.text.startsWith("Yes — send the example."));
  assertEquals(classifyInbound({ from: m.from, fromName: m.fromName, to: m.to, cc: m.cc, subject: m.subject, bodyText: m.text, headers: m.headers }), "human");
});
