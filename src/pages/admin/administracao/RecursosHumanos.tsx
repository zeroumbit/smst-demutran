import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Pencil, Plus, Search, Trash2, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type RhServidor = {
  id: string;
  matricula: string;
  nome_completo: string;
  cpf: string | null;
  cargo: string | null;
  lotacao: string | null;
  data_admissao: string | null;
  email: string | null;
  telefone: string | null;
  situacao: 'ativo' | 'afastado' | 'inativo';
  created_at: string;
};

type RhAfastamento = {
  id: string;
  servidor_id: string;
  tipo: 'ferias' | 'atestado' | 'licenca' | 'licenca_premio' | 'outro';
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
};

type RhPonto = {
  id: string;
  servidor_id: string;
  data_ponto: string;
  entrada: string | null;
  saida: string | null;
  horas_extras: number;
  observacao: string | null;
};

const afastamentoLabels: Record<RhAfastamento['tipo'], string> = {
  ferias: 'Férias',
  atestado: 'Atestado',
  licenca: 'Licença',
  licenca_premio: 'Licença-prêmio',
  outro: 'Outro',
};

const situacaoBadge: Record<RhServidor['situacao'], string> = {
  ativo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  afastado: 'bg-amber-100 text-amber-800 border-amber-200',
  inativo: 'bg-slate-100 text-slate-800 border-slate-200',
};

const initialServidor = {
  matricula: '',
  nome_completo: '',
  cpf: '',
  cargo: '',
  lotacao: '',
  data_admissao: '',
  email: '',
  telefone: '',
  situacao: 'ativo' as RhServidor['situacao'],
};

const initialAfastamento = {
  tipo: 'ferias' as RhAfastamento['tipo'],
  data_inicio: '',
  data_fim: '',
  observacao: '',
};

const initialPonto = {
  servidor_id: '',
  data_ponto: '',
  entrada: '',
  saida: '',
  horas_extras: '',
  observacao: '',
};

