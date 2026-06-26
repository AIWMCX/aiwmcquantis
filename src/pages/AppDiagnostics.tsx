/**
 * /app/diagnostics — surfaces the most recent captured error from the
 * route-level boundary so the user (or support) can debug without guessing.
 *
 * Reads from sessionStorage via src/lib/appRecovery.ts. No network calls.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clipboard,
  Check,
  Trash2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  readLastError,
  clearLastError,
  BUILD_ID,
  recoverAndReload,
  type CapturedError,
} from '@/lib/appRecovery';

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
}

export default function AppDiagnostics() {
  const [err, setErr] = useState<CapturedError | null>(null);
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setErr(readLastError());
  }, []);

  const handleCopy = async () => {
    if (!err) return;
    const blob = [
      `Build: ${err.buildId ?? 'unknown'} (current: ${BUILD_ID})`,
      `When:  ${formatTimestamp(err.timestamp)}`,
      `URL:   ${err.url}`,
      `UA:    ${err.userAgent}`,
      ``,
      `${err.name ?? 'Error'}: ${err.message}`,
      ``,
      err.stack ?? '(no stack)',
      ``,
      `--- Component stack ---`,
      err.componentStack ?? '(none)',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleClear = () => {
    clearLastError();
    setErr(null);
  };

  const handleHardReload = async () => {
    setClearing(true);
    await recoverAndReload();
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to /app
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded border border-border/60 bg-muted/40 text-muted-foreground">
            build {BUILD_ID.slice(0, 12)}
          </span>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">App diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            The last error caught by the /app route-level boundary. Use this when
            the dashboard fails to load so you can see the real cause instead of
            the generic recovery screen.
          </p>
        </header>

        {!err && (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No errors captured in this session. 🎉
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              If /app is misbehaving but nothing appears here, the issue is
              likely a stale service-worker cache — try a hard reload below.
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleHardReload}
                disabled={clearing}
                className="gap-2"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`}
                />
                Clear cache &amp; reload /app
              </Button>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {err.name ?? 'Error'}
                </h2>
                <p className="text-sm font-mono text-destructive break-words mt-0.5">
                  {err.message}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd className="font-mono text-foreground/90">
                  {formatTimestamp(err.timestamp)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Captured at build</dt>
                <dd className="font-mono text-foreground/90">
                  {err.buildId ?? 'unknown'}
                  {err.buildId && err.buildId !== BUILD_ID && (
                    <span className="ml-1 text-amber-500">(stale — now {BUILD_ID.slice(0, 8)})</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="font-mono text-foreground/90 break-all">{err.url}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">User agent</dt>
                <dd className="font-mono text-foreground/80 break-all text-[11px]">
                  {err.userAgent}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Stack trace
              </p>
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words bg-background/70 border border-border rounded p-3 max-h-72 overflow-auto text-muted-foreground">
                {err.stack ?? '(no stack)'}
              </pre>
            </div>

            {err.componentStack && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  React component stack
                </p>
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-words bg-background/70 border border-border rounded p-3 max-h-56 overflow-auto text-muted-foreground">
                  {err.componentStack}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button size="sm" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy report'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleHardReload}
                disabled={clearing}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`}
                />
                Clear cache &amp; reload
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                className="gap-1.5 text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
