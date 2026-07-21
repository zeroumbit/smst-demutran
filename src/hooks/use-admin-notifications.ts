import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { syncPushSubscription } from '@/lib/pushNotifications';
import type { AdminNotification } from '@/types/admin';

const POLL_INTERVAL = 30000;

function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission === 'denied') return Promise.resolve(false);
  return Notification.requestPermission().then((p) => p === 'granted');
}

async function showNativeNotification(notification: AdminNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body: notification.titulo,
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: notification.id,
    silent: false,
    data: {
      url: '/admin/dashboard',
      notificationId: notification.id,
    },
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('SMST Canindé', options);
      return;
    } catch {
      /* fallback below */
    }
  }

  const n = new Notification('SMST Canindé', options);
  n.onclick = () => {
    window.focus();
    window.dispatchEvent(new CustomEvent('notification-click', { detail: notification }));
  };
}

export function useAdminNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(userId ?? null);
  const latestIdRef = useRef<string | null>(null);
  const permGranted = useRef(false);

  useEffect(() => {
    requestNotificationPermission().then((ok) => {
      permGranted.current = ok;
      if (ok && userId) {
        syncPushSubscription().catch((error) => {
          console.warn('Nao foi possivel registrar push nativo:', error);
        });
      }
    });
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    const requestedUserId = userId;

    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activeUserIdRef.current !== requestedUserId) return;

    if (error) {
      console.error('Erro ao carregar notificacoes:', error);
      setLoading(false);
      return;
    }

    const items = data as AdminNotification[];

    if (activeUserIdRef.current !== requestedUserId) return;
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.lida_em).length);
    setLoading(false);

    if (permGranted.current && items.length > 0) {
      const latest = items[0];
      if (latestIdRef.current !== null && latest.id !== latestIdRef.current && !latest.lida_em) {
        void showNativeNotification(latest);
      }
      latestIdRef.current = latest.id;
    }
  }, [userId]);

  useEffect(() => {
    activeUserIdRef.current = userId ?? null;
    latestIdRef.current = null;
    setLoading(true);

    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    loadNotifications();

    const interval = setInterval(loadNotifications, POLL_INTERVAL);
    return () => {
      if (activeUserIdRef.current === userId) {
        activeUserIdRef.current = null;
      }
      clearInterval(interval);
    };
  }, [loadNotifications, userId]);

  const markAsRead = useCallback(async (notificacaoId: string) => {
    const { error } = await supabase.rpc('marcar_notificacao_admin_lida', {
      _notificacao_id: notificacaoId,
    });

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificacaoId ? { ...n, lida_em: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase.rpc('marcar_todas_notificacoes_admin_lidas');

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.lida_em ? n : { ...n, lida_em: new Date().toISOString() })),
      );
      setUnreadCount(0);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