const RecursosHumanosPage = () => {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [servidores, setServidores] = useState<RhServidor[]>([]);
  const [afastamentos, setAfastamentos] = useState<RhAfastamento[]>([]);
  const [pontos, setPontos] = useState<RhPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tab, setTab] = useState('servidores');

  const [servidorDialogOpen, setServidorDialogOpen] = useState(false);
  const [servidorDialogMode, setServidorDialogMode] = useState<'create' | 'edit'>('create');
  const [servidorAlvo, setServidorAlvo] = useState<RhServidor | null>(null);
  const [formServidor, setFormServidor] = useState(initialServidor);

  const [afastamentoDialogOpen, setAfastamentoDialogOpen] = useState(false);
  const [afastamentoServidor, setAfastamentoServidor] = useState<RhServidor | null>(null);
  const [formAfastamento, setFormAfastamento] = useState(initialAfastamento);

  const [pontoDialogOpen, setPontoDialogOpen] = useState(false);
  const [pontoServidor, setPontoServidor] = useState<RhServidor | null>(null);
  const [formPonto, setFormPonto] = useState(initialPonto);

  const loadData = useCallback(async () => {
    const [servidoresResponse, afastamentosResponse, pontosResponse] = await Promise.all([
      supabase.from('rh_servidores').select('*').order('nome_completo'),
      supabase.from('rh_afastamentos').select('*').order('data_inicio', { ascending: false }).limit(200),
      supabase.from('rh_folhas_ponto').select('*').order('data_ponto', { ascending: false }).limit(300),
    ]);
    if (servidoresResponse.error) console.warn('Erro ao carregar servidores:', servidoresResponse.error.message);
    else setServidores((servidoresResponse.data || []) as RhServidor[]);
    if (afastamentosResponse.error) console.warn('Erro ao carregar afastamentos:', afastamentosResponse.error.message);
    else setAfastamentos((afastamentosResponse.data || []) as RhAfastamento[]);
    if (pontosResponse.error) console.warn('Erro ao carregar folhas de ponto:', pontosResponse.error.message);
    else setPontos((pontosResponse.data || []) as RhPonto[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredServidores = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return servidores;
    return servidores.filter(
      (s) =>
        s.nome_completo.toLowerCase().includes(termo) ||
        s.matricula.toLowerCase().includes(termo) ||
        (s.cargo || '').toLowerCase().includes(termo),
    );
  }, [servidores, busca]);

  const ativosCount = servidores.filter((s) => s.situacao === 'ativo').length;
  const afastadosCount = servidores.filter((s) => s.situacao === 'afastado').length;
  const afastamentosVigentes = afastamentos.filter((a) => new Date(a.data_fim) >= new Date()).length;

  const openCreate = () => {
    setServidorDialogMode('create');
    setServidorAlvo(null);
    setFormServidor(initialServidor);
    setServidorDialogOpen(true);
  };

  const openEdit = (servidor: RhServidor) => {
    setServidorDialogMode('edit');
    setServidorAlvo(servidor);
    setFormServidor({
      matricula: servidor.matricula,
      nome_completo: servidor.nome_completo,
      cpf: servidor.cpf || '',
      cargo: servidor.cargo || '',
      lotacao: servidor.lotacao || '',
      data_admissao: servidor.data_admissao || '',
      email: servidor.email || '',
      telefone: servidor.telefone || '',
      situacao: servidor.situacao,
    });
    setServidorDialogOpen(true);
  };

  const handleServidorSave = async () => {
    if (!formServidor.nome_completo.trim() || !formServidor.matricula.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Informe nome completo e matricula.', variant: 'destructive' });
      return;
    }
    const payload = {
      matricula: formServidor.matricula.trim(),
      nome_completo: formServidor.nome_completo.trim(),
      cpf: formServidor.cpf.trim() || null,
      cargo: formServidor.cargo.trim() || null,
      lotacao: formServidor.lotacao.trim() || null,
      data_admissao: formServidor.data_admissao || null,
      email: formServidor.email.trim() || null,
      telefone: formServidor.telefone.trim() || null,
      situacao: formServidor.situacao,
    };
    const { error } = servidorDialogMode === 'edit' && servidorAlvo
      ? await supabase.from('rh_servidores').update(payload).eq('id', servidorAlvo.id)
      : await supabase.from('rh_servidores').insert(payload);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: servidorDialogMode === 'edit' ? 'Servidor atualizado' : 'Servidor cadastrado',
      description: 'Os dados foram salvos.',
    });
    setServidorDialogOpen(false);
    setServidorAlvo(null);
    void loadData();
  };

  const handleDelete = async (servidor: RhServidor) => {
    const confirmed = await confirm({
      title: 'Excluir servidor',
      description: `Remover permanentemente ${servidor.nome_completo}? Os afastamentos vinculados serao removidos.`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_servidores').delete().eq('id', servidor.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Servidor excluido', description: `${servidor.nome_completo} foi removido.` });
    void loadData();
  };

  const openAfastamento = (servidor: RhServidor) => {
    setAfastamentoServidor(servidor);
    setFormAfastamento(initialAfastamento);
    setAfastamentoDialogOpen(true);
  };

  const handleAfastamentoSave = async () => {
    if (!afastamentoServidor) return;
    if (!formAfastamento.data_inicio || !formAfastamento.data_fim) {
      toast({ title: 'Campos obrigatorios', description: 'Informe as datas de inicio e fim.', variant: 'destructive' });
      return;
    }
    if (new Date(formAfastamento.data_fim) < new Date(formAfastamento.data_inicio)) {
      toast({ title: 'Datas invalidas', description: 'A data final deve ser maior ou igual a inicial.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rh_afastamentos').insert({
      servidor_id: afastamentoServidor.id,
      tipo: formAfastamento.tipo,
      data_inicio: formAfastamento.data_inicio,
      data_fim: formAfastamento.data_fim,
      observacao: formAfastamento.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    const { error: updateError } = await supabase
      .from('rh_servidores')
      .update({ situacao: 'afastado' })
      .eq('id', afastamentoServidor.id)
      .eq('situacao', 'ativo');
    if (updateError) console.warn('Nao foi possivel atualizar a situacao do servidor:', updateError.message);
    toast({ title: 'Afastamento registrado', description: 'O periodo de afastamento foi salvo.' });
    setAfastamentoDialogOpen(false);
    setAfastamentoServidor(null);
    void loadData();
  };

  const handleCancelarAfastamento = async (afastamento: RhAfastamento) => {
    const confirmed = await confirm({
      title: 'Remover afastamento',
      description: 'Excluir este registro de afastamento?',
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_afastamentos').delete().eq('id', afastamento.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Afastamento removido', description: 'O registro foi excluido.' });
    void loadData();
  };

  const afastamentosDoServidor = (servidorId: string) => afastamentos.filter((a) => a.servidor_id === servidorId);

  const openPonto = (servidor: RhServidor) => {
    setPontoServidor(servidor);
    setFormPonto({ ...initialPonto, servidor_id: servidor.id, data_ponto: new Date().toISOString().slice(0, 10) });
    setPontoDialogOpen(true);
  };

  const openPontoNovo = () => {
    if (servidores.length === 0) {
      toast({ title: 'Sem servidores', description: 'Cadastre servidores antes de registrar ponto.', variant: 'destructive' });
      return;
    }
    setPontoServidor(null);
    setFormPonto({ ...initialPonto, data_ponto: new Date().toISOString().slice(0, 10) });
    setPontoDialogOpen(true);
  };

  const handlePontoSave = async () => {
    const servidorId = formPonto.servidor_id || pontoServidor?.id;
    const servidorAlvoPonto = servidores.find((s) => s.id === servidorId);
    if (!servidorId || !servidorAlvoPonto) {
      toast({ title: 'Selecione o servidor', description: 'Escolha o servidor antes de salvar o ponto.', variant: 'destructive' });
      return;
    }
    if (!formPonto.data_ponto) {
      toast({ title: 'Campo obrigatorio', description: 'Informe a data do ponto.', variant: 'destructive' });
      return;
    }
    const horasExtras = Number(formPonto.horas_extras.replace(',', '.')) || 0;
    if (horasExtras < 0) {
      toast({ title: 'Horas invalidas', description: 'As horas extras nao podem ser negativas.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rh_folhas_ponto').insert({
      servidor_id: servidorId,
      data_ponto: formPonto.data_ponto,
      entrada: formPonto.entrada || null,
      saida: formPonto.saida || null,
      horas_extras: Number(horasExtras.toFixed(2)),
      observacao: formPonto.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao registrar ponto', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Ponto registrado', description: 'A jornada foi salva na folha de ponto.' });
    setPontoDialogOpen(false);
    setPontoServidor(null);
    void loadData();
  };

  const handleDeletePonto = async (ponto: RhPonto) => {
    const confirmed = await confirm({
      title: 'Excluir ponto',
      description: `Remover o registro de ponto de ${new Date(ponto.data_ponto).toLocaleDateString('pt-BR')}?`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_folhas_ponto').delete().eq('id', ponto.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Ponto excluido', description: 'O registro foi removido.' });
    void loadData();
  };

  const calcularHoras = (entrada: string | null, saida: string | null) => {
    if (!entrada || !saida) return null;
    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = saida.split(':').map(Number);
    if (eh === undefined || em === undefined || sh === undefined || sm === undefined) return null;
    const inicio = eh * 60 + em;
    const fim = sh * 60 + sm;
    let minutos = fim - inicio;
    if (minutos < 0) minutos += 24 * 60;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `${horas}h${resto > 0 ? String(resto).padStart(2, '0') : ''}`;
  };

  const pontosDoMes = useMemo(() => {
    const agora = new Date();
    const mesKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    return pontos.filter((p) => p.data_ponto.startsWith(mesKey));
  }, [pontos]);

  const totalPontosMes = pontosDoMes.length;
  const totalHorasExtrasMes = pontosDoMes.reduce((acc, p) => acc + Number(p.horas_extras || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 px-1 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Recursos Humanos</h1>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#0d9488_100%)] md:rounded-[34px] lg:block">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-100/70 md:text-[11px]">Administracao Central</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Recursos Humanos</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Cadastro de servidores e controle de afastamentos (ferias, atestados e licencas).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Servidores</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{servidores.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Total cadastrados</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Ativos</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{ativosCount}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Em atividade</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Afastados</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{afastadosCount}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Ferias/atestado/licenca</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Afast. vigentes</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{afastamentosVigentes}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Periodos em andamento</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="servidores">Servidores</TabsTrigger>
            <TabsTrigger value="ponto">Folha de Ponto</TabsTrigger>
            <TabsTrigger value="afastamentos">Afastamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="servidores" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, matricula ou cargo..."
                />
              </div>
              <Button onClick={openCreate} className="gap-2 rounded-2xl">
                <Plus className="h-4 w-4" />
                Cadastrar servidor
              </Button>
            </div>

            {loading ? (
              <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando servidores...</div>
            ) : filteredServidores.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum servidor encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {filteredServidores.map((servidor) => {
                  const afastamentosAtivosServidor = afastamentosDoServidor(servidor.id).filter(
                    (a) => new Date(a.data_fim) >= new Date(),
                  );
                  return (
                    <div key={servidor.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white">
                            <UserRoundCog className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-bold text-slate-900">{servidor.nome_completo}</p>
                              <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', situacaoBadge[servidor.situacao])}>
                                {servidor.situacao === 'ativo' ? 'Ativo' : servidor.situacao === 'afastado' ? 'Afastado' : 'Inativo'}
                              </Badge>
                              {afastamentosAtivosServidor.length > 0 && (
                                <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                  {afastamentosAtivosServidor.length} afastamento(s) vigente(s)
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-slate-500">
                              Matrícula {servidor.matricula}
                              {servidor.cargo ? ` · ${servidor.cargo}` : ''}
                              {servidor.lotacao ? ` · ${servidor.lotacao}` : ''}
                            </p>
                            {servidor.email && <p className="mt-0.5 text-[13px] text-slate-500">{servidor.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={() => openAfastamento(servidor)}>
                            <CalendarClock className="h-4 w-4" />
                            Afastamento
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-slate-600" onClick={() => openEdit(servidor)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-red-600" onClick={() => void handleDelete(servidor)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ponto" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-[22px] border border-slate-200/80 bg-white p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Registros do mes</p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">{totalPontosMes}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Jornadas lançadas</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Horas extras no mes</p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-amber-600">{totalHorasExtrasMes.toFixed(2)}h</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Acumulado do período</p>
              </div>
              <div className="flex items-end justify-end">
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={openPontoNovo}>
                  <CalendarClock className="h-4 w-4" />
                  Registrar ponto
                </Button>
              </div>
            </div>

            {pontos.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum registro de ponto. Registre a jornada de entrada/saida dos servidores.
              </div>
            ) : (
              <div className="space-y-2">
                {pontos.map((ponto) => {
                  const servidor = servidores.find((s) => s.id === ponto.servidor_id);
                  const horas = calcularHoras(ponto.entrada, ponto.saida);
                  return (
                    <div key={ponto.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{servidor?.nome_completo || 'Servidor removido'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(ponto.data_ponto).toLocaleDateString('pt-BR')}
                            {ponto.entrada ? ` · Entrada ${ponto.entrada}` : ''}
                            {ponto.saida ? ` · Saida ${ponto.saida}` : ''}
                            {horas ? ` · ${horas}` : ''}
                            {Number(ponto.horas_extras) > 0 ? ` · +${Number(ponto.horas_extras).toFixed(2)}h extras` : ''}
                            {ponto.observacao ? ` · ${ponto.observacao}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 self-start rounded-lg p-0 text-red-600 sm:self-auto" onClick={() => void handleDeletePonto(ponto)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="afastamentos" className="space-y-4">
            {afastamentos.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum afastamento registrado
              </div>
            ) : (
              <div className="space-y-3">
                {afastamentos.map((afastamento) => {
                  const servidor = servidores.find((s) => s.id === afastamento.servidor_id);
                  const vigente = new Date(afastamento.data_fim) >= new Date();
                  return (
                    <div key={afastamento.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold text-slate-900">{servidor?.nome_completo || 'Servidor removido'}</p>
                            <Badge variant="outline" className="rounded-full border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                              {afastamentoLabels[afastamento.tipo]}
                            </Badge>
                            {vigente && (
                              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                Vigente
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] text-slate-500">
                            {new Date(afastamento.data_inicio).toLocaleDateString('pt-BR')} até {new Date(afastamento.data_fim).toLocaleDateString('pt-BR')}
                            {afastamento.observacao ? ` · ${afastamento.observacao}` : ''}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 self-start rounded-xl text-[13px] font-semibold text-red-600 sm:self-auto" onClick={() => void handleCancelarAfastamento(afastamento)}>
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ResponsiveDialog
        open={servidorDialogOpen}
        onOpenChange={(open) => { if (!open) { setServidorDialogOpen(false); setServidorAlvo(null); } }}
        title={servidorDialogMode === 'edit' ? 'Editar servidor' : 'Cadastrar servidor'}
        description={servidorDialogMode === 'edit' ? servidorAlvo?.nome_completo || '' : 'Novo registro no quadro de Recursos Humanos.'}
        confirmLabel={servidorDialogMode === 'edit' ? 'Salvar' : 'Cadastrar'}
        onCancel={() => { setServidorDialogOpen(false); setServidorAlvo(null); }}
        onConfirm={() => void handleServidorSave()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={formServidor.nome_completo} onChange={(e) => setFormServidor({ ...formServidor, nome_completo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Matricula *</Label>
              <Input value={formServidor.matricula} onChange={(e) => setFormServidor({ ...formServidor, matricula: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={formServidor.cpf} onChange={(e) => setFormServidor({ ...formServidor, cpf: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={formServidor.cargo} onChange={(e) => setFormServidor({ ...formServidor, cargo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lotacao</Label>
              <Input value={formServidor.lotacao} onChange={(e) => setFormServidor({ ...formServidor, lotacao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de admissao</Label>
              <Input type="date" value={formServidor.data_admissao} onChange={(e) => setFormServidor({ ...formServidor, data_admissao: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formServidor.email} onChange={(e) => setFormServidor({ ...formServidor, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={formServidor.telefone} onChange={(e) => setFormServidor({ ...formServidor, telefone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Situacao</Label>
            <Select value={formServidor.situacao} onValueChange={(v) => setFormServidor({ ...formServidor, situacao: v as RhServidor['situacao'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={pontoDialogOpen}
        onOpenChange={(open) => { if (!open) { setPontoDialogOpen(false); setPontoServidor(null); } }}
        title="Registrar ponto"
        description={pontoServidor?.nome_completo || 'Jornada de entrada/saida'}
        confirmLabel="Registrar"
        onCancel={() => { setPontoDialogOpen(false); setPontoServidor(null); }}
        onConfirm={() => void handlePontoSave()}
      >
        <div className="space-y-4 py-2">
          {!pontoServidor && (
            <div className="space-y-2">
              <Label>Servidor *</Label>
              <Select value={formPonto.servidor_id} onValueChange={(v) => setFormPonto({ ...formPonto, servidor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o servidor" /></SelectTrigger>
                <SelectContent>
                  {servidores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={formPonto.data_ponto} onChange={(e) => setFormPonto({ ...formPonto, data_ponto: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Entrada</Label>
              <Input type="time" value={formPonto.entrada} onChange={(e) => setFormPonto({ ...formPonto, entrada: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Saida</Label>
              <Input type="time" value={formPonto.saida} onChange={(e) => setFormPonto({ ...formPonto, saida: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horas extras</Label>
              <Input inputMode="decimal" value={formPonto.horas_extras} onChange={(e) => setFormPonto({ ...formPonto, horas_extras: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observacao</Label>
            <Input value={formPonto.observacao} onChange={(e) => setFormPonto({ ...formPonto, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={afastamentoDialogOpen}
        onOpenChange={(open) => { if (!open) { setAfastamentoDialogOpen(false); setAfastamentoServidor(null); } }}
        title="Registrar afastamento"
        description={afastamentoServidor?.nome_completo || ''}
        confirmLabel="Registrar"
        onCancel={() => { setAfastamentoDialogOpen(false); setAfastamentoServidor(null); }}
        onConfirm={() => void handleAfastamentoSave()}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo de afastamento</Label>
            <Select value={formAfastamento.tipo} onValueChange={(v) => setFormAfastamento({ ...formAfastamento, tipo: v as RhAfastamento['tipo'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="atestado">Atestado</SelectItem>
                <SelectItem value="licenca">Licença</SelectItem>
                <SelectItem value="licenca_premio">Licença-prêmio</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data inicio</Label>
              <Input type="date" value={formAfastamento.data_inicio} onChange={(e) => setFormAfastamento({ ...formAfastamento, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data fim</Label>
              <Input type="date" value={formAfastamento.data_fim} onChange={(e) => setFormAfastamento({ ...formAfastamento, data_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observacao</Label>
            <Input value={formAfastamento.observacao} onChange={(e) => setFormAfastamento({ ...formAfastamento, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default RecursosHumanosPage;
