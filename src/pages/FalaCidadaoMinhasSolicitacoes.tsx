import { FormEvent, useEffect, useState } from 'react';
import { ClipboardList, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { FalaCidadaoLayout } from '@/components/fala-cidadao/FalaCidadaoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { clearFalaSession, falaPrioridadeLabels, falaStatusLabels, getStoredFalaSession, listMinhasSolicitacoesFala, loginFalaExternalUser, registerFalaExternalUser, storeFalaSession, validarFalaExternalSession } from '@/lib/falaCidadao';
import { isValidCpf, isValidEmail, maskCpf, maskPhone } from '@/lib/masks';
import type { FalaDemandaPublica, FalaExternalUser } from '@/types/fala-cidadao';

const FalaCidadaoMinhasSolicitacoes = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [user, setUser] = useState<FalaExternalUser | null>(null);
  const [items, setItems] = useState<FalaDemandaPublica[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ cpf: '', senha: '' });
  const [registerForm, setRegisterForm] = useState({
    cpf: '',
    nomeCompleto: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
  });

  const loadPortal = async (token: string) => {
    const [sessionData, demandasData] = await Promise.all([
      validarFalaExternalSession(token),
      listMinhasSolicitacoesFala(token),
    ]);

    if (!sessionData?.valido || !sessionData.usuario) {
      clearFalaSession();
      setSessionToken(null);
      setUser(null);
      setItems([]);
      return;
    }

    setSessionToken(token);
    setUser(sessionData.usuario);
    setItems(demandasData);
  };

  useEffect(() => {
    const stored = getStoredFalaSession();
    if (stored) {
      void loadPortal(stored);
    }
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const result = await loginFalaExternalUser(loginForm.cpf, loginForm.senha);
      if (!result?.session_token) {
        setAuthError('CPF ou senha invalidos.');
      } else {
        storeFalaSession(result.session_token);
        setLoginForm({ cpf: '', senha: '' });
        await loadPortal(result.session_token);
      }
    } catch (error: any) {
      setAuthError(error.message || 'Nao foi possivel entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);

    if (!isValidCpf(registerForm.cpf)) {
      setAuthError('Informe um CPF valido.');
      return;
    }
    if (!registerForm.nomeCompleto.trim()) {
      setAuthError('Informe o nome completo.');
      return;
    }
    if (registerForm.email && !isValidEmail(registerForm.email)) {
      setAuthError('Informe um email valido.');
      return;
    }
    if (registerForm.senha.length < 6) {
      setAuthError('A senha precisa ter no minimo 6 caracteres.');
      return;
    }
    if (registerForm.senha !== registerForm.confirmarSenha) {
      setAuthError('A confirmacao de senha nao confere.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerFalaExternalUser({
        cpf: registerForm.cpf,
        nomeCompleto: registerForm.nomeCompleto,
        email: registerForm.email,
        telefone: registerForm.telefone,
        senha: registerForm.senha,
      });

      if (result?.error) {
        setAuthError(result.error);
      } else {
        const loginResult = await loginFalaExternalUser(registerForm.cpf, registerForm.senha);
        if (loginResult?.session_token) {
          storeFalaSession(loginResult.session_token);
          await loadPortal(loginResult.session_token);
          setRegisterForm({
            cpf: '',
            nomeCompleto: '',
            email: '',
            telefone: '',
            senha: '',
            confirmarSenha: '',
          });
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Nao foi possivel criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionToken || !user) {
    return (
      <FalaCidadaoLayout>
        <section className="py-10 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <LogIn className="h-6 w-6 text-blue-600" />
                  Entrar para ver minhas solicitacoes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field label="CPF">
                    <Input value={loginForm.cpf} maxLength={14} placeholder="000.000.000-00" onChange={(e) => setLoginForm((current) => ({ ...current, cpf: maskCpf(e.target.value) }))} />
                  </Field>
                  <Field label="Senha">
                    <Input type="password" value={loginForm.senha} onChange={(e) => setLoginForm((current) => ({ ...current, senha: e.target.value }))} />
                  </Field>
                  {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Entrando...' : 'Acessar'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserPlus className="h-6 w-6 text-emerald-600" />
                  Criar conta de acompanhamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cadastro" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="cadastro">Cadastro rapido</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cadastro">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <Field label="CPF">
                        <Input value={registerForm.cpf} maxLength={14} placeholder="000.000.000-00" onChange={(e) => setRegisterForm((current) => ({ ...current, cpf: maskCpf(e.target.value) }))} />
                      </Field>
                      <Field label="Nome completo">
                        <Input value={registerForm.nomeCompleto} onChange={(e) => setRegisterForm((current) => ({ ...current, nomeCompleto: e.target.value }))} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Email">
                          <Input type="email" value={registerForm.email} onChange={(e) => setRegisterForm((current) => ({ ...current, email: e.target.value }))} />
                        </Field>
                        <Field label="Telefone">
                          <Input value={registerForm.telefone} maxLength={15} onChange={(e) => setRegisterForm((current) => ({ ...current, telefone: maskPhone(e.target.value) }))} />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Senha">
                          <Input type="password" value={registerForm.senha} onChange={(e) => setRegisterForm((current) => ({ ...current, senha: e.target.value }))} />
                        </Field>
                        <Field label="Confirmar senha">
                          <Input type="password" value={registerForm.confirmarSenha} onChange={(e) => setRegisterForm((current) => ({ ...current, confirmarSenha: e.target.value }))} />
                        </Field>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Criando conta...' : 'Criar conta e entrar'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>
      </FalaCidadaoLayout>
    );
  }

  return (
    <FalaCidadaoLayout>
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Area do cidadao</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">{user.nome_completo}</h2>
                <p className="mt-1 text-sm text-slate-600">{user.email || user.telefone || 'Conta de acompanhamento ativa'}</p>
              </div>
              <Button variant="outline" onClick={() => {
                clearFalaSession();
                setSessionToken(null);
                setUser(null);
                setItems([]);
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Solicitacoes" value={String(items.length)} />
            <SummaryCard label="Em andamento" value={String(items.filter((item) => item.status !== 'concluido' && item.status !== 'arquivado').length)} />
            <SummaryCard label="Concluidas" value={String(items.filter((item) => item.status === 'concluido').length)} />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ClipboardList className="h-6 w-6 text-blue-600" />
                Minhas solicitacoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                  Nenhuma solicitacao vinculada a esta conta ainda.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.protocolo}</p>
                          <h3 className="mt-1 text-lg font-bold text-slate-900">{item.secretaria_nome}</h3>
                          <p className="text-sm text-slate-600">{item.assunto_nome || 'Assunto nao informado'}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-white px-3 py-1 text-sm font-bold">
                          {falaStatusLabels[item.status]}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Info label="Prioridade" value={falaPrioridadeLabels[item.prioridade]} />
                        <Info label="Abertura" value={new Date(item.data_abertura).toLocaleString('pt-BR')} />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-700">{item.descricao}</p>
                      {item.resposta_cidadao ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <div className="mb-1 flex items-center gap-2 font-semibold">
                            <ShieldCheck className="h-4 w-4" />
                            Retorno da Prefeitura
                          </div>
                          <p>{item.resposta_cidadao}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </FalaCidadaoLayout>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default FalaCidadaoMinhasSolicitacoes;

