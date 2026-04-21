import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageMeta } from '@/components/seo/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

interface DenialRow {
  id: string;
  user_id: string | null;
  tier: string;
  feature: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface FeatureAggregate {
  feature: string;
  total: number;
  byTier: Record<string, number>;
  uniqueUsers: number;
}

const RANGES = [
  { id: '24h', label: 'Last 24h', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
] as const;

export default function AdminDenials() {
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  );
  const [range, setRange] = useState<typeof RANGES[number]['id']>('7d');
  const [rows, setRows] = useState<DenialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const fetchDenials = async () => {
      setLoading(true);
      const hours = RANGES.find((r) => r.id === range)?.hours ?? 168;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('entitlement_denials')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!error && data) {
        setRows(data as DenialRow[]);
      }
      setLoading(false);
    };
    fetchDenials();
  }, [range]);

  // Aggregate by feature
  const featureMap = new Map<string, FeatureAggregate>();
  const userSet = new Set<string>();
  rows.forEach((r) => {
    const existing = featureMap.get(r.feature) ?? {
      feature: r.feature,
      total: 0,
      byTier: {},
      uniqueUsers: 0,
    };
    existing.total += 1;
    existing.byTier[r.tier] = (existing.byTier[r.tier] ?? 0) + 1;
    featureMap.set(r.feature, existing);
    if (r.user_id) userSet.add(r.user_id);
  });

  // Recompute uniqueUsers per feature
  featureMap.forEach((agg) => {
    const featureUsers = new Set(
      rows.filter((r) => r.feature === agg.feature && r.user_id).map((r) => r.user_id)
    );
    agg.uniqueUsers = featureUsers.size;
  });

  const features = Array.from(featureMap.values()).sort((a, b) => b.total - a.total);
  const totalDenials = rows.length;
  const uniqueUsers = userSet.size;
  const anonymousDenials = rows.filter((r) => !r.user_id).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageMeta
        title="Entitlement Denials | Admin"
        description="Monitor blocked feature requests and identify upgrade opportunities."
        path="/admin/denials"
        noIndex
      />
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Entitlement Denials</h1>
              <p className="text-sm text-muted-foreground">
                Track blocked feature requests — upgrade-intent + abuse signal
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)} className="space-y-6">
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>{r.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={range} className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Total Denials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? '…' : totalDenials.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Unique Users Hit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? '…' : uniqueUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {anonymousDenials.toLocaleString()} anonymous hits
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Blocked Feature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">
                    {loading ? '…' : (features[0]?.feature ?? 'None')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {features[0]?.total ?? 0} blocks
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Feature breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Denials by Feature</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : features.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No denials recorded in this range. Either entitlements are too permissive,
                    or no users hit gated features.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                        <TableHead>Tier Breakdown</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {features.map((f) => (
                        <TableRow key={f.feature}>
                          <TableCell className="font-mono text-sm">{f.feature}</TableCell>
                          <TableCell className="text-right font-semibold">{f.total}</TableCell>
                          <TableCell className="text-right">{f.uniqueUsers}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(f.byTier).map(([tier, count]) => (
                                <span
                                  key={tier}
                                  className="text-xs px-2 py-1 rounded bg-muted text-foreground"
                                >
                                  {tier}: {count}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Denial Events</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Feature</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 50).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.feature}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded bg-muted">{r.tier}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {r.path ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {r.user_id ? `${r.user_id.slice(0, 8)}…` : 'anon'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
