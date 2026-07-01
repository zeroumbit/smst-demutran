import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, ChevronRight, Clock, Eye, EyeOff, Hourglass, Plus, RefreshCcw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { IROOperacao, IROCandidatura, IROHoraManual, IROBancoHoras, IRONotificacao } from '@/types/admin';

type Section = 'operacoes' | 'candidaturas' | 'banco-horas' | 'notificacoes';

const TEMPO_SOLICITACAO_LABEL: Record<string, string> = {
  imediato: 'Imediato', '1h': '1 hora', '6h': '6 horas', '8h': '8 horas',
  '12h': '12 horas', '24h': '24 horas', '48h': '48 horas',
};

const STATUS_CANDIDATURA_VARIANT: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const NOTIFICACAO_TIPO_LABEL: Record<string, string> = {
  info: 'Info', sucesso: 'Sucesso', alerta: 'Alerta', erro: 'Erro', manual: 'Manual',
};

const NOTIFICACAO_TIPO_VARIANT: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  sucesso: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alerta: 'bg-amber-50 text-amber-700 border-amber-200',
  erro: 'bg-red-50 text-red-700 border-red-200',
  manual: 'bg-purple-50 text-purple-700 border-purple-200',
};

const sectionLabels: Record<Section, string> = {
  operacoes: 'Operações',
  candidaturas: 'Candidaturas',
  'banco-horas': 'Banco de Horas',
  notificacoes: 'Notificações',
};

const operacaoFormInitial = {
  nome: '', descricao: '', horario_previsto: '08:00',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: new Date().toISOString().slice(0, 10),
  vagas_por_dia: 1, horas_por_dia: 8, tempo_solicitacao: 'imediato',
};

