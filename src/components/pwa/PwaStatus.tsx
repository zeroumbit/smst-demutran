import { useState } from 'react';
import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PwaStatus() {
  const { installPrompt, isOnline, needRefresh, install, updateSW } = usePWA();
  const [installDismissed, setInstallDismissed] = useState(false);

  const showInstall = installPrompt && !installDismissed;

  if (!showInstall && isOnline && !needRefresh) return null;

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[320px]',
      needRefresh ? 'sm:bottom-20' : '',
    )}>
      {showInstall && (
        <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-100 p-2.5 text-brand-600 shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Instalar SMST</p>
              <p className="text-xs text-slate-500 mt-0.5">Instale para acesso rápido e offline.</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={install} className="text-xs h-8 rounded-xl">Instalar</Button>
                <Button size="sm" variant="ghost" onClick={() => setInstallDismissed(true)} className="text-xs h-8 rounded-xl">Agora não</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {needRefresh && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600 shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Nova versão disponível</p>
              <p className="text-xs text-amber-700 mt-0.5">Atualize para a versão mais recente.</p>
              <Button size="sm" onClick={() => updateSW?.()} className="text-xs h-8 rounded-xl mt-3 bg-amber-600 hover:bg-amber-700 text-white">
                Atualizar agora
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)] flex items-center gap-2 text-sm text-slate-600">
          <WifiOff className="h-4 w-4 text-slate-400 shrink-0" />
          <span>Modo offline — dados podem estar desatualizados</span>
        </div>
      )}
    </div>
  );
}
