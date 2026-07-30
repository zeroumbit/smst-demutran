import { useEffect, useState, FormEvent } from 'react';
import { ArrowLeft, Inbox, Plus, Clock, AlertCircle, CheckCircle2, XCircle, FileText, Send, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { solicitacoesService } from '@/services/solicitacoes.service';
import type {
  GuardaSolicitacao,
  GuardaSolicitacaoInteracao,
  GuardaSolicitacaoStatus,
  GuardaSolicitacaoTipo,
} from '@/modules/escalas/types/escalas.types';
import { formatDateTime } from '@/modules/escalas/utils/escalas.formatters';

const statusBadges: Record<GuardaSolicitacaoStatus, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  EM_ANALISE: { label: 'Em Análise', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  AGUARDANDO_INFORMACAO: { label: 'Aguardando Informação', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECUSADA: { label: 'Recusada', color: 'bg-red-50 text-red-700 border-red-200' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-green-50 text-green-800 border-green-200' },
  CANCELADA: { label: 'Cancelada', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const tipoLabels: Record<GuardaSolicitacaoTipo, string> = {
  TROCA_SERVICO: 'Troca de Serviço',
  ESCLARECIMENTO_ESCALA: 'Esclarecimento sobre Escala',
  CORRECAO_ESCALA: 'Correção de Escala',
  ATUALIZACAO_CADASTRAL: 'Atualização Cadastral',
  PROBLEMA_EQUIPAMENTO: 'Problema com Equipamento',
  SOLICITACAO_ADMINISTRATIVA: 'Solicitação Administrativa',
  OUTRO: 'Outro',
};

export default function MinhasSolicitacoesPage() {
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState<GuardaSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');

  // Modais
  const [novaOpen, setNovaOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<GuardaSolicitacao | null>(null);
  const [interacoes, setInteracoes] = useState<GuardaSolicitacaoInteracao[]>([]);
  const [detalheLoading, setDetalheLoading] = useState(false);

  // Form de Nova Solicitação
  const [novaForm, setNovaForm] = useState({
    tipo: 'SOLICITACAO_ADMINISTRATIVA' as GuardaSolicitacaoTipo,
    assunto: '',
    descricao: '',
  });

  // Form de Nova Interação
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregarSolicitacoes = async () => {
    setLoading(true);
    try {
      const data = await solicitacoesService.listarSolicitacoes(
        statusFilter === 'TODOS' ? null : (statusFilter as GuardaSolicitacaoStatus),
        tipoFilter === 'TODOS' ? null : (tipoFilter as GuardaSolicitacaoTipo)
      );
      setSolicitacoes(data);
    } catch (err: any) {
      toast.error('Erro ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarSolicitacoes();
  }, [statusFilter, tipoFilter]);

  const abrirDetalhe = async (sol: GuardaSolicitacao) => {
    setSelectedSolicitacao(sol);
    setDetalheOpen(true);
    setDetalheLoading(true);
    try {
      const res = await solicitacoesService.obterDetalhes(sol.id);
      if (res.sucesso) {
        setSelectedSolicitacao(res.solicitacao);
        setInteracoes(res.interacoes || []);
      }
    } catch (e: any) {
      toast.error('Erro ao carregar detalhes.');
    } finally {
      setDetalheLoading(false);
    }
  };

  const handleCriarSolicitacao = async (e: FormEvent) => {
    e.preventDefault();
    if (!novaForm.assunto.trim()) {
      toast.error('Informe o assunto.');
      return;
    }
    try {
      const res = await solicitacoesService.criarSolicitacao({
        tipo: novaForm.tipo,
        assunto: novaForm.assunto,
        descricao: novaForm.descricao,
      });
      if (res.sucesso) {
        toast.success(`Solicitação criada! Protocolo: ${res.protocolo}`);
        setNovaOpen(false);
        setNovaForm({ tipo: 'SOLICITACAO_ADMINISTRATIVA', assunto: '', descricao: '' });
        void carregarSolicitacoes();
      } else {
        toast.error(res.mensagem || 'Erro ao criar solicitação.');
      }
    } catch (err: any) {
      toast.error('Falha ao enviar solicitação.');
    }
  };

  const handleEnviarInteracao = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitacao || !mensagem.trim()) return;
    setEnviando(true);
    try {
      const res = await solicitacoesService.adicionarInteracao({
        solicitacao_id: selectedSolicitacao.id,
        mensagem: mensagem.trim(),
      });
      if (res.sucesso) {
        toast.success('Resposta enviada!');
        setMensagem('');
        void abrirDetalhe(selectedSolicitacao);
      } else {
        toast.error(res.mensagem);
      }
    } catch (e: any) {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = async () => {
    if (!selectedSolicitacao) return;
    if (!confirm('Deseja realmente cancelar esta solicitação?')) return;
    try {
      const res = await solicitacoesService.cancelarSolicitacao(selectedSolicitacao.id);
      if (res.sucesso) {
        toast.success(res.mensagem);
        void abrirDetalhe(selectedSolicitacao);
        void carregarSolicitacoes();
      } else {
        toast.error(res.mensagem);
      }
    } catch (e: any) {
      toast.error('Erro ao cancelar.');
    }
  };

  return (
    <GuardsLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between lg:hidden px-1 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Minhas Solicitações</h1>
          </div>
          <Button size="sm" onClick={() => setNovaOpen(true)} className="gap-1.5 rounded-xl text-xs">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_48%,_#2563eb_100%)] p-4 text-white sm:rounded-[28px] sm:p-6 lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Central "Minhas Solicitações"</h1>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">Acompanhe todos os seus protocolos, esclarecimentos e pedidos administrativos num só lugar.</p>
          </div>
          <Button onClick={() => setNovaOpen(true)} className="gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-md">
            <Plus className="h-4 w-4 text-brand-600" /> Nova Solicitação
          </Button>
        </section>

        {/* Filtros */}
        <Card className="rounded-[22px] border-slate-200">
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                  <SelectItem value="AGUARDANDO_INFORMACAO">Aguardando Informação</SelectItem>
                  <SelectItem value="APROVADA">Aprovada</SelectItem>
                  <SelectItem value="RECUSADA">Recusada</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500 mb-1 block">Tipo de Solicitação</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  <SelectItem value="ESCLARECIMENTO_ESCALA">Esclarecimento de Escala</SelectItem>
                  <SelectItem value="CORRECAO_ESCALA">Correção de Escala</SelectItem>
                  <SelectItem value="TROCA_SERVICO">Troca de Serviço</SelectItem>
                  <SelectItem value="PROBLEMA_EQUIPAMENTO">Problema com Equipamento</SelectItem>
                  <SelectItem value="ATUALIZACAO_CADASTRAL">Atualização Cadastral</SelectItem>
                  <SelectItem value="SOLICITACAO_ADMINISTRATIVA">Solicitação Administrativa</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Listagem */}
        <Card className="rounded-[22px] border-slate-200">
          <CardHeader><CardTitle>Histórico de Protocolos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">Carregando solicitações...</p>
            ) : solicitacoes.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">Nenhuma solicitação encontrada.</p>
                <p className="text-xs text-slate-400">Você pode abrir um novo pedido a qualquer momento.</p>
              </div>
            ) : (
              solicitacoes.map((sol) => {
                const stInfo = statusBadges[sol.status] ?? { label: sol.status, color: 'bg-slate-100 text-slate-600' };
                return (
                  <div
                    key={sol.id}
                    onClick={() => abrirDetalhe(sol)}
                    className="rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:bg-slate-50/50 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {sol.protocolo}
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {tipoLabels[sol.tipo] ?? sol.tipo}
                        </Badge>
                      </div>
                      <Badge className={`text-[12px] border ${stInfo.color}`}>
                        {stInfo.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900">{sol.assunto}</p>
                      {sol.escala_titulo && (
                        <p className="text-xs text-amber-700 mt-0.5">Escala vinculada: {sol.escala_titulo}</p>
                      )}
                      {sol.descricao && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{sol.descricao}</p>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Criado em {formatDateTime(sol.created_at)}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Nova Solicitação */}
      <ResponsiveDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        title="Nova Solicitação"
        description="Abra um novo protocolo diretamente para a gestão da Guarda Municipal."
        footer={
          <div className="flex gap-2 w-full">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button type="submit" form="nova-solicitacao-form" className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700">Criar Protocolo</Button>
          </div>
        }
      >
        <form id="nova-solicitacao-form" onSubmit={handleCriarSolicitacao} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Tipo de Solicitação</Label>
            <Select value={novaForm.tipo} onValueChange={(val: GuardaSolicitacaoTipo) => setNovaForm((c) => ({ ...c, tipo: val }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ESCLARECIMENTO_ESCALA">Esclarecimento sobre Escala</SelectItem>
                <SelectItem value="CORRECAO_ESCALA">Correção de Escala</SelectItem>
                <SelectItem value="TROCA_SERVICO">Troca de Serviço</SelectItem>
                <SelectItem value="PROBLEMA_EQUIPAMENTO">Problema com Equipamento</SelectItem>
                <SelectItem value="ATUALIZACAO_CADASTRAL">Atualização Cadastral</SelectItem>
                <SelectItem value="SOLICITACAO_ADMINISTRATIVA">Solicitação Administrativa</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Assunto</Label>
            <Input className="rounded-xl" placeholder="Ex: Solicitação de ajuste no posto de serviço" value={novaForm.assunto} onChange={(e) => setNovaForm((c) => ({ ...c, assunto: e.target.value }))} required />
          </div>
          <div className="grid gap-2">
            <Label>Descrição detalhada</Label>
            <Textarea className="rounded-xl min-h-[100px]" placeholder="Descreva os detalhes do seu pedido..." value={novaForm.descricao} onChange={(e) => setNovaForm((c) => ({ ...c, descricao: e.target.value }))} />
          </div>
        </form>
      </ResponsiveDialog>

      {/* Modal Detalhes & Linha do Tempo */}
      <ResponsiveDialog
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        title={selectedSolicitacao ? `Protocolo ${selectedSolicitacao.protocolo}` : 'Detalhes'}
        description={selectedSolicitacao?.assunto}
        footer={
          selectedSolicitacao && !['CONCLUIDA', 'CANCELADA', 'RECUSADA'].includes(selectedSolicitacao.status) ? (
            <div className="w-full flex justify-between gap-2">
              <Button type="button" variant="outline" className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleCancelar}>
                Cancelar Solicitação
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDetalheOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : undefined
        }
      >
        {detalheLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando linha do tempo...</p>
        ) : selectedSolicitacao ? (
          <div className="space-y-5 py-2">
            {/* Cabeçalho da Solicitação */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">{tipoLabels[selectedSolicitacao.tipo]}</span>
                <Badge className={`text-xs border ${statusBadges[selectedSolicitacao.status]?.color}`}>
                  {statusBadges[selectedSolicitacao.status]?.label}
                </Badge>
              </div>
              {selectedSolicitacao.escala_titulo && (
                <p className="text-xs text-amber-800 font-medium">Linked Escala: {selectedSolicitacao.escala_titulo}</p>
              )}
              {selectedSolicitacao.descricao && (
                <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80">{selectedSolicitacao.descricao}</p>
              )}
              <p className="text-[11px] text-slate-400">Aberto em {formatDateTime(selectedSolicitacao.created_at)}</p>
            </div>

            {/* Linha do Tempo de Interações */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Linha do Tempo & Interações</h4>
              <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                {interacoes.map((item) => (
                  <div key={item.id} className="relative pl-4">
                    <div className={`absolute -left-[13px] top-1 h-3 w-3 rounded-full border-2 border-white ${item.autor_tipo === 'GESTAO' ? 'bg-blue-600' : item.autor_tipo === 'GUARDA' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                    <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">
                          {item.autor_tipo === 'GESTAO' ? '🛡️ Gestão SMST' : item.autor_tipo === 'GUARDA' ? '👤 Você' : '⚙️ Sistema'}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(item.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.mensagem}</p>
                      {item.status_novo && item.status_novo !== item.status_anterior && (
                        <p className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">
                          Status atualizado para: {statusBadges[item.status_novo as GuardaSolicitacaoStatus]?.label ?? item.status_novo}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Caixa de Resposta / Interação */}
            {!['CONCLUIDA', 'CANCELADA', 'RECUSADA'].includes(selectedSolicitacao.status) && (
              <form onSubmit={handleEnviarInteracao} className="space-y-2 pt-2 border-t border-slate-200">
                <Label className="text-xs font-semibold text-slate-700">Adicionar informação / resposta</Label>
                <div className="flex gap-2">
                  <Textarea
                    className="rounded-xl min-h-[60px] text-sm"
                    placeholder="Digite sua resposta para a gestão..."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                  />
                  <Button type="submit" disabled={enviando || !mensagem.trim()} className="rounded-xl self-end h-10 px-4 bg-brand-600 hover:bg-brand-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </ResponsiveDialog>
    </GuardsLayout>
  );
}
