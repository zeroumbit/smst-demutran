import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { maskCpf } from '@/lib/masks';
import { Eye, EyeOff, Loader2, Shield, ShieldCheck, User, Mail, Lock, GraduationCap } from 'lucide-react';
import guardaLogo from '@/guarda.png';

const CadastroGuarda = () => {
  const navigate = useNavigate();
  const [passo, setPasso] = useState<'validacao' | 'cadastro' | 'sucesso'>('validacao');
  const [validating, setValidating] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [guardaId, setGuardaId] = useState<string | null>(null);
  const [guardaNome, setGuardaNome] = useState('');
  const [guardaGrad, setGuardaGrad] = useState('');

  const [apelido, setApelido] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const [erroCpf, setErroCpf] = useState('');
  const [erroMatricula, setErroMatricula] = useState('');

  useEffect(() => {
    document.title = 'Cadastro de Acesso - Guarda Municipal';
  }, []);

  const handleValidar = async (e: FormEvent) => {
    e.preventDefault();
    setErroCpf('');
    setErroMatricula('');

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroCpf('CPF inválido.');
      return;
    }
    if (!matricula.trim()) {
      setErroMatricula('Informe a matrícula.');
      return;
    }

    setValidating(true);
    const { data, error } = await supabase.rpc('validar_dados_guarda', {
      p_cpf: cpfLimpo,
      p_matricula: matricula.trim(),
    });

    setValidating(false);

    if (error) {
      toast({ title: 'Erro ao validar', description: error.message, variant: 'destructive' });
      return;
    }

    const result = data as { valido: boolean; mensagem?: string; guarda_id?: string; nome?: string; matricula?: string; graduacao_id?: string; graduacao_nome?: string };

    if (!result.valido) {
      toast({ title: 'Dados não conferem', description: result.mensagem || 'Erro ao validar seus dados.', variant: 'destructive' });
      return;
    }

    setGuardaId(result.guarda_id || null);
    setGuardaNome(result.nome || '');
    setGuardaGrad(result.graduacao_nome || '');
    setPasso('cadastro');
  };

  const handleCadastrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!guardaId) return;

    if (!email.trim() || !senha || !confirmarSenha) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    if (senha.length < 6) {
      toast({ title: 'Senha curta', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    if (senha !== confirmarSenha) {
      toast({ title: 'Senhas não conferem', description: 'A nova senha e a confirmação devem ser iguais.', variant: 'destructive' });
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

    if (error) {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
      return;
    }

    setPasso('sucesso');
  };

  if (passo === 'sucesso') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-4">
        <Card className="w-full max-w-md rounded-3xl border-slate-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Conta criada!</CardTitle>
            <CardDescription className="text-sm">
              Sua conta de acesso foi criada com sucesso, {guardaNome.split(' ')[0]}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-slate-600">
              Agora você pode fazer login no sistema usando seu e-mail e a senha que definiu.
            </p>
            <Button className="w-full" onClick={() => navigate('/admin/login')}>
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-4">
      <Card className="w-full max-w-md rounded-3xl border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={guardaLogo} alt="Guarda Municipal" className="h-full w-full object-contain p-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {passo === 'validacao' ? 'Ativar Acesso' : 'Criar Conta'}
          </CardTitle>
          <CardDescription className="text-sm">
            {passo === 'validacao'
              ? 'Informe seu CPF e matrícula para iniciar o cadastro.'
              : `Confirme seus dados e defina seu e-mail e senha de acesso.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passo === 'validacao' ? (
            <form onSubmit={handleValidar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <div className="relative">
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => { setCpf(maskCpf(e.target.value)); setErroCpf(''); }}
                    placeholder="000.000.000-00"
                    required
                    disabled={validating}
                    className="h-11"
                  />
                  {cpf.replace(/\D/g, '').length >= 11 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <User className="h-4 w-4 text-brand-500" />
                    </div>
                  )}
                </div>
                {erroCpf && <p className="text-xs text-red-500">{erroCpf}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  value={matricula}
                  onChange={(e) => { setMatricula(e.target.value); setErroMatricula(''); }}
                  placeholder="Ex.: 3180"
                  required
                  disabled={validating}
                  className="h-11"
                />
                {erroMatricula && <p className="text-xs text-red-500">{erroMatricula}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={validating}>
                {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                {validating ? 'Validando...' : 'Validar dados'}
              </Button>
              <p className="text-center text-xs text-slate-400">
                Já possui conta? <a href="/admin/login" className="text-brand-600 hover:underline">Faça login</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleCadastrar} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Nome:</span>
                  <span className="font-medium text-slate-800">{guardaNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Graduação:</span>
                  <span className="font-medium text-slate-800">{guardaGrad}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">CPF:</span>
                  <span className="font-medium text-slate-800">{maskCpf(cpf)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Matrícula:</span>
                  <span className="font-medium text-slate-800">{matricula}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apelido">Como deseja ser chamado</Label>
                <Input
                  id="apelido"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder={guardaNome.split(' ')[0]}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="h-11"
                />
                {confirmarSenha && senha !== confirmarSenha && (
                  <p className="text-xs text-red-500">As senhas não conferem</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11" disabled={registering}>
                {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {registering ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroGuarda;
