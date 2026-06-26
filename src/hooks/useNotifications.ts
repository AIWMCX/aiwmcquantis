import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { trackEvent } from '@/lib/analytics';
import type { UserNotification } from '@/lib/engagementTypes';

import { logger } from '@/lib/logger';
interface UseNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('user_notifications')
        .select('id, notification_type, title, message, action_url, action_label, icon, is_read, is_dismissed, expires_at, created_at')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Cast the notification_type to the correct type
      const typedNotifications = (data || []).map(n => ({
        ...n,
        notification_type: n.notification_type as UserNotification['notification_type'],
      })) as UserNotification[];

      setNotifications(typedNotifications);
    } catch (err) {
      logger.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channelName = `user_notifications:${user.id}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as UserNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );

      const notification = notifications.find(n => n.id === id);
      if (notification) {
        trackEvent('notification_clicked', {
          type: notification.notification_type,
          notification_id: id,
        });
      }
    } catch (err) {
      logger.error('Error marking notification as read:', err);
    }
  }, [user, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      trackEvent('notifications_marked_all_read', { count: unreadCount });
    } catch (err) {
      logger.error('Error marking all notifications as read:', err);
    }
  }, [user, unreadCount]);

  const dismissNotification = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_dismissed: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      logger.error('Error dismissing notification:', err);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}
