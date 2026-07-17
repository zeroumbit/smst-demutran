import { useEffect, useState } from 'react';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { maskCpf, isValidEmail } from '@/lib/masks';
import { User, Lock, RefreshCcw, Eye, EyeOff, Check } from 'lucide-react';
import type { GuardaPerfil } from '@/types/admin';

const GuardaPerfil = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guarda, setGuarda] = useState<GuardaPerfil | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [mudandoSenha, setMudandoSenha] = useState(false);

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.user_id });
    if (data) {
      const g = data as GuardaPerfil;
      setGuarda(g);
      setNome(g.nome || '');
      setEmail(g.email || '');
      setTelefone(g.telefone || '');
    }
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [user?.user_id]);

  const handleSalvarDados = async () => {
    if (!guarda) return;
    if (email && !isValidEmail(email)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('guardas_municipais').update({ nome: nome.trim(), email: email.trim() || null, telefone: telefone.trim() || null }).eq('id', guarda.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Dados atualizados com sucesso' });
    }
    setSaving(false);
  };

  const handleAlterarSenha = async () => {
    if (!guarda) return;
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({ title: 'Preencha todos os campos de senha', variant: 'destructive' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: 'Nova senha e confirmação não conferem', variant: 'destructive' });
      return;
    }
    if (novaSenha.length < 6) {
      toast({ title: 'Senha curta', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (novaSenha.length > 10) {
      toast({ title: 'A senha deve ter no máximo 10 caracteres', variant: 'destructive' });
      return;
    }
    if (!/[A-Z]/.test(novaSenha) || !/[a-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha) || !/[!@#$%&*]/.test(novaSenha)) {
      toast({ title: 'Senha fraca', description: 'Use ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%&*)', variant: 'destructive' });
      return;
    }
    setMudandoSenha(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
      setMudandoSenha(false);
      return;
    }

    toast({ title: 'Senha alterada com sucesso' });
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setMudandoSenha(false);
  };

  if (loading) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">Carregando...</div>
      </GuardsLayout>
    );
  }

  if (!guarda) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">Perfil não encontrado.</div>
      </GuardsLayout>
    );
  }

  return (
    <GuardsLayout>
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl md:mt-3 md:text-[26px]">Meu Perfil</h1>
              <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">Gerencie suas informações e altere sua senha.</p>
            </div>
            <button onClick={() => void loadData()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-none hover:bg-white/30" aria-label="Atualizar perfil">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        <Card className="rounded-2xl border-slate-200/80">
          <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-slate-500" />
              Dados pessoais
            </CardTitle>
            <CardDescription>
              Matrícula {guarda.matricula} &middot; {guarda.graduacao_nome || ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">CPF:</span>
              <span className="ml-2 break-words text-[15px] font-bold text-slate-800">{guarda.cpf ? maskCpf(guarda.cpf) : '—'}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-12 rounded-xl border-slate-200 text-[15px] font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu email (opcional)" className="h-12 rounded-xl border-slate-200 text-[15px] font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(85) 99999-9999" className="h-12 rounded-xl border-slate-200 text-[15px] font-medium" />
            </div>
            <Button onClick={() => void handleSalvarDados()} disabled={saving} className="min-h-12 w-full rounded-xl text-[14px] font-semibold sm:min-h-11 sm:w-auto">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80">
          <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-slate-500" />
              Alterar senha
            </CardTitle>
            <CardDescription>
              Sua senha pode ter até 10 caracteres, incluindo letras, números e caracteres especiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Senha atual</Label>
              <div className="relative">
                <Input type={showSenhaAtual ? 'text' : 'password'} value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••••" className="h-12 rounded-xl border-slate-200 pr-12 text-[15px] font-medium" />
                <button type="button" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" onClick={() => setShowSenhaAtual(!showSenhaAtual)} aria-label={showSenhaAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}>
                  {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nova senha</Label>
              <div className="relative">
                <Input type={showNovaSenha ? 'text' : 'password'} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••••" maxLength={10} className="h-12 rounded-xl border-slate-200 pr-12 text-[15px] font-medium" />
                <button type="button" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" onClick={() => setShowNovaSenha(!showNovaSenha)} aria-label={showNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}>
                  {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">{novaSenha.length}/10 caracteres</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Confirmar nova senha</Label>
              <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••••" maxLength={10} className="h-12 rounded-xl border-slate-200 text-[15px] font-medium" />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs text-red-500">As senhas não conferem</p>
              )}
            </div>
            <Button onClick={() => void handleAlterarSenha()} disabled={mudandoSenha} className="min-h-12 w-full rounded-xl text-[14px] font-semibold sm:min-h-11 sm:w-auto">
              {mudandoSenha ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </GuardsLayout>
  );
};

export default GuardaPerfil;
