/**
 * RFC 5322 plain-text message builder for business-mailbox sends.
 * We generate the Message-ID ourselves: it is the delivery evidence stored
 * on the followup / ticket message, the key that de-duplicates our own
 * copy when the Sent folder is synced, and what replies point back to via
 * In-Reply-To / References (so threading needs no provider API).
 */

export interface OutgoingMessage {
  from: string;
  fromName?: string | null;
  to: string;
  subject: string;
  text: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  date?: Date;
}

const enc = new TextEncoder();

export function newMessageId(domain: string): string {
  return `<${crypto.randomUUID()}@${domain}>`;
}

function isAscii(s: string): boolean {
  return /^[\x20-\x7e]*$/.test(s);
}

/** RFC 2047 encoded-word for non-ASCII header text. */
export function encodeHeader(value: string): string {
  if (isAscii(value)) return value;
  const bytes = enc.encode(value);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

function mailbox(address: string, name?: string | null): string {
  if (!name) return `<${address}>`;
  const display = isAscii(name) ? `"${name.replace(/(["\\])/g, '\\$1')}"` : encodeHeader(name);
  return `${display} <${address}>`;
}

/** Quoted-printable (RFC 2045 §6.7) with soft breaks at 76 columns. */
export function quotedPrintable(text: string): string {
  const out: string[] = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    let encoded = '';
    const bytes = enc.encode(line);
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      const isLast = i === bytes.length - 1;
      const plain = (b >= 33 && b <= 126 && b !== 61) || ((b === 32 || b === 9) && !isLast);
      encoded += plain ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }
    let rest = encoded;
    while (rest.length > 76) {
      let cut = 75;
      // Never split an =XX escape.
      if (rest[cut - 1] === '=') cut -= 1;
      else if (rest[cut - 2] === '=') cut -= 2;
      out.push(`${rest.slice(0, cut)}=`);
      rest = rest.slice(cut);
    }
    out.push(rest);
  }
  return out.join('\r\n');
}

export function buildMessage(m: OutgoingMessage): string {
  const headers = [
    `From: ${mailbox(m.from, m.fromName)}`,
    `To: <${m.to}>`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${(m.date ?? new Date()).toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: ${m.messageId}`,
  ];
  if (m.inReplyTo) headers.push(`In-Reply-To: ${m.inReplyTo}`);
  const refs = (m.references ?? []).filter(Boolean);
  if (refs.length) headers.push(`References: ${refs.join(' ')}`);
  headers.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: quoted-printable');
  return `${headers.join('\r\n')}\r\n\r\n${quotedPrintable(m.text)}\r\n`;
}
