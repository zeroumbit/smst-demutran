import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, CarFront, CheckCircle, Clock, CreditCard, Eye, EyeOff, Home, KeyRound, LogOut, Printer, Save, ScrollText, Send, User, UserCircle, X, XCircle } from 'lucide-react';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';
import { TermsGate } from '@/components/shared/TermsGate';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { getConcessionarioFinancialCopy } from '@/lib/demutranConcessionarioFinanceiro';
import { printHtml } from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { maskCpf, maskPhone } from '@/lib/masks';
import type { DemutranConcessionario, DemutranConcessionarioNotificacao } from '@/types/admin';

const SESSION_KEY = 'demutran_concessionario_session';

const categoriaLabels: Record<DemutranConcessionario['categoria'], string> = {
  mototaxi: 'Moto-taxi',
  taxi: 'Taxi',
  carro_horario: 'Carro de horario',
  fretista: 'Fretista',
};

const categoriaIcons: Record<DemutranConcessionario['categoria'], string> = {
  mototaxi: '🏍️',
  taxi: '🚕',
  carro_horario: '🚗',
  fretista: '🚛',
};

const vencimentoLabels: Record<string, string> = {
  em_dia: 'Em dia',
  vencendo: 'Vencendo este mês',
  vencido: 'Vencido',
};

type PerfilEditavel = {
  titular_nome: string;
  cpf: string;
  endereco: string;
  cnh_numero: string;
  validade_cnh: string;
  atividade_remunerada: string;
  categoria_cnh: string;
  curso: string;
  inicio_atividade: string;
  motorista_auxiliar: string;
  cnh_auxiliar: string;
  validade_cnh_auxiliar: string;
  email_notificacao: string;
  telefone_notificacao: string;
  aceita_notificacoes: boolean;
  observacoes: string;
  novaSenha: string;
  confirmarNovaSenha: string;
};

const initialEdit: PerfilEditavel = {
  titular_nome: '',
  cpf: '',
  endereco: '',
  cnh_numero: '',
  validade_cnh: '',
  atividade_remunerada: '',
  categoria_cnh: '',
  curso: '',
  inicio_atividade: '',
  motorista_auxiliar: '',
  cnh_auxiliar: '',
  validade_cnh_auxiliar: '',
  email_notificacao: '',
  telefone_notificacao: '',
  aceita_notificacoes: true,
  observacoes: '',
  novaSenha: '',
  confirmarNovaSenha: '',
};

type Tab = 'home' | 'taxas' | 'veiculos' | 'concessao' | 'perfil';

const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'taxas', label: 'Taxas', icon: CreditCard },
  { key: 'veiculos', label: 'Veículos', icon: CarFront },
  { key: 'concessao', label: 'Concessão', icon: ScrollText },
  { key: 'perfil', label: 'Perfil', icon: UserCircle },
];

