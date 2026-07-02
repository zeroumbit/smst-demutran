import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { maskCpf } from '@/lib/masks';
import { Eye, EyeOff, Loader2, Shield, Lock, Check } from 'lucide-react';
import guardaLogo from '@/guarda.png';

const CadastroGuarda = () => {
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);

  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [apelido, setApelido] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const [passo, setPasso] = useState<'digitar' | 'cadastro'>('digitar');
  const [guardaId, setGuardaId] = useState<string | null>(null);
  const [guardaNome, setGuardaNome] = useState('');
  const [guardaGrad, setGuardaGrad] = useState('');
  const [validando, setValidando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState('');
  const [jaPossuiConta, setJaPossuiConta] = useState(false);

  useEffect(() => {
    document.title = 'Cadastro de Acesso - Guarda Municipal';
  }, []);

  const cpfValido = cpf.replace(/\D/g, '').length === 11;
  const matriculaPreenchida = matricula.trim().length > 0;
  const podeContinuar = cpfValido && matriculaPreenchida;

  const handleContinuar = async () => {
    setErroValidacao('');
    setJaPossuiConta(false);
    const cpfLimpo = cpf.replace(/\D/g, '');

    setValidando(true);
    const { data, error } = await supabase.rpc('validar_dados_guarda', {
      p_cpf: cpfLimpo,
      p_matricula: matricula.trim(),
    });
    setValidando(false);

    if (error) { setErroValidacao(error.message); return; }

    const result = data as Record<string, unknown>;

    if (!result) { setErroValidacao('Erro ao validar dados.'); return; }

    const status = result.status as string | undefined;
    const valido = result.valido as boolean | undefined;

    // Handle old format (valido: true/false) and new format (status)
    if (status === 'nao_encontrado' || (status === undefined && valido === false)) {
      setErroValidacao((result.mensagem as string) || 'Dados não encontrados.');
      return;
    }

    if (status === 'ja_possui_conta') {
      setJaPossuiConta(true);
      return;
    }

    if (status === 'ok' || (status === undefined && valido === true)) {
      setGuardaId((result.guarda_id as string) || null);
      setGuardaNome((result.nome as string) || '');
      setGuardaGrad((result.graduacao_nome as string) || '');
      setPasso('cadastro');
    }
  };

  const handleCriarConta = async (e: FormEvent) => {
    e.preventDefault();
    if (!guardaId) return;
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
    const { error } = await supabase.rpc('criar_acesso_guarda', {
      p_guarda_id: guardaId,
      p_email: email.trim(),
      p_senha: senha,
      p_nome: guardaNome,
      p_apelido: apelido.trim() || null,
    });
    setRegistering(false);

    if (error) { toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' }); return; }

    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="flex w-full max-w-5xl flex-col-reverse overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:flex-row">
        {/* Left side — Info */}
        <div className="flex flex-col justify-center bg-gradient-to-br from-primary to-primary/90 px-8 py-10 text-white lg:w-5/12 lg:px-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm">
            <img src={guardaLogo} alt="Guarda Municipal" className="h-full w-full object-contain p-2" />
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em]">Ativar seu<br />acesso</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Este é o portal de ativação de conta para Guardas Municipais. Aqui você vai criar seu login
            pessoal para acessar o sistema IRO, sua escala e demais ferramentas da corporação.
          </p>

          <hr className="my-6 border-white/20" />

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">1</div>
              <div>
                <p className="font-semibold">Verificar seus dados</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/70">
                  Informe seu <strong className="text-white">CPF</strong> e sua <strong className="text-white">matrícula</strong>
                  exatamente como constam no cadastro da Guarda Municipal.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">2</div>
              <div>
                <p className="font-semibold">Criar sua conta</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/70">
                  Depois de verificado, defina seu <strong className="text-white">e-mail</strong> e uma
                  <strong className="text-white"> senha</strong> para acessar o sistema.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Suporte: procure o gestor da Guarda Municipal.
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-sm font-semibold text-slate-700">CPF</Label>
                    <Input id="cpf" value={cpf} onChange={(e) => { setCpf(maskCpf(e.target.value)); setErroValidacao(''); setJaPossuiConta(false); }} placeholder="000.000.000-00" required disabled={validando} className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula" className="text-sm font-semibold text-slate-700">Matrícula</Label>
                    <Input id="matricula" value={matricula} onChange={(e) => { setMatricula(e.target.value); setErroValidacao(''); setJaPossuiConta(false); }} placeholder="Ex.: 3180" required disabled={validando} className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
                  </div>
                </div>

                {erroValidacao && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 flex items-center gap-3 shadow-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-200">
                    <span className="text-xs font-bold text-red-700">!</span>
                  </div>
                  {erroValidacao}
                </div>
                )}

                {jaPossuiConta && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 flex items-center gap-3 shadow-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                    <Check className="h-4 w-4 text-emerald-700" />
                  </div>
                  Este Guarda Municipal já possui uma conta cadastrada.
                </div>
                )}

                <Button
                  type="button"
                  onClick={() => void handleContinuar()}
                  disabled={!podeContinuar || validando}
                  className={`w-full h-12 rounded-xl text-base font-bold shadow-sm transition-all ${
                    !podeContinuar
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
                  }`}
                >
                  {validando ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-5 w-5" />
                  )}
                  {validando ? 'Consultando...' : 'CONTINUAR'}
                </Button>
              </div>
          ) : (
            <form onSubmit={handleCriarConta} className="space-y-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 flex items-center gap-3 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                  <Check className="h-4 w-4 text-emerald-700" />
                </div>
                Você já está no sistema, e pode criar sua conta
              </div>

              <div className="space-y-2">
                <Label htmlFor="apelido" className="text-sm font-semibold text-slate-700">Como deseja ser chamado</Label>
                <Input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder={guardaNome.split(' ')[0]} required disabled={registering} className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary" />
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
            Já possui conta? <a href="/admin/login" className="text-primary hover:underline">Faça login</a>
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default CadastroGuarda;
