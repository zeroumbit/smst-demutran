import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { maskCpf } from '@/lib/masks';
import { Check, Eye, EyeOff, Loader2, Lock, Shield, User } from 'lucide-react';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

const CadastroConcessionario = () => {
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);

  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const [passo, setPasso] = useState<'digitar' | 'cadastro'>('digitar');
  const [concessionarioId, setConcessionarioId] = useState<string | null>(null);
  const [concessionarioNome, setConcessionarioNome] = useState('');
  const [concessionarioCategoria, setConcessionarioCategoria] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [erroValidacao, setErroValidacao] = useState('');
  const validationRequestId = useRef(0);

  useEffect(() => {
    document.title = 'Cadastro de Acesso - Concessionário DEMUTRAN';
  }, []);

  const cpfValido = cpf.replace(/\D/g, '').length === 11;

  const resetValidacao = () => {
    setValidationStatus('idle');
    setErroValidacao('');
    setConcessionarioId(null);
    setConcessionarioNome('');
    setConcessionarioCategoria('');
  };

  const validarConcessionario = async (requestId: number) => {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!cpfValido) {
      resetValidacao();
      return;
    }

    setValidationStatus('validating');
    try {
      const { data, error } = await supabase.rpc('validar_dados_concessionario', {
        p_cpf: cpfLimpo,
      });

      if (requestId !== validationRequestId.current) return;

      if (error) {
        resetValidacao();
        setValidationStatus('invalid');
        console.error('Erro RPC validar_dados_concessionario:', error);
        if (error.message?.includes('does not exist') || error.message?.includes('not found') || error.message?.includes('function')) {
          setErroValidacao('Função de validação não encontrada no banco de dados. O administrador precisa aplicar a migration mais recente.');
        } else {
          setErroValidacao(error.message);
        }
        return;
      }

      const result = data as Record<string, unknown>;
      if (!result) {
        resetValidacao();
        setValidationStatus('invalid');
        setErroValidacao('Erro ao validar dados.');
        return;
      }

      const id = (result.concessionario_id as string) || null;
      const nome = (result.nome as string) || '';
      const categoria = (result.categoria_label as string) || '';
      const status = result.status as string | undefined;

      if (status === 'nao_encontrado') {
        resetValidacao();
        setValidationStatus('invalid');
        setErroValidacao((result.mensagem as string) || 'CPF não encontrado.');
        return;
      }

      if (status === 'ja_cadastrado') {
        resetValidacao();
        setValidationStatus('invalid');
        setErroValidacao((result.mensagem as string) || 'Este CPF já possui cadastro.');
        return;
      }

      if (status === 'ok' && id) {
        setConcessionarioId(id);
        setConcessionarioNome(nome);
        setConcessionarioCategoria(categoria);
        setErroValidacao('');
        setValidationStatus('valid');
      } else {
        resetValidacao();
        setValidationStatus('invalid');
        setErroValidacao((result.mensagem as string) || 'CPF não encontrado. Verifique o número informado.');
      }
    } catch (err) {
      if (requestId !== validationRequestId.current) return;
      resetValidacao();
      setValidationStatus('invalid');
      console.error('Erro ao validar concessionário:', err);
      setErroValidacao('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      if (requestId === validationRequestId.current) {
        setValidationStatus((current) => current === 'validating' ? 'idle' : current);
      }
    }
  };

  useEffect(() => {
    if (!cpfValido) {
      validationRequestId.current += 1;
      resetValidacao();
      return;
    }

    const requestId = validationRequestId.current + 1;
    validationRequestId.current = requestId;
    const timeoutId = window.setTimeout(() => {
      void validarConcessionario(requestId);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [cpf]);

  const handleContinuar = () => {
    if (validationStatus !== 'valid' || !concessionarioId) return;
    setPasso('cadastro');
  };

  const handleCriarConta = async (e: FormEvent) => {
    e.preventDefault();
    if (!concessionarioId) return;
    if (!email.trim() || !senha || !confirmarSenha) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha e-mail, senha e confirmação.', variant: 'destructive' });
      return;
    }
    if (senha.length < 6) {
      toast({ title: 'Senha curta', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (senha !== confirmarSenha) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.rpc('criar_acesso_concessionario', {
        p_concessionario_id: concessionarioId,
        p_email: email.trim(),
        p_senha: senha,
        p_nome: concessionarioNome,
      });

      if (error) {
        console.error('Erro RPC criar_acesso_concessionario:', error);
        if (error.message?.includes('does not exist') || error.message?.includes('not found') || error.message?.includes('function')) {
          toast({ title: 'Erro no sistema', description: 'Função de criação não encontrada no banco de dados. O administrador precisa aplicar a migration mais recente.', variant: 'destructive' });
        } else {
          toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
        }
        return;
      }

      const result = data as Record<string, unknown> | null;
      if (!result?.sucesso) {
        toast({
          title: 'Não foi possível criar a conta',
          description: (result?.mensagem as string) || 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Agora faça login com seu e-mail e a senha que definiu.',
      });
      navigate('/demutran/concessionario');
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      toast({ title: 'Erro de conexão', description: 'Verifique sua internet e tente novamente.', variant: 'destructive' });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="flex w-full max-w-5xl flex-col-reverse overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:flex-row">
        {/* Left side — Info */}
        <div className="flex flex-col justify-center bg-gradient-to-br from-sky-700 to-sky-600 px-8 py-10 text-white lg:w-5/12 lg:px-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm">
            <User className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em]">Criar seu acesso</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Este é o portal de ativação de conta para Concessionários do DEMUTRAN. Aqui você vai criar seu acesso
            pessoal para consultar taxas, dados do veículo e muito mais.
          </p>

          <hr className="my-6 border-white/20" />

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">1</div>
              <div>
                <p className="font-semibold">Verificar seus dados</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/70">
                  Informe seu <strong className="text-white">CPF</strong> exatamente como consta no cadastro do DEMUTRAN.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">2</div>
              <div>
                <p className="font-semibold">Criar sua conta</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/70">
                  Depois de verificado, defina seu <strong className="text-white">e-mail</strong> e uma
                  {' '}<strong className="text-white">senha</strong> para acessar o sistema.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Suporte: procure o DEMUTRAN.
          </p>
        </div>

        {/* Right side — Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md">

            {/* Step indicator */}
            <div className="mb-8">
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${passo === 'cadastro' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>1</div>
                  <p className={`text-xs font-semibold text-center leading-tight ${passo === 'cadastro' ? 'text-emerald-700' : 'text-primary'}`}>Seus dados</p>
                </div>
                <div className={`h-0.5 flex-1 mt-4 ${passo === 'cadastro' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${passo === 'cadastro' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>2</div>
                  <p className={`text-xs font-semibold text-center leading-tight ${passo === 'cadastro' ? 'text-primary' : 'text-slate-400'}`}>Criar conta</p>
                </div>
              </div>
            </div>

            {passo === 'digitar' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-sm font-semibold text-slate-700">CPF</Label>
                  <Input id="cpf" value={cpf} onChange={(e) => { setCpf(maskCpf(e.target.value)); resetValidacao(); }} placeholder="000.000.000-00" required className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
                </div>

                {cpfValido && validationStatus !== 'invalid' && (
                  <div className={`rounded-xl border px-5 py-4 text-sm shadow-sm flex items-center gap-3 ${
                    validationStatus === 'valid'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      validationStatus === 'valid' ? 'bg-emerald-200' : 'bg-white'
                    }`}>
                      {validationStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Check className={`h-4 w-4 ${validationStatus === 'valid' ? 'text-emerald-700' : 'text-emerald-600'}`} />}
                    </div>
                    {validationStatus === 'validating' ? 'Validando CPF...' : validationStatus === 'valid' ? 'Concessionário encontrado.' : 'Aguardando validação.'}
                  </div>
                )}

                {validationStatus === 'valid' && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-700 shadow-sm">
                    <p className="font-semibold">{concessionarioNome}</p>
                    <p className="text-sky-600">{concessionarioCategoria}</p>
                  </div>
                )}

                {erroValidacao && validationStatus === 'invalid' && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 flex items-center gap-3 shadow-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-200">
                    <span className="text-xs font-bold text-red-700">!</span>
                  </div>
                  {erroValidacao}
                </div>
                )}

                <Button
                  type="button"
                  onClick={handleContinuar}
                  disabled={validationStatus !== 'valid' || !concessionarioId}
                  className={`w-full h-12 rounded-xl text-base font-bold shadow-sm transition-all ${
                    validationStatus !== 'valid' || !concessionarioId
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
                  }`}
                >
                  {validationStatus === 'validating' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-5 w-5" />
                  )}
                  {validationStatus === 'validating' ? 'Consultando...' : 'CONTINUAR'}
                </Button>
              </div>
          ) : (
            <form onSubmit={handleCriarConta} className="space-y-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 flex items-center gap-3 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                  <Check className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold">{concessionarioNome}</p>
                  <p className="text-emerald-600">Você já está no sistema, pode criar sua conta</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" required disabled={registering} className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-sm font-semibold text-slate-700">Senha</Label>
                <div className="relative">
                  <Input id="senha" type={showSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} disabled={registering} className="h-12 rounded-xl border-slate-300 bg-white px-4 pr-12 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha" className="text-sm font-semibold text-slate-700">Confirmar senha</Label>
                <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" required disabled={registering} className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
                {confirmarSenha && senha !== confirmarSenha && (
                  <p className="text-xs text-red-500 mt-1">As senhas não conferem</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => { setPasso('digitar'); setErroValidacao(''); }}>
                  Voltar
                </Button>
                <Button type="submit" disabled={registering} className="h-12 rounded-xl px-8 shadow-sm">
                  {registering ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
                  {registering ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-400 pt-4">
            Já possui conta? <a href="/demutran/concessionario" className="text-primary hover:underline">Faça login</a>
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default CadastroConcessionario;
