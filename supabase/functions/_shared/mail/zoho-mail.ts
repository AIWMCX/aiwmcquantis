/**
 * Zoho Mail REST client (the Quantis-domain mailboxes live at Zoho Mail;
 * MX mx.zoho.com). Server-side only — uses a long-lived OAuth refresh token
 * from a Self Client, exchanged for short-lived access tokens.
 *
 * Secrets (supabase secrets set …):
 *   ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET, ZOHO_MAIL_REFRESH_TOKEN
 *   ZOHO_ACCOUNTS_HOST  (optional, default accounts.zoho.com — use .eu/.in for other data centers)
 *   ZOHO_MAIL_API_HOST  (optional, default mail.zoho.com)
 * Scopes for the refresh token:
 *   ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL
 *
 * Endpoints used (https://www.zoho.com/mail/help/api/):
 *   GET  /api/accounts
 *   GET  /api/accounts/{accountId}/folders
 *   GET  /api/accounts/{accountId}/messages/view?folderId&start&limit&includeto=true
 *   GET  /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/content
 *   GET  /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/header
 *   POST /api/accounts/{accountId}/messages                (send)
 *   POST /api/accounts/{accountId}/messages/{messageId}    (reply, action=reply)
 */

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsHost: string;
  apiHost: string;
}

export function zohoConfigFromEnv(): ZohoConfig | null {
  const clientId = Deno.env.get('ZOHO_MAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOHO_MAIL_CLIENT_SECRET');
  const refreshToken = Deno.env.get('ZOHO_MAIL_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    accountsHost: Deno.env.get('ZOHO_ACCOUNTS_HOST') || 'accounts.zoho.com',
    apiHost: Deno.env.get('ZOHO_MAIL_API_HOST') || 'mail.zoho.com',
  };
}

export interface ZohoAccount {
  accountId: string;
  primaryEmail: string;
  /** Every address this account may send as (primary + aliases). */
  sendAs: string[];
}

export interface ZohoFolder {
  folderId: string;
  folderName: string;
  folderType: string;
}

export interface ZohoListedMessage {
  messageId: string;
  folderId: string;
  threadId: string | null;
  fromAddress: string;
  sender: string | null;
  toAddress: string;
  ccAddress: string;
  subject: string;
  summary: string;
  receivedTime: number;
}

export interface ZohoSendResult {
  messageId: string | null;
  mailId: string | null;
}

export class ZohoMailError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
  }
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

export class ZohoMailClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly cfg: ZohoConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const params = new URLSearchParams({
      refresh_token: this.cfg.refreshToken,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      grant_type: 'refresh_token',
    });
    const res = await this.fetchImpl(`https://${this.cfg.accountsHost}/oauth/v2/token?${params}`, { method: 'POST' });
    const json = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !json.access_token) {
      throw new ZohoMailError(`Zoho OAuth refresh failed: ${json.error ?? res.status}`, res.status, json);
    }
    this.token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async call<T = unknown>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.accessToken();
    const res = await this.fetchImpl(`https://${this.cfg.apiHost}${path}`, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null) as { status?: { code?: number; description?: string }; data?: unknown } | null;
    const code = json?.status?.code ?? res.status;
    if (!res.ok || (typeof code === 'number' && code >= 400)) {
      const more = (json?.data as { moreInfo?: string } | undefined)?.moreInfo;
      throw new ZohoMailError(`Zoho Mail ${method} ${path.split('?')[0]} failed: ${json?.status?.description ?? res.status}${more ? ` (${more})` : ''}`, res.status, json);
    }
    return (json?.data ?? json) as T;
  }

  async accounts(): Promise<ZohoAccount[]> {
    const data = await this.call<Array<Record<string, unknown>>>('GET', '/api/accounts');
    return (Array.isArray(data) ? data : []).map((a) => {
      const sendAs = new Set<string>();
      const primary = str(a.primaryEmailAddress ?? a.mailboxAddress ?? a.incomingUserName).toLowerCase();
      if (primary) sendAs.add(primary);
      for (const d of (a.sendMailDetails as Array<Record<string, unknown>> | undefined) ?? []) {
        const addr = str(d.fromAddress).toLowerCase();
        if (addr) sendAs.add(addr);
      }
      for (const e of (a.emailAddress as Array<Record<string, unknown>> | undefined) ?? []) {
        const addr = str(e.mailId).toLowerCase();
        if (addr) sendAs.add(addr);
      }
      return { accountId: str(a.accountId), primaryEmail: primary, sendAs: Array.from(sendAs) };
    });
  }

  async folders(accountId: string): Promise<ZohoFolder[]> {
    const data = await this.call<Array<Record<string, unknown>>>('GET', `/api/accounts/${accountId}/folders`);
    return (Array.isArray(data) ? data : []).map((f) => ({
      folderId: str(f.folderId),
      folderName: str(f.folderName),
      folderType: str(f.folderType),
    }));
  }

  async listMessages(accountId: string, folderId: string, start = 1, limit = 50): Promise<ZohoListedMessage[]> {
    const q = new URLSearchParams({ folderId, start: String(start), limit: String(limit), includeto: 'true', sortorder: 'false' });
    const data = await this.call<Array<Record<string, unknown>>>('GET', `/api/accounts/${accountId}/messages/view?${q}`);
    return (Array.isArray(data) ? data : []).map((m) => ({
      messageId: str(m.messageId),
      folderId: str(m.folderId || folderId),
      threadId: m.threadId ? str(m.threadId) : null,
      fromAddress: str(m.fromAddress),
      sender: m.sender ? str(m.sender) : null,
      toAddress: str(m.toAddress),
      ccAddress: str(m.ccAddress),
      subject: str(m.subject),
      summary: str(m.summary),
      receivedTime: Number(m.receivedTime ?? m.sentDateInGMT ?? 0),
    }));
  }

  async content(accountId: string, folderId: string, messageId: string): Promise<string> {
    const data = await this.call<{ content?: string }>('GET', `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`);
    return str(data?.content);
  }

  /** Raw header block (string) or header object, whichever Zoho returns. */
  async headers(accountId: string, folderId: string, messageId: string): Promise<unknown> {
    const data = await this.call<Record<string, unknown>>('GET', `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/header`);
    return data?.headerContent ?? data?.headers ?? data;
  }

  async send(accountId: string, msg: { from: string; to: string; subject: string; text: string }): Promise<ZohoSendResult> {
    const data = await this.call<Record<string, unknown>>('POST', `/api/accounts/${accountId}/messages`, {
      fromAddress: msg.from,
      toAddress: msg.to,
      subject: msg.subject,
      content: msg.text,
      mailFormat: 'plaintext',
    });
    return { messageId: data?.messageId ? str(data.messageId) : null, mailId: data?.mailId ? str(data.mailId).trim() : null };
  }

  async reply(accountId: string, originalMessageId: string, msg: { from: string; to: string; subject: string; text: string }): Promise<ZohoSendResult> {
    const data = await this.call<Record<string, unknown>>('POST', `/api/accounts/${accountId}/messages/${originalMessageId}`, {
      fromAddress: msg.from,
      toAddress: msg.to,
      subject: msg.subject,
      content: msg.text,
      mailFormat: 'plaintext',
      action: 'reply',
    });
    return { messageId: data?.messageId ? str(data.messageId) : null, mailId: data?.mailId ? str(data.mailId).trim() : null };
  }
}

/** Find the account that may send as `address` (primary or alias). */
export function accountForAddress(accounts: ZohoAccount[], address: string): ZohoAccount | null {
  const a = address.toLowerCase();
  return accounts.find((x) => x.sendAs.includes(a)) ?? null;
}
