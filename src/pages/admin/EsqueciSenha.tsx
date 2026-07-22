import { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        console.error('Erro na solicitação de recuperação de senha:', error.message);
        toast({
          title: 'Erro ao processar solicitação',
          description: 'Não foi possível processar sua solicitação neste momento. Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } else {
        setSent(true);
        setCooldown(60);
        toast({
          title: 'E-mail enviado',
          description: 'Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir sua senha.',
        });
      }
    } catch (error) {
      console.error('Erro inesperado na recuperação:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) {
        toast({
          title: 'Erro ao reenviar e-mail',
          description: 'Não foi possível reenviar as instruções agora. Tente mais tarde.',
          variant: 'destructive',
        });
      } else {
        setCooldown(60);
        toast({
          title: 'Instruções reenviadas',
          description: 'E-mail de recuperação reenviado com sucesso.',
        });
      }
    } catch (err) {
      console.error('Erro ao reenviar:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-safe-screen flex items-center justify-center bg-[#f6f8fc]">
      <div className="relative w-full max-w-[420px]">
        <a
          href="/admin/login"
          className="absolute -top-12 left-0 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Voltar
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
            <h1 className="text-[28px] font-black tracking-[-0.06em] text-white">Redefinir senha</h1>
            <p className="mt-1.5 text-sm leading-5 text-sky-100/80">Secretaria de Segurança de Canindé</p>
          </div>

          <Card className="mt-5 rounded-[26px] border border-slate-200/80 bg-white shadow-[0_20px_45px_-32px_rgba(15,23,42,0.38)]">
            <CardContent className="p-6 pt-8">
              {sent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
                    <MailCheck className="size-8 text-emerald-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-slate-800">Verifique seu e-mail</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Se existir uma conta associada ao endereço informado, você receberá um link para redefinir sua senha.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || isSubmitting}
                      variant="outline"
                      className="w-full h-12 rounded-[18px] text-[15px] font-medium"
                    >
                      {cooldown > 0 ? `Enviar novamente (${cooldown}s)` : 'Enviar novamente'}
                    </Button>

                    <a
                      href="/admin/login"
                      className="block w-full text-center text-xs text-sky-600 hover:text-sky-800 font-semibold transition-colors mt-2"
                    >
                      Voltar para o login
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-800">Recuperar senha</h2>
                    <p className="text-xs text-slate-400">
                      Informe o e-mail utilizado para acessar o sistema.
                    </p>
                  </div>

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
                      disabled={isSubmitting}
                      className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-4 text-[15px] font-medium placeholder:text-slate-400 focus-visible:bg-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-[18px] text-[15px] font-bold tracking-[-0.01em]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar instruções'
                    )}
                  </Button>

                  <a
                    href="/admin/login"
                    className="block w-full text-center text-xs text-slate-400 hover:text-sky-600 font-semibold transition-colors mt-2"
                  >
                    Voltar para o login
                  </a>
                </form>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Ambiente seguro — dados criptografados</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EsqueciSenha;
