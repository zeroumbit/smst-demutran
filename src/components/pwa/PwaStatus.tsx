import { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

export function PwaStatus() {
  const { installPrompt, isOnline, install } = usePWA();
  const [installDismissed, setInstallDismissed] = useState(false);

  const showInstall = installPrompt && !installDismissed;

  if (!showInstall && isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[320px]">
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

      {!isOnline && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)] flex items-center gap-2 text-sm text-slate-600">
          <WifiOff className="h-4 w-4 text-slate-400 shrink-0" />
          <span>Modo offline — dados podem estar desatualizados</span>
        </div>
      )}
    </div>
  );
}
