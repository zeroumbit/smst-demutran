import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarCheck, Check, ChevronDown, ClipboardCheck, Download, FileBarChart, MapPin, Plus, Search, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { JgcAluno, JgcTurma } from '@/types/jovem-guarda';

import { JgcSaibaMaisButton, type JgcSectionKey } from './JgcPageHelpModal';

type Can = (module: string, action: string) => boolean;
type Props = { section: string; alunos: JgcAluno[]; turmas: JgcTurma[]; can: Can; reload: () => void };
type Responsavel = { id:string; aluno_id:string; nome:string; vinculo:string; telefone:string; whatsapp:string|null; email:string|null; logradouro?:string|null; numero?:string|null; bairro?:string|null; endereco:string|null; principal:boolean; autorizado_buscar:boolean; aluno?:{nome_completo:string}|null };
type Atividade = { id:string; titulo:string; tipo:string; descricao:string|null; data:string; hora_inicio:string|null; hora_fim:string|null; local:string|null; turma_id:string|null; status:string; turma?:{nome:string}|null };
type Diario = { id:string; turma_id:string; data:string; conteudo:string|null; observacoes:string|null; turma?:{nome:string}|null; frequencias?:{aluno_id:string;status:string;observacao:string|null}[]|null };
type FrequencyStatus = 'presente'|'ausente'|'justificada'|'atraso';

const today = new Date().toISOString().slice(0,10);
const dateLabel = (value:string) => new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));

export function JgcOperationalSection({ section, alunos, turmas, can, reload }:Props) {
  if (section==='responsaveis') return <Responsaveis alunos={alunos} can={can}/>;
  if (section==='diario') return <DiarioTurma alunos={alunos} turmas={turmas} can={can}/>;
  if (section==='atividades') return <Atividades turmas={turmas} can={can}/>;
  if (section==='relatorios') return <Relatorios alunos={alunos} turmas={turmas} can={can}/>;
  return null;
}

