import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices, useUpdateInvoiceStatus, type InvoiceStatus } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

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
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function InvoiceManager() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const { data: invoices, isLoading } = useInvoices(statusFilter === 'all' ? undefined : statusFilter as InvoiceStatus);
  const updateStatus = useUpdateInvoiceStatus();

  /* ─── KPI calculations ─── */
  const kpis = useMemo(() => {
    if (!invoices?.length) return { outstanding: 0, paidThisMonth: 0, overdueCount: 0, avgDays: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let outstanding = 0;
    let paidThisMonth = 0;
    let overdueCount = 0;
    let paidDaysTotal = 0;
    let paidCount = 0;

    invoices.forEach(inv => {
      if (inv.status === 'sent' || inv.status === 'overdue') outstanding += Number(inv.total_amount);
      if (inv.status === 'overdue') overdueCount++;
      if (inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= monthStart) {
        paidThisMonth += Number(inv.total_amount);
      }
      if (inv.status === 'paid' && inv.paid_at) {
        const issued = new Date(inv.issue_date);
        const paid = new Date(inv.paid_at);
        paidDaysTotal += Math.max(0, Math.floor((paid.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24)));
        paidCount++;
      }
    });

    return {
      outstanding,
      paidThisMonth,
      overdueCount,
      avgDays: paidCount > 0 ? Math.round(paidDaysTotal / paidCount) : 0,
    };
  }, [invoices]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h2 mb-1">Invoice Manager</h1>
            <p className="text-body-sm">Track and manage all your invoices</p>
          </div>
          <Button onClick={() => navigate('/docs')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Outstanding', value: `$${kpis.outstanding.toLocaleString()}`, icon: DollarSign, color: 'var(--q-status-yellow)' },
            { label: 'Paid This Month', value: `$${kpis.paidThisMonth.toLocaleString()}`, icon: CheckCircle, color: 'var(--q-status-green)' },
            { label: 'Overdue', value: kpis.overdueCount.toString(), icon: AlertTriangle, color: kpis.overdueCount > 0 ? 'var(--q-status-red)' : 'var(--q-status-green)' },
            { label: 'Avg. Days to Pay', value: `${kpis.avgDays}d`, icon: TrendingUp, color: 'var(--q-accent-primary)' },
          ].map(kpi => {
            const KpiIcon = kpi.icon;
            return (
              <div key={kpi.label} className="rounded-xl p-4" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <KpiIcon className="w-4 h-4" style={{ color: kpi.color }} />
                  <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--q-text-tertiary)' }}>{kpi.label}</span>
                </div>
                <span className="text-metric-sm" style={{ color: kpi.color }}>{kpi.value}</span>
              </div>
            );
          })}
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Invoice List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first invoice from the Docs Studio.
              </p>
              <Button onClick={() => navigate('/docs')} variant="outline">
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
              const StatusIcon = config.icon;
              const daysOver = inv.status === 'overdue' ? getDaysOverdue(inv.due_date) : 0;
              return (
                <div key={inv.id} className="rounded-xl p-4 transition-shadow hover:shadow-md" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Client initials */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: 'var(--q-accent-glow)', color: 'var(--q-accent-primary)' }}>
                        {getInitials(inv.client_name)}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--q-text-primary)' }}>{inv.invoice_number}</p>
                        <p className="text-[12px]" style={{ color: 'var(--q-text-tertiary)' }}>
                          {inv.client_name}{inv.client_company ? ` · ${inv.client_company}` : ''}
                          {inv.payment_terms && <span className="ml-2 opacity-70">({inv.payment_terms})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Overdue badge */}
                      {daysOver > 0 && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--q-status-red-bg)', color: 'var(--q-status-red)', border: '1px solid var(--q-status-red-border)' }}>
                          {daysOver}d overdue
                        </span>
                      )}

                      <div className="text-right hidden sm:block">
                        <p className="text-[15px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-primary)' }}>
                          ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>
                          {new Date(inv.issue_date).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>

                      {/* Quick action: Mark Paid */}
                      {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 gap-1 hidden sm:flex"
                          onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}
                        >
                          <CheckCircle className="w-3 h-3" /> Mark Paid
                        </Button>
                      )}

                      {/* Analysis link */}
                      {inv.analysis_ref_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px] h-7 gap-1 hidden lg:flex"
                          onClick={() => navigate(`/app?analysis=${inv.analysis_ref_id}`)}
                        >
                          <ExternalLink className="w-3 h-3" /> View Analysis
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {inv.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'sent' })}>
                              <Send className="w-4 h-4 mr-2" /> Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: inv.id, status: 'cancelled' })}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
