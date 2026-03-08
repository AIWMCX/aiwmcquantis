import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices, useUpdateInvoiceStatus, type InvoiceStatus } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileText },
  sent: { label: 'Sent', variant: 'outline', icon: Send },
  paid: { label: 'Paid', variant: 'default', icon: CheckCircle },
  overdue: { label: 'Overdue', variant: 'destructive', icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'secondary', icon: XCircle },
};

export default function InvoiceManager() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const { data: invoices, isLoading } = useInvoices(statusFilter === 'all' ? undefined : statusFilter as InvoiceStatus);
  const updateStatus = useUpdateInvoiceStatus();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate('/docs')} className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Docs Studio
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Invoice Manager</h1>
            <p className="text-muted-foreground">Track and manage all your invoices</p>
          </div>
          <Button onClick={() => navigate('/docs')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
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
              return (
                <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{inv.client_name}{inv.client_company ? ` · ${inv.client_company}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold text-foreground">
                          ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.issue_date).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {inv.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'sent' })}>
                              <Send className="w-4 h-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: inv.id, status: 'cancelled' })}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
