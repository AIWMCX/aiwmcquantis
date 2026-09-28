/**
 * Byte transport + buffered line reader shared by the IMAP and SMTP clients.
 * The clients only see this interface, so tests drive them with a scripted
 * fake server and production uses a TLS socket (Deno.connectTls).
 *
 * Supabase Edge Functions block outbound ports 25 and 587, so the business
 * mailboxes are reached over implicit TLS: IMAP 993, SMTP 465.
 */

export interface Transport {
  read(): Promise<Uint8Array | null>;
  write(bytes: Uint8Array): Promise<void>;
  close(): void;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export class LineReader {
  private buf = new Uint8Array(0);

  constructor(private readonly t: Transport, private readonly timeoutMs = 30_000) {}

  private async fill(): Promise<void> {
    let timer: number | undefined;
    const chunk = await Promise.race([
      this.t.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('mail server timed out')), this.timeoutMs) as unknown as number;
      }),
    ]).finally(() => clearTimeout(timer));
    if (chunk === null) throw new Error('mail server closed the connection');
    const next = new Uint8Array(this.buf.length + chunk.length);
    next.set(this.buf);
    next.set(chunk, this.buf.length);
    this.buf = next;
  }

  /** One line without its CRLF, decoded as UTF-8. */
  async line(): Promise<string> {
    for (;;) {
      const i = this.buf.indexOf(10);
      if (i >= 0) {
        const end = i > 0 && this.buf[i - 1] === 13 ? i - 1 : i;
        const text = dec.decode(this.buf.subarray(0, end));
        this.buf = this.buf.slice(i + 1);
        return text;
      }
      await this.fill();
    }
  }

  /** Exactly `n` raw bytes (IMAP literals). */
  async bytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.fill();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }
}

export async function writeText(t: Transport, text: string): Promise<void> {
  await t.write(enc.encode(text));
}

/** Production transport: implicit-TLS socket. */
export async function tlsTransport(hostname: string, port: number): Promise<Transport> {
  const conn = await Deno.connectTls({ hostname, port });
  const scratch = new Uint8Array(64 * 1024);
  return {
    async read() {
      const n = await conn.read(scratch);
      return n === null ? null : scratch.slice(0, n);
    },
    async write(bytes) {
      let off = 0;
      while (off < bytes.length) off += await conn.write(bytes.subarray(off));
    },
    close() {
      try { conn.close(); } catch { /* already closed */ }
    },
  };
}
