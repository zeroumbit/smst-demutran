import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      console.error('Erro inesperado no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fc] p-4">
      <div className="relative w-full max-w-[420px]">
        <a
          href="/"
          className="absolute -top-12 left-0 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Início
        </a>

        <div className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] px-7 pb-7 pt-9 text-white text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white/10 backdrop-blur-sm">
            <img
              src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo-login.png"
              alt="Logo SMST"
              className="h-14 w-14 object-contain"
            />
          </div>
          <h1 className="text-[28px] font-black tracking-[-0.06em]">Painel Administrativo</h1>
          <p className="mt-1.5 text-sm leading-5 text-sky-100/80">Secretaria de Segurança de Canindé</p>
        </div>

        <Card className="-mt-6 mx-4 rounded-[26px] border border-slate-200/80 bg-white shadow-[0_20px_45px_-32px_rgba(15,23,42,0.38)]">
          <CardContent className="p-6 pt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@caninde.ce.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-4 text-[15px] font-medium placeholder:text-slate-400 focus-visible:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
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

              <Button
                type="submit"
                className="w-full h-12 rounded-[18px] text-[15px] font-bold tracking-[-0.01em]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Ambiente seguro — dados criptografados</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
