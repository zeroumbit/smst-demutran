import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { maskCpf, maskPhone, maskCep, isValidEmail } from '@/lib/masks';
import { ArrowLeft, User, MapPin, PhoneCall, HeartPulse, Lock, RefreshCcw, Eye, EyeOff, Info, Trash2 } from 'lucide-react';
import type { GuardaPerfil, GuardaContatoEmergencia, GuardaInformacoesSaude } from '@/types/admin';

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const PARENTESCO_OPCOES = [
  'Mãe', 'Pai', 'Irmão(ã)', 'Filho(a)', 'Esposo(a)', 'Sogro(a)', 'Amigo(a)', 'Outro',
];

const GuardaPerfilPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guarda, setGuarda] = useState<GuardaPerfil | null>(null);

  // ---- CARD 1: Dados Pessoais ----
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsAppMesmoTelefone, setWhatsAppMesmoTelefone] = useState(false);
  const [savingDados, setSavingDados] = useState(false);

  // ---- CARD 2: Endereço ----
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cep, setCep] = useState('');
  const [savingEndereco, setSavingEndereco] = useState(false);

  // ---- CARD 3: Contato de Emergência ----
  const [contatoId, setContatoId] = useState<string | null>(null);
  const [contatoNome, setContatoNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [parentescoOutro, setParentescoOutro] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');
  const [contatoWhatsapp, setContatoWhatsapp] = useState('');
  const [contatoWhatsAppMesmo, setContatoWhatsAppMesmo] = useState(false);
  const [savingContato, setSavingContato] = useState(false);
  const [deletingContato, setDeletingContato] = useState(false);

  // ---- CARD 4: Informações de Saúde ----
  const [saudeId, setSaudeId] = useState<string | null>(null);
  const [tipoSanguineo, setTipoSanguineo] = useState<string>('nao_informado');
  const [possuiAlergias, setPossuiAlergias] = useState<string>('prefiro_nao_informar');
  const [alergias, setAlergias] = useState('');
  const [possuiPatologias, setPossuiPatologias] = useState<string>('prefiro_nao_informar');
  const [patologias, setPatologias] = useState('');
  const [observacoesSaude, setObservacoesSaude] = useState('');
  const [savingSaude, setSavingSaude] = useState(false);

  // ---- CARD 5: Alterar Senha ----
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [mudandoSenha, setMudandoSenha] = useState(false);

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Dados Principais e Endereço
      const { data: guardaRes } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.user_id });
      if (guardaRes) {
        const g = guardaRes as GuardaPerfil;
        setGuarda(g);
        setNome(g.nome || '');
        setEmail(g.email || '');

        const telFormatted = g.telefone ? maskPhone(g.telefone) : '';
        const whatsFormatted = g.whatsapp ? maskPhone(g.whatsapp) : '';
        setTelefone(telFormatted);
        setWhatsapp(whatsFormatted);
        setWhatsAppMesmoTelefone(Boolean(telFormatted && whatsFormatted && telFormatted === whatsFormatted));

        setEstado(g.estado || '');
        setCidade(g.cidade || '');
        setLogradouro(g.logradouro || '');
        setNumero(g.numero || '');
        setBairro(g.bairro || '');
        setComplemento(g.complemento || '');
        setCep(g.cep ? maskCep(g.cep) : '');

        // 2. Buscar Contato de Emergência
        const { data: contatosData } = await supabase
          .from('guarda_contatos_emergencia')
          .select('*')
          .eq('guarda_id', g.id)
          .eq('principal', true)
          .limit(1)
          .maybeSingle();

        if (contatosData) {
          const c = contatosData as GuardaContatoEmergencia;
          setContatoId(c.id || null);
          setContatoNome(c.nome || '');
          setParentesco(c.parentesco || '');
          setParentescoOutro(c.parentesco_outro || '');

          const cTel = c.telefone ? maskPhone(c.telefone) : '';
          const cWhats = c.whatsapp ? maskPhone(c.whatsapp) : '';
          setContatoTelefone(cTel);
          setContatoWhatsapp(cWhats);
          setContatoWhatsAppMesmo(Boolean(cTel && cWhats && cTel === cWhats));
        } else {
          setContatoId(null);
          setContatoNome('');
          setParentesco('');
          setParentescoOutro('');
          setContatoTelefone('');
          setContatoWhatsapp('');
          setContatoWhatsAppMesmo(false);
        }

        // 3. Buscar Informações de Saúde
        const { data: saudeData } = await supabase
          .from('guarda_informacoes_saude')
          .select('*')
          .eq('guarda_id', g.id)
          .maybeSingle();

        if (saudeData) {
          const s = saudeData as GuardaInformacoesSaude;
          setSaudeId(s.id || null);
          setTipoSanguineo(s.tipo_sanguineo || 'nao_informado');
          setPossuiAlergias(s.possui_alergias || 'prefiro_nao_informar');
          setAlergias(s.alergias || '');
          setPossuiPatologias(s.possui_patologias || 'prefiro_nao_informar');
          setPatologias(s.patologias || '');
          setObservacoesSaude(s.observacoes || '');
        } else {
          setSaudeId(null);
          setTipoSanguineo('nao_informado');
          setPossuiAlergias('prefiro_nao_informar');
          setAlergias('');
          setPossuiPatologias('prefiro_nao_informar');
          setPatologias('');
          setObservacoesSaude('');
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar perfil do guarda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.user_id]);

  // Sync WhatsApp when checkbox is checked on Card 1
  const handleTelefoneChange = (val: string) => {
    const formatted = maskPhone(val);
    setTelefone(formatted);
    if (whatsAppMesmoTelefone) {
      setWhatsapp(formatted);
    }
  };

  const handleWhatsAppSameCheck = (checked: boolean) => {
    setWhatsAppMesmoTelefone(checked);
    if (checked) {
      setWhatsapp(telefone);
    }
  };

  // Sync WhatsApp when checkbox is checked on Card 3
  const handleContatoTelefoneChange = (val: string) => {
    const formatted = maskPhone(val);
    setContatoTelefone(formatted);
    if (contatoWhatsAppMesmo) {
      setContatoWhatsapp(formatted);
    }
  };

  const handleContatoWhatsAppSameCheck = (checked: boolean) => {
    setContatoWhatsAppMesmo(checked);
    if (checked) {
      setContatoWhatsapp(contatoTelefone);
    }
  };

  // ---- SALVAR DADOS PESSOAIS ----
  const handleSalvarDadosPessoais = async () => {
    if (!guarda) return;
    if (email && !isValidEmail(email)) {
      toast({ title: 'Email inválido', description: 'Por favor, insira um e-mail válido.', variant: 'destructive' });
      return;
    }
    setSavingDados(true);
    const { error } = await supabase
      .from('guardas_municipais')
      .update({
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        whatsapp: whatsapp.trim() || null,
      })
      .eq('id', guarda.id);

    if (error) {
      toast({ title: 'Erro ao salvar dados pessoais', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Dados pessoais atualizados com sucesso!' });
    }
    setSavingDados(false);
  };

  // ---- SALVAR ENDEREÇO ----
  const handleSalvarEndereco = async () => {
    if (!guarda) return;
    setSavingEndereco(true);
    const { error } = await supabase
      .from('guardas_municipais')
      .update({
        estado: estado || null,
        cidade: cidade.trim() || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        bairro: bairro.trim() || null,
        complemento: complemento.trim() || null,
        cep: cep.trim() || null,
      })
      .eq('id', guarda.id);

    if (error) {
      toast({ title: 'Erro ao salvar endereço', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Endereço atualizado com sucesso!' });
    }
    setSavingEndereco(false);
  };

  const handleLimparEndereco = async () => {
    if (!guarda) return;
    setEstado('');
    setCidade('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setComplemento('');
    setCep('');

    setSavingEndereco(true);
    const { error } = await supabase
      .from('guardas_municipais')
      .update({
        estado: null,
        cidade: null,
        logradouro: null,
        numero: null,
        bairro: null,
        complemento: null,
        cep: null,
      })
      .eq('id', guarda.id);

    if (error) {
      toast({ title: 'Erro ao limpar endereço', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Endereço removido com sucesso!' });
    }
    setSavingEndereco(false);
  };

  // ---- SALVAR CONTATO DE EMERGÊNCIA ----
  const handleSalvarContatoEmergencia = async () => {
    if (!guarda) return;
    if (!contatoNome.trim()) {
      toast({ title: 'Nome do contato é obrigatório', variant: 'destructive' });
      return;
    }
    if (!parentesco) {
      toast({ title: 'Selecione o parentesco', variant: 'destructive' });
      return;
    }
    if (parentesco === 'Outro' && !parentescoOutro.trim()) {
      toast({ title: 'Especifique o parentesco ou vínculo', variant: 'destructive' });
      return;
    }
    if (!contatoTelefone.trim()) {
      toast({ title: 'Telefone do contato é obrigatório', variant: 'destructive' });
      return;
    }

    setSavingContato(true);

    const payload = {
      guarda_id: guarda.id,
      nome: contatoNome.trim(),
      parentesco,
      parentesco_outro: parentesco === 'Outro' ? parentescoOutro.trim() : null,
      telefone: contatoTelefone.trim(),
      whatsapp: contatoWhatsapp.trim() || null,
      principal: true,
    };

    if (contatoId) {
      const { error } = await supabase
        .from('guarda_contatos_emergencia')
        .update(payload)
        .eq('id', contatoId);

      if (error) {
        toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Contato de emergência atualizado com sucesso!' });
      }
    } else {
      const { data, error } = await supabase
        .from('guarda_contatos_emergencia')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Erro ao salvar contato', description: error.message, variant: 'destructive' });
      } else {
        if (data?.id) setContatoId(data.id);
        toast({ title: 'Contato de emergência salvo com sucesso!' });
      }
    }
    setSavingContato(false);
  };

  const handleRemoverContatoEmergencia = async () => {
    if (!guarda) return;
    if (!contatoId) {
      setContatoNome('');
      setParentesco('');
      setParentescoOutro('');
      setContatoTelefone('');
      setContatoWhatsapp('');
      setContatoWhatsAppMesmo(false);
      return;
    }

    setDeletingContato(true);
    const { error } = await supabase
      .from('guarda_contatos_emergencia')
      .delete()
      .eq('id', contatoId);

    if (error) {
      toast({ title: 'Erro ao remover contato', description: error.message, variant: 'destructive' });
    } else {
      setContatoId(null);
      setContatoNome('');
      setParentesco('');
      setParentescoOutro('');
      setContatoTelefone('');
      setContatoWhatsapp('');
      setContatoWhatsAppMesmo(false);
      toast({ title: 'Contato de emergência removido.' });
    }
    setDeletingContato(false);
  };

  // ---- SALVAR INFORMAÇÕES DE SAÚDE ----
  const handleSalvarSaude = async () => {
    if (!guarda) return;
    setSavingSaude(true);

    const payload = {
      guarda_id: guarda.id,
      tipo_sanguineo: tipoSanguineo || 'nao_informado',
      possui_alergias: possuiAlergias || 'prefiro_nao_informar',
      alergias: possuiAlergias === 'sim' ? alergias.trim() : null,
      possui_patologias: possuiPatologias || 'prefiro_nao_informar',
      patologias: possuiPatologias === 'sim' ? patologias.trim() : null,
      observacoes: observacoesSaude.trim() || null,
    };

    if (saudeId) {
      const { error } = await supabase
        .from('guarda_informacoes_saude')
        .update(payload)
        .eq('id', saudeId);

      if (error) {
        toast({ title: 'Erro ao salvar informações de saúde', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Informações de saúde atualizadas com sucesso!' });
      }
    } else {
      const { data, error } = await supabase
        .from('guarda_informacoes_saude')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Erro ao salvar informações de saúde', description: error.message, variant: 'destructive' });
      } else {
        if (data?.id) setSaudeId(data.id);
        toast({ title: 'Informações de saúde salvas com sucesso!' });
      }
    }
    setSavingSaude(false);
  };

  const handleLimparSaude = async () => {
    if (!guarda) return;
    setTipoSanguineo('nao_informado');
    setPossuiAlergias('prefiro_nao_informar');
    setAlergias('');
    setPossuiPatologias('prefiro_nao_informar');
    setPatologias('');
    setObservacoesSaude('');

    if (saudeId) {
      setSavingSaude(true);
      const { error } = await supabase
        .from('guarda_informacoes_saude')
        .delete()
        .eq('id', saudeId);

      if (error) {
        toast({ title: 'Erro ao limpar informações de saúde', description: error.message, variant: 'destructive' });
      } else {
        setSaudeId(null);
        toast({ title: 'Informações de saúde removidas com sucesso!' });
      }
      setSavingSaude(false);
    }
  };

  // ---- ALTERAR SENHA ----
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
    if (novaSenha.length < 8) {
      toast({ title: 'Senha muito curta', description: 'A nova senha deve ter no mínimo 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (!/[A-Z]/.test(novaSenha) || !/[a-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha) || !/[!@#$%&*]/.test(novaSenha)) {
      toast({
        title: 'Senha fraca',
        description: 'Use ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%&*)',
        variant: 'destructive',
      });
      return;
    }
    setMudandoSenha(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
      setMudandoSenha(false);
      return;
    }

    toast({ title: 'Senha alterada com sucesso!' });
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setMudandoSenha(false);
  };

  if (loading) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">
          Carregando informações do perfil...
        </div>
      </GuardsLayout>
    );
  }

  if (!guarda) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">
          Perfil não encontrado.
        </div>
      </GuardsLayout>
    );
  }

  return (
    <GuardsLayout>
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6 pb-12">
        {/* Header Mobile */}
        <div className="flex items-center gap-1 lg:hidden px-1 py-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Meu Perfil</h1>
        </div>

        {/* Header Desktop */}
        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-4 text-white sm:px-6 sm:py-5 lg:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl md:mt-3 md:text-[26px]">Meu Perfil</h1>
              <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                Gerencie suas informações cadastrais, endereço, contato de emergência, saúde e senha.
              </p>
            </div>
            <button
              onClick={() => void loadData()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-none hover:bg-white/30"
              aria-label="Atualizar perfil"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* =====================================================
            INTERFACE EM ABAS (TABS)
            ===================================================== */}
        <Tabs defaultValue="dados-pessoais" className="w-full space-y-4">
          <div className="overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
            <TabsList className="inline-flex h-12 w-auto min-w-full justify-start rounded-2xl bg-slate-100/90 p-1.5 text-slate-600 sm:justify-center">
              <TabsTrigger
                value="dados-pessoais"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Dados Pessoais</span>
              </TabsTrigger>
              <TabsTrigger
                value="endereco"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Endereço</span>
              </TabsTrigger>
              <TabsTrigger
                value="contatos"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <PhoneCall className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Contatos</span>
              </TabsTrigger>
              <TabsTrigger
                value="saude"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <HeartPulse className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Informações de Saúde</span>
              </TabsTrigger>
              <TabsTrigger
                value="senha"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Alterar Senha</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ABA 1: DADOS PESSOAIS */}
          <TabsContent value="dados-pessoais" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <User className="h-5 w-5 text-slate-500" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Matrícula {guarda.matricula} &middot; {guarda.graduacao_nome || 'Guarda Municipal'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-xs">
                    <span className="font-semibold uppercase tracking-[0.08em] text-slate-400">CPF:</span>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{guarda.cpf ? maskCpf(guarda.cpf) : '—'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs">
                    <span className="font-semibold uppercase tracking-[0.08em] text-slate-400">Matrícula:</span>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{guarda.matricula || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs">
                    <span className="font-semibold uppercase tracking-[0.08em] text-slate-400">Cargo:</span>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{guarda.graduacao_nome || 'Guarda Municipal'}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nome</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Telefone</Label>
                    <Input
                      value={telefone}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      placeholder="(85) 99999-9999"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">WhatsApp</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                      disabled={whatsAppMesmoTelefone}
                      placeholder="(85) 99999-9999"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="whatsapp-mesmo"
                    checked={whatsAppMesmoTelefone}
                    onCheckedChange={(checked) => handleWhatsAppSameCheck(Boolean(checked))}
                  />
                  <label
                    htmlFor="whatsapp-mesmo"
                    className="text-xs font-medium text-slate-600 cursor-pointer select-none"
                  >
                    WhatsApp é o mesmo número do telefone.
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => void handleSalvarDadosPessoais()}
                    disabled={savingDados}
                    className="min-h-11 w-full rounded-xl text-[14px] font-semibold sm:w-auto px-6"
                  >
                    {savingDados ? 'Salvando...' : 'Salvar dados pessoais'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: ENDEREÇO */}
          <TabsContent value="endereco" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  Endereço
                </CardTitle>
                <CardDescription>
                  Informações de localização e residência.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Estado (UF)</Label>
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 text-[15px] font-medium">
                        <SelectValue placeholder="Selecione a UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {UFS_BRASIL.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Cidade</Label>
                    <Input
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Nome da cidade"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Logradouro</Label>
                    <Input
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Rua, Avenida, Praça..."
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Número</Label>
                    <Input
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Bairro</Label>
                    <Input
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Complemento (opcional)</Label>
                    <Input
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">CEP (opcional)</Label>
                    <Input
                      value={cep}
                      onChange={(e) => setCep(maskCep(e.target.value))}
                      placeholder="60000-000"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => void handleSalvarEndereco()}
                    disabled={savingEndereco}
                    className="min-h-11 rounded-xl text-[14px] font-semibold px-6"
                  >
                    {savingEndereco ? 'Salvando...' : 'Salvar endereço'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleLimparEndereco()}
                    disabled={savingEndereco}
                    className="min-h-11 rounded-xl text-[14px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Limpar endereço
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: CONTATOS */}
          <TabsContent value="contatos" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <PhoneCall className="h-5 w-5 text-slate-500" />
                  Contato de Emergência
                </CardTitle>
                <CardDescription>
                  Pessoa que poderá ser contatada em caso de emergência.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nome do Contato</Label>
                    <Input
                      value={contatoNome}
                      onChange={(e) => setContatoNome(e.target.value)}
                      placeholder="Nome completo"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Parentesco</Label>
                    <Select
                      value={parentesco}
                      onValueChange={(val) => {
                        setParentesco(val);
                        if (val !== 'Outro') setParentescoOutro('');
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 text-[15px] font-medium">
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARENTESCO_OPCOES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {parentesco === 'Outro' && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Qual parentesco ou vínculo?
                    </Label>
                    <Input
                      value={parentescoOutro}
                      onChange={(e) => setParentescoOutro(e.target.value)}
                      placeholder="Ex: Tio(a), Padrinho, Vizinho(a)..."
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Telefone</Label>
                    <Input
                      value={contatoTelefone}
                      onChange={(e) => handleContatoTelefoneChange(e.target.value)}
                      placeholder="(85) 99999-9999"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">WhatsApp</Label>
                    <Input
                      value={contatoWhatsapp}
                      onChange={(e) => setContatoWhatsapp(maskPhone(e.target.value))}
                      disabled={contatoWhatsAppMesmo}
                      placeholder="(85) 99999-9999"
                      className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="contato-whatsapp-mesmo"
                    checked={contatoWhatsAppMesmo}
                    onCheckedChange={(checked) => handleContatoWhatsAppSameCheck(Boolean(checked))}
                  />
                  <label
                    htmlFor="contato-whatsapp-mesmo"
                    className="text-xs font-medium text-slate-600 cursor-pointer select-none"
                  >
                    WhatsApp é o mesmo telefone.
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => void handleSalvarContatoEmergencia()}
                    disabled={savingContato}
                    className="min-h-11 rounded-xl text-[14px] font-semibold px-6"
                  >
                    {savingContato ? 'Salvando...' : 'Salvar contato'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleRemoverContatoEmergencia()}
                    disabled={deletingContato || (!contatoId && !contatoNome)}
                    className="min-h-11 rounded-xl text-[14px] font-semibold border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remover contato
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: INFORMAÇÕES DE SAÚDE */}
          <TabsContent value="saude" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <HeartPulse className="h-5 w-5 text-slate-500" />
                  Informações de Saúde
                </CardTitle>
                <CardDescription>
                  Dados relevantes para atendimento de emergência ou segurança em serviço.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="flex items-start gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/60 p-3 text-xs text-sky-800">
                  <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
                  <p className="leading-normal font-medium">
                    Informe apenas informações que considere importantes para situações de emergência ou segurança durante o serviço.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tipo Sanguíneo</Label>
                  <Select value={tipoSanguineo} onValueChange={setTipoSanguineo}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-[15px] font-medium">
                      <SelectValue placeholder="Selecione o tipo sanguíneo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="nao_informado">Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Possui alergias?</Label>
                  <Select
                    value={possuiAlergias}
                    onValueChange={(val) => {
                      setPossuiAlergias(val);
                      if (val !== 'sim') setAlergias('');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-[15px] font-medium">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {possuiAlergias === 'sim' && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Quais alergias?</Label>
                    <Textarea
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                      placeholder="Especifique medicamentos, alimentos ou outras substâncias que causam alergia..."
                      rows={3}
                      className="rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Possui alguma patologia ou condição de saúde importante?
                  </Label>
                  <Select
                    value={possuiPatologias}
                    onValueChange={(val) => {
                      setPossuiPatologias(val);
                      if (val !== 'sim') setPatologias('');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-[15px] font-medium">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {possuiPatologias === 'sim' && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Qual patologia ou condição?</Label>
                    <Textarea
                      value={patologias}
                      onChange={(e) => setPatologias(e.target.value)}
                      placeholder="Descreva a condição de saúde ou doença crônica (ex: Hipertensão, Diabetes...)"
                      rows={3}
                      className="rounded-xl border-slate-200 text-[15px] font-medium"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Observações (opcional)</Label>
                  <Textarea
                    value={observacoesSaude}
                    onChange={(e) => setObservacoesSaude(e.target.value)}
                    placeholder="Informações adicionais importantes para atendimento médico, restrições ou cuidados específicos."
                    rows={3}
                    className="rounded-xl border-slate-200 text-[15px] font-medium"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => void handleSalvarSaude()}
                    disabled={savingSaude}
                    className="min-h-11 rounded-xl text-[14px] font-semibold px-6"
                  >
                    {savingSaude ? 'Salvando...' : 'Salvar informações de saúde'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleLimparSaude()}
                    disabled={savingSaude || (!saudeId && !alergias && !patologias && !observacoesSaude && tipoSanguineo === 'nao_informado')}
                    className="min-h-11 rounded-xl text-[14px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Limpar informações de saúde
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 5: ALTERAR SENHA */}
          <TabsContent value="senha" className="mt-0">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Lock className="h-5 w-5 text-slate-500" />
                  Alterar senha
                </CardTitle>
                <CardDescription>
                  Sua senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Senha atual</Label>
                  <div className="relative">
                    <Input
                      type={showSenhaAtual ? 'text' : 'password'}
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="••••••••••"
                      className="h-11 rounded-xl border-slate-200 pr-12 text-[15px] font-medium"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
                      onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                      aria-label={showSenhaAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                    >
                      {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Nova senha</Label>
                  <div className="relative">
                    <Input
                      type={showNovaSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="••••••••••"
                      className="h-11 rounded-xl border-slate-200 pr-12 text-[15px] font-medium"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
                      onClick={() => setShowNovaSenha(!showNovaSenha)}
                      aria-label={showNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                    >
                      {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{novaSenha.length} caracteres (mínimo 8)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Confirmar nova senha</Label>
                  <Input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••••"
                    className="h-11 rounded-xl border-slate-200 text-[15px] font-medium"
                  />
                  {confirmarSenha && novaSenha !== confirmarSenha && (
                    <p className="text-xs text-rose-500 font-medium">As senhas não conferem</p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => void handleAlterarSenha()}
                    disabled={mudandoSenha}
                    className="min-h-11 w-full rounded-xl text-[14px] font-semibold sm:w-auto px-6"
                  >
                    {mudandoSenha ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </GuardsLayout>
  );
};

export default GuardaPerfilPage;
