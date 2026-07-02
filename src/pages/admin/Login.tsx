import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

const Login = () => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tipoLogin, setTipoLogin] = useState<'email' | 'cpf'>('email');
  const { login, loginGuarda } = useAuth();

  const isCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11;
  };

  const handleInputChange = (value: string) => {
    setLoginInput(value);
    if (isCPF(value)) {
      setTipoLogin('cpf');
    } else {
      setTipoLogin('email');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginInput || !password) return;
    setIsLoading(true);

    try {
      if (tipoLogin === 'cpf') {
        await loginGuarda(loginInput, password);
      } else {
        await login(loginInput, password);
      }
    } catch (error) {
      console.error('Erro inesperado no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md flex justify-start">
        <a
          href="/"
          className="mb-4 px-4 py-2 text-white hover:text-gray-300 transition-colors flex items-center gap-2"
          aria-label="Voltar para a página inicial"
        >
          <span className="text-sm">← Início</span>
        </a>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <a href="/" className="inline-block">
            <div className="mx-auto w-18 h-18 flex items-center justify-center cursor-pointer">
              <img
                src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo-login.png"
                alt="Logo SMST"
                className="h-18 w-18 object-contain"
              />
            </div>
          </a>
          <CardTitle className="text-3xl font-bold text-primary">
            Painel Administrativo
          </CardTitle>
          <CardDescription className="text-base">
            Secretaria de Seguranca de Caninde
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm font-medium">
                {tipoLogin === 'cpf' ? 'CPF' : 'E-mail'}
              </Label>
              <div className="relative">
                <Input
                  id="login"
                  type={tipoLogin === 'cpf' ? 'text' : 'email'}
                  placeholder={tipoLogin === 'cpf' ? '000.000.000-00' : 'seu.email@caninde.ce.gov.br'}
                  value={loginInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
                {tipoLogin === 'cpf' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Shield className="h-4 w-4 text-brand-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {tipoLogin === 'cpf'
                  ? 'Identificado como CPF de guarda municipal'
                  : 'Digite seu email ou CPF para login'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
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
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
