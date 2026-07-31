import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ordemServicoService } from '@/services/ordem-servico.service';
import { gerarPdfOrdemServico, imprimirPdfOrdemServico } from '@/utils/pdfOrdemServico';
import type { OrdemServico, OrdemServicoFormData, OrdemServicoStatus } from '@/types/ordem-servico.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  Send,
  XCircle,
  Archive,
  RefreshCw,
  Edit,
  Users,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Trash2,
} from 'lucide-react';

interface EquipeOption {
  id: string;
  nome: string;
}

interface ActionTooltipProps {
  label: string;
  description: string;
  children: ReactNode;
}

function ActionTooltip({ label, description, children }: ActionTooltipProps) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-[260px] rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-left shadow-lg"
      >
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function OrdensServicoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const isGuardPortal = location.pathname.startsWith('/admin/perfil-guardas');
  const isDemutran = location.pathname.startsWith('/admin/demutran');
  const sectorSlug = isDemutran ? 'demutran' : 'guarda-municipal';
  const isGestor = ['super_admin', 'gestor', 'admin_setor'].includes(profile?.papel || '') || !isGuardPortal;

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [buscaFilter, setBuscaFilter] = useState('');
  const [equipesList, setEquipesList] = useState<EquipeOption[]>([]);
  const [setorId, setSetorId] = useState<string | null>(null);

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [distribuicaoOpen, setDistribuicaoOpen] = useState(false);

  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();

  // Form State
  const [formData, setFormData] = useState<OrdemServicoFormData>({
    origem: 'Ofício',
    origem_outros: '',
    numero_documento_origem: '',
    assunto: '',
    data_execucao_inicio: new Date().toISOString().slice(0, 10),
    data_execucao_fim: '',
    hora_inicio: '08:00',
    hora_fim: '',
    ate_termino: false,
    descricao: '',
    local_execucao: '',
    ponto_apresentacao: '',
    observacoes: '',
    solicitante_nome: '',
    solicitante_orgao: '',
    solicitante_funcao: '',
    solicitante_telefone: '',
    solicitante_whatsapp: '',
    solicitante_email: '',
    equipes_ids: [],
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = await ordemServicoService.listar(
        statusFilter === 'TODOS' ? null : (statusFilter as OrdemServicoStatus),
        null,
        buscaFilter || null,
        setorId
      );
      setOrdens(data);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar Ordens de Serviço', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const carregarEquipes = async () => {
    if (isDemutran) return;
    try {
      const { data } = await supabase.from('guarda_equipes').select('id, nome').eq('ativo', true).order('nome');
      setEquipesList(data || []);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    let mounted = true;
    const rpcName = isDemutran ? 'get_demutran_setor_id' : 'get_guarda_municipal_setor_id';
    const resolverSetor = async () => {
      if (profile?.setor_slug === sectorSlug && profile?.setor_id) {
        if (mounted) setSetorId(profile.setor_id);
        return;
      }
      const { data, error } = await supabase.rpc(rpcName);
      if (!error && data && mounted) setSetorId(data as string);
    };
    resolverSetor();
    return () => {
      mounted = false;
    };
  }, [isDemutran, sectorSlug, profile?.setor_slug, profile?.setor_id]);

  useEffect(() => {
    carregarDados();
    carregarEquipes();
  }, [statusFilter, buscaFilter, setorId, isDemutran]);

  const handleOpenForm = (os?: OrdemServico) => {
    if (os) {
      setFormData({
        id: os.id,
        origem: os.origem || 'Ofício',
        origem_outros: os.origem_outros || '',
        numero_documento_origem: os.numero_documento_origem || '',
        assunto: os.assunto || '',
        data_execucao_inicio: os.data_execucao_inicio || new Date().toISOString().slice(0, 10),
        data_execucao_fim: os.data_execucao_fim || '',
        hora_inicio: os.hora_inicio || '08:00',
        hora_fim: os.hora_fim || '',
        ate_termino: os.ate_termino || false,
        descricao: os.descricao || '',
        local_execucao: os.local_execucao || '',
        ponto_apresentacao: os.ponto_apresentacao || '',
        observacoes: os.observacoes || '',
        solicitante_nome: os.solicitante_nome || '',
        solicitante_orgao: os.solicitante_orgao || '',
        solicitante_funcao: os.solicitante_funcao || '',
        solicitante_telefone: os.solicitante_telefone || '',
        solicitante_whatsapp: os.solicitante_whatsapp || '',
        solicitante_email: os.solicitante_email || '',
        equipes_ids: (os.equipes || []).map((e) => e.equipe_id),
      });
    } else {
      setFormData({
        origem: 'Ofício',
        origem_outros: '',
        numero_documento_origem: '',
        assunto: '',
        data_execucao_inicio: new Date().toISOString().slice(0, 10),
        data_execucao_fim: '',
        hora_inicio: '08:00',
        hora_fim: '',
        ate_termino: false,
        descricao: '',
        local_execucao: '',
        ponto_apresentacao: '',
        observacoes: '',
        solicitante_nome: '',
        solicitante_orgao: '',
        solicitante_funcao: '',
        solicitante_telefone: '',
        solicitante_whatsapp: '',
        solicitante_email: '',
        equipes_ids: [],
      });
    }
    setFormOpen(true);
  };

  const handleSalvarRascunho = async () => {
    if (!formData.assunto || !formData.descricao || !formData.local_execucao) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha Assunto, Descrição da Missão e Local de Execução.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await ordemServicoService.salvarRascunho(formData, setorId);
      toast({ title: 'Rascunho salvo', description: 'A Ordem de Serviço foi salva com sucesso.' });
      setFormOpen(false);
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublicar = async (osId: string) => {
    setSubmitting(true);
    try {
      const res = await ordemServicoService.publicar(osId);
      toast({ title: 'Ordem de Serviço Publicada!', description: `Gerado o número ${res.numero_formatado}. Notificações enviadas.` });
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao publicar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubstituir = async (os: OrdemServico) => {
    setSubmitting(true);
    try {
      const res = await ordemServicoService.substituir(os.id);
      toast({ title: 'Nova Versão Criada!', description: `Ordem de Serviço substituída pela versão ${res.versao}.` });
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao substituir', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!selectedOS || !motivoCancelamento.trim()) {
      toast({ title: 'Motivo obrigatório', description: 'Informe o motivo do cancelamento.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await ordemServicoService.cancelar(selectedOS.id, motivoCancelamento);
      toast({ title: 'Ordem de Serviço Cancelada', description: 'Cancelamento registrado com sucesso.' });
      setCancelarOpen(false);
      setMotivoCancelamento('');
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao cancelar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArquivar = async (osId: string) => {
    try {
      await ordemServicoService.arquivar(osId);
      toast({ title: 'Ordem de Serviço Arquivada' });
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao arquivar', description: e.message, variant: 'destructive' });
    }
  };

  const handleExcluirRascunho = async (os: OrdemServico) => {
    const confirmed = await confirm({
      title: 'Excluir rascunho da O.S.',
      description: `Excluir definitivamente o rascunho "${os.assunto}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, excluir',
    });
    if (!confirmed) return;
    try {
      await ordemServicoService.excluirRascunho(os.id);
      toast({ title: 'Rascunho excluído', description: 'A Ordem de Serviço em rascunho foi excluída.' });
      carregarDados();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir rascunho', description: e.message, variant: 'destructive' });
    }
  };

  const handleVerDetalhes = async (os: OrdemServico) => {
    setSelectedOS(os);
    setDetalhesOpen(true);
    // Registrar visualização automaticamente se for responsável
    try {
      await ordemServicoService.registrarAcesso(os.id, 'VISUALIZACAO');
    } catch {
      // silent
    }
  };

  const handleBaixarPdf = async (os: OrdemServico) => {
    await gerarPdfOrdemServico(os);
    try {
      await ordemServicoService.registrarAcesso(os.id, 'DOWNLOAD');
    } catch {
      // silent
    }
  };

  const handleImprimir = async (os: OrdemServico) => {
    await imprimirPdfOrdemServico(os);
    try {
      await ordemServicoService.registrarAcesso(os.id, 'IMPRESSAO');
    } catch {
      // silent
    }
  };

  const statusBadge = (status: OrdemServicoStatus) => {
    switch (status) {
      case 'RASCUNHO':
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">Rascunho</Badge>;
      case 'PUBLICADA':
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Publicada</Badge>;
      case 'SUBSTITUIDA':
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Substituída</Badge>;
      case 'CANCELADA':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'ARQUIVADA':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-800">Arquivada</Badge>;
    }
  };

  const toggleEquipe = (id: string) => {
    setFormData((prev) => {
      const exists = prev.equipes_ids.includes(id);
      return {
        ...prev,
        equipes_ids: exists ? prev.equipes_ids.filter((e) => e !== id) : [...prev.equipes_ids, id],
      };
    });
  };

  const content = (
    <div className="space-y-6 pb-20">
      {/* Cabeçalho Mobile (espelha as demais telas) */}
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
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Ordens de Serviço</h1>
        </div>
      </div>

      {/* Top Banner (desktop) */}
      <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/80 sm:text-xs">
              {isDemutran ? 'Departamento Municipal de Trânsito — Demutran' : 'Guarda Municipal de Canindé'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Ordens de Serviço (O.S.)</h1>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">
              {isDemutran
                ? 'Gestão, emissão oficial e auditoria de cumprimento operacional.'
                : 'Gestão, emissão oficial, distribuição para equipes e auditoria de cumprimento operacional.'}
            </p>
          </div>
          {isGestor && (
            <Button
              onClick={() => handleOpenForm()}
              className="gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md self-start lg:self-center"
            >
              <Plus className="h-4 w-4 text-brand-600" /> Nova Ordem de Serviço
            </Button>
          )}
        </div>
      </section>

      {/* Botão Flutuante FAB para Mobile se for Gestor */}
      {isGestor && (
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="fixed bottom-[calc(5.5rem+var(--safe-area-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl lg:hidden active:scale-95 transition-all"
          aria-label="Nova Ordem de Serviço"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {/* Filtros */}
      <Card className="rounded-[22px] border-slate-200">
        <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs text-slate-500 mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Número, assunto ou local..."
                value={buscaFilter}
                onChange={(e) => setBuscaFilter(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="TODOS">Todos os status</SelectItem>
                <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                <SelectItem value="PUBLICADA">Publicada</SelectItem>
                <SelectItem value="SUBSTITUIDA">Substituída</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="ARQUIVADA">Arquivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ordens de Serviço */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : ordens.length === 0 ? (
        <Card className="rounded-[22px] p-8 text-center border-dashed border-slate-300">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma Ordem de Serviço encontrada</h3>
          <p className="text-xs text-slate-500 mt-1">Não há ordens cadastradas com os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ordens.map((os) => {
            const numFmt = os.numero_formatado || `Rascunho ${os.id.slice(0, 6)}`;
            return (
              <Card key={os.id} className="rounded-[22px] border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{numFmt}</span>
                        {statusBadge(os.status)}
                        {os.versao > 1 && (
                          <Badge variant="outline" className="text-[10px] font-bold text-sky-700 bg-sky-50 border-sky-200">
                            Versão {os.versao}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400">Origem: {os.origem}</span>
                      </div>

                      <h3 className="text-base font-bold text-brand-700">{os.assunto}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{os.descricao}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Execução: {new Date(os.data_execucao_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{os.hora_inicio} hs {os.ate_termino ? '(Até término)' : os.hora_fim ? `- ${os.hora_fim}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{os.local_execucao}</span>
                        </div>
                      </div>

                      {/* Equipes vinculadas */}
                      {!isDemutran && os.equipes && os.equipes.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {os.equipes.map((eq) => (
                              <span key={eq.equipe_id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {eq.equipe_nome}
                                {eq.primeira_visualizacao_em ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" title="Visualizado pelo responsável" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500" title="Aguardando visualização" />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações em linha única horizontal */}
                    <div className="flex flex-row items-center flex-wrap justify-end gap-1.5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {/* Botão Ver Detalhes - Apenas Ícone */}
                      <ActionTooltip label="Ver Detalhes" description="Abrir a Ordem de Serviço para consultar todas as informações e o histórico.">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerDetalhes(os)}
                          className="h-9 w-9 p-0 grid place-items-center rounded-xl hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4 text-slate-700" />
                        </Button>
                      </ActionTooltip>

                      {/* Ações de Rascunho */}
                      {isGestor && os.status === 'RASCUNHO' && (
                        <>
                          {/* Editar - Apenas Ícone */}
                          <ActionTooltip label="Editar Rascunho" description="Alterar as informações deste rascunho antes de publicar.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenForm(os)}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Editar Rascunho"
                            >
                              <Edit className="h-4 w-4 text-slate-700" />
                            </Button>
                          </ActionTooltip>
                          {/* Excluir Rascunho - Apenas Ícone */}
                          <ActionTooltip label="Excluir Rascunho" description="Remover permanentemente este rascunho. Esta ação não pode ser desfeita.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExcluirRascunho(os)}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Excluir Rascunho"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          {/* Publicar - Ícone + Nome */}
                          <Button
                            size="sm"
                            onClick={() => handlePublicar(os.id)}
                            disabled={submitting}
                            className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3"
                          >
                            <Send className="h-3.5 w-3.5" /> Publicar
                          </Button>
                        </>
                      )}

                      {/* Ações de O.S. Publicada */}
                      {os.status !== 'RASCUNHO' && (
                        <>
                          {/* Baixar PDF - Apenas Ícone */}
                          <ActionTooltip label="Baixar PDF" description="Gerar e baixar o arquivo PDF oficial da Ordem de Serviço.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBaixarPdf(os)}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl text-brand-700 hover:bg-brand-50 hover:text-brand-800"
                              aria-label="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          {/* Imprimir - Apenas Ícone */}
                          <ActionTooltip label="Imprimir" description="Abrir a versão para impressão da Ordem de Serviço.">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleImprimir(os)}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                              aria-label="Imprimir"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                        </>
                      )}

                      {/* Ações Adicionais do Gestor em O.S. Publicada */}
                      {!isDemutran && isGestor && os.status === 'PUBLICADA' && (
                        <>
                          {/* Rastreamento de Distribuição */}
                          <ActionTooltip label="Consultar Distribuição" description="Ver quais equipes receberam a O.S. e quem já visualizou.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedOS(os); setDistribuicaoOpen(true); }}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                              aria-label="Consultar Distribuição"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          {/* Substituir */}
                          <ActionTooltip label="Substituir por Nova Versão" description="Criar uma nova versão corrigida da O.S. em rascunho.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubstituir(os)}
                              disabled={submitting}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                              aria-label="Substituir por Nova Versão"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          {/* Cancelar */}
                          <ActionTooltip label="Cancelar Ordem de Serviço" description="Registrar o cancelamento da O.S. informando o motivo.">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedOS(os); setCancelarOpen(true); }}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Cancelar Ordem de Serviço"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          {/* Arquivar */}
                          <ActionTooltip label="Arquivar" description="Mover a O.S. para o histórico de ordens arquivadas.">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArquivar(os.id)}
                              className="h-9 w-9 p-0 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Arquivar"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal / Form de Criação / Edição de Rascunho */}
      <ResponsiveDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formData.id ? 'Editar Rascunho da O.S.' : 'Nova Ordem de Serviço'}
        description="Preencha os campos operacionais para criar ou atualizar a Ordem de Serviço."
        confirmLabel="Salvar Rascunho"
        onConfirm={handleSalvarRascunho}
        confirmLoading={submitting}
      >
        <div className="space-y-4 py-2 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Origem da O.S. *</Label>
              <Select value={formData.origem} onValueChange={(val) => setFormData({ ...formData, origem: val })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Ofício">Ofício</SelectItem>
                  <SelectItem value="Memorando">Memorando</SelectItem>
                  <SelectItem value="Processo Administrativo">Processo Administrativo</SelectItem>
                  <SelectItem value="Comunicação Interna (CI)">Comunicação Interna (CI)</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Solicitação Verbal">Solicitação Verbal</SelectItem>
                  <SelectItem value="Determinação Superior">Determinação Superior</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.origem === 'Outro' && (
              <div>
                <Label className="text-xs font-semibold">Qual a origem?</Label>
                <Input
                  value={formData.origem_outros || ''}
                  onChange={(e) => setFormData({ ...formData, origem_outros: e.target.value })}
                  placeholder="Especifique a origem..."
                  className="rounded-xl mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold">Número do Documento de Origem</Label>
              <Input
                value={formData.numero_documento_origem || ''}
                onChange={(e) => setFormData({ ...formData, numero_documento_origem: e.target.value })}
                placeholder="Ex: Ofício nº 154/2026"
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Assunto / Título da Missão *</Label>
            <Input
              value={formData.assunto}
              onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
              placeholder="Ex: Operação Feira Livre e Controle de Tráfego"
              className="rounded-xl mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Data Inicial de Execução *</Label>
              <Input
                type="date"
                value={formData.data_execucao_inicio}
                onChange={(e) => setFormData({ ...formData, data_execucao_inicio: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Data Final (opcional)</Label>
              <Input
                type="date"
                value={formData.data_execucao_fim || ''}
                onChange={(e) => setFormData({ ...formData, data_execucao_fim: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Horário Início *</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Horário Término</Label>
              <Input
                type="time"
                disabled={formData.ate_termino}
                value={formData.hora_fim || ''}
                onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                className="rounded-xl mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="ate_termino"
                  checked={formData.ate_termino}
                  onCheckedChange={(checked) => setFormData({ ...formData, ate_termino: !!checked })}
                />
                <Label htmlFor="ate_termino" className="text-xs text-slate-600 cursor-pointer">
                  Até o término do serviço
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Local de Execução *</Label>
            <Input
              value={formData.local_execucao}
              onChange={(e) => setFormData({ ...formData, local_execucao: e.target.value })}
              placeholder="Ex: Praça Cruz das Almas / Centro Comercial"
              className="rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Ponto de Apresentação</Label>
            <Input
              value={formData.ponto_apresentacao || ''}
              onChange={(e) => setFormData({ ...formData, ponto_apresentacao: e.target.value })}
              placeholder={isDemutran ? 'Ex: Sede do Demutran às 07:30' : 'Ex: Sede da Guarda Municipal às 07:30'}
              className="rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Descrição Detalhada da Missão *</Label>
            <Textarea
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o objetivo da operação e procedimentos a serem adotados..."
              className="rounded-xl mt-1"
            />
          </div>

          {/* Seleção de Equipes */}
          {!isDemutran && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">Equipes Destinatárias</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                {equipesList.map((eq) => (
                  <div key={eq.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`eq_${eq.id}`}
                      checked={formData.equipes_ids.includes(eq.id)}
                      onCheckedChange={() => toggleEquipe(eq.id)}
                    />
                    <Label htmlFor={`eq_${eq.id}`} className="text-xs text-slate-700 cursor-pointer truncate">
                      {eq.nome}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solicitante */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dados do Solicitante</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Solicitante</Label>
                <Input
                  value={formData.solicitante_nome || ''}
                  onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })}
                  placeholder="Nome completo"
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Órgão / Instituição</Label>
                <Input
                  value={formData.solicitante_orgao || ''}
                  onChange={(e) => setFormData({ ...formData, solicitante_orgao: e.target.value })}
                  placeholder="Ex: Secretaria de Cultura"
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Função / Cargo</Label>
                <Input
                  value={formData.solicitante_funcao || ''}
                  onChange={(e) => setFormData({ ...formData, solicitante_funcao: e.target.value })}
                  placeholder="Ex: Coordenador de Eventos"
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone de Contato</Label>
                <Input
                  value={formData.solicitante_telefone || ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let masked = digits;
                    if (digits.length <= 2) masked = digits ? `(${digits}` : '';
                    else if (digits.length <= 6) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                    else if (digits.length <= 10) masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                    else masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                    setFormData({ ...formData, solicitante_telefone: masked });
                  }}
                  placeholder="(88) 99999-9999"
                  maxLength={15}
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={formData.solicitante_whatsapp || ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let masked = digits;
                    if (digits.length <= 2) masked = digits ? `(${digits}` : '';
                    else if (digits.length <= 6) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                    else if (digits.length <= 10) masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                    else masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                    setFormData({ ...formData, solicitante_whatsapp: masked });
                  }}
                  placeholder="(88) 99999-9999"
                  maxLength={15}
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">E-mail do Solicitante</Label>
                <Input
                  type="email"
                  value={formData.solicitante_email || ''}
                  onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value.toLowerCase().trim() })}
                  placeholder="exemplo@orgao.gov.br"
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Observações Operacionais</Label>
            <Textarea
              rows={2}
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Orientações adicionais de logística, armamento ou rádio comunicação..."
              className="rounded-xl mt-1"
            />
          </div>
        </div>
      </ResponsiveDialog>

      {/* Modal de Detalhes da O.S. */}
      {selectedOS && (
        <ResponsiveDialog
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          title={selectedOS.numero_formatado || 'Detalhes da Ordem de Serviço'}
          description={`Assunto: ${selectedOS.assunto}`}
        >
          <div className="space-y-4 py-2 text-left">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
              {statusBadge(selectedOS.status)}
              <span className="text-xs text-slate-500">Origem: <strong>{selectedOS.origem}</strong></span>
              {selectedOS.numero_documento_origem && (
                <span className="text-xs text-slate-500">Doc. Origem: <strong>{selectedOS.numero_documento_origem}</strong></span>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase">Descrição da Missão</h4>
              <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{selectedOS.descricao}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400 block">Data de Execução</span>
                <span className="font-semibold text-slate-800">{new Date(selectedOS.data_execucao_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Horário</span>
                <span className="font-semibold text-slate-800">{selectedOS.hora_inicio} hs {selectedOS.ate_termino ? '(Até término)' : ''}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Local</span>
                <span className="font-semibold text-slate-800">{selectedOS.local_execucao}</span>
              </div>
            </div>

            {selectedOS.solicitante_nome && (
              <div className="border-t border-slate-100 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Solicitante</h4>
                <p className="text-xs text-slate-700 mt-1">
                  <strong>{selectedOS.solicitante_nome}</strong> ({selectedOS.solicitante_orgao})
                </p>
              </div>
            )}

            {/* Equipes */}
            {!isDemutran && selectedOS.equipes && selectedOS.equipes.length > 0 && (
              <div className="border-t border-slate-100 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Equipes Destinatárias</h4>
                <div className="space-y-1">
                  {selectedOS.equipes.map((eq) => (
                    <div key={eq.equipe_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100">
                      <span className="font-bold text-slate-800">{eq.equipe_nome}</span>
                      <span className="text-slate-500">
                        {eq.primeira_visualizacao_em
                          ? `Visto em ${new Date(eq.primeira_visualizacao_em).toLocaleString('pt-BR')}`
                          : 'Aguardando visualização'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedOS.status !== 'RASCUNHO' && (
              <div className="flex gap-2 pt-3">
                <Button onClick={() => handleBaixarPdf(selectedOS)} className="flex-1 gap-2 rounded-xl bg-brand-600 text-white">
                  <Download className="h-4 w-4" /> Baixar PDF Oficial
                </Button>
              </div>
            )}
          </div>
        </ResponsiveDialog>
      )}

      {/* Modal de Cancelamento */}
      <ResponsiveDialog
        open={cancelarOpen}
        onOpenChange={setCancelarOpen}
        title="Cancelar Ordem de Serviço"
        description="Esta ação registrará o motivo e notificará os responsáveis das equipes."
        confirmLabel="Confirmar Cancelamento"
        onConfirm={handleConfirmarCancelamento}
        confirmLoading={submitting}
      >
        <div className="space-y-3 py-2 text-left">
          <Label className="text-xs font-semibold">Motivo do Cancelamento *</Label>
          <Textarea
            rows={3}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Informe a justificativa administrativa para o cancelamento desta O.S..."
            className="rounded-xl"
          />
        </div>
      </ResponsiveDialog>

      {/* Modal de Distribuição e Rastreabilidade */}
      {selectedOS && (
        <ResponsiveDialog
          open={distribuicaoOpen}
          onOpenChange={setDistribuicaoOpen}
          title={`Distribuição — ${selectedOS.numero_formatado}`}
          description="Histórico de visualizações, downloads e impressões pelas equipes."
        >
          <div className="space-y-3 py-2 text-left">
            {(selectedOS.equipes || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma equipe vinculada a esta Ordem de Serviço.</p>
            ) : (
              (selectedOS.equipes || []).map((eq) => (
                <div key={eq.equipe_id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{eq.equipe_nome}</span>
                    <span className="text-slate-500">Líder: {eq.lider_nome || 'Não definido'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Primeira Visualização:</span>
                      <strong>{eq.primeira_visualizacao_em ? new Date(eq.primeira_visualizacao_em).toLocaleString('pt-BR') : 'Pendente'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Download Realizado:</span>
                      <strong>{eq.baixada_em ? new Date(eq.baixada_em).toLocaleString('pt-BR') : 'Não'}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ResponsiveDialog>
      )}

      {confirmDialog}
    </div>
  );

  if (isGuardPortal) {
    return <GuardsLayout>{content}</GuardsLayout>;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
