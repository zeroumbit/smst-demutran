import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowLeft, CalendarCheck, ChevronRight, ClipboardCheck,
  Clock3, FileBarChart, GraduationCap, HeartPulse, ListChecks, Plus, Search,
  ShieldCheck, Sparkles, Users, UsersRound,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { JgcAluno, JgcAtendimento, JgcPerfil, JgcPrivacidade, JgcTurma } from '@/types/jovem-guarda';
import { JgcOperationalSection } from '@/components/jgc/JgcOperationalSections';
import { JgcStudentJourney } from '@/components/jgc/JgcStudentJourney';

type Section = 'dashboard' | 'alunos' | 'responsaveis' | 'turmas' | 'diario' | 'atividades' | 'acompanhamentos' | 'relatorios';
const menu: { id: Section; label: string; icon: typeof Users; profiles: JgcPerfil[] }[] = [
  { id: 'dashboard', label: 'Visão geral', icon: Sparkles, profiles: ['gestor','administrativo','professor','multiprofissional'] },
  { id: 'alunos', label: 'Alunos', icon: Users, profiles: ['gestor','administrativo','professor','multiprofissional'] },
  { id: 'responsaveis', label: 'Responsáveis', icon: UsersRound, profiles: ['gestor','administrativo','multiprofissional'] },
  { id: 'turmas', label: 'Turmas', icon: UsersRound, profiles: ['gestor','administrativo'] },
  { id: 'diario', label: 'Diário', icon: ClipboardCheck, profiles: ['gestor','professor'] },
  { id: 'atividades', label: 'Atividades', icon: CalendarCheck, profiles: ['gestor','professor'] },
  { id: 'acompanhamentos', label: 'Acompanhamentos', icon: HeartPulse, profiles: ['gestor','multiprofissional'] },
  { id: 'relatorios', label: 'Relatórios', icon: FileBarChart, profiles: ['gestor','administrativo','professor','multiprofissional'] },
];

