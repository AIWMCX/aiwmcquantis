import React, { useEffect, useState, useCallback } from 'react';
import { Bell, UserPlus, BarChart3, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface AdminNotification {
  id: string;
  event_type: 'new_user' | 'new_analysis' | 'activity';
  title: string;
  message: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/**
 * Live admin bell — fetches admin_notifications, subscribes to realtime
 * inserts, plays a toast for each new event, and lets the admin mark
 * everything as read. Admin-only via RLS.
 */
export function AdminNotificationsBell() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = items.filter((i) => !i.read_at).length;

  const load = useCallback(async () => {
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (supabase as any)
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      logger.error('[AdminNotifications] load failed', error);
      return;
    }
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Realtime subscription for live pings
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          const row = payload.new as AdminNotification;
          setItems((prev) => [row, ...prev].slice(0, 50));
          toast(row.title, {
            description: row.message ?? undefined,
            duration: 6000,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const markAllRead = async () => {
    const unreadIds = items.filter((i) => !i.read_at).map((i) => i.id);
    if (unreadIds.length === 0) return;
    // deno-lint-ignore no-explicit-any
    const { error } = await (supabase as any)
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);
    if (error) {
      toast.error('Failed to mark as read');
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })),
    );
  };

  const iconFor = (t: AdminNotification['event_type']) =>
    t === 'new_user' ? UserPlus : t === 'new_analysis' ? BarChart3 : Bell;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="font-semibold text-sm">Activity feed</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread · {items.length} recent
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">
              No activity yet. New signups and analyses will appear here in real time.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = iconFor(n.event_type);
                return (
                  <li
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 ${
                      !n.read_at ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="p-2 rounded-md bg-muted h-fit">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
