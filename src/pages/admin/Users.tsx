import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logger } from '@/lib/logger';
import { filterUsers, isPaying, isTrialing, summarize, toCsv, type AdminUserRow, type UserSegment } from '@/lib/admin-users';

/**
 * /admin/users: every account, read from public.admin_users_overview()
 * (admin only). Internal accounts and founder grants are hidden by default
 * and never counted in the external numbers.
 */

const SEGMENTS: Array<{ key: UserSegment; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'activated', label: 'Ran an analysis' },
  { key: 'never_analyzed', label: 'Never analyzed' },
  { key: 'recent', label: 'Signed in, last 30 days' },
  { key: 'trialing', label: 'On trial' },
  { key: 'paying', label: 'Paying' },
];

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<UserSegment>('all');
  const [includeInternal, setIncludeInternal] = useState(false);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_users_overview' as never);
    if (err) {
      logger.error('admin_users_overview failed', err);
      setError(err.message);
      return;
    }
    setRows((data ?? []) as unknown as AdminUserRow[]);
  };

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => (rows ? summarize(rows) : null), [rows]);
  const visible = useMemo(() => (rows ? filterUsers(rows, { query, segment, includeInternal }) : []), [rows, query, segment, includeInternal]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quantis-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Users · Admin</title></Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Every account. Internal accounts and founder grants are excluded from the numbers below.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Could not load users: {error}</p>}

      {!summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="All accounts" value={summary.total} hint={`${summary.internal} internal`} />
          <Stat label="External accounts" value={summary.external} />
          <Stat label="Ran at least one analysis" value={summary.activated} hint={`${summary.activationRate}% of external`} />
          <Stat label="Never analyzed" value={summary.external - summary.activated} />
          <Stat label="Signed in, last 30 days" value={summary.signedInLast30} />
          <Stat label="Signed up, last 7 days" value={summary.signedUpLast7} />
          <Stat label="On trial" value={summary.trialing} />
          <Stat label="Paying" value={summary.paying} hint="active Stripe subscription" />
        </div>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Accounts ({visible.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Search email or name" value={query} onChange={(e) => setQuery(e.target.value)} />
            {SEGMENTS.map((s) => (
              <Button key={s.key} size="sm" variant={segment === s.key ? 'default' : 'outline'} onClick={() => setSegment(s.key)}>{s.label}</Button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={includeInternal} onCheckedChange={setIncludeInternal} />Show internal
            </label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead>Sign-in</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Analyses</TableHead>
                <TableHead>Last analysis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="font-medium">{u.email ?? '—'}</div>
                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {u.full_name && <span>{u.full_name}</span>}
                      {!u.email_confirmed && <Badge variant="outline">unconfirmed</Badge>}
                      {u.is_internal && <Badge variant="secondary">internal</Badge>}
                      {u.is_admin && <Badge variant="secondary">admin</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{fmt(u.signed_up_at)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(u.last_sign_in_at)}</TableCell>
                  <TableCell>{u.sign_in_provider}</TableCell>
                  <TableCell>
                    {u.plan_id}
                    {isPaying(u) && <Badge className="ml-1">paying</Badge>}
                    {isTrialing(u) && <Badge variant="outline" className="ml-1">trial</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.analyses_count}</TableCell>
                  <TableCell className="tabular-nums">{fmt(u.last_analysis_at)}</TableCell>
                </TableRow>
              ))}
              {rows && visible.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No accounts match.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