function Head({title,subtitle,action,sectionKey}:{title:string;subtitle:string;action?:React.ReactNode;sectionKey:JgcSectionKey}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5 self-end sm:self-auto">
        {action}
        <JgcSaibaMaisButton sectionKey={sectionKey} />
      </div>
    </div>
  );
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Choice({value,onChange,options,placeholder='Selecione'}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];placeholder?:string}) {
  return <Select value={value||undefined} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{options.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>;
}
function Blank({icon:Icon,title,text}:{icon:typeof UsersRound;title:string;text:string}) {
  return <div className="rounded-3xl border border-dashed bg-white/70 px-6 py-12 text-center"><Icon className="mx-auto h-8 w-8 text-teal-700"/><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}

function Responsaveis({alunos,can}:{alunos:JgcAluno[];can:Can}) {
  const [items,setItems]=useState<Responsavel[]>([]); const [open,setOpen]=useState(false); const [search,setSearch]=useState('');
  const [form,setForm]=useState({aluno_id:'',nome:'',vinculo:'',telefone:'',whatsapp:'',email:'',logradouro:'',numero:'',bairro:'',principal:false,autorizado_buscar:false});
  const load=async()=>{const {data}=await supabase.from('jgc_responsaveis').select('*, aluno:jgc_alunos(nome_completo)').order('nome');setItems((data as unknown as Responsavel[])||[])};
  useEffect(()=>{void load()},[]);
  async function save(){
    if(!form.aluno_id||!form.nome.trim()||!form.vinculo.trim()||!form.telefone.trim())
      return toast({title:'Preencha aluno, nome, vínculo e telefone',variant:'destructive'});
    const fullEndereco = [
      form.logradouro.trim(),
      form.numero.trim() ? `Nº ${form.numero.trim()}` : '',
      form.bairro.trim() ? `Bairro ${form.bairro.trim()}` : '',
    ].filter(Boolean).join(', ');
    const {error}=await supabase.from('jgc_responsaveis').insert({
      aluno_id: form.aluno_id,
      nome: form.nome.trim(),
      vinculo: form.vinculo.trim(),
      telefone: form.telefone.trim(),
      whatsapp: form.whatsapp ? form.whatsapp.trim() : null,
      email: form.email ? form.email.trim() : null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      bairro: form.bairro.trim() || null,
      endereco: fullEndereco || null,
      principal: form.principal,
      autorizado_buscar: form.autorizado_buscar,
    });
    if(error)return toast({title:'Erro ao cadastrar responsável',description:error.message,variant:'destructive'});
    toast({title:'Responsável vinculado'});
    setForm({aluno_id:'',nome:'',vinculo:'',telefone:'',whatsapp:'',email:'',logradouro:'',numero:'',bairro:'',principal:false,autorizado_buscar:false});
    setOpen(false);
    void load();
  }
  const filtered=items.filter(item=>`${item.nome} ${item.aluno?.nome_completo||''} ${item.telefone}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section>
      <Head title="Responsáveis" subtitle="Contatos familiares reutilizados diretamente na ficha do aluno" sectionKey="responsaveis" action={can('responsaveis','criar')?<Button onClick={()=>setOpen(true)} className="hidden bg-teal-700 sm:inline-flex"><Plus className="mr-2 h-4 w-4"/>Novo responsável</Button>:undefined}/>
      <div className="relative mb-4 max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
        <Input className="bg-white pl-10" placeholder="Responsável, aluno ou telefone..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {filtered.length?(
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(item=>(
            <Card key={item.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <strong>{item.nome}</strong>
                    <p className="text-sm text-slate-500">{item.vinculo} de {item.aluno?.nome_completo}</p>
                  </div>
                  {item.principal&&<Badge className="bg-teal-100 text-teal-800">Principal</Badge>}
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <p>{item.telefone}{item.whatsapp?' · WhatsApp '+item.whatsapp:''}</p>
                  {item.endereco&&<p className="mt-1 text-slate-500">{item.endereco}</p>}
                  {item.autorizado_buscar&&<p className="mt-1 text-emerald-700"><Check className="mr-1 inline h-4 w-4"/>Autorizado a buscar</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ):<Blank icon={UsersRound} title="Nenhum responsável" text="Vincule responsáveis aos alunos sem duplicar cadastros."/>}
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Novo responsável" description="O contato ficará disponível na ficha do aluno." onCancel={()=>setOpen(false)} onConfirm={save} confirmLabel="Vincular">
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Aluno *">
              <Choice value={form.aluno_id} onChange={v=>setForm({...form,aluno_id:v})} options={alunos.map(a=>({value:a.id,label:a.nome_completo}))} placeholder="Selecione o aluno"/>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Nome do responsável *">
              <Input placeholder="Nome completo do responsável" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/>
            </Field>
          </div>
          <Field label="Parentesco ou vínculo *">
            <Input placeholder="Ex: Mãe, Pai, Tutor" value={form.vinculo} onChange={e=>setForm({...form,vinculo:e.target.value})}/>
          </Field>
          <Field label="Telefone *">
            <Input placeholder="(00) 00000-0000" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/>
          </Field>
          <Field label="WhatsApp">
            <Input placeholder="(00) 00000-0000" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/>
          </Field>
          <Field label="E-mail">
            <Input type="email" placeholder="responsavel@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </Field>
          <div className="sm:col-span-2 grid grid-cols-[1fr_110px] gap-3">
            <Field label="Logradouro">
              <Input placeholder="Rua, Avenida, Travessa, etc." value={form.logradouro} onChange={e=>setForm({...form,logradouro:e.target.value})}/>
            </Field>
            <Field label="Número">
              <Input placeholder="Nº / S/N" maxLength={8} className="text-center" value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})}/>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Bairro">
              <Input placeholder="Ex: Centro" value={form.bairro} onChange={e=>setForm({...form,bairro:e.target.value})}/>
            </Field>
          </div>
          <div className="sm:col-span-2 space-y-2 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.principal} onChange={e=>setForm({...form,principal:e.target.checked})} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"/>
              <span>Responsável principal</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.autorizado_buscar} onChange={e=>setForm({...form,autorizado_buscar:e.target.checked})} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"/>
              <span>Autorizado a buscar</span>
            </label>
          </div>
        </div>
      </ResponsiveDialog>
      {can('responsaveis','criar')&&<button type="button" onClick={()=>setOpen(true)} aria-label="Novo responsável" title="Novo responsável" className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"><Plus className="h-6 w-6"/></button>}
    </section>
  );
}

function DiarioTurma({alunos,turmas,can}:{alunos:JgcAluno[];turmas:JgcTurma[];can:Can}) {
  const [tab,setTab]=useState<'chamada'|'diarios'>('diarios');
  const [openTurmaId,setOpenTurmaId]=useState<string|null>(null);
  const [data,setData]=useState(today);
  const [conteudo,setConteudo]=useState('');
  const [observacoes,setObservacoes]=useState('');
  const [frequency,setFrequency]=useState<Record<string,FrequencyStatus>>({});
  const [saving,setSaving]=useState(false);
  const [diarios,setDiarios]=useState<Diario[]>([]);
  const [loadingDiarios,setLoadingDiarios]=useState(false);
  const [turmaFilter,setTurmaFilter]=useState('');
  const [alunoFilter,setAlunoFilter]=useState('');
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const activeTurmas=turmas.filter(t=>t.status==='ativa');
  const getStudents=(turmaId:string)=>alunos.filter(a=>a.situacao==='ativo'&&(a.turma_id===turmaId||a.turmas?.some(t=>t.id===turmaId)));
  const students=openTurmaId?getStudents(openTurmaId):[];
  useEffect(()=>{if(openTurmaId)setFrequency(Object.fromEntries(students.map(a=>[a.id,'presente'])))},[openTurmaId]);
  useEffect(()=>{setFrequency(prev=>{const ids=new Set(students.map(a=>a.id));const next={...prev};students.forEach(a=>{if(!(a.id in next))next[a.id]='presente'});Object.keys(next).forEach(id=>{if(!ids.has(id))delete next[id]});return next})},[students.length]);
  async function loadDiarios(){setLoadingDiarios(true);const {data}=await supabase.from('jgc_diarios').select('*, turma:jgc_turmas(nome), frequencias:jgc_frequencias(aluno_id,status,observacao)').order('data',{ascending:false});setDiarios((data as unknown as Diario[])||[]);setLoadingDiarios(false)}
  useEffect(()=>{void loadDiarios()},[]);
  const statusCounts=(freq:Diario['frequencias'])=>{const c={presente:0,ausente:0,justificada:0,atraso:0};(freq||[]).forEach(f=>{if(f.status in c)c[f.status as keyof typeof c]++});return c};
  const statusClass=(value:string)=>value==='presente'?'bg-emerald-100 text-emerald-800':value==='ausente'?'bg-rose-100 text-rose-800':value==='justificada'?'bg-amber-100 text-amber-800':value==='atraso'?'bg-sky-100 text-sky-800':'bg-slate-100 text-slate-700';
  const filteredDiarios=turmaFilter?diarios.filter(d=>d.turma_id===turmaFilter):diarios;
  const studentRecords=alunoFilter?diarios.flatMap(d=>((turmaFilter&&d.turma_id!==turmaFilter)?[]:(d.frequencias||[]).filter(f=>f.aluno_id===alunoFilter).map(f=>({diario:d,status:f.status,observacao:f.observacao})))).sort((a,b)=>b.diario.data.localeCompare(a.diario.data)):[];
  const presentCount=studentRecords.filter(r=>r.status==='presente'||r.status==='atraso').length;
  const absentCount=studentRecords.filter(r=>r.status==='ausente'||r.status==='justificada').length;
  const percentual=studentRecords.length?Math.round(100*presentCount/studentRecords.length):0;
  async function save(){
    if(!openTurmaId||!data)return toast({title:'Selecione data',variant:'destructive'});
    setSaving(true);
    const {data:diario,error}=await supabase.from('jgc_diarios').upsert({turma_id:openTurmaId,data,conteudo:conteudo.trim()||null,observacoes:observacoes.trim()||null},{onConflict:'turma_id,data'}).select('id').single();
    if(error||!diario){setSaving(false);return toast({title:'Erro ao salvar diário',description:error?.message,variant:'destructive'})}
    const rows=students.map(a=>({diario_id:diario.id,aluno_id:a.id,status:frequency[a.id]||'presente'}));
    if(rows.length){const {error:freqError}=await supabase.from('jgc_frequencias').upsert(rows,{onConflict:'diario_id,aluno_id'});if(freqError){setSaving(false);return toast({title:'Erro ao salvar frequência',description:freqError.message,variant:'destructive'})}}
    toast({title:'Chamada registrada'});
    setSaving(false);
    setOpenTurmaId(null);
    void loadDiarios();
  }
  const tabs=<Tabs value={tab} onValueChange={v=>setTab(v as 'chamada'|'diarios')} className="w-full sm:w-80"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="diarios">Diários</TabsTrigger><TabsTrigger value="chamada">Fazer chamada</TabsTrigger></TabsList></Tabs>;
  return (
    <section>
      <Head title="Diário" subtitle="Registre a chamada e consulte os diários dos encontros" sectionKey="diario" action={tabs}/>
      {tab==='chamada'?(
        <>
          {activeTurmas.length?<div className="grid gap-4 md:grid-cols-2">{activeTurmas.map(t=>{const count=getStudents(t.id).length;return <Card key={t.id} className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between gap-4"><div><strong className="text-lg">{t.nome}</strong><p className="mt-0.5 text-sm text-slate-500">{count} aluno(s) ativo(s){t.turno?` · ${t.turno}`:''}</p></div><Button onClick={()=>{setOpenTurmaId(t.id);setData(today)}} className="shrink-0 gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={!can('frequencia','registrar')}><ClipboardCheck className="h-4 w-4"/>Fazer chamada</Button></div></CardContent></Card>})}</div>:<Blank icon={ClipboardCheck} title="Nenhuma turma ativa" text="Não há turmas ativas disponíveis para chamada."/>}
          <ResponsiveDialog open={!!openTurmaId} onOpenChange={v=>{if(!v)setOpenTurmaId(null)}} title="Fazer chamada" description={openTurmaId?`${turmas.find(t=>t.id===openTurmaId)?.nome} · ${dateLabel(data)}`:''} onCancel={()=>setOpenTurmaId(null)} onConfirm={save} confirmLabel={saving?'Salvando...':'Salvar chamada'}>
            <div className="space-y-4">
              <Field label="Data do encontro"><Input type="date" value={data} onChange={e=>setData(e.target.value)}/></Field>
              <Field label="Conteúdo trabalhado"><Textarea rows={2} placeholder="Atividades, conteúdos e temas do encontro" value={conteudo} onChange={e=>setConteudo(e.target.value)}/></Field>
              <Field label="Observações do diário"><Textarea rows={2} placeholder="Anotações sobre o andamento da turma" value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></Field>
              {students.length?<div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">{students.map(a=><div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm font-medium">{a.nome_completo}</span><div className="flex flex-wrap justify-end gap-1">{([['presente','Presente'],['ausente','Ausente'],['justificada','Justificada'],['atraso','Atraso']] as [string,string][]).map(([value,label])=><button key={value} type="button" onClick={()=>setFrequency({...frequency,[a.id]:value as FrequencyStatus})} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${frequency[a.id]===value?'bg-teal-600 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}</div></div>)}</div>:<p className="text-sm text-slate-500">Nenhum aluno ativo na turma.</p>}
            </div>
          </ResponsiveDialog>
        </>
      ):(
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Choice value={turmaFilter} onChange={setTurmaFilter} options={turmas.map(t=>({value:t.id,label:t.nome}))} placeholder="Todas as turmas"/>
            <Choice value={alunoFilter} onChange={setAlunoFilter} options={alunos.map(a=>({value:a.id,label:a.nome_completo}))} placeholder="Diário de todos os alunos"/>
            {(turmaFilter||alunoFilter)&&<Button variant="ghost" size="sm" className="w-fit" onClick={()=>{setTurmaFilter('');setAlunoFilter('')}}>Limpar filtros</Button>}
          </div>
          {loadingDiarios?<div className="grid min-h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700"/></div>:alunoFilter?(
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <ReportCard label="Encontros" value={studentRecords.length}/>
                <ReportCard label="Presenças" value={presentCount}/>
                <ReportCard label="Faltas" value={absentCount}/>
                <ReportCard label="Frequência" value={`${percentual}%`}/>
              </div>
              {studentRecords.length?<div className="space-y-3">{studentRecords.map((r,index)=><Card key={`${r.diario.id}-${index}`} className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><strong className="text-lg">{dateLabel(r.diario.data)}</strong><Badge className={`${statusClass(r.status)} border-0`}>{r.status}</Badge></div><p className="text-sm text-slate-500">{r.diario.turma?.nome||'Turma'}</p></div>{(r.diario.conteudo||r.diario.observacoes)&&<div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{r.diario.conteudo&&<p><strong className="text-slate-700">Conteúdo:</strong> {r.diario.conteudo}</p>}{r.diario.observacoes&&<p><strong className="text-slate-700">Observações:</strong> {r.diario.observacoes}</p>}</div>}</CardContent></Card>)}</div>:<Blank icon={BookOpenText} title="Sem registros" text="Ainda não há diários registrados para este aluno."/>}
            </div>
          ):filteredDiarios.length?(
            <div className="space-y-3">{filteredDiarios.map(d=>{const c=statusCounts(d.frequencias);const presentes=c.presente+c.atraso;const faltas=c.ausente+c.justificada;const total=c.presente+c.ausente+c.justificada+c.atraso;const expanded=expandedId===d.id;return <Card key={d.id} className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={()=>setExpandedId(expanded?null:d.id)}><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><BookOpenText className="h-5 w-5"/></div><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{dateLabel(d.data)}</strong><Badge variant="outline">{d.turma?.nome||'Turma'}</Badge></div><p className="mt-0.5 text-sm text-slate-500">{total?`${presentes} presente(s) · ${faltas} falta(s) · ${total} registro(s)`:'Sem chamada registrada'}</p></div></div><ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform',expanded&&'rotate-180')}/></button>{d.conteudo&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-700">Conteúdo:</strong> {d.conteudo}</p>}{d.observacoes&&<p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Observações:</strong> {d.observacoes}</p>}{expanded&&<div className="mt-3 overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left text-slate-500"><th className="p-3">Aluno</th><th className="p-3">Status</th><th className="p-3">Observação</th></tr></thead><tbody>{(d.frequencias||[]).map(f=>{const aluno=alunos.find(a=>a.id===f.aluno_id);return <tr key={f.aluno_id} className="border-b last:border-0"><td className="p-3 font-medium">{aluno?.nome_completo||'—'}</td><td className="p-3"><Badge className={`${statusClass(f.status)} border-0`}>{f.status}</Badge></td><td className="p-3 text-slate-500">{f.observacao||'—'}</td></tr>})}</tbody></table></div>}</CardContent></Card>})}</div>
          ):<Blank icon={BookOpenText} title="Nenhum diário registrado" text="As chamadas salvas aparecerão aqui para consulta."/>}
        </div>
      )}
    </section>
  );
}


function Atividades({turmas,can}:{turmas:JgcTurma[];can:Can}) {
  const [items,setItems]=useState<Atividade[]>([]);const [open,setOpen]=useState(false);
  const [form,setForm]=useState({titulo:'',tipo:'pedagogica',descricao:'',data:today,hora_inicio:'',hora_fim:'',local:'',turma_id:''});
  const load=async()=>{const {data}=await supabase.from('jgc_atividades').select('*, turma:jgc_turmas(nome)').order('data',{ascending:false});setItems((data as unknown as Atividade[])||[])};
  useEffect(()=>{void load()},[]);
  async function save(){if(!form.titulo.trim()||!form.data)return toast({title:'Informe título e data',variant:'destructive'});const payload={...form,hora_inicio:form.hora_inicio||null,hora_fim:form.hora_fim||null,local:form.local||null,turma_id:form.turma_id||null};const {error}=await supabase.from('jgc_atividades').insert(payload);if(error)return toast({title:'Erro ao criar atividade',description:error.message,variant:'destructive'});toast({title:'Atividade criada'});setOpen(false);void load()}
  async function cancel(item:Atividade){const {error}=await supabase.from('jgc_atividades').update({status:'cancelada'}).eq('id',item.id);if(error)return toast({title:'Erro ao cancelar',description:error.message,variant:'destructive'});void load()}
  return <section><Head title="Atividades" subtitle="Aulas, oficinas, eventos, visitas e ações coletivas" sectionKey="atividades" action={can('atividades','criar')?<Button onClick={()=>setOpen(true)} className="hidden bg-teal-700 sm:inline-flex"><Plus className="mr-2 h-4 w-4"/>Nova atividade</Button>:undefined}/>{items.length?<div className="grid gap-4 md:grid-cols-2">{items.map(item=><Card key={item.id} className="rounded-2xl border-0 shadow-sm"><CardHeader><div className="flex justify-between"><Badge variant="outline">{item.tipo}</Badge><Badge className={item.status==='cancelada'?'bg-rose-100 text-rose-800':'bg-emerald-100 text-emerald-800'}>{item.status}</Badge></div><CardTitle>{item.titulo}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>{item.descricao}</p><p><CalendarCheck className="mr-2 inline h-4 w-4"/>{dateLabel(item.data)} {item.hora_inicio?.slice(0,5)}</p>{item.local&&<p><MapPin className="mr-2 inline h-4 w-4"/>{item.local}</p>}<p>{item.turma?.nome||'Atividade geral'}</p>{can('atividades','excluir')&&item.status==='ativa'&&<Button variant="outline" size="sm" onClick={()=>void cancel(item)}>Cancelar atividade</Button>}</CardContent></Card>)}</div>:<Blank icon={CalendarCheck} title="Nenhuma atividade" text="Cadastre a programação socioeducativa do projeto."/>}<ResponsiveDialog open={open} onOpenChange={setOpen} title="Nova atividade" description="A atividade será associada à turma e ao histórico dos participantes." onCancel={()=>setOpen(false)} onConfirm={save} confirmLabel="Criar atividade"><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Título *"><Input placeholder="Título da atividade" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></Field></div><Field label="Tipo"><Choice value={form.tipo} onChange={v=>setForm({...form,tipo:v})} options={['pedagogica','esportiva','cultural','educativa','palestra','oficina','evento','acao_coletiva','outra'].map(v=>({value:v,label:v.replaceAll('_',' ')}))}/></Field><Field label="Data *"><Input type="date" placeholder="Data da atividade" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></Field><Field label="Turma"><Choice value={form.turma_id} onChange={v=>setForm({...form,turma_id:v})} options={turmas.map(t=>({value:t.id,label:t.nome}))}/></Field><Field label="Início"><Input type="time" placeholder="08:00" value={form.hora_inicio} onChange={e=>setForm({...form,hora_inicio:e.target.value})}/></Field><Field label="Fim"><Input type="time" placeholder="12:00" value={form.hora_fim} onChange={e=>setForm({...form,hora_fim:e.target.value})}/></Field><Field label="Local"><Input placeholder="Local da atividade" value={form.local} onChange={e=>setForm({...form,local:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="Descrição"><Textarea placeholder="Descrição detalhada da atividade" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></Field></div></div></ResponsiveDialog>{can('atividades','criar')&&<button type="button" onClick={()=>setOpen(true)} aria-label="Nova atividade" title="Nova atividade" className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"><Plus className="h-6 w-6"/></button>}</section>
}

function Relatorios({alunos,turmas,can}:{alunos:JgcAluno[];turmas:JgcTurma[];can:Can}) {
  const [frequency,setFrequency]=useState<{aluno_id:string;total:number;presencas:number;faltas:number;percentual:number}[]>([]);
  const alunoIds=useMemo(()=>alunos.map(a=>a.id),[alunos]);
  useEffect(()=>{if(!alunoIds.length){setFrequency([]);return}void supabase.from('jgc_frequencia_resumo').select('*').in('aluno_id',alunoIds).then(({data})=>setFrequency(data||[]))},[alunoIds]);
  const active=alunos.filter(a=>a.situacao==='ativo').length;const withoutClass=alunos.filter(a=>a.situacao==='ativo'&&!a.turma_id).length;
  const avg=frequency.length?frequency.reduce((sum,item)=>sum+Number(item.percentual||0),0)/frequency.length:0;
  function exportCsv(){if(!can('relatorios','exportar'))return;const rows=[['Matrícula','Aluno','Situação','Turma','Escola','Frequência'],...alunos.map(a=>[a.matricula,a.nome_completo,a.situacao,a.turma?.nome||'',a.escola_nome||'',frequency.find(f=>f.aluno_id===a.id)?.percentual?.toString()||''])];const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(';')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`jovem-guarda-${today}.csv`;link.click();URL.revokeObjectURL(url)}
  return <section><Head title="Relatórios" subtitle="Visão administrativa e pedagógica limitada aos dados autorizados" sectionKey="relatorios" action={can('relatorios','exportar')?<Button onClick={exportCsv} className="hidden bg-teal-700 sm:inline-flex"><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>:undefined}/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ReportCard label="Alunos ativos" value={active}/><ReportCard label="Turmas ativas" value={turmas.filter(t=>t.status==='ativa').length}/><ReportCard label="Sem turma" value={withoutClass}/><ReportCard label="Frequência média" value={`${avg.toFixed(1)}%`}/></div><Card className="mt-5 rounded-3xl border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-teal-700"/>Frequência individual</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Aluno</th><th className="p-3">Turma</th><th className="p-3">Presenças</th><th className="p-3">Faltas</th><th className="p-3">Percentual</th></tr></thead><tbody>{alunos.map(a=>{const f=frequency.find(item=>item.aluno_id===a.id);return <tr key={a.id} className="border-b last:border-0"><td className="p-3 font-medium">{a.nome_completo}</td><td className="p-3">{a.turma?.nome||'—'}</td><td className="p-3">{f?.presencas||0}</td><td className="p-3">{f?.faltas||0}</td><td className="p-3"><Badge className={Number(f?.percentual||0)<75?'bg-rose-100 text-rose-800':'bg-emerald-100 text-emerald-800'}>{Number(f?.percentual||0).toFixed(1)}%</Badge></td></tr>})}</tbody></table></CardContent></Card>{can('relatorios','exportar')&&<button type="button" onClick={exportCsv} aria-label="Exportar CSV" title="Exportar CSV" className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"><Download className="h-6 w-6"/></button>}</section>
}
function ReportCard({label,value}:{label:string;value:number|string}){return <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></CardContent></Card>}
