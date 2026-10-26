/**
 * /settings/api-keys — manage Pro-tier API keys.
 *
 * - Lists existing keys with masked prefix, label, last_used_at, status.
 * - Creates new key via edge function; plaintext shown EXACTLY ONCE in a
 *   sticky one-time-reveal panel with copy-to-clipboard.
 * - Revoke (soft) and delete (hard) controls per row.
 * - Strictly Pro-gated client-side; server enforces independently.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIERS } from '@/config/tiers';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useApiKeys, type ApiKey, type CreatedApiKey } from '@/hooks/useApiKeys';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Copy, Eye, EyeOff, KeyRound, Lock, Plus, ShieldAlert, Trash2, X } from 'lucide-react';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-US');
}

function maskedPrefix(prefix: string): string {
  return `${prefix}••••••••••••••••••••••••••••••••`;
}

export default function ApiKeysSettings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isPro, loading: subLoading, createCheckout } = useSubscription();
  const { keys, loading, error, createKey, revokeKey, deleteKey } = useApiKeys();
  const { toast } = useToast();

  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast({ title: 'Label required', description: 'Give the key a descriptive name.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const created = await createKey(newLabel);
      setJustCreated(created);
      setRevealed(true);
      setNewLabel('');
      toast({ title: 'API key created', description: 'Copy it now — you won\'t see it again.' });
    } catch (e) {
      toast({
        title: 'Failed to create key',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, label = 'Key') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied to clipboard` });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleRevoke = async (k: ApiKey) => {
    try {
      await revokeKey(k.id);
      toast({ title: 'Key revoked', description: `"${k.name}" can no longer make requests.` });
    } catch (e) {
      toast({
        title: 'Revoke failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (k: ApiKey) => {
    try {
      await deleteKey(k.id);
      toast({ title: 'Key deleted' });
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const isLoading = authLoading || subLoading;

  if (isLoading) {
    return (
      <AppLayout title="API Keys">
        <div className="container max-w-4xl px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout title="API Keys">
        <div className="container max-w-md px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-3">Sign in required</h1>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </div>
      </AppLayout>
    );
  }

  if (!isPro) {
    return (
      <AppLayout title="API Keys">
        <PageSEO title="API Keys — AIWMC Quantis" description="Programmatic API access for Pro accounts." canonical="/settings/api-keys" noindex />
        <div className="container max-w-2xl px-4 sm:px-6 py-12">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
                <CardTitle>API access is a Pro feature</CardTitle>
              </div>
              <CardDescription>
                Pro unlocks 60 req/hour API access, white-label PDFs, 5-year financial models, and 3 team seats.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => createCheckout('pro')} className="min-h-[48px]">
                Upgrade to Pro — ${TIERS.pro.priceMonthly}/mo
              </Button>
              <Button variant="outline" onClick={() => navigate('/pricing')} className="min-h-[48px]">
                Compare plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="API Keys">
      <PageSEO
        title="API Keys — AIWMC Quantis"
        description="Create, label, and revoke API keys for programmatic access to Quantis analyses."
        canonical="/settings/api-keys"
        noindex
      />

      <div className="container max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Programmatic access to Quantis analyses. Rate limit: 60 req/hour, 100 analyses/day per key.
          </p>
        </header>

        {/* One-time reveal panel — only after a successful create */}
        {justCreated && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <AlertTitle className="flex items-center justify-between">
              <span>Copy your key now — you won't see it again</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJustCreated(null);
                  setRevealed(false);
                }}
                aria-label="Dismiss new key panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 px-3 py-2 rounded bg-background border font-mono text-sm break-all">
                  {revealed ? justCreated.plaintext_key : '•'.repeat(56)}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRevealed((v) => !v)}
                  aria-label={revealed ? 'Hide key' : 'Show key'}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(justCreated.plaintext_key, 'API key')}
                  aria-label="Copy key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Store it in your secret manager. We only keep a SHA-256 hash — there is no recovery.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Create new */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Create new key
            </CardTitle>
            <CardDescription>Give it a label so you can identify it later (e.g. "Vercel prod", "CI runner").</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="key-label" className="sr-only">Key label</Label>
                <Input
                  id="key-label"
                  placeholder="e.g. Production server"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  maxLength={64}
                  disabled={creating}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newLabel.trim()} className="min-h-[48px]">
                {creating ? 'Creating…' : 'Generate key'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Your keys
              <Badge variant="secondary" className="ml-2">{keys.length}</Badge>
            </CardTitle>
            <CardDescription>Up to 10 active keys. Revoke disables; delete removes permanently.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : keys.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No API keys yet. Create one above to get started.
              </p>
            ) : (
              <ul className="divide-y">
                {keys.map((k) => (
                  <li key={k.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{k.name}</span>
                        {k.is_active ? (
                          <Badge variant="outline" className="border-green-500/50 text-green-600">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                            Revoked
                          </Badge>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground font-mono block mt-1 truncate">
                        {maskedPrefix(k.key_prefix)}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Created {formatDate(k.created_at)}</span>
                        <span>Last used {formatDate(k.last_used_at)}</span>
                        <span>{k.usage_count ?? 0} requests</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {k.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">Revoke</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke "{k.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Requests using this key will immediately stop working. You can still see it here for audit purposes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(k)}>Revoke</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Delete ${k.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{k.name}" permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the key record entirely. Cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(k)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
