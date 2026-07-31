import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AdminNotification } from '@/types/admin';

const tipoIcon: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const tipoColor: Record<string, string> = {
  info: 'text-blue-500 bg-blue-50',
  success: 'text-emerald-500 bg-emerald-50',
  warning: 'text-amber-500 bg-amber-50',
  error: 'text-red-500 bg-red-50',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

interface NotificationDropdownProps {
  userId: string | undefined;
  triggerClassName?: string;
}

export function NotificationDropdown({ userId, triggerClassName }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useAdminNotifications(userId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: AdminNotification) => {
    if (!notification.lida_em) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setOpen(false);
  };

  // Versão Mobile — Drawer Nativo (Bottom Sheet)
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            triggerClassName ??
            'relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-95 transition-all'
          }
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85dvh] rounded-t-[28px] pb-[calc(1.2rem+var(--safe-area-bottom))]">
            <DrawerHeader className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <DrawerTitle className="text-base font-bold text-slate-900">Notificações</DrawerTitle>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar lidas
                </button>
              )}
            </DrawerHeader>

            <div className="overflow-y-auto px-3 py-3 max-h-[60dvh] space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Bell className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-400">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = tipoIcon[notification.tipo] || Info;
                  const colorClass = tipoColor[notification.tipo] || tipoColor.info;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors active:bg-slate-100 ${
                        !notification.lida_em ? 'bg-brand-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.lida_em ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                            {notification.titulo}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">
                            {timeAgo(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {notification.mensagem}
                        </p>
                      </div>
                      {!notification.lida_em && (
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Versão Desktop — Modal Lateral Direito (Sheet Slide-over)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          'relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)] lg:flex hover:bg-slate-50 transition-colors'
        }
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-white">
          <SheetHeader className="border-b border-slate-100 px-5 py-4 flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-base font-bold text-slate-900">Notificações</SheetTitle>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors pr-6"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar lidas
              </button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = tipoIcon[notification.tipo] || Info;
                const colorClass = tipoColor[notification.tipo] || tipoColor.info;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-colors ${
                      !notification.lida_em ? 'bg-brand-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.lida_em ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                          {notification.titulo}
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {notification.mensagem}
                      </p>
                    </div>
                    {!notification.lida_em && (
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
