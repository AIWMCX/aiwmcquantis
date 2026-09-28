# Business mailboxes: setup and operating runbook (2026-09-28)

## What exists after this change

| Address | Where it lands in Quantis | Replies go out from |
|---|---|---|
| support@aiwmcquantis.com | **Business Inbox → Support** as a ticket | support@ |
| legal@aiwmcquantis.com | **Business Inbox → Legal** as a ticket (priority high by default) | legal@ |
| privacy@ | Legal ticket (it is a published address) | legal@ |
| security@ | Support ticket (it is a published address) | support@ |
| hello@aiwmcquantis.com | **Sales pipeline**: replies are matched to prospects. Unknown senders become inbound prospects (`segment = inbound`, stage `replied`). | hello@ (default outreach sender) |
| market@aiwmcquantis.com | **Sales pipeline**, same as hello@ | market@ |

A pg_cron job (`business-mail-tick`) calls the `business-mail` edge function every 5 minutes. Each tick does two things:

1. **Sync.** It reads the Zoho Inbox and Sent folders.
   - **Tickets.** Mail to support@ or legal@ opens a ticket, or joins an existing one. It is matched by ticket tag, Zoho thread, In-Reply-To, or the same sender with the same subject within 30 days.
   - **Pipeline.** Mail to hello@ or market@, or mail from any prospect, goes to the pipeline:
     - *Human reply:* the prospect moves to `replied`, and any queued follow-up is held.
     - *Bare "no" or "remove me":* this is the opt-out the footer asks for. The address is suppressed and the prospect is marked `lost`.
     - *Bounce:* the bounced recipient is marked `hard_bounced` and suppressed.
     - *Out-of-office:* recorded only. The sequence continues.
   - **Manual sends.** If you send an approved message by hand from Zoho, the Sent-folder sync finds it. It marks the message sent with `sent_via = zoho_sent_folder` as evidence.
   - **Not stored.** DMARC reports, newsletters and no-reply notifications are `system` mail and never become tickets. Personal mail that isn't addressed to a business mailbox, and isn't from a prospect, is **never stored**.
2. **Send.** At most one approved, queued outreach message goes out, and only if every one of these holds:
   - Sending is switched on.
   - The domain DNS check passes.
   - It is inside the sending window (default Mon–Fri, 09:00–17:00 America/New_York).
   - Today's count is under the cap. The cap ramps during warm-up: 5, 7, 9, … up to 20 per day.
   - At least 4 minutes have passed since the last send.
   - The campaign's own `daily_limit` is not reached.

   Before each send, the gate is re-run:
   - The prospect is still active and its address isn't on the suppression list.
   - The prospect hasn't replied.
   - For a first touch, the prospect is still `discovered`, and no duplicate record with the same address was contacted in the last 30 days.
   - For a follow-up, the prospect is still `contacted`, and that step hasn't been sent yet.

   Follow-ups are sent as replies in the first touch's thread. The Zoho `messageId` and the RFC `Message-ID` are stored as delivery evidence.

The human approval firewall is unchanged. The database only allows `approved` messages to be queued, and nothing is ever sent from a draft.

## Blocking finding: fix DNS before any mail is sent from Zoho

DNS was read live on 2026-09-28. The nameservers are IONOS (`ns.ui-global-dns.*`).

| Record | Now | Problem |
|---|---|---|
| MX | mx.zoho.com / mx2 / mx3 | OK: mail is received by Zoho |
| SPF (TXT @) | `v=spf1 include:_spf.perfora.net include:_spf.kundenserver.de include:_spf.google.com include:_spf-us.ionos.com include:spf.protection.outlook.com -all` | **Zoho is not authorized** |
| DKIM | nothing at `zmail._domainkey` / `zoho._domainkey` | **No Zoho DKIM key** |
| DMARC | `p=reject; sp=reject; pct=100` | Correct policy, but together with the two gaps above it tells receivers to **reject** mail sent from the Zoho mailbox |
| Resend (app emails) | `resend._domainkey` + `send.` subdomain | OK, unaffected |

As long as this stands, anything sent from support@, hello@ and the other Zoho addresses can be rejected by Gmail or Outlook. That includes manual replies from the Zoho web client. **The paced sender refuses to send** until `Business Inbox → Mailbox & sending → Domain authentication` shows all four checks green.

**Fix (IONOS DNS, about 10 minutes, then about 1 hour to propagate):**

1. **SPF:** replace the TXT on `@` with:
   `v=spf1 include:zohomail.com include:_spf.google.com include:spf.protection.outlook.com ~all`
   Remove the three IONOS includes (`perfora`, `kundenserver`, `ionos`): mail is hosted at Zoho, not IONOS. Keep Google or Outlook only if you really send @aiwmcquantis.com through them. There must be exactly one SPF record, with at most 10 lookups.
