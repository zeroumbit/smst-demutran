import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ResetStatus = 'PROCESSANDO_LINK' | 'LINK_VALIDO' | 'LINK_INVALIDO' | 'LINK_EXPIRADO' | 'ATUALIZANDO_SENHA' | 'SENHA_ATUALIZADA';

const ResetPassword = () => {
  const [status, setStatus] = useState<ResetStatus>('PROCESSANDO_LINK');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isRecoverySession = false;
    
    const hash = window.location.hash;
    const search = window.location.search;
    const hasAccessToken = hash.includes('access_token=') && hash.includes('type=recovery');
    const hasCode = new URLSearchParams(search).has('code');
    const hasError = hash.includes('error=') || search.includes('error=');
    
    if (hasError) {
      setStatus('LINK_INVALIDO');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecoverySession = true;
        setStatus('LINK_VALIDO');
      }
    });

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && (hasAccessToken || isRecoverySession)) {
        setStatus('LINK_VALIDO');
      } else if (hasCode) {
        // Exchange code for session (PKCE)
        const code = new URLSearchParams(search).get('code') || '';
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Erro ao trocar código por sessão:', error.message);
          setStatus('LINK_INVALIDO');
        } else {
          setStatus('LINK_VALIDO');
        }
      } else if (!hasAccessToken && !isRecoverySession) {
        // Wait a brief moment to see if onAuthStateChange triggers PASSWORD_RECOVERY
        setTimeout(async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!isRecoverySession && !currentSession) {
            setStatus('LINK_INVALIDO');
          }
        }, 1500);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status === 'SENHA_ATUALIZADA') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validar se senhas coincidem
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    // Validar regras de senha usando nosso utilitário centralizado
    const validationError = validatePassword(password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setStatus('ATUALIZANDO_SENHA');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Erro ao atualizar senha:', error.message);
        setErrorMessage('Não foi possível atualizar sua senha. Tente novamente.');
        setStatus('LINK_VALIDO');
        toast({
          title: 'Erro ao redefinir senha',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setStatus('SENHA_ATUALIZADA');
        toast({
          title: 'Senha alterada!',
          description: 'Sua senha foi redefinida com sucesso.',
        });

        // Efetuar logout da sessão de recuperação temporária
        await supabase.auth.signOut();

        setTimeout(() => {
          navigate('/admin/login');
        }, 2200);
      }
    } catch (err) {
      console.error('Erro inesperado na atualização:', err);
      setErrorMessage('Erro inesperado ao redefinir a senha.');
      setStatus('LINK_VALIDO');
    }
  };

  return (
    <div className="mobile-safe-screen flex items-center justify-center bg-[#f6f8fc]">
      <div className="relative w-full max-w-[420px]">
        <a
          href="/admin/login"
          className="absolute -top-12 left-0 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Voltar para o Login
        </a>

        <div className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] px-7 pt-9 pb-[30px]">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white/10 backdrop-blur-sm">
              <img
                src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo-login.png"
                alt="Logo SMST"
                className="h-14 w-14 object-contain"
              />
            </div>
            <h1 className="text-[28px] font-black tracking-[-0.06em] text-white">Painel Administrativo</h1>
            <p className="mt-1.5 text-sm leading-5 text-sky-100/80">Redefinição de Senha</p>
          </div>

          <Card className="mt-5 rounded-[26px] border border-slate-200/80 bg-white shadow-[0_20px_45px_-32px_rgba(15,23,42,0.38)]">
            <CardContent className="p-6 pt-8">
              {status === 'PROCESSANDO_LINK' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-slate-600">Validando seu link de recuperação...</p>
                </div>
              )}

              {(status === 'LINK_INVALIDO' || status === 'LINK_EXPIRADO') && (
                <div className="space-y-6 text-center py-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-slate-800">Link inválido ou expirado</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Este link de recuperação não é mais válido ou já expirou. Por favor, solicite um novo link.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/login')}
                    className="w-full h-12 rounded-[18px] text-[15px] font-bold"
                  >
                    Solicitar novo link
                  </Button>
                </div>
              )}

              {status === 'SENHA_ATUALIZADA' && (
                <div className="space-y-6 text-center py-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 animate-bounce">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-slate-800">Senha alterada com sucesso!</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Sua senha foi atualizada. Você será redirecionado para a tela de login.
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-100 w-full rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {(status === 'LINK_VALIDO' || status === 'ATUALIZANDO_SENHA') && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-800">Crie uma nova senha</h2>
                    <p className="text-xs text-slate-400">
                      Defina a sua nova credencial de acesso administrativo.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={status === 'ATUALIZANDO_SENHA'}
                        className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-4 pr-12 text-[15px] font-medium placeholder:text-slate-400 focus-visible:bg-white"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={status === 'ATUALIZANDO_SENHA'}
                      className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-4 text-[15px] font-medium placeholder:text-slate-400 focus-visible:bg-white"
                    />
                  </div>

                  {/* Password Guidelines Helper */}
                  <div className="text-[10px] text-slate-400 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-500 uppercase tracking-wider text-[8px]">Requisitos da senha:</p>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li className={password.length >= 6 && password.length <= 10 ? "text-green-600 font-semibold" : ""}>Entre 6 e 10 caracteres</li>
                      <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-green-600 font-semibold" : ""}>Letras maiúsculas e minúsculas</li>
                      <li className={/[0-9]/.test(password) ? "text-green-600 font-semibold" : ""}>Ao menos um número</li>
                      <li className={/[!@#$%&*]/.test(password) ? "text-green-600 font-semibold" : ""}>Ao menos um caractere especial (!@#$%&*)</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-[18px] text-[15px] font-bold tracking-[-0.01em]"
                    disabled={status === 'ATUALIZANDO_SENHA'}
                  >
                    {status === 'ATUALIZANDO_SENHA' ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Redefinindo...
                      </>
                    ) : (
                      'Redefinir senha'
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Ambiente seguro — redefinição via Supabase Auth</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
