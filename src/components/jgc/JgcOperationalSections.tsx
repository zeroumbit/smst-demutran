import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarCheck, Check, ChevronDown, ClipboardCheck, FileBarChart, FileText, MapPin, Pencil, Plus, Printer, Search, UsersRound } from 'lucide-react';
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
import { printHtml } from '@/lib/reports';
import type { JgcAluno, JgcPerfil, JgcTurma } from '@/types/jovem-guarda';

import { JgcSaibaMaisButton, type JgcSectionKey } from './JgcPageHelpModal';

type Can = (module: string, action: string) => boolean;
type Props = { section: string; alunos: JgcAluno[]; turmas: JgcTurma[]; can: Can; reload: () => void; profile?: JgcPerfil | null };
type Responsavel = { id:string; aluno_id:string; nome:string; vinculo:string; telefone:string; whatsapp:string|null; email:string|null; logradouro?:string|null; numero?:string|null; bairro?:string|null; endereco:string|null; principal:boolean; autorizado_buscar:boolean; aluno?:{nome_completo:string}|null };
type Atividade = { id:string; titulo:string; tipo:string; descricao:string|null; data:string; hora_inicio:string|null; hora_fim:string|null; local:string|null; turma_id:string|null; status:string; turma?:{nome:string}|null };
type Diario = { id:string; turma_id:string; data:string; conteudo:string|null; observacoes:string|null; turma?:{nome:string}|null; frequencias?:{aluno_id:string;status:string;observacao:string|null}[]|null };
type FrequencyStatus = 'presente'|'ausente'|'justificada'|'atraso';
type DiarioGeralStatus = 'presente' | 'ausente' | 'justificada' | 'atraso';

type DiarioGeralItem = {
  id: string;
  data: string;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  alunos?: { id?: string; chamada_geral_id?: string; aluno_id: string; status: DiarioGeralStatus; observacao?: string | null }[] | null;
};

const today = new Date().toISOString().slice(0,10);
const dateLabel = (value:string) => new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));

