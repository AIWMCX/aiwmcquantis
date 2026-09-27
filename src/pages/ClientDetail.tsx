import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { getAnalyses } from '@/services/analysisDb';
import type { AnalysisHistoryEntry } from '@/types/analysis';

/**
 * Client workspace (Stage 5): the lightest possible "client management"
 * surface -- a client's name/industry/location plus its own decisions,
 * grouped together, with a way to start a new decision "for this client".
 * Deliberately NOT a full CRM page (out of scope per the stage charter):
 * no editing UI here beyond what New Decision's inline "+ New client"
 * already provides.
 */
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { clients, isLoaded: clientsLoaded, getClient } = useClients();
  const [decisions, setDecisions] = useState<AnalysisHistoryEntry[] | null>(null);

  const client = id ? getClient(id) : undefined;

  useEffect(() => {
    if (!isAuthenticated || !user || !id) return;
    let cancelled = false;
    getAnalyses(user.id, { clientId: id, limit: 100 }).then((rows) => {
      if (!cancelled) setDecisions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, id]);

  return (
    <AppLayout title={client?.name ?? 'Client'}>
      <div className="container max-w-3xl px-4 sm:px-6 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 -ml-2"
          onClick={() => navigate('/app')}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Button>

        {!clientsLoaded ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : !client ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Client not found, or it doesn't belong to your account.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold mb-1">{client.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {[client.industry, client.location].filter(Boolean).join(' • ') || 'No industry or location on file'}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() =>
                  navigate('/app/new-decision', {
                    state: { prefillClientId: client.id },
                  })
                }
              >
                <Plus className="w-3.5 h-3.5" /> New decision for this client
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Decisions {decisions ? `(${decisions.length})` : ''}
                </span>
              </div>
              {decisions === null ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : decisions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No decisions for this client yet.
                </div>
              ) : (
                <ul>
                  {decisions.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate('/app', {
                            state: { openAnalysisId: entry.id, openAnalysisResult: entry.result },
                          })
                        }
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/50 transition-colors min-h-[44px]"
                      >
                        <span className="truncate font-medium text-foreground">{entry.idea}</span>
                        <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