const today = new Date().toISOString().slice(0, 10);
const initialStudent = {
  nome_completo: '', data_nascimento: '', cpf: '', nis: '', naturalidade_cidade: '', naturalidade_uf: '',
  data_entrada: today, serie_ano: '', escola_nome: '', turno_escola: '', horario_escola: '', turma_id: '',
  projeto_hora_inicio: '', projeto_hora_fim: '', situacao: 'ativo', tipo_sanguineo: 'nao_informado',
  possui_condicao: 'nao_informado', condicao_saude: '', usa_medicamento: 'nao_informado',
  medicamentos: '', orientacao_medicamento: '',
};
const dateLabel = (value?: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value.slice(0,10)}T12:00:00Z`))
  : '—';
const statusClass = (value: string) => value === 'ativo' || value === 'ativa'
  ? 'bg-emerald-100 text-emerald-800' : value === 'afastado' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';

export default function JovemGuardaCidada() {
  const { profile: account, isSuperAdmin } = useAuth();
  const { section = 'dashboard', alunoId } = useParams<{ section?: Section; alunoId?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<JgcPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<JgcAluno[]>([]);
  const [turmas, setTurmas] = useState<JgcTurma[]>([]);
  const [atendimentos, setAtendimentos] = useState<JgcAtendimento[]>([]);
  const [actions, setActions] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [search, setSearch] = useState('');
  const [studentOpen, setStudentOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [student, setStudent] = useState({ ...initialStudent });
  const [classForm, setClassForm] = useState({ nome: '', descricao: '', turno: '', hora_inicio: '', hora_fim: '' });
  const [service, setService] = useState({
    aluno_id: alunoId || '', data: today, hora: new Date().toTimeString().slice(0,5),
    area_profissional: '', tipo: 'individual', motivo: '', origem: 'demanda_espontanea',
    relato: '', marcadores: '', privacidade: 'restrito' as JgcPrivacidade,
    necessita_retorno: false, retorno_data: '', retorno_motivo: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s, c, v, a, e] = await Promise.all([
      supabase.rpc('jgc_perfil_atual'),
      supabase.from('jgc_alunos').select('*, turma:jgc_turmas(nome), saude:jgc_aluno_saude(*)').is('deleted_at', null).order('nome_completo'),
      supabase.from('jgc_turmas').select('*').order('nome'),
      supabase.from('jgc_atendimentos').select('*, aluno:jgc_alunos(nome_completo,matricula)').is('deleted_at', null).order('data', { ascending: false }).limit(50),
      supabase.from('jgc_acoes').select('*', { count: 'exact', head: true }).in('status', ['pendente','em_andamento']),
      supabase.from('jgc_encaminhamentos').select('*', { count: 'exact', head: true }).in('status', ['pendente','encaminhado','em_acompanhamento']),
    ]);
    setProfile((p.data as JgcPerfil | null) || null);
    setAlunos((s.data as unknown as JgcAluno[]) || []);
    setTurmas((c.data as JgcTurma[]) || []);
    setAtendimentos((v.data as unknown as JgcAtendimento[]) || []);
    setActions(a.count || 0); setReferrals(e.count || 0); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visibleMenu = useMemo(() => menu.filter(item => profile && item.profiles.includes(profile)), [profile]);
  const active = menu.some(item => item.id === section) ? section : 'dashboard';
  const selected = alunos.find(item => item.id === alunoId);
  const filtered = alunos.filter(item => `${item.nome_completo} ${item.matricula} ${item.escola_nome || ''}`.toLowerCase().includes(search.toLowerCase()));
  const moduleForSection: Record<Section, string> = {
    dashboard: 'jgc_dashboard', alunos: 'jgc_alunos', responsaveis: 'jgc_responsaveis',
    turmas: 'jgc_turmas', diario: 'jgc_frequencia', atividades: 'jgc_atividades',
    acompanhamentos: 'jgc_acompanhamentos', relatorios: 'jgc_relatorios',
  };
  const unrestricted = isSuperAdmin || account?.papel === 'gestor' || account?.papel === 'admin_setor';
  const hasModule = (moduleId: string) => unrestricted || !!account?.modulos?.includes(moduleId);
  const can = (moduleId: string, action: string) =>
    unrestricted || !!account?.modulos?.includes(`jovem_guarda.${moduleId}.${action}`);
  const allowedMenu = visibleMenu.filter(item => hasModule(moduleForSection[item.id]));
  if (!loading && !profile) return <Navigate to="/admin/dashboard/jovem-guarda" replace />;
  if (!loading && ((alunoId && !hasModule('jgc_alunos')) || (!alunoId && !hasModule(moduleForSection[active])))) {
    const firstAllowed = allowedMenu[0]?.id;
    if (firstAllowed) return <Navigate to={`/admin/dashboard/jovem-guarda/${firstAllowed}`} replace />;
    return <AdminLayout><Empty icon={ShieldCheck} title="Sem módulos liberados" text="Você não possui permissão para acessar os módulos do Jovem Guarda."/></AdminLayout>;
  }

  async function saveStudent() {
    if (!can('alunos','criar')) return;
    if (!student.nome_completo.trim() || !student.data_nascimento) {
      toast({ title: 'Informe nome e data de nascimento', variant: 'destructive' }); return;
    }
    const { error } = await supabase.rpc('jgc_criar_aluno', { _dados: student });
    if (error) { toast({ title: 'Não foi possível cadastrar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Aluno cadastrado', description: 'Matrícula gerada automaticamente pelo sistema.' });
    setStudentOpen(false); setStudent({ ...initialStudent }); void load();
  }
  async function saveClass() {
    if (!can('turmas','criar')) return;
    if (!classForm.nome.trim()) { toast({ title: 'Informe o nome da turma', variant: 'destructive' }); return; }
    const payload = Object.fromEntries(Object.entries(classForm).map(([key,value]) => [key, value || null]));
    const { error } = await supabase.from('jgc_turmas').insert(payload);
    if (error) { toast({ title: 'Não foi possível criar a turma', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Turma criada' }); setClassOpen(false); void load();
  }
  async function saveService() {
    if (!can('acompanhamento','criar')) return;
    if (!service.aluno_id || !service.area_profissional.trim() || !service.motivo.trim() || !service.relato.trim()) {
      toast({ title: 'Preencha aluno, área, motivo e relato', variant: 'destructive' }); return;
    }
    const payload = {
      ...service,
      marcadores: service.marcadores.split(',').map(value => value.trim()).filter(Boolean),
      retorno_data: service.necessita_retorno ? service.retorno_data || null : null,
      retorno_motivo: service.necessita_retorno ? service.retorno_motivo || null : null,
    };
    const { error } = await supabase.from('jgc_atendimentos').insert(payload);
    if (error) { toast({ title: 'Não foi possível registrar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Atendimento registrado com auditoria' }); setServiceOpen(false); void load();
  }

  return <AdminLayout>
    <div className="min-h-[calc(100vh-8rem)] rounded-[2rem] bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,.12),_transparent_35%),linear-gradient(145deg,#f8fafc,#f0fdfa)] p-3 sm:p-6">
      <header className="mb-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 px-5 py-6 text-white shadow-xl shadow-teal-950/15 sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-teal-200"><ShieldCheck className="h-4 w-4"/>Jovem Guarda Cidadã</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cuidar da trajetória, agir no momento certo.</h1>
            <p className="mt-2 max-w-2xl text-sm text-teal-50/75">Acompanhamento socioeducativo organizado em torno de cada jovem.</p>
          </div>
          <Badge className="w-fit border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">{profile || 'carregando'} · acesso protegido</Badge>
        </div>
      </header>
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {allowedMenu.map(({ id, label, icon: Icon }) => <Link key={id} to={`/admin/dashboard/jovem-guarda/${id}`} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${active === id && !alunoId ? 'bg-teal-700 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-800'}`}><Icon className="h-4 w-4"/>{label}</Link>)}
      </nav>
      {loading ? <div className="grid min-h-72 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700"/></div>
      : selected ? <StudentDetail student={selected} services={atendimentos.filter(item => item.aluno_id === selected.id)} profile={profile!} can={can} onBack={() => navigate('/admin/dashboard/jovem-guarda/alunos')} onService={() => { setService(value => ({ ...value, aluno_id: selected.id })); setServiceOpen(true); }}/>
      : active === 'dashboard' ? <Dashboard profile={profile!} alunos={alunos} turmas={turmas} services={atendimentos} actions={actions} referrals={referrals} onStudent={can('alunos','criar') ? () => setStudentOpen(true) : undefined} onService={can('acompanhamento','criar') ? () => setServiceOpen(true) : undefined}/>
      : active === 'alunos' ? <section><PageHead title="Alunos" subtitle="Cadastro e trajetória centralizada do jovem" action={can('alunos','criar') && <Button onClick={() => setStudentOpen(true)} className="gap-2 bg-teal-700 hover:bg-teal-800"><Plus className="h-4 w-4"/>Novo aluno</Button>}/>
        <div className="relative mb-4 max-w-xl"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, matrícula ou escola..." className="bg-white pl-10"/></div>
        {filtered.length ? <div className="grid gap-3">{filtered.map(item => <button key={item.id} onClick={() => navigate(`/admin/dashboard/jovem-guarda/alunos/${item.id}`)} className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"><Initials name={item.nome_completo}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-slate-900">{item.nome_completo}</strong><Badge className={`${statusClass(item.situacao)} border-0`}>{item.situacao}</Badge></div><p className="mt-1 truncate text-sm text-slate-500">{item.matricula} · {item.turma?.nome || 'Sem turma'} · {item.escola_nome || 'Escola não informada'}</p></div><ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-600"/></button>)}</div> : <Empty icon={Users} title="Nenhum aluno encontrado" text="Cadastre o primeiro participante ou ajuste sua busca."/>}
      </section>
      : active === 'turmas' ? <section><PageHead title="Turmas" subtitle="Organize horários, professores e participantes" action={<Button onClick={() => setClassOpen(true)} className="gap-2 bg-teal-700"><Plus className="h-4 w-4"/>Nova turma</Button>}/>{turmas.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{turmas.map(item => <Card key={item.id} className="rounded-2xl border-0 shadow-sm"><CardHeader><div className="flex justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><GraduationCap/></div><Badge className={`${statusClass(item.status)} border-0`}>{item.status}</Badge></div><CardTitle className="pt-3">{item.nome}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>{item.descricao || 'Sem descrição'}</p><p><Clock3 className="mr-2 inline h-4 w-4"/>{item.turno || 'Turno livre'} · {item.hora_inicio?.slice(0,5) || '—'} às {item.hora_fim?.slice(0,5) || '—'}</p><p><Users className="mr-2 inline h-4 w-4"/>{alunos.filter(studentItem => studentItem.turma_id === item.id).length} aluno(s)</p></CardContent></Card>)}</div> : <Empty icon={UsersRound} title="Nenhuma turma cadastrada" text="Crie uma turma e depois vincule os alunos."/>}</section>
      : active === 'acompanhamentos' ? <section><PageHead title="Acompanhamentos" subtitle="Atendimentos, retornos, ações e encaminhamentos" action={<Button onClick={() => setServiceOpen(true)} className="gap-2 bg-teal-700"><Plus className="h-4 w-4"/>Registrar atendimento</Button>}/><div className="mb-5 grid gap-3 sm:grid-cols-3"><Stat label="Atendimentos visíveis" value={atendimentos.length} icon={HeartPulse}/><Stat label="Ações abertas" value={actions} icon={ListChecks}/><Stat label="Encaminhamentos" value={referrals} icon={ChevronRight}/></div>{atendimentos.length ? <div className="space-y-3">{atendimentos.map(item => <Card key={item.id} className="rounded-2xl border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700"><HeartPulse/></div><div className="flex-1"><div className="flex flex-wrap gap-2"><strong>{item.aluno?.nome_completo}</strong><Badge variant="outline">{item.tipo}</Badge><Badge variant="outline">{item.privacidade}</Badge></div><p className="mt-1 text-sm text-slate-600">{item.motivo}</p><p className="mt-1 text-xs text-slate-400">{dateLabel(item.data)} · {item.area_profissional}</p></div>{item.necessita_retorno && <Badge className="bg-amber-100 text-amber-800">Retorno {dateLabel(item.retorno_data)}</Badge>}</CardContent></Card>)}</div> : <Empty icon={HeartPulse} title="Nenhum atendimento visível" text="Novos registros aparecerão conforme seu nível de acesso."/>}</section>
      : <JgcOperationalSection section={active} alunos={alunos} turmas={turmas} can={can} reload={load}/>}
    </div>

    <ResponsiveDialog open={studentOpen} onOpenChange={setStudentOpen} title="Novo aluno" description="A matrícula será gerada automaticamente pelo backend." onCancel={() => setStudentOpen(false)} onConfirm={saveStudent} confirmLabel="Cadastrar aluno">
      <Tabs defaultValue="pessoal" className="py-2">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="pessoal">Pessoal</TabsTrigger><TabsTrigger value="escola">Escola</TabsTrigger><TabsTrigger value="projeto">Projeto</TabsTrigger><TabsTrigger value="saude">Saúde</TabsTrigger></TabsList>
        <TabsContent value="pessoal"><Grid><Field label="Nome completo *"><Input value={student.nome_completo} onChange={event => setStudent({ ...student, nome_completo: event.target.value })}/></Field><Field label="Data de nascimento *"><Input type="date" value={student.data_nascimento} onChange={event => setStudent({ ...student, data_nascimento: event.target.value })}/></Field><Field label="CPF"><Input inputMode="numeric" maxLength={11} value={student.cpf} onChange={event => setStudent({ ...student, cpf: event.target.value.replace(/\D/g,'').slice(0,11) })}/></Field><Field label="NIS"><Input value={student.nis} onChange={event => setStudent({ ...student, nis: event.target.value })}/></Field><Field label="Cidade de nascimento"><Input value={student.naturalidade_cidade} onChange={event => setStudent({ ...student, naturalidade_cidade: event.target.value })}/></Field><Field label="UF"><Input maxLength={2} value={student.naturalidade_uf} onChange={event => setStudent({ ...student, naturalidade_uf: event.target.value.toUpperCase() })}/></Field></Grid></TabsContent>
        <TabsContent value="escola"><Grid><Field label="Série/Ano"><Input value={student.serie_ano} onChange={event => setStudent({ ...student, serie_ano: event.target.value })}/></Field><Field label="Escola"><Input list="jgc-schools" value={student.escola_nome} onChange={event => setStudent({ ...student, escola_nome: event.target.value })}/><datalist id="jgc-schools">{[...new Set(alunos.map(item => item.escola_nome).filter(Boolean))].map(value => <option key={value!} value={value!}/>)}</datalist></Field><Field label="Turno"><Choice value={student.turno_escola} onChange={value => setStudent({ ...student, turno_escola: value })} options={['manha','tarde','noite','integral']}/></Field><Field label="Horário detalhado"><Input placeholder="07:00 às 11:30" value={student.horario_escola} onChange={event => setStudent({ ...student, horario_escola: event.target.value })}/></Field></Grid></TabsContent>
        <TabsContent value="projeto"><Grid><Field label="Data de entrada"><Input type="date" value={student.data_entrada} onChange={event => setStudent({ ...student, data_entrada: event.target.value })}/></Field><Field label="Turma"><Choice value={student.turma_id} onChange={value => { const selectedClass = turmas.find(item => item.id === value); setStudent({ ...student, turma_id: value, projeto_hora_inicio: selectedClass?.hora_inicio?.slice(0,5) || '', projeto_hora_fim: selectedClass?.hora_fim?.slice(0,5) || '' }); }} options={turmas.map(item => ({ value: item.id, label: item.nome }))}/></Field><Field label="Entrada"><Input type="time" value={student.projeto_hora_inicio} onChange={event => setStudent({ ...student, projeto_hora_inicio: event.target.value })}/></Field><Field label="Saída"><Input type="time" value={student.projeto_hora_fim} onChange={event => setStudent({ ...student, projeto_hora_fim: event.target.value })}/></Field></Grid></TabsContent>
        <TabsContent value="saude"><div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Informações essenciais à segurança. Esta seção não é prontuário médico.</div><Grid><Field label="Tipo sanguíneo"><Choice value={student.tipo_sanguineo} onChange={value => setStudent({ ...student, tipo_sanguineo: value })} options={['A+','A-','B+','B-','AB+','AB-','O+','O-','nao_informado']}/></Field><Field label="Possui condição de saúde?"><Choice value={student.possui_condicao} onChange={value => setStudent({ ...student, possui_condicao: value })} options={['sim','nao','nao_informado']}/></Field>{student.possui_condicao === 'sim' && <Field label="Qual condição?"><Textarea value={student.condicao_saude} onChange={event => setStudent({ ...student, condicao_saude: event.target.value })}/></Field>}<Field label="Usa medicamento?"><Choice value={student.usa_medicamento} onChange={value => setStudent({ ...student, usa_medicamento: value })} options={['sim','nao','nao_informado']}/></Field>{student.usa_medicamento === 'sim' && <Field label="Medicamento(s)"><Textarea value={student.medicamentos} onChange={event => setStudent({ ...student, medicamentos: event.target.value })}/></Field>}</Grid></TabsContent>
      </Tabs>
    </ResponsiveDialog>
    <ResponsiveDialog open={classOpen} onOpenChange={setClassOpen} title="Nova turma" description="O horário padrão será sugerido nos cadastros dos alunos." onCancel={() => setClassOpen(false)} onConfirm={saveClass} confirmLabel="Criar turma"><Grid><Field label="Nome *"><Input value={classForm.nome} onChange={event => setClassForm({ ...classForm, nome: event.target.value })}/></Field><Field label="Turno"><Choice value={classForm.turno} onChange={value => setClassForm({ ...classForm, turno: value })} options={['manha','tarde','noite','integral']}/></Field><Field label="Hora inicial"><Input type="time" value={classForm.hora_inicio} onChange={event => setClassForm({ ...classForm, hora_inicio: event.target.value })}/></Field><Field label="Hora final"><Input type="time" value={classForm.hora_fim} onChange={event => setClassForm({ ...classForm, hora_fim: event.target.value })}/></Field><Field label="Descrição"><Textarea value={classForm.descricao} onChange={event => setClassForm({ ...classForm, descricao: event.target.value })}/></Field></Grid></ResponsiveDialog>
    <ResponsiveDialog open={serviceOpen} onOpenChange={setServiceOpen} title="Registro de atendimento" description="O registro será auditado e respeitará o nível de privacidade." onCancel={() => setServiceOpen(false)} onConfirm={saveService} confirmLabel="Salvar atendimento"><div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2"><Grid><Field label="Aluno *"><Choice value={service.aluno_id} onChange={value => setService({ ...service, aluno_id: value })} options={alunos.map(item => ({ value: item.id, label: `${item.nome_completo} · ${item.matricula}` }))}/></Field><Field label="Área profissional *"><Input placeholder="Psicologia, Serviço Social..." value={service.area_profissional} onChange={event => setService({ ...service, area_profissional: event.target.value })}/></Field><Field label="Tipo"><Choice value={service.tipo} onChange={value => setService({ ...service, tipo: value })} options={['individual','familiar','grupo','com_responsavel','visita','contato_telefonico','outro']}/></Field><Field label="Privacidade"><Choice value={service.privacidade} onChange={value => setService({ ...service, privacidade: value as JgcPrivacidade })} options={['compartilhado','restrito','sigiloso']}/></Field></Grid><Field label="Motivo principal *"><Input value={service.motivo} onChange={event => setService({ ...service, motivo: event.target.value })}/></Field><Field label="Relato do atendimento *"><Textarea rows={5} value={service.relato} onChange={event => setService({ ...service, relato: event.target.value })}/></Field><Field label="Marcadores, separados por vírgula"><Input placeholder="Familiar, Frequência, Pedagógico" value={service.marcadores} onChange={event => setService({ ...service, marcadores: event.target.value })}/></Field><label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={service.necessita_retorno} onChange={event => setService({ ...service, necessita_retorno: event.target.checked })}/>Necessita acompanhamento futuro</label>{service.necessita_retorno && <Grid><Field label="Data prevista"><Input type="date" value={service.retorno_data} onChange={event => setService({ ...service, retorno_data: event.target.value })}/></Field><Field label="Motivo do retorno"><Input value={service.retorno_motivo} onChange={event => setService({ ...service, retorno_motivo: event.target.value })}/></Field></Grid>}</div></ResponsiveDialog>
  </AdminLayout>;
}

function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{action}</div>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 py-3 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Choice({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: (string | { value: string; label: string })[] }) {
  return <Select value={value || undefined} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{options.map(option => { const item = typeof option === 'string' ? { value: option, label: option.replaceAll('_',' ') } : option; return <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>; })}</SelectContent></Select>;
}
function Initials({ name }: { name: string }) { return <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 font-bold text-teal-800">{name.split(' ').slice(0,2).map(value => value[0]).join('')}</div>; }
function Empty({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6"/></div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p></div>; }
function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-5 w-5"/></div><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div></CardContent></Card>; }

function Dashboard({ profile, alunos, turmas, services, actions, referrals, onStudent, onService }: { profile: JgcPerfil; alunos: JgcAluno[]; turmas: JgcTurma[]; services: JgcAtendimento[]; actions: number; referrals: number; onStudent?: () => void; onService?: () => void }) {
  const multi = profile === 'multiprofissional'; const professor = profile === 'professor';
  return <section><PageHead title={`Painel ${profile}`} subtitle={multi ? 'Priorize retornos e pendências que exigem ação.' : professor ? 'Sua rotina de turmas e chamadas em um só lugar.' : 'Indicadores essenciais do programa.'} action={multi ? <Button onClick={onService} className="bg-teal-700"><Plus className="mr-2 h-4 w-4"/>Atendimento</Button> : professor ? <Button asChild className="bg-amber-400 text-slate-950 hover:bg-amber-300"><Link to="/admin/dashboard/jovem-guarda/diario"><ClipboardCheck className="mr-2 h-4 w-4"/>Fazer chamada</Link></Button> : <Button onClick={onStudent} className="bg-teal-700"><Plus className="mr-2 h-4 w-4"/>Novo aluno</Button>}/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Alunos ativos" value={alunos.filter(item => item.situacao === 'ativo').length} icon={Users}/><Stat label="Turmas ativas" value={turmas.filter(item => item.status === 'ativa').length} icon={GraduationCap}/><Stat label="Atendimentos" value={services.length} icon={HeartPulse}/><Stat label="Ações abertas" value={actions} icon={AlertTriangle}/></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><Card className="rounded-3xl border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-teal-700"/>Movimentação recente</CardTitle></CardHeader><CardContent>{services.length ? <div className="space-y-4">{services.slice(0,5).map(item => <div key={item.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-1 h-2 w-2 rounded-full bg-teal-500"/><div><strong className="text-sm">{item.aluno?.nome_completo}</strong><p className="text-sm text-slate-500">{item.motivo}</p><span className="text-xs text-slate-400">{dateLabel(item.data)}</span></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">A movimentação aparecerá aqui.</p>}</CardContent></Card><Card className="rounded-3xl border-0 bg-slate-950 text-white shadow-sm"><CardHeader><CardTitle className="text-lg">Exige atenção</CardTitle></CardHeader><CardContent className="space-y-3"><Attention label="Ações em aberto" value={actions}/><Attention label="Encaminhamentos" value={referrals}/><Attention label="Retornos agendados" value={services.filter(item => item.necessita_retorno).length}/><Attention label="Alunos sem turma" value={alunos.filter(item => !item.turma_id && item.situacao === 'ativo').length}/></CardContent></Card></div></section>;
}
function Attention({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3"><span className="text-sm text-slate-200">{label}</span><strong className="grid h-8 min-w-8 place-items-center rounded-lg bg-amber-400 px-2 text-slate-950">{value}</strong></div>; }

function StudentDetail({ student, services, profile, onBack, onService, can }: { student: JgcAluno; services: JgcAtendimento[]; profile: JgcPerfil; onBack: () => void; onService: () => void; can: (module:string,action:string)=>boolean }) {
  const canSensitive = profile === 'gestor' || profile === 'multiprofissional';
  return <JgcStudentJourney student={student} services={services} profile={profile} onBack={onBack} onService={onService} can={can}/>;
  return <section><button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-medium text-teal-800"><ArrowLeft className="h-4 w-4"/>Voltar aos alunos</button><div className="mb-5 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center"><Initials name={student.nome_completo}/><div className="flex-1"><div className="flex flex-wrap gap-2"><h2 className="text-2xl font-bold">{student.nome_completo}</h2><Badge className={`${statusClass(student.situacao)} border-0`}>{student.situacao}</Badge></div><p className="mt-1 text-sm text-slate-500">{student.matricula} · Entrada em {dateLabel(student.data_entrada)}</p></div>{canSensitive && <Button onClick={onService} className="bg-teal-700"><Plus className="mr-2 h-4 w-4"/>Atendimento</Button>}</div><Tabs defaultValue="geral"><TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto bg-white p-1"><TabsTrigger value="geral">Visão geral</TabsTrigger><TabsTrigger value="frequencia">Frequência</TabsTrigger>{canSensitive && <TabsTrigger value="acompanhamentos">Acompanhamentos</TabsTrigger>}<TabsTrigger value="familia">Família</TabsTrigger>{canSensitive && <TabsTrigger value="saude">Saúde</TabsTrigger>}<TabsTrigger value="historico">Histórico</TabsTrigger></TabsList><TabsContent value="geral"><div className="grid gap-4 md:grid-cols-2"><Info title="Escola e projeto" rows={[['Escola',student.escola_nome],['Série/Ano',student.serie_ano],['Turma',student.turma?.nome],['Horário',`${student.projeto_hora_inicio?.slice(0,5) || '—'} às ${student.projeto_hora_fim?.slice(0,5) || '—'}`]]}/><Info title="Dados pessoais" rows={[['Nascimento',dateLabel(student.data_nascimento)],['Naturalidade',[student.naturalidade_cidade,student.naturalidade_uf].filter(Boolean).join(' - ')],['CPF',student.cpf ? `•••.•••.•••-${student.cpf.slice(-2)}` : 'Não informado'],['NIS',student.nis ? 'Informado' : 'Não informado']]}/></div></TabsContent><TabsContent value="frequencia"><Empty icon={ClipboardCheck} title="Frequência individual" text="As chamadas do Diário de Turma serão consolidadas aqui."/></TabsContent>{canSensitive && <TabsContent value="acompanhamentos">{services.length ? <div className="space-y-3">{services.map(item => <Card key={item.id}><CardContent className="p-4"><div className="flex justify-between"><strong>{item.motivo}</strong><Badge variant="outline">{item.privacidade}</Badge></div><p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.relato}</p><p className="mt-2 text-xs text-slate-400">{dateLabel(item.data)} · {item.area_profissional}</p></CardContent></Card>)}</div> : <Empty icon={HeartPulse} title="Sem acompanhamentos visíveis" text="Registros aparecerão conforme seu nível de acesso."/>}</TabsContent>}<TabsContent value="familia"><Empty icon={UsersRound} title="Família e responsáveis" text="Responsáveis e ações familiares são reunidos nesta visão."/></TabsContent>{canSensitive && <TabsContent value="saude"><Info title="Informações essenciais de saúde" rows={[['Tipo sanguíneo',student.saude?.tipo_sanguineo],['Condição',student.saude?.possui_condicao === 'sim' ? student.saude.condicao_saude : 'Não informada'],['Medicamentos',student.saude?.usa_medicamento === 'sim' ? student.saude.medicamentos : 'Não informado'],['Orientação',student.saude?.orientacao_medicamento]]}/></TabsContent>}<TabsContent value="historico"><Empty icon={Clock3} title="Linha do tempo" text="Mudanças de turma, atividades, frequência e acompanhamentos autorizados serão reunidos aqui."/></TabsContent></Tabs></section>;
}
function Info({ title, rows }: { title: string; rows: [string,string | null | undefined][] }) { return <Card className="rounded-2xl border-0 shadow-sm"><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="divide-y">{rows.map(([key,value]) => <div key={key} className="flex justify-between gap-4 py-3 text-sm"><span className="text-slate-500">{key}</span><strong className="text-right text-slate-800">{value || 'Não informado'}</strong></div>)}</CardContent></Card>; }
function PendingSection({ section }: { section: Section }) {
  const info = { diario: ['Diário de Turma','Chamada, conteúdo, atividade e observações por encontro.',ClipboardCheck], atividades: ['Atividades','Oficinas, eventos e ações pedagógicas, esportivas e culturais.',CalendarCheck], relatorios: ['Relatórios','Indicadores conforme o perfil e a privacidade dos dados.',FileBarChart] } as const;
  const [title, text, Icon] = info[section as keyof typeof info] || ['Módulo','',Sparkles];
  return <section><PageHead title={title} subtitle={text}/><Empty icon={Icon} title={`${title} preparado`} text="A estrutura segura de banco, vínculos e permissões está pronta para consolidar os registros desta área."/></section>;
}
