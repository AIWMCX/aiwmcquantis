/**
 * Minimal IMAP4rev1 client for the business mailboxes (IONOS Mail).
 * Only what the sync needs: LOGIN, LIST, SELECT, UID SEARCH, UID FETCH
 * (partial BODY.PEEK[] so nothing is marked read), APPEND (to file what
 * Quantis sends into the mailbox's Sent folder, so Outlook shows it), LOGOUT.
 */
import { LineReader, type Transport, writeText } from './transport.ts';

export interface ImapFolder {
  name: string;
  flags: string[];
}

export interface ImapSelect {
  uidValidity: number;
  uidNext: number | null;
  exists: number;
}

export interface ImapFetched {
  uid: number;
  internalDate: Date | null;
  raw: Uint8Array;
}

type Item = { text: string; literals: Uint8Array[] };

export class ImapError extends Error {}

function quote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function imapDate(d: Date): string {
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/** Unquote an IMAP astring / quoted mailbox name. */
function unquote(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\(["\\])/g, '$1');
  return t;
}

export class ImapClient {
  private reader: LineReader;
  private tagN = 0;

  constructor(private readonly t: Transport, timeoutMs = 30_000) {
    this.reader = new LineReader(t, timeoutMs);
  }

  async greet(): Promise<void> {
    const line = await this.reader.line();
    if (!/^\* (OK|PREAUTH)/i.test(line)) throw new ImapError(`unexpected IMAP greeting: ${line.slice(0, 120)}`);
  }

  /** Read one untagged/tagged response item, following literals. */
  private async readItem(): Promise<Item> {
    let text = await this.reader.line();
    const literals: Uint8Array[] = [];
    for (;;) {
      const m = text.match(/\{(\d+)\}$/);
      if (!m) break;
      literals.push(await this.reader.bytes(Number(m[1])));
      text += `\u0000${await this.reader.line()}`; // \0 marks where the literal sat
    }
    return { text, literals };
  }

  private async command(cmd: string, literal?: Uint8Array): Promise<Item[]> {
    const tag = `Q${++this.tagN}`;
    if (literal) {
      await writeText(this.t, `${tag} ${cmd} {${literal.length}}\r\n`);
      const cont = await this.reader.line();
      if (!cont.startsWith('+')) throw new ImapError(`${cmd.split(' ')[0]} refused: ${cont.slice(0, 200)}`);
      await this.t.write(literal);
      await writeText(this.t, '\r\n');
    } else {
      await writeText(this.t, `${tag} ${cmd}\r\n`);
    }
    const items: Item[] = [];
    for (;;) {
      const item = await this.readItem();
      if (item.text.startsWith(`${tag} `)) {
        if (!/^\S+ OK/i.test(item.text)) {
          const verb = cmd.startsWith('LOGIN') ? 'LOGIN' : cmd.split(' ').slice(0, 2).join(' ');
          throw new ImapError(`${verb} failed: ${item.text.slice(tag.length + 1, tag.length + 200)}`);
        }
        return items;
      }
      items.push(item);
    }
  }

  async login(user: string, password: string): Promise<void> {
    await this.command(`LOGIN ${quote(user)} ${quote(password)}`);
  }

  async list(): Promise<ImapFolder[]> {
    const items = await this.command('LIST "" "*"');
    const out: ImapFolder[] = [];
    for (const it of items) {
      const m = it.text.match(/^\* LIST \(([^)]*)\) (?:"(?:[^"\\]|\\.)*"|NIL) (.+)$/i);
      if (!m) continue;
      const name = m[2].includes('\u0000') && it.literals[0] ? new TextDecoder().decode(it.literals[0]) : unquote(m[2]);
      out.push({ name, flags: m[1].split(/\s+/).filter(Boolean) });
    }
    return out;
  }

  async select(mailbox: string): Promise<ImapSelect> {
    const items = await this.command(`SELECT ${quote(mailbox)}`);
    let uidValidity = 0;
    let uidNext: number | null = null;
    let exists = 0;
    for (const it of items) {
      const v = it.text.match(/\[UIDVALIDITY (\d+)\]/i);
      if (v) uidValidity = Number(v[1]);
      const n = it.text.match(/\[UIDNEXT (\d+)\]/i);
      if (n) uidNext = Number(n[1]);
      const e = it.text.match(/^\* (\d+) EXISTS/i);
      if (e) exists = Number(e[1]);
    }
    return { uidValidity, uidNext, exists };
  }

  async uidSearch(criteria: string): Promise<number[]> {
    const items = await this.command(`UID SEARCH ${criteria}`);
    const uids: number[] = [];
    for (const it of items) {
      const m = it.text.match(/^\* SEARCH ?(.*)$/i);
      if (m) uids.push(...m[1].trim().split(/\s+/).filter(Boolean).map(Number));
    }
    return uids.filter((u) => Number.isFinite(u)).sort((a, b) => a - b);
  }

  /** Fetch up to `maxBytes` of each message without setting \Seen. */
  async fetch(uids: number[], maxBytes = 400_000): Promise<ImapFetched[]> {
    if (uids.length === 0) return [];
    const items = await this.command(`UID FETCH ${uids.join(',')} (UID INTERNALDATE BODY.PEEK[]<0.${maxBytes}>)`);
    const out: ImapFetched[] = [];
    for (const it of items) {
      if (!/^\* \d+ FETCH/i.test(it.text)) continue;
      const uid = it.text.match(/UID (\d+)/i);
      const date = it.text.match(/INTERNALDATE "([^"]+)"/i);
      if (!uid || it.literals.length === 0) continue;
      const parsed = date ? new Date(date[1].replace(/^(\d{1,2})-(\w{3})-(\d{4})/, '$2 $1 $3')) : null;
      out.push({ uid: Number(uid[1]), internalDate: parsed && !isNaN(parsed.getTime()) ? parsed : null, raw: it.literals[it.literals.length - 1] });
    }
    return out;
  }

  async append(mailbox: string, raw: Uint8Array, flags = '(\\Seen)'): Promise<void> {
    await this.command(`APPEND ${quote(mailbox)} ${flags}`, raw);
  }

  async logout(): Promise<void> {
    try {
      await this.command('LOGOUT');
    } catch { /* server may just close */ }
    this.t.close();
  }
}

/** The Sent folder: \Sent special-use flag first, then common names. */
export function findSentFolder(folders: ImapFolder[]): string | null {
  const flagged = folders.find((f) => f.flags.some((x) => /^\\sent$/i.test(x)));
  if (flagged) return flagged.name;
  const byName = folders.find((f) => /(^|[./])(sent|sent items|sent messages|sent mail|gesendete objekte|gesendet)$/i.test(f.name));
  return byName?.name ?? null;
}
