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
        <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>
      </GuardsLayout>
    );
  }

  if (!guarda) {
    return (
      <GuardsLayout>
        <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Perfil não encontrado.</div>
      </GuardsLayout>
    );
  }

  return (
    <GuardsLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 pb-5 pt-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Meu Perfil</h1>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">Gerencie suas informações e altere sua senha.</p>
            </div>
            <button onClick={() => void loadData()} className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        <Card className="rounded-[28px] border-slate-200/80">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-slate-500" />
              Dados pessoais
            </CardTitle>
            <CardDescription>
              Matrícula {guarda.matricula} &middot; {guarda.graduacao_nome || ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="rounded-[20px] bg-slate-50 px-4 py-3 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">CPF:</span>
              <span className="ml-2 text-[15px] font-bold text-slate-800">{guarda.cpf ? maskCpf(guarda.cpf) : '—'}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu email (opcional)" className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(85) 99999-9999" className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
            </div>
            <Button onClick={() => void handleSalvarDados()} disabled={saving} className="rounded-[18px] text-[14px] font-semibold">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-slate-500" />
              Alterar senha
            </CardTitle>
            <CardDescription>
              Sua senha pode ter até 10 caracteres, incluindo letras, números e caracteres especiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Senha atual</Label>
              <div className="relative">
                <Input type={showSenhaAtual ? 'text' : 'password'} value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••••" className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowSenhaAtual(!showSenhaAtual)}>
                  {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Nova senha</Label>
              <div className="relative">
                <Input type={showNovaSenha ? 'text' : 'password'} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••••" maxLength={10} className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowNovaSenha(!showNovaSenha)}>
                  {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">{novaSenha.length}/10 caracteres</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Confirmar nova senha</Label>
              <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••••" maxLength={10} className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs text-red-500">As senhas não conferem</p>
              )}
            </div>
            <Button onClick={() => void handleAlterarSenha()} disabled={mudandoSenha} className="rounded-[18px] text-[14px] font-semibold">
              {mudandoSenha ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </GuardsLayout>
  );
};

export default GuardaPerfil;
