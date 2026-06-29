import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, ClipboardList, Clock3, MessageCircleReply, RefreshCcw, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { atualizarStatusFalaDemanda, falaStatusLabels, listAdminFalaDemandas, listAdminFalaHistorico, listAdminFalaTransferencias, listFalaSecretarias, transferirFalaDemanda } from '@/lib/falaCidadao';
import type { FalaDemandaAdmin, FalaHistoricoStatus, FalaSecretaria, FalaStatus, FalaTransferencia } from '@/types/fala-cidadao';

const adminStatusOptions: FalaStatus[] = ['recebido', 'analise', 'execucao', 'concluido', 'arquivado', 'transferido'];

const FalaCidadaoAdmin = () => {
  const [items, setItems] = useState<FalaDemandaAdmin[]>([]);
  const [secretarias, setSecretarias] = useState<FalaSecretaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | FalaStatus>('todos');
  const [selected, setSelected] = useState<FalaDemandaAdmin | null>(null);
  const [historico, setHistorico] = useState<FalaHistoricoStatus[]>([]);
  const [transferencias, setTransferencias] = useState<FalaTransferencia[]>([]);
  const [nextStatus, setNextStatus] = useState<FalaStatus>('analise');
  const [respostaCidadao, setRespostaCidadao] = useState('');
  const [observacaoInterna, setObservacaoInterna] = useState('');
  const [secretariaDestinoId, setSecretariaDestinoId] = useState('');
  const [justificativaTransferencia, setJustificativaTransferencia] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [demandasData, secretariasData] = await Promise.all([
        listAdminFalaDemandas(),
        listFalaSecretarias(),
      ]);
      setItems(demandasData);
      setSecretarias(secretariasData);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar modulo', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false;
      const haystack = [
        item.protocolo,
        item.nome_cidadao,
        item.cpf,
        item.email,
        item.telefone,
        item.descricao,
        item.endereco,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [items, search, statusFilter]);

  const openDetails = async (item: FalaDemandaAdmin) => {
    setSelected(item);
    setNextStatus(item.status);
    setRespostaCidadao(item.resposta_cidadao || '');
    setObservacaoInterna(item.observacao_interna || '');
    setSecretariaDestinoId('');
    setJustificativaTransferencia('');
    try {
      const [historicoData, transferenciasData] = await Promise.all([
        listAdminFalaHistorico(item.id),
        listAdminFalaTransferencias(item.id),
      ]);
      setHistorico(historicoData);
      setTransferencias(transferenciasData);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar detalhes', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await atualizarStatusFalaDemanda(selected.id, nextStatus, respostaCidadao, observacaoInterna);
      toast({ title: 'Status atualizado' });
      await loadData();
      await openDetails({ ...selected, status: nextStatus, resposta_cidadao: respostaCidadao, observacao_interna: observacaoInterna });
    } catch (error: any) {
      toast({ title: 'Nao foi possivel atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleTransfer = async () => {
    if (!selected || !secretariaDestinoId || !justificativaTransferencia.trim()) return;
    setSavingTransfer(true);
    try {
      await transferirFalaDemanda(selected.id, secretariaDestinoId, justificativaTransferencia);
      toast({ title: 'Demanda transferida' });
      await loadData();
      await openDetails(selected);
    } catch (error: any) {
      toast({ title: 'Falha na transferencia', description: error.message, variant: 'destructive' });
    } finally {
      setSavingTransfer(false);
    }
  };

  const pendentes = items.filter((item) => item.status === 'recebido' || item.status === 'analise').length;
  const concluidas = items.filter((item) => item.status === 'concluido').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Atendimento urbano</p>
              <h1 className="mt-3 text-[34px] font-black tracking-[-0.08em]">Fala Cidadao</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">
                Gerencie protocolos, responda cidadaos e acompanhe a rastreabilidade das demandas.
              </p>
            </div>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void loadData()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Total" value={String(items.length)} icon={ClipboardList} />
            <StatCard label="Pendentes" value={String(pendentes)} icon={Clock3} />
            <StatCard label="Concluidas" value={String(concluidas)} icon={ShieldCheck} />
          </div>
        </section>

        <Card className="rounded-[24px] border-slate-200">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <Label>Buscar por protocolo, nome, CPF ou descricao</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: FALA-20260629, Maria, buraco..." />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'todos' | FalaStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {adminStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{falaStatusLabels[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Carregando demandas...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <article key={item.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold">{item.protocolo}</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold">{falaStatusLabels[item.status]}</Badge>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{item.nome_cidadao}</h2>
                      <p className="text-sm text-slate-600">{item.endereco}{item.bairro ? ` - ${item.bairro}` : ''}</p>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-slate-700">{item.descricao}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-sm text-slate-500">
                      Aberta em {new Date(item.data_abertura).toLocaleString('pt-BR')}
                    </div>
                    <Button onClick={() => void openDetails(item)}>
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </article>
            ))}

            {filteredItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Nenhuma demanda encontrada com os filtros atuais.
              </div>
            ) : null}
          </div>
        )}

        <ResponsiveDialog
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setHistorico([]);
              setTransferencias([]);
            }
          }}
          title="Detalhes da demanda"
          description={selected ? `${selected.protocolo} • ${selected.nome_cidadao}` : ''}
        >
          {selected ? (
            <div className="space-y-6 py-2">
              <section className="grid gap-4 md:grid-cols-2">
                <Info label="CPF" value={selected.cpf} />
                <Info label="Telefone" value={selected.telefone || '-'} />
                <Info label="Email" value={selected.email || '-'} />
                <Info label="Status atual" value={falaStatusLabels[selected.status]} />
              </section>

              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Descricao</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  {selected.descricao}
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <MessageCircleReply className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Atualizar atendimento</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Novo status</Label>
                    <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as FalaStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {adminStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>{falaStatusLabels[status]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Info label="Abertura" value={new Date(selected.data_abertura).toLocaleString('pt-BR')} />
                </div>
                <div className="space-y-2">
                  <Label>Resposta visivel ao cidadao</Label>
                  <Textarea rows={3} value={respostaCidadao} onChange={(e) => setRespostaCidadao(e.target.value)} placeholder="Mensagem que pode ser vista pelo cidadao." />
                </div>
                <div className="space-y-2">
                  <Label>Observacao interna</Label>
                  <Textarea rows={3} value={observacaoInterna} onChange={(e) => setObservacaoInterna(e.target.value)} placeholder="Notas internas da equipe." />
                </div>
                <Button onClick={() => void handleSaveStatus()} disabled={savingStatus}>
                  {savingStatus ? 'Salvando...' : 'Salvar atualizacao'}
                </Button>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Transferir demanda</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Secretaria destino</Label>
                    <Select value={secretariaDestinoId} onValueChange={setSecretariaDestinoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a secretaria" /></SelectTrigger>
                      <SelectContent>
                        {secretarias.filter((item) => item.id !== selected.secretaria_atual_id).map((secretaria) => (
                          <SelectItem key={secretaria.id} value={secretaria.id}>{secretaria.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Justificativa</Label>
                  <Textarea rows={3} value={justificativaTransferencia} onChange={(e) => setJustificativaTransferencia(e.target.value)} placeholder="Explique por que a demanda deve mudar de secretaria." />
                </div>
                <Button variant="outline" onClick={() => void handleTransfer()} disabled={savingTransfer || !secretariaDestinoId || !justificativaTransferencia.trim()}>
                  {savingTransfer ? 'Transferindo...' : 'Transferir demanda'}
                </Button>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Historico de status</h3>
                {historico.length === 0 ? (
                  <EmptyBox text="Nenhum historico registrado." />
                ) : (
                  historico.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{entry.status_anterior ? `${falaStatusLabels[entry.status_anterior]} -> ${falaStatusLabels[entry.status_novo]}` : falaStatusLabels[entry.status_novo]}</strong>
                        <span className="text-slate-500">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      {entry.observacao ? <p className="mt-2 text-slate-700">{entry.observacao}</p> : null}
                      {entry.resposta_publica ? <p className="mt-2 text-emerald-700">{entry.resposta_publica}</p> : null}
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Transferencias</h3>
                {transferencias.length === 0 ? (
                  <EmptyBox text="Nenhuma transferencia registrada." />
                ) : (
                  transferencias.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>Transferencia registrada</strong>
                        <span className="text-slate-500">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="mt-2 text-slate-700">{entry.justificativa}</p>
                    </div>
                  ))
                )}
              </section>
            </div>
          ) : null}
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</p>
        </div>
        <div className="rounded-[18px] bg-white/15 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export default FalaCidadaoAdmin;

