# Business mailboxes: setup and operating runbook (2026-09-28)

The mailboxes are hosted at **IONOS** (Mail Basic). They are the same mailboxes the founder has in Outlook: hello@, market@, support@, legal@. Quantis connects to them with standard IMAP and SMTP, so Outlook and Quantis always show the same mail:

- Anything Quantis sends is also filed in the mailbox's **Sent Items**, so it appears in Outlook.
- Anything the founder sends from Outlook is picked up from Sent Items.
  - When it matches an approved outreach message, that message is marked sent, with the Sent Items copy as evidence.
  - When it's a reply in a ticket's thread, it's added to that ticket.

## What lands where

| Address | In Quantis | Replies go out from |
|---|---|---|
| support@aiwmcquantis.com | **Business Inbox → Support** ticket | support@ |
| legal@aiwmcquantis.com | **Business Inbox → Legal** ticket (priority high) | legal@ |
| hello@aiwmcquantis.com | **Sales pipeline**. Prospect replies are matched automatically; unknown senders become inbound prospects. | hello@ (default outreach sender) |
| market@aiwmcquantis.com | **Sales pipeline**, same as hello@ | market@ |
| privacy@ / security@ | Tickets (legal / support), only if these mailboxes exist and have a password configured | legal@ / support@ |

A pg_cron job (`business-mail-tick`) runs every 5 minutes.

**Sync.** For each connected mailbox it reads new mail in INBOX and Sent Items (by IMAP UID; messages are never marked read).
- **Tickets.** Mail to support@ or legal@ opens a ticket, or joins an existing one. It is matched by `[Ticket #N]`, In-Reply-To/References, or the same sender with the same subject within 30 days.
- **Pipeline.** Mail to hello@ or market@ goes to the pipeline:
  - *Human reply:* the prospect moves to `replied`, and anything queued for them is held.
  - *Bare "no" or "remove me":* this is the opt-out the footer asks for. The address is suppressed and the prospect is marked `lost`.
  - *Bounce:* the recipient is marked `hard_bounced` and suppressed.
  - *Out-of-office:* recorded only.
- **Never tickets.** DMARC reports, newsletters and no-reply mail are stored as `system` mail and never become tickets.

**Send.** At most one approved, queued outreach message goes out, and only if:
- sending is switched on;
- the DNS check passes;
- it is inside the sending window;
- the warm-up/daily cap and the minimum gap allow it;
- the campaign's daily limit is not reached.

Immediately before each send it re-checks suppression, a prospect reply, duplicate addresses contacted in the last 30 days, and the sequence step.

Delivery evidence is our own `Message-ID` plus the SMTP server's acceptance reply. Follow-ups carry `In-Reply-To`/`References`, so they thread under the first email in the recipient's inbox and in Outlook.

The human approval firewall is unchanged. Only `approved` messages can be queued, a database constraint enforces this, and nothing is ever sent from a draft.

## Blocking finding: MX still points to Zoho

DNS was read live on 2026-09-28. The nameservers are IONOS.

| Record | Now | Effect |
|---|---|---|
| MX | mx.zoho.com / mx2.zoho.com / mx3.zoho.com | **Replies to hello@, market@ and the others go to Zoho, not to the IONOS mailboxes in Outlook.** A reply to the outreach sent from Outlook will not appear in Outlook or in Quantis. |
| SPF | `v=spf1 include:_spf.perfora.net include:_spf.kundenserver.de include:_spf.google.com include:_spf-us.ionos.com include:spf.protection.outlook.com -all` | OK. IONOS is authorized, so mail sent from Outlook/IONOS passes DMARC. |
| DMARC | `p=reject` | OK. SPF alignment passes for IONOS. |
| DKIM | none | Recommended, not required. |

**Fix (IONOS, about 5 minutes, then up to about 1 hour to propagate):** go to IONOS → Domains & SSL → aiwmcquantis.com → DNS.
1. Delete the three MX records `mx.zoho.com`, `mx2.zoho.com` and `mx3.zoho.com`.
2. Add `MX @ → mx00.ionos.com`, priority 10.
3. Add `MX @ → mx01.ionos.com`, priority 10.