const PublicConcessionarioDemutran = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAreaRoute = location.pathname === '/demutran/concessionario/area';
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<DemutranConcessionario | null>(null);
  const [notificacoes, setNotificacoes] = useState<DemutranConcessionarioNotificacao[]>([]);
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [editForm, setEditForm] = useState<PerfilEditavel>(initialEdit);
  const [tab, setTab] = useState<Tab>('home');
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [alteracoes, setAlteracoes] = useState<any[]>([]);
  const [veiculoForm, setVeiculoForm] = useState({ veiculo: '', placa: '', fabricacao: '', rota: '' });
  const [solicitandoVeiculo, setSolicitandoVeiculo] = useState(false);
  const [showConfirmTroca, setShowConfirmTroca] = useState(false);
  const [dismissedDebitoBanner, setDismissedDebitoBanner] = useState(false);

  // Estados para Taxas de Serviços
  const [taxas, setTaxas] = useState<any[]>([]);
  const [loadingTaxas, setLoadingTaxas] = useState(false);
  const [activeTabTaxas, setActiveTabTaxas] = useState<'demutran' | 'carro_horario' | 'mototaxi'>('demutran');

  const loadTaxasPublicas = async () => {
    setLoadingTaxas(true);
    try {
      const { data, error } = await supabase
        .from('demutran_taxas')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setTaxas(data);
      }
    } catch (e) {
      console.error('Erro ao carregar taxas públicas:', e);
    } finally {
      setLoadingTaxas(false);
    }
  };

  const loadAlteracoes = async (token: string) => {
    if (!token) return;
    const { data, error } = await (supabase as any).rpc('listar_minhas_alteracoes', { _session_token: token });
    if (!error && Array.isArray(data)) setAlteracoes(data);
    else setAlteracoes([]);
  };

  const syncEditForm = (data: DemutranConcessionario) => {
    setEditForm({
      titular_nome: data.titular_nome || '',
      cpf: data.cpf || '',
      endereco: data.endereco || '',
      cnh_numero: data.cnh_numero || '',
      validade_cnh: data.validade_cnh || '',
      atividade_remunerada: data.atividade_remunerada || '',
      categoria_cnh: data.categoria_cnh || '',
      curso: data.curso || '',
      inicio_atividade: data.inicio_atividade || '',
      motorista_auxiliar: data.motorista_auxiliar || '',
      cnh_auxiliar: data.cnh_auxiliar || '',
      validade_cnh_auxiliar: data.validade_cnh_auxiliar || '',
      email_notificacao: data.email_notificacao || '',
      telefone_notificacao: data.telefone_notificacao || '',
      aceita_notificacoes: data.aceita_notificacoes,
      observacoes: data.observacoes || '',
      novaSenha: '',
      confirmarNovaSenha: '',
    });
  };

  const loadPerfil = async (token: string) => {
    const [{ data: perfilData, error: perfilError }, { data: notData, error: notError }] = await Promise.all([
      (supabase as any).rpc('obter_perfil_concessionario', { _session_token: token }),
      (supabase as any).rpc('listar_notificacoes_concessionario', { _session_token: token }),
    ]);

    if (perfilError || !perfilData) {
      console.error('loadPerfil error:', perfilError, perfilData);
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      setPerfil(null);
      setNotificacoes([]);
      return false;
    }

    const profile = perfilData as DemutranConcessionario;
    setPerfil(profile);
    syncEditForm(profile);
    setNotificacoes(((notData || []) as DemutranConcessionarioNotificacao[]) ?? []);

    if (notError) {
      console.error(notError);
    }

    void loadAlteracoes(token);
    return true;
  };

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      setSessionToken(stored);
      void loadPerfil(stored);
    }
    void loadTaxasPublicas();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && sessionToken === null) return;
    if (stored && !isAreaRoute) {
      navigate('/demutran/concessionario/area', { replace: true });
    } else if (!stored && isAreaRoute) {
      navigate('/demutran/concessionario', { replace: true });
    }
  }, [sessionToken, isAreaRoute, navigate]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const email = loginForm.email.trim().toLowerCase();
    if (!email || !loginForm.senha.trim()) {
      toast({ title: 'Preencha e-mail e senha', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any).rpc('autenticar_concessionario', {
      _email: email,
      _senha: loginForm.senha,
    });
    setLoading(false);

    if (error) {
      console.error('Erro autenticar_concessionario:', error);
    }

    if (error || !data?.length) {
      toast({ title: 'Acesso nao autorizado', description: 'E-mail ou senha invalidos.', variant: 'destructive' });
      return;
    }

    const token = data[0].session_token as string;
    localStorage.setItem(SESSION_KEY, token);
    setSessionToken(token);
    setLoginForm({ email: '', senha: '' });
    const ok = await loadPerfil(token);
    if (!ok) {
      toast({ title: 'Erro ao carregar perfil', description: 'Tente novamente ou contate o suporte.', variant: 'destructive' });
      return;
    }
    navigate('/demutran/concessionario/area', { replace: true });
    toast({ title: 'Acesso liberado' });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionToken) return;
    if (editForm.novaSenha && editForm.novaSenha.length < 6) {
      toast({ title: 'Senha invalida', description: 'A nova senha precisa ter ao menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (editForm.novaSenha !== editForm.confirmarNovaSenha) {
      toast({ title: 'Senha nao confere', description: 'Confirme corretamente a nova senha.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { data, error } = await (supabase as any).rpc('atualizar_perfil_concessionario_publico', {
      _session_token: sessionToken,
      _titular_nome: editForm.titular_nome,
      _cpf: editForm.cpf,
      _endereco: editForm.endereco,
      _cnh_numero: editForm.cnh_numero,
      _validade_cnh: editForm.validade_cnh || null,
      _atividade_remunerada: editForm.atividade_remunerada,
      _categoria_cnh: editForm.categoria_cnh,
      _curso: editForm.curso,
      _inicio_atividade: editForm.inicio_atividade || null,
      _motorista_auxiliar: editForm.motorista_auxiliar,
      _cnh_auxiliar: editForm.cnh_auxiliar,
      _validade_cnh_auxiliar: editForm.validade_cnh_auxiliar || null,
      _observacoes: editForm.observacoes,
      _email_notificacao: editForm.email_notificacao,
      _telefone_notificacao: editForm.telefone_notificacao,
      _aceita_notificacoes: editForm.aceita_notificacoes,
      _nova_senha: editForm.novaSenha || null,
    });
    setSaving(false);

    if (error || data?.error) {
      toast({ title: 'Erro ao salvar', description: error?.message || data?.error || 'Falha ao atualizar cadastro.', variant: 'destructive' });
      return;
    }

    await loadPerfil(sessionToken);
    toast({ title: 'Cadastro atualizado' });
  };

  const handleSolicitarTrocaVeiculo = async () => {
    if (!sessionToken) return;
    if (!veiculoForm.veiculo.trim() || !veiculoForm.placa.trim()) {
      toast({ title: 'Preencha veículo e placa', variant: 'destructive' });
      return;
    }
    setSolicitandoVeiculo(true);
    const { data, error } = await (supabase as any).rpc('solicitar_troca_veiculo', {
      _session_token: sessionToken,
      _veiculo: veiculoForm.veiculo,
      _placa: veiculoForm.placa,
      _fabricacao: veiculoForm.fabricacao || null,
      _rota: veiculoForm.rota || null,
    });
    setSolicitandoVeiculo(false);

    if (error || data?.error) {
      toast({ title: 'Erro ao solicitar', description: error?.message || data?.error || 'Falha ao enviar solicitação.', variant: 'destructive' });
      return;
    }

    setShowConfirmTroca(false);
    setVeiculoForm({ veiculo: '', placa: '', fabricacao: '', rota: '' });
    await loadPerfil(sessionToken);
    toast({ title: 'Solicitação enviada', description: 'O DEMUTRAN analisará a troca de veículo e gerará a nova taxa de transferência.' });
  };

  const alteracaoStatusBadge: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-800 border-amber-200',
    aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejeitado: 'bg-red-100 text-red-800 border-red-200',
  };

  const alteracaoStatusLabel: Record<string, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setPerfil(null);
    setNotificacoes([]);
    setEditForm(initialEdit);
    navigate('/demutran/concessionario', { replace: true });
  };

  const handlePrint = () => {
    if (!perfil) return;
    const infoRows = [
      ['Categoria', categoriaLabels[perfil.categoria]],
      ['Grupo do taxi', perfil.taxi_grupo || '-'],
      ['Estacionamento', perfil.estacionamento || '-'],
      ['Numero da vaga / bata', perfil.numero_vaga || '-'],
      ['Nome', perfil.titular_nome || '-'],
      ['CPF', perfil.cpf || '-'],
      ['Placa', perfil.placa || '-'],
      ['Veiculo', perfil.veiculo || '-'],
      ['Ultimo alvara', perfil.ultimo_alvara || '-'],
      ['Exercicio', perfil.exercicio || '-'],
      ['Rota', perfil.rota || '-'],
      ['Ponto / distrito', perfil.ponto_referencia || '-'],
      ['CNH', perfil.cnh_numero || '-'],
      ['Validade CNH', perfil.validade_cnh || '-'],
    ];
    const rows = infoRows.map(([label, value]) =>
      `<tr><td style="border:1px solid #cbd5e1;padding:6px;">${label}</td><td style="border:1px solid #cbd5e1;padding:6px;">${value}</td></tr>`
    ).join('');
    const html = `
      <h3 style="font-size:18px;margin:0 0 4px;">${perfil.titular_nome || '-'}</h3>
      <p style="color:#475569;margin:0 0 12px;">${perfil.veiculo || ''} ${perfil.placa ? '• ' + perfil.placa : ''}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tr><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Campo</th><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Valor</th></tr>
        ${rows}
      </table>`;
    printHtml('Meu cadastro - ' + (perfil.titular_nome || perfil.placa || ''), html);
  };

  const unreadCount = useMemo(() => notificacoes.filter((item) => !item.lida_em).length, [notificacoes]);
  const financialStatus = useMemo(
    () => (perfil ? getConcessionarioFinancialCopy(perfil) : null),
    [perfil],
  );

  const markAsRead = async (id: string) => {
    if (!sessionToken) return;
    await (supabase as any).rpc('marcar_notificacao_concessionario_lida', {
      _session_token: sessionToken,
      _notificacao_id: id,
    });
    await loadPerfil(sessionToken);
  };

  return (
    <DemutranPortalLayout>
      {!perfil ? (
        <section className="bg-background py-10 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Login do Concessionário */}
              <div className="lg:col-span-5">
                <TermsGate title="Aceite os termos para acessar" description="Para acessar os dados do concessionario, voce precisa aceitar nossos Termos de Uso e Politica de Privacidade.">
                  <Card className="border-primary/10 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <KeyRound className="h-5 w-5 text-primary" />
                        Entrar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="concessionario-email">E-mail</Label>
                          <Input
                            id="concessionario-email"
                            type="email"
                            autoComplete="email"
                            value={loginForm.email}
                            maxLength={255}
                            onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                            placeholder="nome@exemplo.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Senha</Label>
                          <div className="relative">
                            <Input
                              type={showSenha ? 'text' : 'password'}
                              autoComplete="current-password"
                              value={loginForm.senha}
                              onChange={(event) => setLoginForm((current) => ({ ...current, senha: event.target.value }))}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSenha((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Entrando...' : 'ENTRAR'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => window.location.href = '/demutran/concessionario/cadastro'}
                        >
                          Cadastre-se
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TermsGate>
              </div>

              {/* Tabela Explicativa de Preços (Pública) */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="border-border shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-[14px] bg-primary/10 p-2.5 text-primary">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>Tabela de Preços e Taxas Vigentes</CardTitle>
                        <CardDescription>Consulte os valores oficiais das taxas de serviços cobrados pelo DEMUTRAN.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingTaxas ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Carregando taxas vigentes...</p>
                    ) : (
                      <Tabs value={activeTabTaxas} onValueChange={(value) => setActiveTabTaxas(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
                          <TabsTrigger value="demutran" className="rounded-lg text-xs font-semibold py-2">DEMUTRAN</TabsTrigger>
                          <TabsTrigger value="carro_horario" className="rounded-lg text-xs font-semibold py-2">Carro Horário</TabsTrigger>
                          <TabsTrigger value="mototaxi" className="rounded-lg text-xs font-semibold py-2">Mototaxistas</TabsTrigger>
                        </TabsList>

                        {['demutran', 'carro_horario', 'mototaxi'].map((tabTipo) => {
                          const filteredTaxas = taxas.filter((taxa) => taxa.tipo === tabTipo);
                          return (
                            <TabsContent key={tabTipo} value={tabTipo} className="mt-0">
                              {filteredTaxas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-2xl bg-muted/10">
                                  <p className="text-sm text-muted-foreground">Nenhuma taxa cadastrada ou ativa.</p>
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                  <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                      <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-3.5 font-semibold">Serviço</th>
                                        <th className="px-4 py-3.5 text-right font-semibold">Valor</th>
                                        <th className="px-4 py-3.5 font-semibold">Observação</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {filteredTaxas.map((taxa) => (
                                        <tr key={taxa.id} className="transition-colors hover:bg-muted/5">
                                          <td className="px-4 py-3 text-xs font-medium text-foreground">{taxa.servico}</td>
                                          <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                                            {taxa.valor !== null ? (
                                              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxa.valor)
                                            ) : (
                                              <span className="text-muted-foreground italic">—</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-[11px] text-muted-foreground">
                                            {taxa.observacao || <span className="italic text-muted-foreground/30">—</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between border-b border-border py-4">
              <h1 className="text-[20px] font-bold text-foreground">Área do Concessionário</h1>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotificacoes((prev) => !prev)}
                  className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 py-6 md:flex-row">
              <nav className="flex shrink-0 flex-row gap-1 md:flex-col md:w-48">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      tab === item.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 space-y-6 min-w-0">
                {tab === 'home' && (
                  <>
                    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                          {categoriaIcons[perfil.categoria]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {categoriaLabels[perfil.categoria]}
                          </p>
                          <h2 className="mt-1 text-xl font-bold text-foreground">
                            {perfil.titular_nome || 'Concessionário'}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {perfil.veiculo ? `${perfil.veiculo}${perfil.placa ? ` • ${perfil.placa}` : ''}` : 'Sem veículo vinculado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {financialStatus?.status === 'em_debito' && !dismissedDebitoBanner && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-red-800">Você está em débito</p>
                            <p className="mt-1 text-sm text-red-700">{financialStatus.description}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setDismissedDebitoBanner(true)} className="shrink-0 rounded-full p-1 text-red-500 hover:bg-red-200 hover:text-red-700 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <SummaryCard
                        icon={CreditCard}
                        label="Situação das taxas"
                        value={financialStatus?.label || 'Indisponível'}
                        variant={financialStatus?.status === 'pago' ? 'success' : financialStatus?.status === 'prazo_aberto' ? 'warning' : 'danger'}
                      />
                      <SummaryCard
                        icon={ScrollText}
                        label="Número da vaga"
                        value={perfil.numero_vaga || 'Não informado'}
                      />
                      <SummaryCard
                        icon={User}
                        label="CNH"
                        value={perfil.cnh_numero ? `${perfil.cnh_numero}${perfil.validade_cnh ? ` (val. ${perfil.validade_cnh})` : ''}` : 'Não informada'}
                      />
                      <SummaryCard
                        icon={CarFront}
                        label="Fabricação"
                        value={perfil.fabricacao || 'Não informado'}
                      />
                      <SummaryCard
                        icon={CalendarIcon}
                        label="Último alvará"
                        value={perfil.ultimo_alvara || 'Não informado'}
                      />
                      <SummaryCard
                        icon={ScrollText}
                        label="Início da atividade"
                        value={perfil.inicio_atividade || 'Não informado'}
                      />
                    </div>
                  </>
                )}

                {tab === 'taxas' && (
                  <>
                    {financialStatus ? (
                      <Card
                        className={
                          financialStatus.status === 'pago'
                            ? 'border-emerald-200 bg-emerald-50/70'
                            : financialStatus.status === 'prazo_aberto'
                              ? 'border-blue-200 bg-blue-50/70'
                              : 'border-red-200 bg-red-50/80'
                        }
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Situação das taxas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold text-foreground">{financialStatus.label}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{financialStatus.description}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma informação financeira disponível.
                        </CardContent>
                      </Card>
                    )}

                    {/* Tabela de Preços e Taxas para Consulta do Concessionário */}
                    <Card className="border-border shadow-sm mt-6">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-[14px] bg-primary/10 p-2.5 text-primary">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle>Tabela de Taxas Vigentes</CardTitle>
                            <CardDescription>Valores oficiais vigentes do DEMUTRAN para as categorias de serviço.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loadingTaxas ? (
                          <p className="text-sm text-muted-foreground text-center py-6">Carregando taxas...</p>
                        ) : (
                          <Tabs value={activeTabTaxas} onValueChange={(value) => setActiveTabTaxas(value as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
                              <TabsTrigger value="demutran" className="rounded-lg text-xs font-semibold py-2">Taxas do DEMUTRAN</TabsTrigger>
                              <TabsTrigger value="carro_horario" className="rounded-lg text-xs font-semibold py-2">Carros de Horário</TabsTrigger>
                              <TabsTrigger value="mototaxi" className="rounded-lg text-xs font-semibold py-2">Mototaxistas</TabsTrigger>
                            </TabsList>

                            {['demutran', 'carro_horario', 'mototaxi'].map((tabTipo) => {
                              const filteredTaxas = taxas.filter((taxa) => taxa.tipo === tabTipo);
                              return (
                                <TabsContent key={tabTipo} value={tabTipo} className="mt-0">
                                  {filteredTaxas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-2xl bg-muted/10">
                                      <p className="text-sm text-muted-foreground">Nenhuma taxa cadastrada ou ativa.</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                                      <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                          <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            <th className="px-4 py-3.5 font-semibold">Serviço</th>
                                            <th className="px-4 py-3.5 text-right font-semibold">Valor</th>
                                            <th className="px-4 py-3.5 font-semibold">Observação</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {filteredTaxas.map((taxa) => (
                                            <tr key={taxa.id} className="transition-colors hover:bg-muted/5">
                                              <td className="px-4 py-3 text-xs font-medium text-foreground">{taxa.servico}</td>
                                              <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                                                {taxa.valor !== null ? (
                                                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxa.valor)
                                                ) : (
                                                  <span className="text-muted-foreground italic">—</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-[11px] text-muted-foreground">
                                                {taxa.observacao || <span className="italic text-muted-foreground/30">—</span>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </TabsContent>
                              );
                            })}
                          </Tabs>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {tab === 'veiculos' && (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <CarFront className="h-5 w-5 text-primary" />
                            Dados do veículo
                          </CardTitle>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 shrink-0" onClick={() => setVeiculoForm({
                              veiculo: perfil.veiculo || '',
                              placa: perfil.placa || '',
                              fabricacao: perfil.fabricacao || '',
                              rota: perfil.rota || '',
                            })}>
                              <Send className="h-4 w-4" />
                              Solicitar alteração
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-lg">
                                <CarFront className="h-5 w-5 text-primary" />
                                Solicitar alteração de veículo
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <strong>⚠ Importante:</strong> A alteração do veículo ou placa gera uma nova taxa de transferência. Sua solicitação será analisada pelo DEMUTRAN.
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Veículo *">
                                  <Input value={veiculoForm.veiculo} onChange={(e) => setVeiculoForm((prev) => ({ ...prev, veiculo: e.target.value }))} placeholder="Ex: Honda CG 150" />
                                </Field>
                                <Field label="Placa *">
                                  <Input value={veiculoForm.placa} onChange={(e) => setVeiculoForm((prev) => ({ ...prev, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" />
                                </Field>
                                <Field label="Fabricação">
                                  <Input value={veiculoForm.fabricacao} onChange={(e) => setVeiculoForm((prev) => ({ ...prev, fabricacao: e.target.value }))} placeholder="Ex: 2020" />
                                </Field>
                                <Field label="Rota">
                                  <Input value={veiculoForm.rota} onChange={(e) => setVeiculoForm((prev) => ({ ...prev, rota: e.target.value }))} placeholder="Ex: Canindé - Fortaleza" />
                                </Field>
                              </div>
                              <div className="flex justify-end gap-3 pt-2">
                                <DialogTrigger asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogTrigger>
                                <Button onClick={() => setShowConfirmTroca(true)}>Solicitar</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2">
                        <Info label="Veículo" value={perfil.veiculo || '-'} />
                        <Info label="Placa" value={perfil.placa || '-'} />
                        <Info label="Fabricação" value={perfil.fabricacao || '-'} />
                        <Info label="Rota" value={perfil.rota || '-'} />
                        <Info label="Número da vaga / bata" value={perfil.numero_vaga || '-'} />
                        <Info label="Estacionamento" value={perfil.estacionamento || '-'} />
                      </CardContent>
                    </Card>

                    <AlertDialog open={showConfirmTroca} onOpenChange={setShowConfirmTroca}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Confirmar solicitação
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3">
                            <p>Ao solicitar a alteração dos dados do veículo:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Uma <strong>nova taxa de transferência</strong> será gerada</li>
                              <li>O DEMUTRAN analisará sua solicitação</li>
                              <li>Você receberá uma notificação com o resultado</li>
                            </ul>
                            <p className="font-medium">Deseja continuar?</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSolicitarTrocaVeiculo} disabled={solicitandoVeiculo}>
                            {solicitandoVeiculo ? 'Enviando...' : 'Confirmar solicitação'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Clock className="h-5 w-5 text-primary" />
                          Histórico de solicitações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {alteracoes.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            Nenhuma solicitação de alteração enviada até o momento.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {alteracoes.map((alt: any) => (
                              <div key={alt.id} className="rounded-xl border border-border p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                      Solicitação de {new Date(alt.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Placa: {alt.dados_anteriores?.placa || '-'} → {alt.dados_novos?.placa || '-'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Veículo: {alt.dados_anteriores?.veiculo || '-'} → {alt.dados_novos?.veiculo || '-'}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className={alteracaoStatusBadge[alt.status] || ''}>
                                    {alt.status === 'aprovado' ? <CheckCircle className="mr-1 h-3 w-3" /> : alt.status === 'rejeitado' ? <XCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                    {alteracaoStatusLabel[alt.status] || alt.status}
                                  </Badge>
                                </div>
                                {alt.observacao_admin && (
                                  <p className="mt-2 text-xs text-muted-foreground italic">
                                    Observação: {alt.observacao_admin}
                                  </p>
                                )}
                                {alt.analisado_em && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Analisado em: {new Date(alt.analisado_em).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {tab === 'concessao' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <ScrollText className="h-5 w-5 text-primary" />
                          Dados da concessão
                        </CardTitle>
                        {perfil.concessao_arquivo_url && (
                          <div className="flex gap-2 shrink-0">
                            <a
                              href={perfil.concessao_arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                            >
                              <Printer className="h-4 w-4" />
                              Imprimir
                            </a>
                            <a
                              href={perfil.concessao_arquivo_url}
                              download={perfil.concessao_arquivo_nome || 'concessao'}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                            >
                              <Save className="h-4 w-4" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Info label="Categoria" value={categoriaLabels[perfil.categoria]} />
                      <Info label="Grupo do taxi" value={perfil.taxi_grupo || '-'} />
                      <Info label="Estacionamento" value={perfil.estacionamento || '-'} />
                      <Info label="Número da vaga / bata" value={perfil.numero_vaga || '-'} />
                      <Info label="Ponto / distrito" value={perfil.ponto_referencia || '-'} />
                      <Info label="Início da atividade" value={perfil.inicio_atividade || '-'} />
                      <Info label="Último alvará" value={perfil.ultimo_alvara || '-'} />
                      <Info label="Exercício" value={perfil.exercicio || '-'} />
                      <div className="sm:col-span-2">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">Habilitação</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Info label="CNH" value={perfil.cnh_numero || '-'} />
                          <Info label="Validade CNH" value={perfil.validade_cnh || '-'} />
                          <Info label="Categoria CNH" value={perfil.categoria_cnh || '-'} />
                          <Info label="Atividade remunerada" value={perfil.atividade_remunerada || '-'} />
                          <Info label="Curso" value={perfil.curso || '-'} />
                          <Info label="Motorista auxiliar" value={perfil.motorista_auxiliar || '-'} />
                          <Info label="CNH auxiliar" value={perfil.cnh_auxiliar || '-'} />
                          <Info label="Validade CNH auxiliar" value={perfil.validade_cnh_auxiliar || '-'} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tab === 'perfil' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <UserCircle className="h-5 w-5 text-primary" />
                        Dados pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Dados pessoais</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nome">
                              <Input value={editForm.titular_nome || ''} onChange={(event) => setEditForm((current) => ({ ...current, titular_nome: event.target.value }))} placeholder="Nome completo" />
                            </Field>
                            <Field label="CPF">
                              <Input value={editForm.cpf || ''} onChange={(event) => setEditForm((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} placeholder="000.000.000-00" />
                            </Field>
                          </div>
                          <Field label="Endereço">
                            <Input value={editForm.endereco || ''} onChange={(event) => setEditForm((current) => ({ ...current, endereco: event.target.value }))} placeholder="Rua, número, bairro" />
                          </Field>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">CNH / Habilitação</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Número da CNH">
                              <Input value={editForm.cnh_numero || ''} onChange={(event) => setEditForm((current) => ({ ...current, cnh_numero: event.target.value }))} placeholder="Número do documento" />
                            </Field>
                            <Field label="Validade da CNH">
                              <Input type="date" value={editForm.validade_cnh || ''} onChange={(event) => setEditForm((current) => ({ ...current, validade_cnh: event.target.value }))} />
                            </Field>
                            <Field label="Categoria CNH">
                              <Input value={editForm.categoria_cnh || ''} onChange={(event) => setEditForm((current) => ({ ...current, categoria_cnh: event.target.value }))} placeholder="Ex: A, B, AB" />
                            </Field>
                            <Field label="Atividade remunerada">
                              <Input value={editForm.atividade_remunerada || ''} onChange={(event) => setEditForm((current) => ({ ...current, atividade_remunerada: event.target.value }))} placeholder="Ex: Motorista de taxi" />
                            </Field>
                            <Field label="Curso">
                              <Input value={editForm.curso || ''} onChange={(event) => setEditForm((current) => ({ ...current, curso: event.target.value }))} placeholder="Ex: Curso de condutor" />
                            </Field>
                            <Field label="Início da atividade">
                              <Input type="date" value={editForm.inicio_atividade || ''} onChange={(event) => setEditForm((current) => ({ ...current, inicio_atividade: event.target.value }))} />
                            </Field>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Motorista auxiliar</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nome do auxiliar">
                              <Input value={editForm.motorista_auxiliar || ''} onChange={(event) => setEditForm((current) => ({ ...current, motorista_auxiliar: event.target.value }))} placeholder="Nome completo" />
                            </Field>
                            <Field label="CNH / registro">
                              <Input value={editForm.cnh_auxiliar || ''} onChange={(event) => setEditForm((current) => ({ ...current, cnh_auxiliar: event.target.value }))} placeholder="Número do documento" />
                            </Field>
                            <Field label="Validade CNH auxiliar">
                              <Input type="date" value={editForm.validade_cnh_auxiliar || ''} onChange={(event) => setEditForm((current) => ({ ...current, validade_cnh_auxiliar: event.target.value }))} />
                            </Field>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Contato e notificações</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Email">
                              <Input type="email" value={editForm.email_notificacao || ''} onChange={(event) => setEditForm((current) => ({ ...current, email_notificacao: event.target.value }))} placeholder="seu@email.com" />
                            </Field>
                            <Field label="Telefone">
                              <Input value={editForm.telefone_notificacao || ''} maxLength={15} onChange={(event) => setEditForm((current) => ({ ...current, telefone_notificacao: maskPhone(event.target.value) }))} placeholder="(00) 00000-0000" />
                            </Field>
                          </div>
                          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                            <Switch checked={editForm.aceita_notificacoes} onCheckedChange={(checked) => setEditForm((current) => ({ ...current, aceita_notificacoes: checked }))} />
                            <span className="text-sm text-muted-foreground">{editForm.aceita_notificacoes ? 'Receber notificações do DEMUTRAN' : 'Notificações desativadas'}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Segurança</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nova senha">
                              <div className="relative">
                                <Input type={showNovaSenha ? 'text' : 'password'} placeholder="Opcional" value={editForm.novaSenha} onChange={(event) => setEditForm((current) => ({ ...current, novaSenha: event.target.value }))} className="pr-10" />
                                <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                                  {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </Field>
                            <Field label="Confirmar nova senha">
                              <div className="relative">
                                <Input type={showConfirmarSenha ? 'text' : 'password'} value={editForm.confirmarNovaSenha} onChange={(event) => setEditForm((current) => ({ ...current, confirmarNovaSenha: event.target.value }))} className="pr-10" />
                                <button type="button" onClick={() => setShowConfirmarSenha(!showConfirmarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                                  {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </Field>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Observações</h4>
                          <Field label="Observações">
                            <Textarea rows={3} value={editForm.observacoes || ''} onChange={(event) => setEditForm((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Observações adicionais" />
                          </Field>
                        </div>

                        <Button type="submit" className="gap-2" disabled={saving}>
                          <Save className="h-4 w-4" />
                          {saving ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Sheet open={showNotificacoes} onOpenChange={setShowNotificacoes}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] max-w-full overflow-y-auto flex flex-col gap-6 p-6">
                  <SheetHeader className="text-left flex flex-col gap-1.5">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                      <Bell className="h-5 w-5 text-primary" />
                      Notificações
                    </SheetTitle>
                    <SheetDescription>
                      {unreadCount > 0 ? `${unreadCount} notificação(ões) não lida(s)` : 'Nenhuma notificação pendente'}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {notificacoes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhuma notificação enviada pelo DEMUTRAN até o momento.
                      </div>
                    ) : (
                      notificacoes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void markAsRead(item.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${item.lida_em ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{item.titulo}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.tipo}</p>
                            </div>
                            {!item.lida_em && <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white animate-pulse">Nova</span>}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.mensagem}</p>
                          <p className="mt-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                        </button>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </section>
      )}
    </DemutranPortalLayout>
  );
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}) {
  const colors = {
    success: 'border-emerald-200 bg-emerald-50/50 [&_svg]:text-emerald-600',
    warning: 'border-amber-200 bg-amber-50/50 [&_svg]:text-amber-600',
    danger: 'border-red-200 bg-red-50/50 [&_svg]:text-red-600',
    default: 'border-border bg-card [&_svg]:text-primary',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[variant]}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CalendarIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default PublicConcessionarioDemutran;
