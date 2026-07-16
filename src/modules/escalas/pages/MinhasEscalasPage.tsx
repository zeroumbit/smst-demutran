import { FormEvent, useMemo, useState } from 'react';
import { addDays, isAfter } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock, History, RefreshCw, Shield, Shuffle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEscalasApoio, useEscalasMutations, useEscalasTrocas, useMinhasEscalas } from '../hooks/useEscalas';
import type { GuardaEscala, TrocaTipo } from '../types/escalas.types';
import { formatDate, formatDateTime, formatTime, getEscalaStatusCalculado, statusClassName, statusLabels, trocaStatusLabels } from '../utils/escalas.formatters';

export default function MinhasEscalasPage() {
  const { data: escalas = [], isLoading } = useMinhasEscalas();
  const { data: trocas = [] } = useEscalasTrocas();
  const apoio = useEscalasApoio();
  const mutations = useEscalasMutations();
  const [selected, setSelected] = useState<GuardaEscala | null>(null);
  const [trocaOpen, setTrocaOpen] = useState(false);
  const [trocaForm, setTrocaForm] = useState({
    tipo: 'SUBSTITUICAO' as TrocaTipo,
    destinatario_guarda_id: '',
    escala_destino_id: '',
    motivo: '',
    observacao: '',
  });

  const now = new Date();
  const futuras = useMemo(() => escalas.filter((escala) => isAfter(new Date(escala.data_inicio), now)).sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()), [escalas]);
  const proxima = futuras[0] ?? null;
  const historico = useMemo(() => escalas.filter((escala) => new Date(escala.data_fim) < now), [escalas]);
  const semana = useMemo(() => futuras.filter((escala) => new Date(escala.data_inicio) <= addDays(now, 7)), [futuras]);

  const openTroca = (escala: GuardaEscala) => {
    setSelected(escala);
    setTrocaForm({ tipo: 'SUBSTITUICAO', destinatario_guarda_id: '', escala_destino_id: '', motivo: '', observacao: '' });
    setTrocaOpen(true);
  };

  const confirmar = async (escala: GuardaEscala) => {
    const result = await mutations.confirmarCiencia.mutateAsync(escala.id);
    result.sucesso ? toast.success(result.mensagem) : toast.error(result.mensagem);
  };

  const solicitarTroca = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !trocaForm.destinatario_guarda_id) {
      toast.error('Informe o destinatario.');
      return;
    }
    if (trocaForm.tipo === 'TROCA' && !trocaForm.escala_destino_id) {
      toast.error('Informe a escala oferecida pelo destinatario.');
      return;
    }
    const result = await mutations.criarTroca.mutateAsync({
      tipo: trocaForm.tipo,
      escala_origem_id: selected.id,
      destinatario_guarda_id: trocaForm.destinatario_guarda_id,
      escala_destino_id: trocaForm.tipo === 'TROCA' ? trocaForm.escala_destino_id : null,
      motivo: trocaForm.motivo,
      observacao: trocaForm.observacao,
    });
    result.sucesso ? toast.success(result.mensagem) : toast.error(result.mensagem);
    if (result.sucesso) setTrocaOpen(false);
  };

  const responderTroca = async (id: string, aceitar: boolean) => {
    const result = await mutations.responderTroca.mutateAsync({ id, aceitar });
    result.sucesso ? toast.success(result.mensagem) : toast.error(result.mensagem);
  };

  const cancelarTroca = async (id: string) => {
    const result = await mutations.cancelarTroca.mutateAsync(id);
    result.sucesso ? toast.success(result.mensagem) : toast.error(result.mensagem);
  };

  return (
    <GuardsLayout>
      <div className="space-y-5">
        <section className="rounded-2xl bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_48%,_#2563eb_100%)] p-4 text-white sm:rounded-[28px] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
          <h1 className="mt-2 text-xl font-black text-white sm:text-2xl md:text-3xl">Minhas Escalas</h1>
          <p className="mt-1.5 hidden text-[13px] text-white/80 md:block md:mt-2 md:text-sm">Servicos publicados, ciencia e trocas de servico.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-5">
            <Stat label="Proximas" value={String(futuras.length)} icon={CalendarDays} />
            <Stat label="Na semana" value={String(semana.length)} icon={Clock} />
            <Stat label="Trocas" value={String(trocas.length)} icon={Shuffle} />
          </div>
        </section>

        {isLoading ? (
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">Carregando escalas...</CardContent></Card>
        ) : (
          <>
            <Card className="rounded-[22px] border-slate-200">
              <CardHeader><CardTitle>Proximo servico</CardTitle></CardHeader>
              <CardContent>
                {proxima ? <EscalaCard escala={proxima} destaque onConfirmar={() => confirmar(proxima)} onTroca={() => openTroca(proxima)} /> : <p className="text-sm text-slate-500">Nenhuma escala futura publicada para voce.</p>}
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-slate-200">
              <CardHeader><CardTitle>Proximas escalas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {futuras.slice(0, 8).map((escala) => <EscalaCard key={escala.id} escala={escala} onConfirmar={() => confirmar(escala)} onTroca={() => openTroca(escala)} />)}
                {futuras.length === 0 && <p className="text-sm text-slate-500">Sem proximas escalas.</p>}
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-slate-200">
              <CardHeader><CardTitle>Trocas de servico</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {trocas.map((troca) => (
                  <div key={troca.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{troca.tipo} - {troca.escala_origem?.titulo ?? 'Escala'}</p>
                        <p className="text-xs text-slate-500">Solicitante: {troca.solicitante?.nome ?? '-'} - Destinatario: {troca.destinatario?.nome ?? '-'}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(troca.solicitado_em)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{trocaStatusLabels[troca.status]}</Badge>
                        {troca.status === 'AGUARDANDO_ACEITE' && (
                          <>
                            <Button size="sm" onClick={() => responderTroca(troca.id, true)}>Aceitar</Button>
                            <Button size="sm" variant="outline" onClick={() => responderTroca(troca.id, false)}>Recusar</Button>
                            <Button size="sm" variant="ghost" onClick={() => cancelarTroca(troca.id)}>Cancelar</Button>
                          </>
                        )}
                        {troca.status === 'AGUARDANDO_APROVACAO' && <Button size="sm" variant="ghost" onClick={() => cancelarTroca(troca.id)}>Cancelar</Button>}
                      </div>
                    </div>
                  </div>
                ))}
                {trocas.length === 0 && <p className="text-sm text-slate-500">Nenhuma solicitacao de troca.</p>}
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-slate-200">
              <CardHeader><CardTitle>Historico</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {historico.slice(0, 8).map((escala) => <EscalaCard key={escala.id} escala={escala} />)}
                {historico.length === 0 && <p className="text-sm text-slate-500">Nenhum servico anterior.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={trocaOpen} onOpenChange={setTrocaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar troca de servico</DialogTitle>
            <DialogDescription>A troca so altera a escala oficial apos aceite do outro guarda e aprovacao administrativa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={solicitarTroca} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <strong>{selected?.titulo}</strong><br />{selected ? formatDateTime(selected.data_inicio) : ''}
            </div>
            <Field label="Tipo">
              <Select value={trocaForm.tipo} onValueChange={(value: TrocaTipo) => setTrocaForm((current) => ({ ...current, tipo: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="SUBSTITUICAO">Substituicao</SelectItem><SelectItem value="TROCA">Troca</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Guarda destinatario">
              <Select value={trocaForm.destinatario_guarda_id} onValueChange={(value) => setTrocaForm((current) => ({ ...current, destinatario_guarda_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(apoio.guardas.data ?? []).map((guarda) => <SelectItem key={guarda.id} value={guarda.id}>{guarda.nome} - {guarda.matricula}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {trocaForm.tipo === 'TROCA' && (
              <Field label="Escala oferecida pelo destinatario">
                <Select value={trocaForm.escala_destino_id} onValueChange={(value) => setTrocaForm((current) => ({ ...current, escala_destino_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{escalas.filter((escala) => escala.id !== selected?.id && new Date(escala.data_inicio) > new Date()).map((escala) => <SelectItem key={escala.id} value={escala.id}>{escala.titulo} - {formatDate(escala.data_inicio)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Motivo"><Input value={trocaForm.motivo} onChange={(event) => setTrocaForm((current) => ({ ...current, motivo: event.target.value }))} /></Field>
            <Field label="Observacao"><Textarea value={trocaForm.observacao} onChange={(event) => setTrocaForm((current) => ({ ...current, observacao: event.target.value }))} /></Field>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setTrocaOpen(false)}>Cancelar</Button><Button type="submit">Enviar solicitacao</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </GuardsLayout>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return <div className="rounded-[20px] bg-white/10 p-4"><Icon className="h-5 w-5 text-white/70" /><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-white/60">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function EscalaCard({ escala, destaque, onConfirmar, onTroca }: { escala: GuardaEscala; destaque?: boolean; onConfirmar?: () => void; onTroca?: () => void }) {
  const status = getEscalaStatusCalculado(escala);
  const minhaCiencia = escala.ciencias?.find((ciencia) => ciencia.escala_id === escala.id);
  const agente = escala.agentes?.[0];
  return (
    <div className={`rounded-xl border p-4 ${destaque ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-900">{escala.titulo}</p>
            <Badge variant="outline" className={statusClassName(status)}>{statusLabels[status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatDate(escala.data_inicio)} - {formatTime(escala.data_inicio)} ate {formatTime(escala.data_fim)}</p>
          <p className="mt-2 text-sm text-slate-600">{escala.posto?.nome ?? escala.local_texto ?? 'Local nao definido'}</p>
          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />{agente?.funcao ?? '-'}</span>
            <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{escala.equipe?.nome ?? 'Sem equipe'}</span>
            <span className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" />{escala.viaturas?.[0]?.veiculo?.prefixo ?? 'Sem viatura'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onConfirmar && !minhaCiencia?.confirmado_em && <Button size="sm" onClick={onConfirmar} className="gap-2"><CheckCircle2 className="h-4 w-4" />Confirmar ciencia</Button>}
          {minhaCiencia?.confirmado_em && <Badge className="bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Ciente</Badge>}
          {onTroca && new Date(escala.data_inicio) > new Date() && <Button size="sm" variant="outline" onClick={onTroca} className="gap-2"><Shuffle className="h-4 w-4" />Solicitar troca</Button>}
        </div>
      </div>
    </div>
  );
}