IONOS's "use IONOS mail servers / reset mail records" option does the same thing. Don't touch SPF, DMARC, or the Resend records (`resend._domainkey`, `send.`).

Before you delete the Zoho records, look in Zoho Mail once for anything that arrived there that you still need. After the switch, Zoho stops receiving.

**Optional (recommended): DKIM.** IONOS → Email → DKIM → enable for aiwmcquantis.com. If the selector differs from `s1-ionos`, set it in Business Inbox → Mailbox & sending → DKIM selector.

The paced sender refuses to send until `/admin/inbox → Mailbox & sending → Domain mail DNS` shows MX, SPF and DMARC green. Otherwise we would cold-email people whose replies can't come back.

## Connect the mailboxes to Quantis (one time)

1. **Check IMAP.** In Outlook, make sure each IONOS account is connected as **IMAP**, not POP. With POP, Outlook may delete mail from the server before Quantis sees it. Outlook → Settings → Accounts shows the type.
2. **Set the Supabase secret.** Go to Dashboard → Edge Functions → Secrets, or use the CLI:
   ```bash
   supabase secrets set --project-ref dmlxrvfyqsakyjomsvdj \
     BUSINESS_MAILBOX_PASSWORDS='{"hello@aiwmcquantis.com":"…","market@aiwmcquantis.com":"…","support@aiwmcquantis.com":"…","legal@aiwmcquantis.com":"…"}'
   ```
   Use the same passwords Outlook uses, and include only the mailboxes that exist.
   - The defaults are `imap.ionos.com:993` and `smtp.ionos.com:465` (IONOS US). Override them with `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_SMTP_HOST` and `MAIL_SMTP_PORT` if your IONOS account shows different servers (for example `imap.ionos.de`).
   - Port 465 is used on purpose: Supabase Edge Functions block outbound ports 25 and 587.
   - The production deploy only sets the secrets it manages and never unsets others, so this secret persists across deploys.
   - If you change a mailbox password in IONOS, update this secret too. Quantis shows the failed login in Mailbox & sending.
3. **Check the connection.** Open `/admin/inbox → Mailbox & sending`. Every mailbox should read "connected · Sent folder "Sent Items"". Then click **Sync now**. The first sync looks back 14 days.

## Daily operation

- **Outreach:**
  1. `/admin/commercial` → Review → **Approve**.
  2. **Ready to send** → **Queue send** (or **Queue all**).
  3. Quantis sends one message at a time from hello@ (change "Send from" to market@ if you prefer) inside the window. The display name is the first line of the campaign signature, e.g. "Bogdan Jeltov".

  You can still use **Open in mail** and send from Outlook yourself: the Sent-folder sync marks it sent automatically. **I sent it myself** remains as a manual fallback.
- **Replies:** they arrive in Outlook as usual (after the MX fix) and, within 5 minutes, in Quantis:
  - a human reply moves the prospect to `replied` and stops the sequence;
  - classify it (positive / objection / …) with **Record reply**.
- **Support and legal:** answer in `/admin/inbox` (the signature and `[Ticket #N]` are added, and the reply is filed in Sent Items), or answer in Outlook; both end up in the ticket.
- **First time turning sending on:** flip **Sending on**. It refuses until DNS is ready and the mailboxes are connected. That starts the warm-up: day 1 = 5 messages, then +2 per day up to the daily cap (20).
- **Kill switch:** the same toggle. Queued messages stay queued.

## Compliance built in

- Every outreach email carries the opt-out line, and a bare "no" is honored automatically.
- **The campaign signature must include your name and a postal address** (CAN-SPAM). The draft in the 2026-09-28 screenshot ended at "Bogdan Jeltov"; add the address to the campaign's sender identity.
- Suppression is per email address, so duplicate CRM records can't be emailed twice.
- No tracking pixels and no open tracking.

## Known limits

- Zoho CRM leads are not synced. Import the ones with real signals via Commercial Ops → Campaigns & import.
- Mail that only Bcc's a business address is routed to the mailbox that received it; aliases need to appear in To, Cc or Delivered-To to refine routing.
- IMAP fetch reads the first 400 KB of each message: text is always complete; large attachments are not stored.
