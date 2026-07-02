import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { maskCpf } from '@/lib/masks';
import { Eye, EyeOff, Loader2, Shield, ShieldCheck, User, Mail, Lock, GraduationCap, Check } from 'lucide-react';
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

  const [validado, setValidado] = useState(false);
  const [guardaId, setGuardaId] = useState<string | null>(null);
  const [guardaNome, setGuardaNome] = useState('');
  const [guardaGrad, setGuardaGrad] = useState('');
  const [validando, setValidando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState('');

  useEffect(() => {
    document.title = 'Cadastro de Acesso - Guarda Municipal';
  }, []);

  const validarCpfMatricula = async () => {
    setErroValidacao('');
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) { setErroValidacao('CPF inválido.'); return false; }
    if (!matricula.trim()) { setErroValidacao('Informe a matrícula.'); return false; }

    setValidando(true);
    const { data, error } = await supabase.rpc('validar_dados_guarda', {
      p_cpf: cpfLimpo,
      p_matricula: matricula.trim(),
    });
    setValidando(false);

    if (error) { setErroValidacao(error.message); return false; }

    const result = data as { valido: boolean; mensagem?: string; guarda_id?: string; nome?: string; graduacao_nome?: string };

    if (!result.valido) {
      setErroValidacao(result.mensagem || 'Dados não conferem.');
      return false;
    }

    setGuardaId(result.guarda_id || null);
    setGuardaNome(result.nome || '');
    setGuardaGrad(result.graduacao_nome || '');
    setValidado(true);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validado) {
      const ok = await validarCpfMatricula();
      if (!ok) return;
    }

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

    navigate('/admin/login', { state: { contaCriada: true } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-4">
      <Card className="w-full max-w-md rounded-3xl border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={guardaLogo} alt="Guarda Municipal" className="h-full w-full object-contain p-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Ativar Acesso</CardTitle>
          <CardDescription className="text-sm">
            São duas etapas: primeiro valide seus dados, depois crie sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${validado ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>1</div>
                <p className={`text-xs font-semibold text-center leading-tight ${validado ? 'text-emerald-700' : 'text-brand-700'}`}>Validar dados</p>
              </div>
              <div className={`h-0.5 flex-1 mt-4 ${validado ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${validado ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>2</div>
                <p className={`text-xs font-semibold text-center leading-tight ${validado ? 'text-brand-700' : 'text-slate-400'}`}>Criar conta</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!validado ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={cpf} onChange={(e) => { setCpf(maskCpf(e.target.value)); setErroValidacao(''); }} placeholder="000.000.000-00" required disabled={registering} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input id="matricula" value={matricula} onChange={(e) => { setMatricula(e.target.value); setErroValidacao(''); }} placeholder="Ex.: 3180" required disabled={registering} className="h-11" />
                  </div>
                </div>
                {erroValidacao && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erroValidacao}</div>
                )}
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void validarCpfMatricula()} disabled={validando}>
                    {validando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    {validando ? 'Validando...' : 'Validar CPF e matrícula'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  Você já está no sistema, e pode criar sua conta
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apelido">Como deseja ser chamado</Label>
                  <Input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder={guardaNome.split(' ')[0]} required disabled={registering} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" required disabled={registering} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <div className="relative">
                    <Input id="senha" type={showSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} disabled={registering} className="h-11 pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowSenha(!showSenha)}>
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                  <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" required disabled={registering} className="h-11" />
                  {confirmarSenha && senha !== confirmarSenha && (
                    <p className="text-xs text-red-500">As senhas não conferem</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setValidado(false); setErroValidacao(''); }}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={registering}>
                    {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    {registering ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </div>
              </>
            )}

            <p className="text-center text-xs text-slate-400 pt-2">
              Já possui conta? <a href="/admin/login" className="text-brand-600 hover:underline">Faça login</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroGuarda;
