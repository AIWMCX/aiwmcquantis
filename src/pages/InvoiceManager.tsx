import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices, useUpdateInvoiceStatus, type Invoice, type InvoiceStatus } from '@/hooks/useInvoices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  MoreVertical,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Plus,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Search,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { InvoiceCreatorPanel } from '@/components/invoices/InvoiceCreatorPanel';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileText },
  sent: { label: 'Sent', variant: 'outline', icon: Send },
  paid: { label: 'Paid', variant: 'default', icon: CheckCircle },
  overdue: { label: 'Overdue', variant: 'destructive', icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'secondary', icon: XCircle },
};

function getDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function InvoiceManager() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: invoices, isLoading } = useInvoices(statusFilter === 'all' ? undefined : statusFilter as InvoiceStatus);
  const updateStatus = useUpdateInvoiceStatus();

  // Search filter
  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(inv =>
      inv.client_name.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_company && inv.client_company.toLowerCase().includes(q))
    );
  }, [invoices, search]);

  /* ─── KPI calculations ─── */
  const kpis = useMemo(() => {
    if (!invoices?.length) return { outstanding: 0, paidThisMonth: 0, overdueCount: 0, avgDays: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let outstanding = 0, paidThisMonth = 0, overdueCount = 0, paidDaysTotal = 0, paidCount = 0;

    invoices.forEach(inv => {
      if (inv.status === 'sent' || inv.status === 'overdue') outstanding += Number(inv.total_amount);
      if (inv.status === 'overdue') overdueCount++;
      if (inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= monthStart) paidThisMonth += Number(inv.total_amount);
      if (inv.status === 'paid' && inv.paid_at) {
        paidDaysTotal += Math.max(0, Math.floor((new Date(inv.paid_at).getTime() - new Date(inv.issue_date).getTime()) / 86400000));
        paidCount++;
      }
    });

    return { outstanding, paidThisMonth, overdueCount, avgDays: paidCount > 0 ? Math.round(paidDaysTotal / paidCount) : 0 };
  }, [invoices]);

  if (authLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!user) { navigate('/auth'); return null; }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create, track, and manage all your invoices</p>
          </div>
          <Button onClick={() => setShowCreator(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Outstanding', value: `$${kpis.outstanding.toLocaleString('en-US')}`, icon: DollarSign, color: 'hsl(var(--chart-4))' },
            { label: 'Paid This Month', value: `$${kpis.paidThisMonth.toLocaleString('en-US')}`, icon: CheckCircle, color: 'hsl(var(--chart-2))' },
            { label: 'Overdue', value: kpis.overdueCount.toString(), icon: AlertTriangle, color: kpis.overdueCount > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))' },
            { label: 'Avg. Days to Pay', value: `${kpis.avgDays}d`, icon: TrendingUp, color: 'hsl(var(--primary))' },
          ].map(kpi => {
            const KpiIcon = kpi.icon;
            return (
              <Card key={kpi.label} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <KpiIcon className="w-4 h-4" style={{ color: kpi.color }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                  </div>
                  <span className="text-xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Analysis Banner */}
        <AnalysisBanner invoices={invoices} userId={user.id} />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')} className="flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !filtered.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{search ? 'No matching invoices' : 'No invoices yet'}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search ? 'Try a different search term.' : 'Create your first invoice to get started.'}
              </p>
              {!search && <Button onClick={() => setShowCreator(true)} variant="outline">Create Invoice</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                onStatusChange={(status) => updateStatus.mutate({ id: inv.id, status })}
                onViewAnalysis={inv.analysis_ref_id ? () => navigate(`/app?analysis=${inv.analysis_ref_id}`) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Creator slide-over */}
      <InvoiceCreatorPanel open={showCreator} onOpenChange={setShowCreator} />
    </AppLayout>
  );
}

/* ─── Invoice Row with expandable detail ─── */
function InvoiceRow({ invoice: inv, expanded, onToggle, onStatusChange, onViewAnalysis }: {
  invoice: Invoice;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: InvoiceStatus) => void;
  onViewAnalysis?: () => void;
}) {
  const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
  const StatusIcon = config.icon;
  const daysOver = inv.status === 'overdue' ? getDaysOverdue(inv.due_date) : 0;
  const lineItems = (inv.line_items || []) as Array<{ description: string; quantity: number; unit_price: number; amount: number }>;

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                {getInitials(inv.client_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {inv.client_name}{inv.client_company ? ` · ${inv.client_company}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {daysOver > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  {daysOver}d overdue
                </span>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold font-mono text-foreground">
                  ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</p>
              </div>
              <Badge variant={config.variant} className="gap-1 text-[11px]">
                <StatusIcon className="w-3 h-3" />{config.label}
              </Badge>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-border">
            {/* Line items table */}
            {lineItems.length > 0 && (
              <div className="mt-3 rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Price</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{item.description}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">${item.unit_price?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-foreground">${item.amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Subtotal: <strong className="text-foreground font-mono">${Number(inv.subtotal).toFixed(2)}</strong></span>
              <span>Tax ({(Number(inv.tax_rate) * 100).toFixed(1)}%): <strong className="text-foreground font-mono">${Number(inv.tax_amount).toFixed(2)}</strong></span>
              {Number(inv.discount_amount) > 0 && <span>Discount: <strong className="text-destructive font-mono">-${Number(inv.discount_amount).toFixed(2)}</strong></span>}
              {inv.payment_terms && <span>Terms: <strong className="text-foreground">{inv.payment_terms}</strong></span>}
              {inv.due_date && <span>Due: <strong className="text-foreground">{new Date(inv.due_date).toLocaleDateString()}</strong></span>}
            </div>

            {inv.notes && (
              <p className="mt-2 text-xs text-muted-foreground italic bg-muted/30 rounded-md px-3 py-2">{inv.notes}</p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              {(inv.status === 'sent' || inv.status === 'overdue') && (
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => onStatusChange('paid')}>
                  <CheckCircle className="w-3 h-3" /> Mark Paid
                </Button>
              )}
              {inv.status === 'draft' && (
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => onStatusChange('sent')}>
                  <Send className="w-3 h-3" /> Mark Sent
                </Button>
              )}
              {onViewAnalysis && (
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={onViewAnalysis}>
                  <ExternalLink className="w-3 h-3" /> View Analysis
                </Button>
              )}
              {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive hover:text-destructive" onClick={() => onStatusChange('cancelled')}>
                  <XCircle className="w-3 h-3" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ─── Analysis cross-link banner ─── */
function AnalysisBanner({ invoices, userId }: { invoices: Invoice[] | undefined; userId: string }) {
  const { data: latestAnalysis } = useQuery({
    queryKey: ['latest-analysis-revenue', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('analyses')
        .select('result, monthly_profit')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!data?.result) return null;
      const result = data.result as Record<string, any>;
      return (result?.monthlyRevenue || result?.monthly_revenue || result?.financials?.monthlyRevenue || 0) as number;
    },
    enabled: !!userId,
  });

  const invoicedThisMonth = useMemo(() => {
    if (!invoices?.length) return 0;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return invoices
      .filter(inv => new Date(inv.issue_date) >= monthStart && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  }, [invoices]);

  if (!latestAnalysis || latestAnalysis <= 0 || !invoices?.length) return null;

  const pct = Math.round((invoicedThisMonth / latestAnalysis) * 100);

  return (
    <div className="rounded-xl p-4 flex items-center gap-3 bg-primary/5 border border-primary/10">
      <TrendingUp className="w-5 h-5 shrink-0 text-primary" />
      <p className="text-sm text-muted-foreground">
        Projected <span className="font-bold text-foreground">${latestAnalysis.toLocaleString('en-US')}/mo</span> revenue.
        Invoiced <span className="font-bold text-foreground">${invoicedThisMonth.toLocaleString('en-US')}</span> this month —{' '}
        <span className={`font-bold ${pct >= 80 ? 'text-chart-2' : pct >= 40 ? 'text-chart-4' : 'text-destructive'}`}>{pct}%</span> of projection.
      </p>
    </div>
  );
}
