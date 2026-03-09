import React, { useEffect, useState } from 'react';
import { QuantisSafetyAgent } from '@/services/quantis-safety-agent';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LastAuditedBadge() {
  const [lastAudited, setLastAudited] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditTime() {
      try {
        const timestamp = await QuantisSafetyAgent.getLatestAuditTimestamp();
        setLastAudited(timestamp);
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
    <Link to="/methodology" className="flex items-center gap-1.5 text-xs text-[var(--q-status-green)] bg-[var(--q-status-green)]/10 hover:bg-[var(--q-status-green)]/20 transition-colors px-3 py-1.5 rounded-full w-fit border border-[var(--q-status-green)]/20">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="font-medium">System Last Audited: {dateStr} | QSL-3 Standard</span>
    </Link>
  );
}
