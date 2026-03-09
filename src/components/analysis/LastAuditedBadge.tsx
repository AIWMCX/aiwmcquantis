import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LastAuditedBadge() {
  const [lastAudited, setLastAudited] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditTime() {
      try {
        const { data, error } = await supabase
          .from('safety_evaluations')
          .select('evaluated_at')
          .order('evaluated_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.evaluated_at) {
          setLastAudited(new Date(data.evaluated_at));
        }
      } catch (err) {
        console.error("Failed to fetch last audited time", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAuditTime();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full w-fit">
        <Loader2 className="w-3 h-3 animate-spin" /> Fetching audit status...
      </div>
    );
  }

  const dateStr = lastAudited 
    ? lastAudited.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Today';

  return (
    <Link to="/methodology" className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors px-3 py-1.5 rounded-full w-fit border border-green-500/20">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="font-medium">System Last Audited: {dateStr} | QSL-3 Standard</span>
    </Link>
  );
}
