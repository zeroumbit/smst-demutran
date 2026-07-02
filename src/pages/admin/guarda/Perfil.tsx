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
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.id });
    if (data) {
      const g = data as GuardaPerfil;
      setGuarda(g);
      setNome(g.nome || '');
      setEmail(g.email || '');
      setTelefone(g.telefone || '');
    }
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [user?.id]);

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
    if (novaSenha.length > 10) {
      toast({ title: 'A senha deve ter no máximo 10 caracteres', variant: 'destructive' });
      return;
    }
    setMudandoSenha(true);

    const { data, error } = await supabase.rpc('alterar_senha_guarda', {
      p_guarda_id: guarda.id,
      p_senha_atual: senhaAtual,
      p_nova_senha: novaSenha,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setMudandoSenha(false);
      return;
    }

    const r = data as { sucesso: boolean; mensagem: string };
    if (!r.sucesso) {
      toast({ title: r.mensagem, variant: 'destructive' });
      setMudandoSenha(false);
      return;
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-guarda-password`;
    const session = await supabase.auth.getSession();
    const accessToken = session?.data?.session?.access_token;

    if (accessToken) {
      try {
        await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            guarda_id: guarda.id,
            nova_senha: novaSenha,
          }),
        });
      } catch {
        console.warn('Não foi possível sincronizar a senha com o sistema de autenticação.');
      }
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
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>
      </GuardsLayout>
    );
  }

  if (!guarda) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Perfil não encontrado.</div>
      </GuardsLayout>
    );
  }

  return (
    <GuardsLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-sm text-slate-500">Gerencie suas informações e altere sua senha</p>
        </div>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-slate-500" />
              Dados pessoais
            </CardTitle>
            <CardDescription>
              Matrícula {guarda.matricula} &middot; {guarda.graduacao_nome || ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">CPF:</span>
              <span className="ml-2 font-medium text-slate-800">{guarda.cpf ? maskCpf(guarda.cpf) : '—'}</span>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu email (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(85) 99999-9999" />
            </div>
            <Button onClick={() => void handleSalvarDados()} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-slate-500" />
              Alterar senha
            </CardTitle>
            <CardDescription>
              Sua senha pode ter até 10 caracteres, incluindo letras, números e caracteres especiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <div className="relative">
                <Input type={showSenhaAtual ? 'text' : 'password'} value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••••" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowSenhaAtual(!showSenhaAtual)}>
                  {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input type={showNovaSenha ? 'text' : 'password'} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••••" maxLength={10} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowNovaSenha(!showNovaSenha)}>
                  {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">{novaSenha.length}/10 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••••" maxLength={10} />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs text-red-500">As senhas não conferem</p>
              )}
            </div>
            <Button onClick={() => void handleAlterarSenha()} disabled={mudandoSenha}>
              {mudandoSenha ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </GuardsLayout>
  );
};

export default GuardaPerfil;
