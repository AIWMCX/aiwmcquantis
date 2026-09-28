/**
 * Minimal SMTP submission client (implicit TLS, port 465) for sending from
 * the business mailboxes: EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT.
 */
import { LineReader, type Transport, writeText } from './transport.ts';

export class SmtpError extends Error {
  constructor(message: string, readonly code: number) {
    super(message);
  }
}

export interface SmtpResult {
  /** The server's final DATA reply, e.g. "250 Requested mail action okay, completed: id=…" */
  response: string;
}

export class SmtpClient {
  private reader: LineReader;

  constructor(private readonly t: Transport, timeoutMs = 30_000) {
    this.reader = new LineReader(t, timeoutMs);
  }

  private async reply(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.reader.line();
      lines.push(line);
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) break;
      if (!/^\d{3}-/.test(line)) throw new SmtpError(`bad SMTP reply: ${line.slice(0, 120)}`, 0);
    }
    return { code: Number(lines[lines.length - 1].slice(0, 3)), text: lines.join('\n') };
  }

  private async expect(step: string, ok: number[]): Promise<string> {
    const r = await this.reply();
    if (!ok.includes(r.code)) throw new SmtpError(`${step} rejected: ${r.text.slice(0, 300)}`, r.code);
    return r.text;
  }

  private async cmd(line: string, step: string, ok: number[]): Promise<string> {
    await writeText(this.t, `${line}\r\n`);
    return this.expect(step, ok);
  }

  async send(opts: { host: string; user: string; password: string; from: string; to: string[]; raw: string }): Promise<SmtpResult> {
    await this.expect('greeting', [220]);
    await this.cmd(`EHLO ${opts.host}`, 'EHLO', [250]);
    const plain = btoa(unescape(encodeURIComponent(`\u0000${opts.user}\u0000${opts.password}`)));
    await this.cmd(`AUTH PLAIN ${plain}`, 'AUTH', [235]);
    await this.cmd(`MAIL FROM:<${opts.from}>`, 'MAIL FROM', [250]);
    for (const rcpt of opts.to) await this.cmd(`RCPT TO:<${rcpt}>`, `RCPT TO ${rcpt}`, [250, 251]);
    await this.cmd('DATA', 'DATA', [354]);
    // Dot-stuffing (RFC 5321 §4.5.2) and normalized CRLF line endings.
    const body = opts.raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    await writeText(this.t, `${body}${body.endsWith('\r\n') ? '' : '\r\n'}.\r\n`);
    const response = await this.expect('message', [250]);
    try {
      await this.cmd('QUIT', 'QUIT', [221]);
    } catch { /* already accepted */ }
    this.t.close();
    return { response };
  }
}