export function JgcOperationalSection({ section, alunos, turmas, can, reload, profile }:Props) {
  if (section==='responsaveis') return <Responsaveis alunos={alunos} can={can}/>;
  if (section==='diario') return <DiarioTurma alunos={alunos} turmas={turmas} can={can} profile={profile}/>;
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
  const safeValue = !value ? '__empty__' : value;
  const safeOptions = options.map(item => ({
    value: !item.value ? '__empty__' : item.value,
    label: item.label
  }));
  const handleValueChange = (val: string) => {
    onChange(val === '__empty__' ? '' : val);
  };
  return (
    <Select value={safeValue} onValueChange={handleValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder}/></SelectTrigger>
      <SelectContent>
        {safeOptions.map(item => (
          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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

function imprimirChamadaGeralDia(diarioGeral: DiarioGeralItem, alunos: JgcAluno[]) {
  const activeStudents = alunos.filter(a => a.situacao === 'ativo');
  const recordMap = new Map((diarioGeral.alunos || []).map(a => [a.aluno_id, a]));

  let totalPresentes = 0;
  let totalFaltas = 0;
  let totalJustificadas = 0;
  let totalAtrasos = 0;

  activeStudents.forEach(a => {
    const status = recordMap.get(a.id)?.status || 'presente';
    if (status === 'presente') totalPresentes++;
    else if (status === 'ausente') totalFaltas++;
    else if (status === 'justificada') totalJustificadas++;
    else if (status === 'atraso') totalAtrasos++;
  });

  const totalRegistros = activeStudents.length;
  const presenciaPct = totalRegistros ? Math.round(((totalPresentes + totalAtrasos) / totalRegistros) * 100) : 0;
  const dataFormatada = dateLabel(diarioGeral.data);

  const rowsHtml = activeStudents.map((a, idx) => {
    const rec = recordMap.get(a.id);
    const st = rec?.status || 'presente';
    const obs = rec?.observacao || '—';
    const statusText = st === 'presente' ? 'PRESENTE' : st === 'ausente' ? 'AUSENTE' : st === 'justificada' ? 'JUSTIFICADA' : 'ATRASO';
    const statusBg = st === 'presente' ? '#dcfce7; color: #166534;' : st === 'ausente' ? '#ffe4e6; color: #9f1239;' : st === 'justificada' ? '#fef3c7; color: #92400e;' : '#e0f2fe; color: #075985;';

    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="font-family: monospace;">${a.matricula}</td>
        <td style="font-weight: 600;">${a.nome_completo}</td>
        <td>${a.turma?.nome || a.turmas?.[0]?.nome || 'Sem turma'}</td>
        <td style="text-align: center;"><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; background: ${statusBg}">${statusText}</span></td>
        <td>${obs}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="margin-bottom: 16px;">
      <h2 style="text-align: center; margin: 0 0 4px; font-size: 18px; color: #0f172a;">RELATÓRIO DE CHAMADA GERAL ADMINISTRATIVA</h2>
      <p style="text-align: center; margin: 0 0 12px; font-size: 13px; color: #475569;">Data do Encontro: <strong>${dataFormatada}</strong></p>
      
      ${diarioGeral.observacoes ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 12px;"><strong>Observações Gerais:</strong> ${diarioGeral.observacoes}</div>` : ''}

      <div style="display: flex; gap: 12px; margin-bottom: 16px; justify-content: space-between; font-size: 12px; background: #f1f5f9; padding: 10px 14px; border-radius: 6px;">
        <span><strong>Total de Alunos:</strong> ${totalRegistros}</span>
        <span><strong style="color: #166534;">Presentes:</strong> ${totalPresentes + totalAtrasos}</span>
        <span><strong style="color: #9f1239;">Faltas:</strong> ${totalFaltas}</span>
        <span><strong style="color: #92400e;">Justificadas:</strong> ${totalJustificadas}</span>
        <span><strong>Taxa de Presença:</strong> ${presenciaPct}%</span>
      </div>

      <table>
        <thead>
          <tr style="background: #f8fafc;">
            <th style="width: 30px; text-align: center;">#</th>
            <th style="width: 90px;">Matrícula</th>
            <th>Nome Completo do Aluno</th>
            <th style="width: 140px;">Turma</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 40px; display: flex; justify-content: space-around; font-size: 11px;">
        <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 4px;">
          <strong>Responsável Administrativo</strong><br />Lançamento da Chamada
        </div>
        <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 4px;">
          <strong>Coordenação Geral</strong><br />Projeto Jovem Guarda Cidadã
        </div>
      </div>
    </div>
  `;

  printHtml(`Chamada Geral - ${dataFormatada}`, html, 'guarda-municipal');
}

function imprimirChamadaGeralMes(chamadasMes: DiarioGeralItem[], alunos: JgcAluno[], mes: string, ano: string) {
  const activeStudents = alunos.filter(a => a.situacao === 'ativo');
  const sortedChamadas = [...chamadasMes].sort((a, b) => a.data.localeCompare(b.data));
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesNome = mes ? monthNames[parseInt(mes, 10) - 1] : 'Todos os Meses';
  const tituloRelatorio = `MAPA MENSAL DE FREQUÊNCIA GERAL — ${mesNome.toUpperCase()} / ${ano}`;

  const dateHeadersHtml = sortedChamadas.map(c => {
    const d = c.data.slice(8, 10);
    return `<th style="text-align: center; width: 28px; font-size: 9px; padding: 4px 2px;">${d}</th>`;
  }).join('');

  const rowsHtml = activeStudents.map((a, idx) => {
    let presences = 0;
    let absences = 0;
    const totalMeetings = sortedChamadas.length;

    const dayCellsHtml = sortedChamadas.map(c => {
      const rec = (c.alunos || []).find(x => x.aluno_id === a.id);
      const st = rec?.status || 'presente';
      let char = 'P';
      let style = 'color: #166534; font-weight: bold;';
      if (st === 'presente') { presences++; char = 'P'; }
      else if (st === 'ausente') { absences++; char = 'F'; style = 'color: #9f1239; font-weight: bold;'; }
      else if (st === 'justificada') { char = 'J'; style = 'color: #92400e; font-weight: bold;'; }
      else if (st === 'atraso') { presences++; char = 'A'; style = 'color: #075985; font-weight: bold;'; }

      return `<td style="text-align: center; font-size: 9px; padding: 4px 2px; ${style}">${char}</td>`;
    }).join('');

    const freqPct = totalMeetings ? Math.round((presences / totalMeetings) * 100) : 0;

    return `
      <tr>
        <td style="text-align: center; font-size: 10px;">${idx + 1}</td>
        <td style="font-family: monospace; font-size: 10px;">${a.matricula}</td>
        <td style="font-weight: 600; font-size: 10px;">${a.nome_completo}</td>
        <td style="font-size: 10px;">${a.turma?.nome || a.turmas?.[0]?.nome || 'Sem turma'}</td>
        ${dayCellsHtml}
        <td style="text-align: center; font-weight: bold; font-size: 10px; color: #166534;">${presences}</td>
        <td style="text-align: center; font-weight: bold; font-size: 10px; color: #9f1239;">${absences}</td>
        <td style="text-align: center; font-weight: bold; font-size: 10px;">${freqPct}%</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="margin-bottom: 16px;">
      <h2 style="text-align: center; margin: 0 0 4px; font-size: 16px; color: #0f172a;">${tituloRelatorio}</h2>
      <p style="text-align: center; margin: 0 0 12px; font-size: 12px; color: #475569;">Total de Encontros Gerais no Período: <strong>${sortedChamadas.length}</strong> | Total de Alunos Ativos: <strong>${activeStudents.length}</strong></p>

      <div style="margin-bottom: 10px; font-size: 10px; color: #475569; display: flex; gap: 16px;">
        <span><strong>Legenda:</strong></span>
        <span style="color: #166534; font-weight: bold;">P = Presente</span>
        <span style="color: #9f1239; font-weight: bold;">F = Falta</span>
        <span style="color: #92400e; font-weight: bold;">J = Justificada</span>
        <span style="color: #075985; font-weight: bold;">A = Atraso</span>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="width: 24px; text-align: center; font-size: 10px;">#</th>
            <th style="width: 70px; font-size: 10px;">Matrícula</th>
            <th style="font-size: 10px;">Nome do Aluno</th>
            <th style="width: 100px; font-size: 10px;">Turma</th>
            ${dateHeadersHtml}
            <th style="width: 32px; text-align: center; font-size: 10px;">Pres.</th>
            <th style="width: 32px; text-align: center; font-size: 10px;">Falt.</th>
            <th style="width: 40px; text-align: center; font-size: 10px;">%</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-around; font-size: 11px;">
        <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 4px;">
          <strong>Responsável Administrativo</strong><br />Conferência de Chamada
        </div>
        <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 4px;">
          <strong>Coordenação Geral</strong><br />Projeto Jovem Guarda Cidadã
        </div>
      </div>
    </div>
  `;

  printHtml(tituloRelatorio, html, 'guarda-municipal');
}

function DiarioTurma({alunos, turmas, can, profile}:{alunos:JgcAluno[]; turmas:JgcTurma[]; can:Can; profile?: JgcPerfil | null}) {
  const canRegistrarTurma = can('frequencia', 'registrar');
  const canGerenciarGeral = profile !== 'professor';

  const defaultTab = canGerenciarGeral ? 'chamada_geral' : 'diarios';
  const [tab, setTab] = useState<'chamada_geral' | 'diarios' | 'chamada'>(defaultTab);

  // Turma diarios state
  const [openTurmaId, setOpenTurmaId] = useState<string|null>(null);
  const [data, setData] = useState(today);
  const [conteudo, setConteudo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [frequency, setFrequency] = useState<Record<string, FrequencyStatus>>({});
  const [saving, setSaving] = useState(false);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [loadingDiarios, setLoadingDiarios] = useState(false);
  const [turmaFilter, setTurmaFilter] = useState('');
  const [alunoFilter, setAlunoFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string|null>(null);

  // Chamada Geral state
  const [chamadasGerais, setChamadasGerais] = useState<DiarioGeralItem[]>([]);
  const [loadingChamadasGerais, setLoadingChamadasGerais] = useState(false);
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());
  const [filtroMes, setFiltroMes] = useState<string>(currentMonth);
  const [filtroAno, setFiltroAno] = useState<string>(currentYear);
  const [filtroBuscaGeral, setFiltroBuscaGeral] = useState<string>('');

  // Chamada Geral Modal state
  const [openGeralModal, setOpenGeralModal] = useState(false);
  const [editingGeralId, setEditingGeralId] = useState<string | null>(null);
  const [dataGeral, setDataGeral] = useState(today);
  const [obsGeral, setObsGeral] = useState('');
  const [freqGeralMap, setFreqGeralMap] = useState<Record<string, DiarioGeralStatus>>({});
  const [obsFrequenciaGeralMap, setObsFrequenciaGeralMap] = useState<Record<string, string>>({});
  const [savingGeral, setSavingGeral] = useState(false);
  const [filtroModalAluno, setFiltroModalAluno] = useState('');
  const [expandedGeralId, setExpandedGeralId] = useState<string | null>(null);

  const activeTurmas = turmas.filter(t => t.status === 'ativa');
  const getStudents = (turmaId: string) => alunos.filter(a => a.situacao === 'ativo' && (a.turma_id === turmaId || a.turmas?.some(t => t.id === turmaId)));
  const students = openTurmaId ? getStudents(openTurmaId) : [];
  const activeAlunos = useMemo(() => alunos.filter(a => a.situacao === 'ativo'), [alunos]);

  useEffect(() => {
    if (openTurmaId) setFrequency(Object.fromEntries(students.map(a => [a.id, 'presente'])));
  }, [openTurmaId]);

  useEffect(() => {
    setFrequency(prev => {
      const ids = new Set(students.map(a => a.id));
      const next = { ...prev };
      students.forEach(a => { if (!(a.id in next)) next[a.id] = 'presente'; });
      Object.keys(next).forEach(id => { if (!ids.has(id)) delete next[id]; });
      return next;
    });
  }, [students.length]);

  async function loadDiarios() {
    setLoadingDiarios(true);
    const { data } = await supabase
      .from('jgc_diarios')
      .select('*, turma:jgc_turmas(nome), frequencias:jgc_frequencias(aluno_id,status,observacao)')
      .order('data', { ascending: false });
    setDiarios((data as unknown as Diario[]) || []);
    setLoadingDiarios(false);
  }

  async function loadChamadasGerais() {
    setLoadingChamadasGerais(true);
    const { data } = await supabase
      .from('jgc_chamadas_gerais')
      .select('*, alunos:jgc_chamada_geral_alunos(*)')
      .order('data', { ascending: false });
    setChamadasGerais((data as unknown as DiarioGeralItem[]) || []);
    setLoadingChamadasGerais(false);
  }

  useEffect(() => {
    void loadDiarios();
    void loadChamadasGerais();
  }, []);

  const statusCounts = (freq: Diario['frequencias']) => {
    const c = { presente: 0, ausente: 0, justificada: 0, atraso: 0 };
    (freq || []).forEach(f => { if (f.status in c) c[f.status as keyof typeof c]++; });
    return c;
  };
  const statusClass = (value: string) =>
    value === 'presente' ? 'bg-emerald-100 text-emerald-800' :
    value === 'ausente' ? 'bg-rose-100 text-rose-800' :
    value === 'justificada' ? 'bg-amber-100 text-amber-800' :
    value === 'atraso' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700';

  const filteredDiarios = turmaFilter ? diarios.filter(d => d.turma_id === turmaFilter) : diarios;
  const studentRecords = alunoFilter ? diarios.flatMap(d => ((turmaFilter && d.turma_id !== turmaFilter) ? [] : (d.frequencias || []).filter(f => f.aluno_id === alunoFilter).map(f => ({ diario: d, status: f.status, observacao: f.observacao })))).sort((a, b) => b.diario.data.localeCompare(a.diario.data)) : [];
  const presentCount = studentRecords.filter(r => r.status === 'presente' || r.status === 'atraso').length;
  const absentCount = studentRecords.filter(r => r.status === 'ausente' || r.status === 'justificada').length;
  const percentual = studentRecords.length ? Math.round(100 * presentCount / studentRecords.length) : 0;

  async function save() {
    if (!canRegistrarTurma) {
      setSaving(false);
      return toast({ title: 'Acesso negado', description: 'Somente professores podem fazer chamada de turma.', variant: 'destructive' });
    }
    if (!openTurmaId || !data) return toast({ title: 'Selecione data', variant: 'destructive' });
    setSaving(true);
    const { data: diario, error } = await supabase.from('jgc_diarios').upsert({ turma_id: openTurmaId, data, conteudo: conteudo.trim() || null, observacoes: observacoes.trim() || null }, { onConflict: 'turma_id,data' }).select('id').single();
    if (error || !diario) { setSaving(false); return toast({ title: 'Erro ao salvar diário', description: error?.message, variant: 'destructive' }); }
    const rows = students.map(a => ({ diario_id: diario.id, aluno_id: a.id, status: frequency[a.id] || 'presente' }));
    if (rows.length) { const { error: freqError } = await supabase.from('jgc_frequencias').upsert(rows, { onConflict: 'diario_id,aluno_id' }); if (freqError) { setSaving(false); return toast({ title: 'Erro ao salvar frequência', description: freqError.message, variant: 'destructive' }); } }
    toast({ title: 'Chamada registrada' });
    setSaving(false);
    setOpenTurmaId(null);
    void loadDiarios();
  }

  // Chamada Geral Filters and Actions
  const filteredChamadasGerais = useMemo(() => {
    return chamadasGerais.filter(c => {
      const [y, m] = c.data.split('-');
      if (filtroAno && y !== filtroAno) return false;
      if (filtroMes && m !== filtroMes) return false;
      if (filtroBuscaGeral.trim()) {
        const query = filtroBuscaGeral.toLowerCase();
        const matchObs = (c.observacoes || '').toLowerCase().includes(query);
        const matchAluno = (c.alunos || []).some(al => {
          const alunoObj = alunos.find(a => a.id === al.aluno_id);
          return (alunoObj?.nome_completo || '').toLowerCase().includes(query) || (alunoObj?.matricula || '').toLowerCase().includes(query);
        });
        if (!matchObs && !matchAluno) return false;
      }
      return true;
    });
  }, [chamadasGerais, filtroMes, filtroAno, filtroBuscaGeral, alunos]);

  const monthlyGeralStats = useMemo(() => {
    let totalP = 0;
    let totalF = 0;
    let totalJ = 0;
    let totalA = 0;
    let totalR = 0;
    filteredChamadasGerais.forEach(c => {
      (c.alunos || []).forEach(a => {
        totalR++;
        if (a.status === 'presente') totalP++;
        else if (a.status === 'ausente') totalF++;
        else if (a.status === 'justificada') totalJ++;
        else if (a.status === 'atraso') totalA++;
      });
    });
    const pct = totalR ? Math.round(((totalP + totalA) / totalR) * 100) : 0;
    return { totalP, totalF, totalJ, totalA, totalR, pct };
  }, [filteredChamadasGerais]);

  function handleOpenNovaChamadaGeral() {
    setEditingGeralId(null);
    setDataGeral(today);
    setObsGeral('');
    setFiltroModalAluno('');
    const defaultFreq: Record<string, DiarioGeralStatus> = {};
    activeAlunos.forEach(a => { defaultFreq[a.id] = 'presente'; });
    setFreqGeralMap(defaultFreq);
    setObsFrequenciaGeralMap({});
    setOpenGeralModal(true);
  }

  function handleOpenEditarChamadaGeral(item: DiarioGeralItem) {
    setEditingGeralId(item.id);
    setDataGeral(item.data);
    setObsGeral(item.observacoes || '');
    setFiltroModalAluno('');
    const freq: Record<string, DiarioGeralStatus> = {};
    const obsMap: Record<string, string> = {};
    (item.alunos || []).forEach(a => {
      freq[a.aluno_id] = a.status;
      if (a.observacao) obsMap[a.aluno_id] = a.observacao;
    });
    activeAlunos.forEach(a => {
      if (!(a.id in freq)) freq[a.id] = 'presente';
    });
    setFreqGeralMap(freq);
    setObsFrequenciaGeralMap(obsMap);
    setOpenGeralModal(true);
  }

  async function handleSaveChamadaGeral() {
    if (!canGerenciarGeral) {
      return toast({ title: 'Acesso negado', description: 'Sem permissão para registrar chamada geral.', variant: 'destructive' });
    }
    if (!dataGeral) {
      return toast({ title: 'Informe a data', variant: 'destructive' });
    }
    setSavingGeral(true);

    const { data: record, error } = await supabase
      .from('jgc_chamadas_gerais')
      .upsert(
        { id: editingGeralId || undefined, data: dataGeral, observacoes: obsGeral.trim() || null },
        { onConflict: 'data' }
      )
      .select('id')
      .single();

    if (error || !record) {
      setSavingGeral(false);
      return toast({ title: 'Erro ao salvar chamada geral', description: error?.message, variant: 'destructive' });
    }

    const rows = activeAlunos.map(a => ({
      chamada_geral_id: record.id,
      aluno_id: a.id,
      status: freqGeralMap[a.id] || 'presente',
      observacao: (obsFrequenciaGeralMap[a.id] || '').trim() || null,
    }));

    if (rows.length) {
      const { error: freqError } = await supabase
        .from('jgc_chamada_geral_alunos')
        .upsert(rows, { onConflict: 'chamada_geral_id,aluno_id' });

      if (freqError) {
        setSavingGeral(false);
        return toast({ title: 'Erro ao salvar frequências gerais', description: freqError.message, variant: 'destructive' });
      }
    }

    toast({ title: 'Chamada geral registrada', description: `Data: ${dateLabel(dataGeral)}` });
    setSavingGeral(false);
    setOpenGeralModal(false);
    void loadChamadasGerais();
  }

  const handleSetAllStatus = (st: DiarioGeralStatus) => {
    const next: Record<string, DiarioGeralStatus> = {};
    activeAlunos.forEach(a => { next[a.id] = st; });
    setFreqGeralMap(next);
  };

  const filteredModalAlunos = useMemo(() => {
    if (!filtroModalAluno.trim()) return activeAlunos;
    const q = filtroModalAluno.toLowerCase();
    return activeAlunos.filter(a => `${a.nome_completo} ${a.matricula} ${a.escola_nome || ''}`.toLowerCase().includes(q));
  }, [activeAlunos, filtroModalAluno]);

  // Dynamic Tabs Header
  const tabOptions = [
    { value: 'chamada_geral', label: 'Chamada Geral' },
    { value: 'diarios', label: 'Diários de Turma' },
    ...(canRegistrarTurma ? [{ value: 'chamada', label: 'Fazer chamada' }] : []),
  ];

  const tabs = (
    <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full sm:w-[420px]">
      <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
        {tabOptions.map(t => (
          <TabsTrigger key={t.value} value={t.value} className="px-1 text-[11px] sm:px-3 sm:text-sm truncate">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return (
    <section>
      <Head
        title="Diário e Frequência"
        subtitle={tab === 'chamada_geral' ? "Conferência de chamada geral dos alunos no projeto" : canRegistrarTurma ? "Registre a chamada e consulte os diários dos encontros" : "Consulte os diários dos encontros"}
        sectionKey="diario"
        action={tabs}
      />

      {tab === 'chamada_geral' ? (
        <div className="space-y-4">
          {/* Action bar and filters */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-1">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-36 sm:flex-none">
                  <Choice
                    value={filtroMes}
                    onChange={setFiltroMes}
                    options={[
                      { value: '', label: 'Todos os meses' },
                      { value: '01', label: 'Janeiro' },
                      { value: '02', label: 'Fevereiro' },
                      { value: '03', label: 'Março' },
                      { value: '04', label: 'Abril' },
                      { value: '05', label: 'Maio' },
                      { value: '06', label: 'Junho' },
                      { value: '07', label: 'Julho' },
                      { value: '08', label: 'Agosto' },
                      { value: '09', label: 'Setembro' },
                      { value: '10', label: 'Outubro' },
                      { value: '11', label: 'Novembro' },
                      { value: '12', label: 'Dezembro' },
                    ]}
                    placeholder="Mês"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Choice
                    value={filtroAno}
                    onChange={setFiltroAno}
                    options={[
                      { value: '2024', label: '2024' },
                      { value: '2025', label: '2025' },
                      { value: '2026', label: '2026' },
                      { value: '2027', label: '2027' },
                    ]}
                    placeholder="Ano"
                  />
                </div>
              </div>

              <div className="relative w-full flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar aluno ou anotação..."
                  value={filtroBuscaGeral}
                  onChange={e => setFiltroBuscaGeral(e.target.value)}
                  className="pl-9 h-10 bg-white"
                />
              </div>

              {(filtroMes !== currentMonth || filtroAno !== currentYear || filtroBuscaGeral) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto shrink-0 text-slate-600"
                  onClick={() => { setFiltroMes(currentMonth); setFiltroAno(currentYear); setFiltroBuscaGeral(''); }}
                >
                  Limpar
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => imprimirChamadaGeralMes(filteredChamadasGerais, alunos, filtroMes, filtroAno)}
                disabled={!filteredChamadasGerais.length}
                className="w-full sm:w-auto gap-2 h-10 border-slate-300 justify-center"
              >
                <Printer className="h-4 w-4 text-slate-600" />
                Imprimir Mês
              </Button>

              {canGerenciarGeral && (
                <Button
                  onClick={handleOpenNovaChamadaGeral}
                  className="w-full sm:w-auto gap-2 bg-teal-700 hover:bg-teal-800 h-10 justify-center font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Nova chamada geral
                </Button>
              )}
            </div>
          </div>

          {/* Monthly stats header card */}
          {filteredChamadasGerais.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-4">
              <ReportCard label="Encontros Gerais" value={filteredChamadasGerais.length} />
              <ReportCard label="Total Presenças" value={monthlyGeralStats.totalP + monthlyGeralStats.totalA} />
              <ReportCard label="Total Faltas" value={monthlyGeralStats.totalF} />
              <ReportCard label="Frequência Média" value={`${monthlyGeralStats.pct}%`} />
            </div>
          )}

          {/* List of general attendance sessions */}
          {loadingChamadasGerais ? (
            <div className="grid min-h-40 place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
            </div>
          ) : filteredChamadasGerais.length ? (
            <div className="space-y-3">
              {filteredChamadasGerais.map(item => {
                const c = statusCounts((item.alunos || []) as any);
                const pres = c.presente + c.atraso;
                const fal = c.ausente;
                const jus = c.justificada;
                const tot = activeAlunos.length || (c.presente + c.ausente + c.justificada + c.atraso);
                const pct = tot ? Math.round((pres / tot) * 100) : 0;
                const isExpanded = expandedGeralId === item.id;

                return (
                  <Card key={item.id} className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left"
                          onClick={() => setExpandedGeralId(isExpanded ? null : item.id)}
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                            <ClipboardCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-lg text-slate-900">{dateLabel(item.data)}</strong>
                              <Badge className="bg-teal-100 text-teal-800 border-0">{pct}% Presença</Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {pres} presente(s) · {fal} falta(s) · {jus} justificada(s) · {tot} alunos
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 sm:border-t-0 sm:pt-0 sm:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none gap-1.5 h-9 justify-center text-xs"
                            onClick={() => imprimirChamadaGeralDia(item, alunos)}
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir dia
                          </Button>
                          {canGerenciarGeral && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none gap-1.5 h-9 text-teal-700 hover:text-teal-800 justify-center text-xs"
                              onClick={() => handleOpenEditarChamadaGeral(item)}
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setExpandedGeralId(isExpanded ? null : item.id)}
                          >
                            <ChevronDown className={cn('h-5 w-5 text-slate-400 transition-transform', isExpanded && 'rotate-180')} />
                          </Button>
                        </div>
                      </div>

                      {item.observacoes && (
                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <strong className="text-slate-700">Observações:</strong> {item.observacoes}
                        </p>
                      )}

                      {isExpanded && (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden sm:block mt-4 overflow-x-auto rounded-xl border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-slate-50 text-left text-slate-500">
                                  <th className="p-3">Matrícula</th>
                                  <th className="p-3">Aluno</th>
                                  <th className="p-3">Turma</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3">Observação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeAlunos.map(a => {
                                  const rec = (item.alunos || []).find(x => x.aluno_id === a.id);
                                  const st = rec?.status || 'presente';
                                  return (
                                    <tr key={a.id} className="border-b last:border-0">
                                      <td className="p-3 font-mono text-xs text-slate-500">{a.matricula}</td>
                                      <td className="p-3 font-medium text-slate-800">{a.nome_completo}</td>
                                      <td className="p-3 text-slate-500">{a.turma?.nome || a.turmas?.[0]?.nome || '—'}</td>
                                      <td className="p-3">
                                        <Badge className={`${statusClass(st)} border-0`}>{st}</Badge>
                                      </td>
                                      <td className="p-3 text-slate-500">{rec?.observacao || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card List View */}
                          <div className="sm:hidden mt-3 space-y-2">
                            {activeAlunos.map(a => {
                              const rec = (item.alunos || []).find(x => x.aluno_id === a.id);
                              const st = rec?.status || 'presente';
                              return (
                                <div key={a.id} className="rounded-xl border bg-slate-50/70 p-3 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <strong className="text-sm font-semibold text-slate-900">{a.nome_completo}</strong>
                                    <Badge className={`${statusClass(st)} border-0 text-[11px]`}>{st}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Matrícula: <strong className="font-mono">{a.matricula}</strong></span>
                                    <span>{a.turma?.nome || a.turmas?.[0]?.nome || 'Sem turma'}</span>
                                  </div>
                                  {rec?.observacao && (
                                    <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border">
                                      <strong>Obs:</strong> {rec.observacao}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Blank
              icon={ClipboardCheck}
              title="Nenhuma chamada geral no período"
              text="Clique no botão 'Nova chamada geral' para realizar a conferência administrativa dos alunos."
            />
          )}

          {/* Modal Nova / Editar Chamada Geral */}
          <ResponsiveDialog
            open={openGeralModal}
            onOpenChange={v => { if (!v) setOpenGeralModal(false); }}
            title={editingGeralId ? "Editar Chamada Geral" : "Nova Chamada Geral Administrativa"}
            description="Conferência geral de presença de todos os alunos cadastrados no projeto."
            onCancel={() => setOpenGeralModal(false)}
            onConfirm={handleSaveChamadaGeral}
            confirmLabel={savingGeral ? "Salvando..." : "Salvar chamada geral"}
          >
            <div className="space-y-4 py-1">
              <Field label="Data da chamada geral *">
                <Input type="date" value={dataGeral} onChange={e => setDataGeral(e.target.value)} />
              </Field>

              <Field label="Observações gerais (opcional)">
                <Textarea
                  rows={2}
                  placeholder="Anotações sobre o dia (ex: palestra especial, evento externo, etc.)"
                  value={obsGeral}
                  onChange={e => setObsGeral(e.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleSetAllStatus('presente')} className="h-8 text-xs font-semibold justify-center">
                    Todos Presentes
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleSetAllStatus('ausente')} className="h-8 text-xs font-semibold text-rose-700 justify-center">
                    Todos Ausentes
                  </Button>
                </div>
                <div className="relative w-full sm:max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar alunos..."
                    value={filtroModalAluno}
                    onChange={e => setFiltroModalAluno(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {filteredModalAlunos.length ? (
                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {filteredModalAlunos.map(a => {
                    const st = freqGeralMap[a.id] || 'presente';
                    const obsVal = obsFrequenciaGeralMap[a.id] || '';
                    return (
                      <div key={a.id} className="flex flex-col gap-2 rounded-xl border p-3 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="text-sm font-semibold text-slate-900">{a.nome_completo}</span>
                            <p className="text-xs text-slate-500">Matrícula: {a.matricula} {a.turma?.nome ? `· ${a.turma.nome}` : ''}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center w-full sm:w-auto">
                            {([['presente', 'Presente'], ['ausente', 'Ausente'], ['justificada', 'Justificada'], ['atraso', 'Atraso']] as [DiarioGeralStatus, string][]).map(([val, lbl]) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setFreqGeralMap({ ...freqGeralMap, [a.id]: val })}
                                className={`w-full sm:w-auto text-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                  st === val
                                    ? val === 'presente' ? 'bg-emerald-600 text-white' : val === 'ausente' ? 'bg-rose-600 text-white' : val === 'justificada' ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {lbl}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Input
                          placeholder="Observação individual (opcional)"
                          value={obsVal}
                          onChange={e => setObsFrequenciaGeralMap({ ...obsFrequenciaGeralMap, [a.id]: e.target.value })}
                          className="h-8 text-xs bg-slate-50"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum aluno ativo encontrado.</p>
              )}
            </div>
          </ResponsiveDialog>
        </div>
      ) : tab === 'chamada' ? (
        // Teacher Class Attendance
        <>
          {activeTurmas.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeTurmas.map(t => {
                const count = getStudents(t.id).length;
                return (
                  <Card key={t.id} className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <strong className="text-lg text-slate-900">{t.nome}</strong>
                          <p className="mt-0.5 text-sm text-slate-500">{count} aluno(s) ativo(s){t.turno ? ` · ${t.turno}` : ''}</p>
                        </div>
                        <Button onClick={() => { setOpenTurmaId(t.id); setData(today); }} className="w-full sm:w-auto shrink-0 gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300 justify-center" disabled={!canRegistrarTurma}>
                          <ClipboardCheck className="h-4 w-4" />Fazer chamada
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : <Blank icon={ClipboardCheck} title="Nenhuma turma ativa" text="Não há turmas ativas disponíveis para chamada." />}
          <ResponsiveDialog open={!!openTurmaId} onOpenChange={v => { if (!v) setOpenTurmaId(null); }} title="Fazer chamada" description={openTurmaId ? `${turmas.find(t => t.id === openTurmaId)?.nome} · ${dateLabel(data)}` : ''} onCancel={() => setOpenTurmaId(null)} onConfirm={save} confirmLabel={saving ? 'Salvando...' : 'Salvar chamada'}>
            <div className="space-y-4">
              <Field label="Data do encontro"><Input type="date" value={data} onChange={e => setData(e.target.value)} /></Field>
              <Field label="Conteúdo trabalhado"><Textarea rows={2} placeholder="Atividades, conteúdos e temas do encontro" value={conteudo} onChange={e => setConteudo(e.target.value)} /></Field>
              <Field label="Observações do diário"><Textarea rows={2} placeholder="Anotações sobre o andamento da turma" value={observacoes} onChange={e => setObservacoes(e.target.value)} /></Field>
              {students.length ? <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">{students.map(a => <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border p-3 bg-white"><span className="text-sm font-semibold text-slate-900">{a.nome_completo}</span><div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-end w-full sm:w-auto">{([['presente', 'Presente'], ['ausente', 'Ausente'], ['justificada', 'Justificada'], ['atraso', 'Atraso']] as [string, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setFrequency({ ...frequency, [a.id]: value as FrequencyStatus })} className={`w-full sm:w-auto text-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${frequency[a.id] === value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}</div></div>)}</div> : <p className="text-sm text-slate-500">Nenhum aluno ativo na turma.</p>}
            </div>
          </ResponsiveDialog>
        </>
      ) : (
        // Diários de Turma (Teacher Logs View)
        <div className="space-y-4">
          <div className="grid gap-2 sm:flex sm:flex-row sm:items-center">
            <Choice value={turmaFilter} onChange={setTurmaFilter} options={turmas.map(t => ({ value: t.id, label: t.nome }))} placeholder="Todas as turmas" />
            <Choice value={alunoFilter} onChange={setAlunoFilter} options={alunos.map(a => ({ value: a.id, label: a.nome_completo }))} placeholder="Diário de todos os alunos" />
            {(turmaFilter || alunoFilter) && <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => { setTurmaFilter(''); setAlunoFilter(''); }}>Limpar filtros</Button>}
          </div>
          {loadingDiarios ? <div className="grid min-h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" /></div> : alunoFilter ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <ReportCard label="Encontros" value={studentRecords.length} />
                <ReportCard label="Presenças" value={presentCount} />
                <ReportCard label="Faltas" value={absentCount} />
                <ReportCard label="Frequência" value={`${percentual}%`} />
              </div>
              {studentRecords.length ? <div className="space-y-3">{studentRecords.map((r, index) => <Card key={`${r.diario.id}-${index}`} className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><strong className="text-lg">{dateLabel(r.diario.data)}</strong><Badge className={`${statusClass(r.status)} border-0`}>{r.status}</Badge></div><p className="text-sm text-slate-500">{r.diario.turma?.nome || 'Turma'}</p></div>{(r.diario.conteudo || r.diario.observacoes) && <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{r.diario.conteudo && <p><strong className="text-slate-700">Conteúdo:</strong> {r.diario.conteudo}</p>}{r.diario.observacoes && <p><strong className="text-slate-700">Observações:</strong> {r.diario.observacoes}</p>}</div>}</CardContent></Card>)}</div> : <Blank icon={BookOpenText} title="Sem registros" text="Ainda não há diários registrados para este aluno." />}
            </div>
          ) : filteredDiarios.length ? (
            <div className="space-y-3">{filteredDiarios.map(d => { const c = statusCounts(d.frequencias); const presentes = c.presente + c.atraso; const faltas = c.ausente + c.justificada; const total = c.presente + c.ausente + c.justificada + c.atraso; const expanded = expandedId === d.id; return <Card key={d.id} className="rounded-2xl border-0 shadow-sm"><CardContent className="p-5"><button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setExpandedId(expanded ? null : d.id)}><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><BookOpenText className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{dateLabel(d.data)}</strong><Badge variant="outline">{d.turma?.nome || 'Turma'}</Badge></div><p className="mt-0.5 text-sm text-slate-500">{total ? `${presentes} presente(s) · ${faltas} falta(s) · ${total} registro(s)` : 'Sem chamada registrada'}</p></div></div><ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')} /></button>{d.conteudo && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-700">Conteúdo:</strong> {d.conteudo}</p>}{d.observacoes && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Observações:</strong> {d.observacoes}</p>}{expanded && <div className="mt-3 overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left text-slate-500"><th className="p-3">Aluno</th><th className="p-3">Status</th><th className="p-3">Observação</th></tr></thead><tbody>{(d.frequencias || []).map(f => { const aluno = alunos.find(a => a.id === f.aluno_id); return <tr key={f.aluno_id} className="border-b last:border-0"><td className="p-3 font-medium">{aluno?.nome_completo || '—'}</td><td className="p-3"><Badge className={`${statusClass(f.status)} border-0`}>{f.status}</Badge></td><td className="p-3 text-slate-500">{f.observacao || '—'}</td></tr>; })}</tbody></table></div>}</CardContent></Card>; })}</div>
          ) : <Blank icon={BookOpenText} title="Nenhum diário registrado" text="As chamadas salvas aparecerão aqui para consulta." />}
        </div>
      )}
    </section>
  );
}

function ReportCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4">
        <span className="text-xs text-slate-500">{label}</span>
        <strong className="mt-1 block text-2xl font-bold text-slate-900">{value}</strong>
      </CardContent>
    </Card>
  );
}

function Atividades({turmas,can}:{turmas:JgcTurma[];can:Can}) {
  const [items,setItems]=useState<Atividade[]>([]);const [open,setOpen]=useState(false);
  const [form,setForm]=useState({titulo:'',tipo:'pedagogica',descricao:'',data:today,hora_inicio:'',hora_fim:'',local:'',turma_id:''});
  const load=async()=>{const {data}=await supabase.from('jgc_atividades').select('*, turma:jgc_turmas(nome)').order('data',{ascending:false});setItems((data as unknown as Atividade[])||[])};
  useEffect(()=>{void load()},[]);
  async function save(){if(!form.titulo.trim()||!form.data)return toast({title:'Informe título e data',variant:'destructive'});const payload={...form,hora_inicio:form.hora_inicio||null,hora_fim:form.hora_fim||null,local:form.local||null,turma_id:form.turma_id||null};const {error}=await supabase.from('jgc_atividades').insert(payload);if(error)return toast({title:'Erro ao criar atividade',description:error.message,variant:'destructive'});toast({title:'Atividade criada'});setOpen(false);void load()}
  async function cancel(item:Atividade){const {error}=await supabase.from('jgc_atividades').update({status:'cancelada'}).eq('id',item.id);if(error)return toast({title:'Erro ao cancelar',description:error.message,variant:'destructive'});void load()}
  return <section><Head title="Atividades" subtitle="Aulas, oficinas, eventos, visitas e ações coletivas" sectionKey="atividades" action={can('atividades','criar')?<Button onClick={()=>setOpen(true)} className="hidden bg-teal-700 sm:inline-flex"><Plus className="mr-2 h-4 w-4"/>Nova atividade</Button>:undefined}/>{items.length?<div className="grid gap-4 md:grid-cols-2">{items.map(item=><Card key={item.id} className="rounded-2xl border-0 shadow-sm"><CardHeader><div className="flex justify-between"><Badge variant="outline">{item.tipo}</Badge><Badge className={item.status==='cancelada'?'bg-rose-100 text-rose-800':'bg-emerald-100 text-emerald-800'}>{item.status}</Badge></div><CardTitle>{item.titulo}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>{item.descricao}</p><p><CalendarCheck className="mr-2 inline h-4 w-4"/>{dateLabel(item.data)} {item.hora_inicio?.slice(0,5)}</p>{item.local&&<p><MapPin className="mr-2 inline h-4 w-4"/>{item.local}</p>}<p>{item.turma?.nome||'Atividade geral'}</p>{can('atividades','excluir')&&item.status==='ativa'&&<Button variant="outline" size="sm" onClick={()=>void cancel(item)}>Cancelar atividade</Button>}</CardContent></Card>)}</div>:<Blank icon={CalendarCheck} title="Nenhuma atividade" text="Cadastre a programação socioeducativa do projeto."/>}<ResponsiveDialog open={open} onOpenChange={setOpen} title="Nova atividade" description="A atividade será associada à turma e ao histórico dos participantes." onCancel={()=>setOpen(false)} onConfirm={save} confirmLabel="Criar atividade"><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Título *"><Input placeholder="Título da atividade" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></Field></div><Field label="Tipo"><Choice value={form.tipo} onChange={v=>setForm({...form,tipo:v})} options={['pedagogica','esportiva','cultural','educativa','palestra','oficina','evento','acao_coletiva','outra'].map(v=>({value:v,label:v.replaceAll('_',' ')}))}/></Field><Field label="Data *"><Input type="date" placeholder="Data da atividade" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></Field><Field label="Turma"><Choice value={form.turma_id} onChange={v=>setForm({...form,turma_id:v})} options={turmas.map(t=>({value:t.id,label:t.nome}))}/></Field><Field label="Início"><Input type="time" placeholder="08:00" value={form.hora_inicio} onChange={e=>setForm({...form,hora_inicio:e.target.value})}/></Field><Field label="Fim"><Input type="time" placeholder="12:00" value={form.hora_fim} onChange={e=>setForm({...form,hora_fim:e.target.value})}/></Field><Field label="Local"><Input placeholder="Local da atividade" value={form.local} onChange={e=>setForm({...form,local:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="Descrição"><Textarea placeholder="Descrição detalhada da atividade" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></Field></div></div></ResponsiveDialog>{can('atividades','criar')&&<button type="button" onClick={()=>setOpen(true)} aria-label="Nova atividade" title="Nova atividade" className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"><Plus className="h-6 w-6"/></button>}</section>;
}

function Relatorios({alunos = [], turmas = [], can}:{alunos?:JgcAluno[];turmas?:JgcTurma[];can?:Can}) {
  const safeAlunos = alunos || [];
  const safeTurmas = turmas || [];
  const activeAlunosCount = safeAlunos.filter(a => a && a.situacao === 'ativo').length;
  const activeTurmasCount = safeTurmas.filter(t => t && t.status === 'ativa').length;

  return (
    <section>
      <Head title="Relatórios" subtitle="Consultas consolidadas e relatórios operacionais do Jovem Guarda Cidadã" sectionKey="relatorios" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-5 w-5 text-teal-700" />
              Alunos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{safeAlunos.length}</p>
            <p className="mt-1 text-xs text-slate-500">{activeAlunosCount} ativos no projeto</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenText className="h-5 w-5 text-teal-700" />
              Turmas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{activeTurmasCount}</p>
            <p className="mt-1 text-xs text-slate-500">De um total de {safeTurmas.length} turmas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileBarChart className="h-5 w-5 text-teal-700" />
              Exportações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Relatórios consolidados disponíveis no menu superior.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