2. **DKIM:** in Zoho Mail Admin Console → Domains → aiwmcquantis.com → Email Configuration → DKIM:
   - Add selector `zmail`.
   - Copy the TXT value.
   - In IONOS, add a TXT record with host `zmail._domainkey` and that value.
   - Back in Zoho, click **Verify**.
   - If you choose a different selector, set it in Business Inbox → Mailbox & sending → DKIM selector.
3. **Leave DMARC and the Resend records as they are.**

## Zoho Mail setup (one time)

1. **Addresses.** In Zoho Mail Admin → Users → your user → Email aliases, add `hello@`, `support@`, `market@`, `legal@`, `privacy@` and `security@` as **aliases of your own mailbox**. Groups whose only member is you also work. All the mail then arrives in one mailbox, and Quantis routes it by the address it was sent to.
2. **Send-as.** Make sure each alias can be used as a **From** address: Settings → Mail → Send mail as.
3. **Plan.** The Zoho Mail REST API needs a plan with API access. If the connection check reports an access error on the Free plan, upgrade to Mail Lite.
4. **API credentials (Self Client):**
   1. Go to https://api-console.zoho.com → **Add Client → Self Client** → copy the Client ID and Client Secret.
   2. In the **Generate Code** tab, use scope `ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL` and a duration of 10 minutes, then copy the code.
   3. Within 10 minutes, exchange the code for a refresh token:
      ```bash
      curl -X POST "https://accounts.zoho.com/oauth/v2/token?grant_type=authorization_code&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&code=CODE"
      ```
      Keep the `refresh_token` from the response. It does not expire unless it is revoked.
5. **Supabase secrets.** Set them in Dashboard → Edge Functions → Secrets, or with the CLI:
   ```bash
   supabase secrets set ZOHO_MAIL_CLIENT_ID=… ZOHO_MAIL_CLIENT_SECRET=… ZOHO_MAIL_REFRESH_TOKEN=… --project-ref dmlxrvfyqsakyjomsvdj
   ```
   Use `.eu`, `.in` or `.com.au` hosts only if the Zoho account is in that data center (`ZOHO_ACCOUNTS_HOST`, `ZOHO_MAIL_API_HOST`). This account is US: `mx.zoho.com`.
   The production deploy only *sets* the secrets it manages and never unsets others, so these persist across deploys.
6. **Check the connection.** Open **/admin/inbox → Mailbox & sending**. It should show:
   - the account and every address it can send as;
   - all DNS checks green;
   - "Sync now" importing mail. The first sync looks back 14 days.

## Daily operation

- **Support and legal:** open `/admin/inbox`.
  - Reply in the ticket, using "Send" or "Send & resolve". The signature and `[Ticket #N]` are added automatically, and the reply goes out from the ticket's address.
  - Internal notes are never emailed.
  - A new message from the customer reopens the ticket.
  - Auto-acknowledgement for support@ is **off** by default. Turn it on in settings if you want it; it never fires for legal@, auto-replies or system mail.
- **Outreach:**
  1. `/admin/commercial` → Review → **Approve**.
  2. **Ready to send** → **Queue send** (or **Queue all**).
  3. The mailbox sends one message at a time inside the window.
  4. Replies, opt-outs and bounces come back automatically. Classify human replies (positive / objection / …) with the existing **Record reply** control.
- **First time turning sending on:** flip **Sending on** in Mailbox & sending. It refuses until DNS is green and Zoho is connected. The first enable starts the warm-up clock: day 1 = 5 messages, then +2 per day up to the daily cap (default 20). Keep 1:1 volume low for the first two weeks. Real replies build sender reputation; volume doesn't.
- **Kill switch:** the same toggle. Queued messages stay queued while sending is off.

## Compliance built in

- Every outreach email carries the opt-out line ("reply 'no' and I won't follow up"), and a bare "no" is honored automatically.
- The campaign `sender_identity` is appended as the signature. **It must include your name and a postal address** (CAN-SPAM).
- Suppression is kept per email address (`email_suppressions`). Duplicate CRM records with the same address can't be emailed twice.
- No tracking pixels and no open tracking. Delivery evidence is the provider's accepted-message ID; replies are evidence only when they actually arrive.

## Known limits

- Zoho CRM (the 1,057 Leads reconciled on 2026-09-27) is **not** synced into Quantis. To bring leads over:
  1. Export the ones with real signals as CSV.
  2. Use Commercial Ops → Campaigns & import.
  3. Draft, approve, queue.
- Mail sent to a business address only by Bcc can't be routed; the address must appear in To, Cc or Delivered-To.
- Reply classification beyond "human reply / opt-out / bounce / auto-reply" (positive vs objection) is deliberately left to you.
