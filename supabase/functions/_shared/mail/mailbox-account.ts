/**
 * Business-mailbox accounts (IONOS Mail, the same mailboxes the founder uses
 * in Outlook). Each address is its own mailbox with its own password.
 *
 * Secrets:
 *   BUSINESS_MAILBOX_PASSWORDS  JSON object, address → mailbox password, e.g.
 *     {"hello@aiwmcquantis.com":"…","market@aiwmcquantis.com":"…",
 *      "support@aiwmcquantis.com":"…","legal@aiwmcquantis.com":"…"}
 *   MAIL_IMAP_HOST (default imap.ionos.com), MAIL_IMAP_PORT (993)
 *   MAIL_SMTP_HOST (default smtp.ionos.com), MAIL_SMTP_PORT (465)
 */
import PostalMime from 'npm:postal-mime@2.7.6';
import { ImapClient, findSentFolder } from './imap.ts';
import { SmtpClient } from './smtp.ts';
import { tlsTransport } from './transport.ts';
import { buildMessage, newMessageId, type OutgoingMessage } from './mime-build.ts';
import { htmlToText } from './routing.ts';

export interface MailServerConfig {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export interface MailboxCredential {
  address: string;
  password: string;
}

export function mailServerFromEnv(): MailServerConfig {
  return {
    imapHost: Deno.env.get('MAIL_IMAP_HOST') || 'imap.ionos.com',
    imapPort: Number(Deno.env.get('MAIL_IMAP_PORT') || 993),
    smtpHost: Deno.env.get('MAIL_SMTP_HOST') || 'smtp.ionos.com',
    smtpPort: Number(Deno.env.get('MAIL_SMTP_PORT') || 465),
  };
}

/** Credentials by lower-cased address; empty when the secret is not set. */
export function mailboxCredentialsFromEnv(): Map<string, MailboxCredential> {
  const raw = Deno.env.get('BUSINESS_MAILBOX_PASSWORDS');
  const out = new Map<string, MailboxCredential>();
  if (!raw) return out;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Length only, never the content -- this has crashed the cron tick
    // silently before; the length at least lets whoever reads the log
    // tell a truncated-paste from a wrong-format paste without needing
    // the actual secret value.
    throw new Error(`BUSINESS_MAILBOX_PASSWORDS is not valid JSON (received ${raw.length} characters)`);
  }
  for (const [addr, pw] of Object.entries(parsed)) {
    if (typeof pw === 'string' && pw) out.set(addr.trim().toLowerCase(), { address: addr.trim().toLowerCase(), password: pw });
  }
  return out;
}

export async function withImap<T>(server: MailServerConfig, cred: MailboxCredential, fn: (imap: ImapClient) => Promise<T>): Promise<T> {
  const imap = new ImapClient(await tlsTransport(server.imapHost, server.imapPort));
  try {
    await imap.greet();
    await imap.login(cred.address, cred.password);
    return await fn(imap);
  } finally {
    await imap.logout().catch(() => undefined);
  }
}

/** Login + LIST, for the connection indicator in /admin/inbox. */
export async function checkMailbox(server: MailServerConfig, cred: MailboxCredential): Promise<{ ok: true; sent_folder: string | null } | { ok: false; error: string }> {
  try {
    const sent = await withImap(server, cred, async (imap) => findSentFolder(await imap.list()));
    return { ok: true, sent_folder: sent };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface SentResult {
  messageId: string;
  smtpResponse: string;
  filedInSent: boolean;
}

/**
 * Send from a business mailbox over SMTP, then file a copy in that
 * mailbox's Sent folder over IMAP so it appears in Outlook like any mail
 * the founder sent by hand. Filing is best-effort: the send already
 * succeeded when SMTP accepted it.
 */
export async function sendFromMailbox(
  server: MailServerConfig,
  cred: MailboxCredential,
  msg: Omit<OutgoingMessage, 'from' | 'messageId'> & { messageId?: string },
): Promise<SentResult> {
  const messageId = msg.messageId ?? newMessageId(cred.address.split('@')[1]);
  const raw = buildMessage({ ...msg, from: cred.address, messageId });
  const smtp = new SmtpClient(await tlsTransport(server.smtpHost, server.smtpPort));
  const { response } = await smtp.send({ host: cred.address.split('@')[1], user: cred.address, password: cred.password, from: cred.address, to: [msg.to], raw });
  let filedInSent = false;
  try {
    await withImap(server, cred, async (imap) => {
      const sent = findSentFolder(await imap.list());
      if (sent) {
        await imap.append(sent, new TextEncoder().encode(raw.replace(/\r?\n/g, '\r\n')));
        filedInSent = true;
      }
    });
  } catch { /* the message was sent; only the Outlook copy is missing */ }
  return { messageId, smtpResponse: response, filedInSent };
}

export interface ParsedMail {
  from: string;
  fromName: string | null;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  messageId: string | null;
  inReplyTo: string | null;
  references: string;
  date: Date | null;
  headers: Record<string, string>;
}

export async function parseMail(raw: Uint8Array): Promise<ParsedMail> {
  const e = await PostalMime.parse(raw, { attachmentEncoding: 'utf8' });
  const headers: Record<string, string> = {};
  for (const h of e.headers ?? []) if (headers[h.key] === undefined) headers[h.key] = h.value;
  const addrs = (list: Array<{ address?: string; group?: Array<{ address?: string }> }> | undefined) =>
    (list ?? []).flatMap((a) => (a.group ? a.group.map((g) => g.address ?? '') : [a.address ?? ''])).filter(Boolean).map((a) => a.toLowerCase());
  // Delivery reports carry the failed recipient in a message/delivery-status
  // part, which postal-mime exposes as an attachment; keep it in the text so
  // the bounce detector can read it.
  const dsn = (e.attachments ?? [])
    .filter((a: { mimeType?: string }) => /delivery-status|rfc822-headers/i.test(a.mimeType ?? ''))
    .map((a: { content: unknown }) => (typeof a.content === 'string' ? a.content : ''))
    .join('\n');
  const text = (e.text && e.text.trim()) ? e.text : e.html ? htmlToText(e.html) : '';
  return {
    from: (e.from?.address ?? '').toLowerCase(),
    fromName: e.from?.name || null,
    to: addrs(e.to as never),
    cc: addrs(e.cc as never),
    subject: e.subject ?? '',
    text: dsn ? `${text}\n\n${dsn}` : text,
    messageId: e.messageId ?? null,
    inReplyTo: e.inReplyTo ?? null,
    references: e.references ?? '',
    date: e.date ? new Date(e.date) : null,
    headers,
  };
}
