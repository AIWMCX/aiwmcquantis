import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  user_id: string;
  document_id: string | null;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  client_address: string | null;
  line_items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string | null;
  payment_terms: string;
  notes: string | null;
  status: string;
  paid_at: string | null;
  analysis_ref_id: string | null;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export function useInvoices(statusFilter?: InvoiceStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoices', user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: !!user,
  });
}

export function useCreateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_name: string;
      client_email?: string;
      client_company?: string;
      client_address?: string;
      line_items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
      subtotal: number;
      tax_rate: number;
      tax_amount: number;
      discount_amount?: number;
      total_amount: number;
      currency?: string;
      issue_date: string;
      due_date?: string;
      payment_terms?: string;
      notes?: string;
      document_id?: string;
      analysis_ref_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get next invoice number atomically
      const { data: invoiceNumber, error: rpcError } = await supabase
        .rpc('get_next_invoice_number', { p_user_id: user.id });
      if (rpcError) throw rpcError;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber as string,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create invoice: ${err.message}`);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'paid') updates.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from('invoices')
        .update(updates as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });
}
