import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bell, CreditCard, IdCard, KeyRound, LogOut, Save } from 'lucide-react';
import Hero from '@/components/shared/Hero';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getConcessionarioFinancialCopy } from '@/lib/demutranConcessionarioFinanceiro';
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

type PerfilEditavel = Pick<
  DemutranConcessionario,
  'endereco' | 'veiculo' | 'placa' | 'observacoes' | 'email_notificacao' | 'telefone_notificacao' | 'aceita_notificacoes'
> & {
  novaSenha: string;
  confirmarNovaSenha: string;
};

const initialEdit: PerfilEditavel = {
  endereco: '',
  veiculo: '',
  placa: '',
  observacoes: '',
  email_notificacao: '',
  telefone_notificacao: '',
  aceita_notificacoes: true,
  novaSenha: '',
  confirmarNovaSenha: '',
};

const PublicConcessionarioDemutran = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<DemutranConcessionario | null>(null);
  const [notificacoes, setNotificacoes] = useState<DemutranConcessionarioNotificacao[]>([]);
  const [loginForm, setLoginForm] = useState({ cpf: '', senha: '' });
  const [editForm, setEditForm] = useState<PerfilEditavel>(initialEdit);

  const syncEditForm = (data: DemutranConcessionario) => {
    setEditForm({
      endereco: data.endereco || '',
      veiculo: data.veiculo || '',
      placa: data.placa || '',
      observacoes: data.observacoes || '',
      email_notificacao: data.email_notificacao || '',
      telefone_notificacao: data.telefone_notificacao || '',
      aceita_notificacoes: data.aceita_notificacoes,
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
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      setPerfil(null);
      setNotificacoes([]);
      return;
    }

    const profile = perfilData as DemutranConcessionario;
    setPerfil(profile);
    syncEditForm(profile);
    setNotificacoes(((notData || []) as DemutranConcessionarioNotificacao[]) ?? []);

    if (notError) {
      console.error(notError);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    setSessionToken(stored);
    void loadPerfil(stored);
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!loginForm.cpf.trim() || !loginForm.senha.trim()) {
      toast({ title: 'Preencha CPF e senha', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any).rpc('autenticar_concessionario', {
      _cpf: loginForm.cpf,
      _senha: loginForm.senha,
    });
    setLoading(false);

    if (error || !data?.length) {
      toast({ title: 'Acesso nao autorizado', description: 'CPF ou senha invalidos.', variant: 'destructive' });
      return;
    }

    const token = data[0].session_token as string;
    localStorage.setItem(SESSION_KEY, token);
    setSessionToken(token);
    setLoginForm({ cpf: '', senha: '' });
    await loadPerfil(token);
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
      _endereco: editForm.endereco,
      _veiculo: editForm.veiculo,
      _placa: editForm.placa,
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

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setPerfil(null);
    setNotificacoes([]);
    setEditForm(initialEdit);
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
      <Hero
        title="Area do Concessionario"
        description="Acesse com CPF e senha individual para consultar seu cadastro, acompanhar sua concessão e receber notificações."
        className="bg-gradient-hero"
      />

      <section className="bg-background py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {!perfil ? (
            <div className="mx-auto max-w-xl">
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
                      <Label>CPF</Label>
                      <Input value={loginForm.cpf} maxLength={14} onChange={(event) => setLoginForm((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" value={loginForm.senha} onChange={(event) => setLoginForm((current) => ({ ...current, senha: event.target.value }))} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Entrando...' : 'Acessar meus dados'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                {financialStatus && (
                  <Card
                    className={
                      financialStatus.status === 'pago'
                        ? 'border-emerald-200 bg-emerald-50/70 shadow-lg'
                        : financialStatus.status === 'prazo_aberto'
                          ? 'border-blue-200 bg-blue-50/70 shadow-lg'
                          : 'border-red-200 bg-red-50/80 shadow-lg'
                    }
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Situacao das taxas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-bold text-foreground">{financialStatus.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{financialStatus.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-primary/10 shadow-lg">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <IdCard className="h-5 w-5 text-primary" />
                        Meu cadastro
                      </CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Alterações feitas pelo DEMUTRAN aparecem automaticamente aqui.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Info label="Categoria" value={categoriaLabels[perfil.categoria]} />
                    <Info label="Numero da vaga / bata" value={perfil.numero_vaga || '-'} />
                    <Info label="Nome" value={perfil.titular_nome || '-'} />
                    <Info label="CPF" value={perfil.cpf || '-'} />
                    <Info label="Placa" value={perfil.placa || '-'} />
                    <Info label="Veiculo" value={perfil.veiculo || '-'} />
                    <Info label="Ultimo alvara" value={perfil.ultimo_alvara || '-'} />
                    <Info label="Exercicio" value={perfil.exercicio || '-'} />
                    <Info label="Rota" value={perfil.rota || '-'} />
                    <Info label="Ponto / distrito" value={perfil.ponto_referencia || '-'} />
                    <Info label="CNH" value={perfil.cnh_numero || '-'} />
                    <Info label="Validade CNH" value={perfil.validade_cnh || '-'} />
                  </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Atualizar dados permitidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Endereco">
                          <Input value={editForm.endereco || ''} onChange={(event) => setEditForm((current) => ({ ...current, endereco: event.target.value }))} />
                        </Field>
                        <Field label="Veiculo">
                          <Input value={editForm.veiculo || ''} onChange={(event) => setEditForm((current) => ({ ...current, veiculo: event.target.value }))} />
                        </Field>
                        <Field label="Placa">
                          <Input value={editForm.placa || ''} onChange={(event) => setEditForm((current) => ({ ...current, placa: event.target.value.toUpperCase() }))} />
                        </Field>
                        <Field label="Email para notificacoes">
                          <Input type="email" value={editForm.email_notificacao || ''} onChange={(event) => setEditForm((current) => ({ ...current, email_notificacao: event.target.value }))} />
                        </Field>
                        <Field label="Telefone para notificacoes">
                          <Input value={editForm.telefone_notificacao || ''} maxLength={15} onChange={(event) => setEditForm((current) => ({ ...current, telefone_notificacao: maskPhone(event.target.value) }))} />
                        </Field>
                        <Field label="Nova senha">
                          <Input type="password" placeholder="Opcional" value={editForm.novaSenha} onChange={(event) => setEditForm((current) => ({ ...current, novaSenha: event.target.value }))} />
                        </Field>
                        <Field label="Confirmar nova senha">
                          <Input type="password" value={editForm.confirmarNovaSenha} onChange={(event) => setEditForm((current) => ({ ...current, confirmarNovaSenha: event.target.value }))} />
                        </Field>
                      </div>
                      <Field label="Observacoes">
                        <Textarea rows={4} value={editForm.observacoes || ''} onChange={(event) => setEditForm((current) => ({ ...current, observacoes: event.target.value }))} />
                      </Field>
                      <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Switch checked={editForm.aceita_notificacoes} onCheckedChange={(checked) => setEditForm((current) => ({ ...current, aceita_notificacoes: checked }))} />
                        <span className="text-sm text-muted-foreground">{editForm.aceita_notificacoes ? 'Receber notificacoes do DEMUTRAN' : 'Notificacoes desativadas'}</span>
                      </div>
                      <Button type="submit" className="gap-2" disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar alteracoes'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-6">
                <Card className="border-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Bell className="h-5 w-5 text-primary" />
                      Notificacoes
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} notificacao(oes) nao lida(s)` : 'Nenhuma notificacao pendente'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificacoes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhuma notificacao enviada pelo DEMUTRAN ate o momento.
                      </div>
                    ) : (
                      notificacoes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void markAsRead(item.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${item.lida_em ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{item.titulo}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.tipo}</p>
                            </div>
                            {!item.lida_em && <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">Nova</span>}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.mensagem}</p>
                          <p className="mt-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </section>
    </DemutranPortalLayout>
  );
};

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
