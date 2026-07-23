import { useCallback, useEffect, useState } from 'react';
import { Cake, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type BirthdayAlert = {
  id: string;
  nome_completo: string;
  data_nascimento: string;
};

export function useBirthdayAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<BirthdayAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const dia = hoje.getDate();

    const [birthdayResult, finishedResult] = await Promise.all([
      supabase
        .from('jgc_alunos')
        .select('id, nome_completo, data_nascimento')
        .is('deleted_at', null)
        .neq('situacao', 'desligado'),
      supabase
        .from('jgc_alertas_encerrados')
        .select('aluno_id')
        .eq('tipo', 'aniversario')
        .eq('encerrado_por', user.user_id),
    ]);

    const allAlunos = (birthdayResult.data || []) as BirthdayAlert[];
    const finishedIds = new Set((finishedResult.data || []).map((r: { aluno_id: string }) => r.aluno_id));

    const birthdayAlerts = allAlunos.filter((a) => {
      if (!a.data_nascimento) return false;
      const nasc = new Date(a.data_nascimento + 'T12:00:00Z');
      return nasc.getUTCMonth() + 1 === mes && nasc.getUTCDate() === dia;
    });

    setAlerts(birthdayAlerts.filter((a) => !finishedIds.has(a.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const finishAlert = async (alunoId: string) => {
    if (!user) return;
    const { error } = await supabase.from('jgc_alertas_encerrados').insert({
      aluno_id: alunoId,
      tipo: 'aniversario',
      encerrado_por: user.user_id,
    });
    if (error) {
      toast({ title: 'Erro ao finalizar alerta', description: error.message, variant: 'destructive' });
      return;
    }
    setAlerts((prev) => prev.filter((a) => a.id !== alunoId));
  };

  return { alerts, loading, finishAlert };
}

export function JgcAlertBanner({
  alert,
  onDismiss,
  onFinish,
}: {
  alert: BirthdayAlert;
  onDismiss: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
        <Cake className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-rose-900">
          <strong className="text-rose-950">{alert.nome_completo}</strong> está fazendo aniversário hoje!
        </p>
        <p className="text-xs text-rose-600">Não deixe de parabenizar o aluno.</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={onFinish} className="h-8 gap-1.5 rounded-xl text-xs text-rose-700 hover:bg-rose-100 hover:text-rose-800">
          <CheckCircle className="h-3.5 w-3.5" />
          Finalizar
        </Button>
        <button onClick={onDismiss} className="grid h-8 w-8 place-items-center rounded-xl text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