const GuardaMunicipalIros = () => {
  const { setorId, profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('operacoes');
  const isGestor = profile?.papel === 'gestor' || profile?.papel === 'super_admin' || profile?.papel === 'admin_setor';

  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [candidaturas, setCandidaturas] = useState<IROCandidatura[]>([]);
  const [bancoHoras, setBancoHoras] = useState<IROBancoHoras[]>([]);
  const [notificacoes, setNotificacoes] = useState<IRONotificacao[]>([]);
  const [usuarios, setUsuarios] = useState<{ user_id: string; nome: string }[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');

  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [operacaoCandidaturas, setOperacaoCandidaturas] = useState<IROCandidatura[]>([]);

  const [operacaoDialogOpen, setOperacaoDialogOpen] = useState(false);
  const [operacaoForm, setOperacaoForm] = useState(operacaoFormInitial);
  const [editingOperacao, setEditingOperacao] = useState<IROOperacao | null>(null);

  const [candidaturaData, setCandidaturaData] = useState({ operacao_id: '', data_operacao: new Date().toISOString().slice(0, 10) });

  const loadData = async () => {
    setLoading(true);
    try {
      const baseFilter = setorId ? (q: any) => q.eq('setor_id', setorId) : (q: any) => q;

      const [opRes, candRes, bhRes, notifRes, userRes] = await Promise.all([
        baseFilter(supabase.from('iro_operacoes').select('*').order('data_inicio', { ascending: false })),
        supabase.from('iro_candidaturas').select('*, iro_operacoes!inner(nome)').order('created_at', { ascending: false }),
        supabase.from('iro_banco_horas').select('*').order('created_at', { ascending: false }),
        supabase.from('iro_notificacoes').select('*').order('created_at', { ascending: false }),
        supabase.from('perfis_usuarios').select('user_id, nome, sobrenome').eq('ativo', true),
      ]);

      setOperacoes((opRes.data || []) as IROOperacao[]);
      setCandidaturas((candRes.data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' })));
      setBancoHoras((bhRes.data || []) as IROBancoHoras[]);
      setNotificacoes((notifRes.data || []) as IRONotificacao[]);
      setUsuarios((userRes.data || []).map((u: any) => ({
        user_id: u.user_id,
        nome: [u.nome, u.sobrenome].filter(Boolean).join(' ') || 'Sem nome'
      })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [setorId]);

  const usuarioMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usuarios) m.set(u.user_id, u.nome);
    return m;
  }, [usuarios]);

  const minhasCandidaturas = useMemo(() => candidaturas.filter((c) => c.usuario_id === user?.id), [candidaturas, user?.id]);
  const minhasNotificacoes = useMemo(() => notificacoes.filter((n) => n.usuario_id === user?.id), [notificacoes, user?.id]);
  const notifNaoLidas = useMemo(() => minhasNotificacoes.filter((n) => !n.lida).length, [minhasNotificacoes]);
  const meuBancoHoras = useMemo(() => bancoHoras.find((b) => b.usuario_id === user?.id), [bancoHoras, user?.id]);

  const horasMes = useMemo(() => {
    const now = new Date();
    let total = 0;
    for (const c of candidaturas) {
      if (c.usuario_id === user?.id && ['confirmado', 'realizado'].includes(c.status)) {
        const d = new Date(c.data_operacao);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) total += c.horas_trabalhadas;
      }
    }
    return total;
  }, [candidaturas, user?.id]);

  const stats = useMemo(() => ({
    operacoesAtivas: operacoes.filter((o) => o.ativo).length,
    candidaturasMes: candidaturas.filter((c) => {
      const d = new Date(c.data_operacao);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    totalBancoHoras: bancoHoras.reduce((a, b) => a + b.horas_excedentes, 0),
    notifNaoLidas,
    horasMes,
  }), [operacoes, candidaturas, bancoHoras, notifNaoLidas, horasMes]);

  const filteredOperacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return operacoes.filter((o) => {
      if (term && !o.nome.toLowerCase().includes(term) && !(o.descricao || '').toLowerCase().includes(term)) return false;
      if (statusFilter === 'ativas' && !o.ativo) return false;
      if (statusFilter === 'inativas' && o.ativo) return false;
      return true;
    });
  }, [operacoes, search, statusFilter]);

  const filteredCandidaturas = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = isGestor ? candidaturas : minhasCandidaturas;
    return list.filter((c) => {
      if (term && !`${c.operacao_nome} ${usuarioMap.get(c.usuario_id) || ''}`.toLowerCase().includes(term)) return false;
      if (statusFilter !== 'todas' && c.status !== statusFilter) return false;
      return true;
    });
  }, [candidaturas, minhasCandidaturas, search, statusFilter, isGestor, usuarioMap]);

  const filteredBancoHoras = useMemo(() => {
    const list = isGestor ? bancoHoras : (meuBancoHoras ? [meuBancoHoras] : []);
    const term = search.trim().toLowerCase();
    return list.filter((b) => {
      if (term && !(usuarioMap.get(b.usuario_id) || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [bancoHoras, meuBancoHoras, search, isGestor, usuarioMap]);

  const filteredNotificacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return minhasNotificacoes.filter((n) => {
      if (term && !n.titulo.toLowerCase().includes(term) && !n.mensagem.toLowerCase().includes(term)) return false;
      if (statusFilter === 'lidas' && !n.lida) return false;
      if (statusFilter === 'nao-lidas' && n.lida) return false;
      return true;
    });
  }, [minhasNotificacoes, search, statusFilter]);

  const openOperacaoDetails = async (item: IROOperacao) => {
    setSelectedOperacao(item);
    const { data } = await supabase
      .from('iro_candidaturas')
      .select('*, iro_operacoes!inner(nome)')
      .eq('operacao_id', item.id)
      .order('created_at', { ascending: false });
    setOperacaoCandidaturas((data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' })));
  };

  const resetOperacaoDialog = () => {
    setEditingOperacao(null);
    setOperacaoForm(operacaoFormInitial);
    setOperacaoDialogOpen(false);
  };

  const openCreateOperacao = () => {
    setEditingOperacao(null);
    setOperacaoForm({ ...operacaoFormInitial, data_inicio: new Date().toISOString().slice(0, 10), data_fim: new Date().toISOString().slice(0, 10) });
    setOperacaoDialogOpen(true);
  };

  const openEditOperacao = (item: IROOperacao) => {
    setEditingOperacao(item);
    setOperacaoForm({
      nome: item.nome, descricao: item.descricao || '',
      horario_previsto: item.horario_previsto.slice(0, 5),
      data_inicio: item.data_inicio, data_fim: item.data_fim,
      vagas_por_dia: item.vagas_por_dia, horas_por_dia: item.horas_por_dia,
      tempo_solicitacao: item.tempo_solicitacao,
    });
    setOperacaoDialogOpen(true);
  };

  const handleSaveOperacao = async () => {
    if (!operacaoForm.nome || !operacaoForm.horario_previsto) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome e horário previsto.', variant: 'destructive' });
      return;
    }
    const payload = { setor_id: setorId, nome: operacaoForm.nome, descricao: operacaoForm.descricao || null, horario_previsto: operacaoForm.horario_previsto, data_inicio: operacaoForm.data_inicio, data_fim: operacaoForm.data_fim, vagas_por_dia: operacaoForm.vagas_por_dia, horas_por_dia: operacaoForm.horas_por_dia, tempo_solicitacao: operacaoForm.tempo_solicitacao };
    if (editingOperacao) {
      const { error } = await supabase.from('iro_operacoes').update(payload).eq('id', editingOperacao.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Operação atualizada' });
    } else {
      const { error } = await supabase.from('iro_operacoes').insert({ ...payload, created_by: profile?.perfil_id || null });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Operação criada' });
    }
    resetOperacaoDialog();
    void loadData();
  };

  const handleToggleAtiva = async (item: IROOperacao) => {
    const { error } = await supabase.from('iro_operacoes').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: item.ativo ? 'Operação desativada' : 'Operação ativada' });
    void loadData();
  };

  const handleCandidatar = async () => {
    if (!candidaturaData.operacao_id || !candidaturaData.data_operacao) {
      toast({ title: 'Selecione operação e data', variant: 'destructive' }); return;
    }
    const { data, error } = await supabase.rpc('candidatar_se_iro', { p_operacao_id: candidaturaData.operacao_id, p_usuario_id: user?.id, p_data: candidaturaData.data_operacao });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    const r = data as { sucesso: boolean; mensagem: string; total_mes?: number };
    if (r.sucesso) {
      toast({ title: 'Candidatura realizada!', description: r.total_mes ? `Total no mês: ${r.total_mes}h` : undefined });
      setSelectedOperacao(null);
      setOperacaoCandidaturas([]);
    } else {
      toast({ title: r.mensagem, variant: 'destructive' });
    }
    setCandidaturaData({ operacao_id: '', data_operacao: new Date().toISOString().slice(0, 10) });
    void loadData();
  };

  const handleCancelarCandidatura = async (item: IROCandidatura) => {
    const { error } = await supabase.from('iro_candidaturas').update({ status: 'cancelado' }).eq('id', item.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Candidatura cancelada' });
    if (selectedOperacao) await openOperacaoDetails(selectedOperacao);
    void loadData();
  };

  const handleMarcarLida = async (item: IRONotificacao) => {
    const { error } = await supabase.from('iro_notificacoes').update({ lida: !item.lida }).eq('id', item.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    void loadData();
  };

  const handleMarcarTodasLidas = async () => {
    const ids = minhasNotificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (!ids.length) return;
    const { error } = await supabase.from('iro_notificacoes').update({ lida: true }).in('id', ids);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `${ids.length} notificação(is) marcada(s) como lida(s)` });
    void loadData();
  };

  const sectionStatusOptions = useMemo(() => {
    if (section === 'operacoes') return [{ value: 'todas', label: 'Todas' }, { value: 'ativas', label: 'Ativas' }, { value: 'inativas', label: 'Inativas' }];
    if (section === 'candidaturas') return [{ value: 'todas', label: 'Todos' }, { value: 'confirmado', label: 'Confirmado' }, { value: 'realizado', label: 'Realizado' }, { value: 'cancelado', label: 'Cancelado' }];
    if (section === 'notificacoes') return [{ value: 'todas', label: 'Todas' }, { value: 'lidas', label: 'Lidas' }, { value: 'nao-lidas', label: 'Não lidas' }];
    return [{ value: 'todas', label: 'Todos' }];
  }, [section]);

  const renderOperacaoCard = (item: IROOperacao) => (
    <article key={item.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', item.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
              {item.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold bg-slate-50">
              {item.vagas_por_dia} vaga(s)/dia
            </Badge>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{item.nome}</h2>
            {item.descricao && <p className="text-sm text-slate-600 mt-1">{item.descricao}</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(item.data_inicio).toLocaleDateString('pt-BR')} - {new Date(item.data_fim).toLocaleDateString('pt-BR')}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{item.horario_previsto.slice(0, 5)}</span>
            <span className="flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" />{item.horas_por_dia}h/dia</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
          <div className="text-xs text-slate-500">{TEMPO_SOLICITACAO_LABEL[item.tempo_solicitacao] || item.tempo_solicitacao}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void openOperacaoDetails(item)}>
              Ver detalhes <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            {isGestor && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEditOperacao(item)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => void handleToggleAtiva(item)}>
                  {item.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );

  const renderCandidaturaCard = (item: IROCandidatura) => (
    <article key={item.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', STATUS_CANDIDATURA_VARIANT[item.status])}>
            {item.status}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{item.operacao_nome}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {usuarioMap.get(item.usuario_id) || '—'} &middot; {new Date(item.data_operacao).toLocaleDateString('pt-BR')} &middot; {item.horas_trabalhadas}h
          </p>
        </div>
        {item.usuario_id === user?.id && item.status !== 'cancelado' && (
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => void handleCancelarCandidatura(item)}>
            Cancelar
          </Button>
        )}
      </div>
    </article>
  );

  const renderBancoHorasCard = (item: IROBancoHoras) => (
    <article key={item.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">{usuarioMap.get(item.usuario_id) || '—'}</p>
          <p className="text-sm text-slate-500 mt-0.5">{item.descricao || item.origem || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-amber-600">{item.horas_excedentes}h</p>
          <p className="text-xs text-slate-500">excedentes</p>
        </div>
      </div>
    </article>
  );

  const renderNotificacaoCard = (item: IRONotificacao) => (
    <article key={item.id} className={cn('rounded-[26px] border bg-white p-5 shadow-sm', !item.lida && 'border-brand-200 bg-brand-50/40')}>
      <div className="flex items-start gap-4">
        <button onClick={() => void handleMarcarLida(item)} className={cn('shrink-0 rounded-lg border p-2 transition-colors', item.lida ? 'border-slate-200 text-slate-400' : 'border-brand-200 text-brand-600')}>
          {item.lida ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('font-semibold text-sm', !item.lida && 'text-brand-800')}>{item.titulo}</p>
            <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold px-2 py-0', NOTIFICACAO_TIPO_VARIANT[item.tipo])}>
              {NOTIFICACAO_TIPO_LABEL[item.tipo]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.mensagem}</p>
          <p className="text-xs text-slate-400 mt-2">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </article>
  );

  const renderSectionItems = () => {
    if (loading) return <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>;

    if (section === 'operacoes') {
      return filteredOperacoes.length ? filteredOperacoes.map(renderOperacaoCard) : <EmptyBox text="Nenhuma operação encontrada." />;
    }
    if (section === 'candidaturas') {
      return filteredCandidaturas.length ? filteredCandidaturas.map(renderCandidaturaCard) : <EmptyBox text="Nenhuma candidatura encontrada." />;
    }
    if (section === 'banco-horas') {
      return filteredBancoHoras.length ? filteredBancoHoras.map(renderBancoHorasCard) : <EmptyBox text="Nenhum registro no banco de horas." />;
    }
    if (section === 'notificacoes') {
      return filteredNotificacoes.length ? filteredNotificacoes.map(renderNotificacaoCard) : <EmptyBox text="Nenhuma notificação." />;
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[34px] font-black tracking-[-0.08em]">IRO</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">
                Integração de Recursos Operacionais — Operações, candidaturas, banco de horas e notificações.
              </p>
            </div>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void loadData()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Operações ativas" value={String(stats.operacoesAtivas)} icon={Calendar} />
            <StatCard label="Candidaturas no mês" value={String(stats.candidaturasMes)} icon={Users} />
            <StatCard label="Minhas horas no mês" value={`${stats.horasMes}h`} icon={Clock} />
            <StatCard label="Banco de horas" value={`${stats.totalBancoHoras}h`} icon={Hourglass} />
          </div>
        </section>

        <Card className="rounded-[24px] border-slate-200">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={
                  section === 'operacoes' ? 'Buscar operações...' :
                  section === 'candidaturas' ? 'Buscar candidaturas...' :
                  section === 'banco-horas' ? 'Buscar guardas...' :
                  'Buscar notificações...'
                } />
              </div>
              <div className="space-y-2">
                <Label>Filtrar</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectionStatusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-[26px] bg-slate-100/80 p-1.5">
            {(Object.entries(sectionLabels) as [Section, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setSection(key); setSearch(''); setStatusFilter('todas'); }}
                className={cn(
                  'rounded-[20px] px-4 py-2.5 text-sm font-bold tracking-[-0.02em] transition-all',
                  section === key
                    ? 'bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
                {key === 'notificacoes' && notifNaoLidas > 0 && (
                  <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] text-white">{notifNaoLidas}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {section === 'operacoes' && isGestor && (
              <Button onClick={openCreateOperacao}><Plus className="mr-2 h-4 w-4" />Nova Operação</Button>
            )}
            {section === 'notificacoes' && notifNaoLidas > 0 && (
              <Button variant="outline" size="sm" onClick={() => void handleMarcarTodasLidas()}>
                <Check className="mr-2 h-4 w-4" />Marcar todas lidas
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">{renderSectionItems()}</div>

        <ResponsiveDialog
          open={Boolean(selectedOperacao)}
          onOpenChange={(open) => { if (!open) { setSelectedOperacao(null); setOperacaoCandidaturas([]); } }}
          title={selectedOperacao?.nome || 'Detalhes da operação'}
          description={selectedOperacao ? `${new Date(selectedOperacao.data_inicio).toLocaleDateString('pt-BR')} - ${new Date(selectedOperacao.data_fim).toLocaleDateString('pt-BR')} • ${selectedOperacao.vagas_por_dia} vaga(s)/dia` : ''}
        >
          {selectedOperacao && (
            <div className="space-y-6 py-2">
              <section className="grid gap-4 md:grid-cols-2">
                <Info label="Horário" value={selectedOperacao.horario_previsto.slice(0, 5)} />
                <Info label="Horas por dia" value={`${selectedOperacao.horas_por_dia}h`} />
                <Info label="Tempo solicitação" value={TEMPO_SOLICITACAO_LABEL[selectedOperacao.tempo_solicitacao] || selectedOperacao.tempo_solicitacao} />
                <Info label="Status" value={selectedOperacao.ativo ? 'Ativa' : 'Inativa'} />
              </section>

              {selectedOperacao.descricao && (
                <section className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Descrição</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    {selectedOperacao.descricao}
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Candidatar-se</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={candidaturaData.data_operacao} onChange={(e) => setCandidaturaData((f) => ({ ...f, data_operacao: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setCandidaturaData((f) => ({ ...f, operacao_id: selectedOperacao.id }));
                        void handleCandidatar();
                      }}
                    >
                      Confirmar Candidatura
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Candidaturas ({operacaoCandidaturas.length})</h3>
                {operacaoCandidaturas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma candidatura para esta operação.
                  </div>
                ) : (
                  operacaoCandidaturas.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <strong>{usuarioMap.get(c.usuario_id) || '—'}</strong>
                          <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold px-2 py-0', STATUS_CANDIDATURA_VARIANT[c.status])}>
                            {c.status}
                          </Badge>
                          <span className="text-slate-500">{new Date(c.data_operacao).toLocaleDateString('pt-BR')} • {c.horas_trabalhadas}h</span>
                        </div>
                        {c.usuario_id === user?.id && c.status !== 'cancelado' && (
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 h-7 text-xs" onClick={() => void handleCancelarCandidatura(c)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={operacaoDialogOpen}
          onOpenChange={(open) => { if (!open) resetOperacaoDialog(); else setOperacaoDialogOpen(true); }}
          title={editingOperacao ? 'Editar Operação' : 'Nova Operação'}
          description="Defina os detalhes da operação IRO."
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da operação</Label>
              <Input value={operacaoForm.nome} onChange={(e) => setOperacaoForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Operação Verão" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={operacaoForm.descricao} onChange={(e) => setOperacaoForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Horário previsto</Label>
                <Input type="time" value={operacaoForm.horario_previsto} onChange={(e) => setOperacaoForm((f) => ({ ...f, horario_previsto: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tempo para solicitação</Label>
                <Select value={operacaoForm.tempo_solicitacao} onValueChange={(v) => setOperacaoForm((f) => ({ ...f, tempo_solicitacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPO_SOLICITACAO_LABEL).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data início</Label>
                <Input type="date" value={operacaoForm.data_inicio} onChange={(e) => setOperacaoForm((f) => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data fim</Label>
                <Input type="date" value={operacaoForm.data_fim} onChange={(e) => setOperacaoForm((f) => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Vagas por dia</Label>
                <Input type="number" min={1} value={operacaoForm.vagas_por_dia} onChange={(e) => setOperacaoForm((f) => ({ ...f, vagas_por_dia: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Horas por dia</Label>
                <Input type="number" min={0.5} step={0.5} value={operacaoForm.horas_por_dia} onChange={(e) => setOperacaoForm((f) => ({ ...f, horas_por_dia: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetOperacaoDialog}>Cancelar</Button>
              <Button onClick={() => void handleSaveOperacao()}>{editingOperacao ? 'Salvar' : 'Criar Operação'}</Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Calendar }) {
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
    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{text}</div>
  );
}

export default GuardaMunicipalIros;
