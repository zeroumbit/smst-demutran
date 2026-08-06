import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileBarChart,
  FileText,
  GraduationCap,
  HeartPulse,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type {
  JgcAluno,
  JgcAtendimento,
  JgcPerfil,
  JgcPrivacidade,
  JgcProfessor,
  JgcTurma,
} from "@/types/jovem-guarda";
import { JgcOperationalSection } from "@/components/jgc/JgcOperationalSections";
import {
  JgcAlertBanner,
  useBirthdayAlerts,
} from "@/components/jgc/JgcAlertBanner";
import { JgcStudentJourney } from "@/components/jgc/JgcStudentJourney";
import { JgcSaibaMaisButton, type JgcSectionKey } from "@/components/jgc/JgcPageHelpModal";
import { baixarPdfAlunos, imprimirListaAlunos } from "@/utils/pdfJovemGuarda";

type Section =
  | "dashboard"
  | "alunos"
  | "responsaveis"
  | "turmas"
  | "diario"
  | "atividades"
  | "acompanhamentos"
  | "relatorios";
const sections: Section[] = [
  "dashboard",
  "alunos",
  "responsaveis",
  "turmas",
  "diario",
  "atividades",
  "acompanhamentos",
  "relatorios",
];
const sectionTitles: Record<Section, string> = {
  dashboard: "Início",
  alunos: "Alunos",
  responsaveis: "Responsáveis",
  turmas: "Turmas",
  diario: "Diário",
  atividades: "Atividades",
  acompanhamentos: "Acompanhamentos",
  relatorios: "Relatórios",
};

const today = new Date().toISOString().slice(0, 10);
const initialStudent = {
  nome_completo: "",
  data_nascimento: "",
  cpf: "",
  nis: "",
  foto_url: "",
  naturalidade_cidade: "",
  naturalidade_uf: "",
  data_entrada: today,
  serie_ano: "",
  escola_nome: "",
  turno_escola: "",
  horario_escola: "",
  turmas_ids: [] as string[],
  projeto_hora_inicio: "",
  projeto_hora_fim: "",
  dias_projeto: [] as string[],
  situacao: "ativo",
  tipo_sanguineo: "nao_informado",
  possui_condicao: "nao_informado",
  condicao_saude: "",
  usa_medicamento: "nao_informado",
  medicamentos: "",
  orientacao_medicamento: "",
};
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T12:00:00Z`),
      )
    : "—";
const statusClass = (value: string) =>
  value === "ativo" || value === "ativa"
    ? "bg-emerald-100 text-emerald-800"
    : value === "afastado"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

export default function JovemGuardaCidada() {
  const { profile: account, isSuperAdmin } = useAuth();
  const { section = "dashboard", alunoId } = useParams<{
    section?: Section;
    alunoId?: string;
  }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<JgcPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<JgcAluno[]>([]);
  const [turmas, setTurmas] = useState<JgcTurma[]>([]);
  const [atendimentos, setAtendimentos] = useState<JgcAtendimento[]>([]);
  const [actions, setActions] = useState<{aluno_id:string}[]>([]);
  const [referrals, setReferrals] = useState<{aluno_id:string}[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>("todos");
  const [studentOpen, setStudentOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [classOpen, setClassOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [isTurmaModalOpen, setIsTurmaModalOpen] = useState(false);
  const [professores, setProfessores] = useState<JgcProfessor[]>([]);
  const [professorTurmaId, setProfessorTurmaId] = useState<string | null>(null);
  const [selectedProfessorIds, setSelectedProfessorIds] = useState<string[]>([]);
  const [meuPerfilUsuarioId, setMeuPerfilUsuarioId] = useState<string | null>(null);
  const [student, setStudent] = useState({ ...initialStudent });

  function handleOpenCreateStudent() {
    setEditingStudentId(null);
    setStudent({ ...initialStudent });
    setStudentOpen(true);
  }

  function handleOpenEditStudent(item: JgcAluno) {
    setEditingStudentId(item.id);
    const existingTurmas = (item.turmas && item.turmas.length > 0)
      ? item.turmas.map((t: any) => t.id)
      : (item.turma_id ? [item.turma_id] : []);
    setStudent({
      nome_completo: item.nome_completo || "",
      data_nascimento: item.data_nascimento?.slice(0, 10) || "",
      cpf: item.cpf || "",
      nis: item.nis || "",
      foto_url: item.foto_url || "",
      naturalidade_cidade: item.naturalidade_cidade || "",
      naturalidade_uf: item.naturalidade_uf || "",
      data_entrada: item.data_entrada?.slice(0, 10) || today,
      serie_ano: item.serie_ano || "",
      escola_nome: item.escola_nome || "",
      turno_escola: item.turno_escola || "",
      horario_escola: item.horario_escola || "",
      turmas_ids: existingTurmas,
      projeto_hora_inicio: item.projeto_hora_inicio?.slice(0, 5) || "",
      projeto_hora_fim: item.projeto_hora_fim?.slice(0, 5) || "",
      dias_projeto: item.dias_projeto || [],
      situacao: item.situacao || "ativo",
      tipo_sanguineo: item.saude?.tipo_sanguineo || "nao_informado",
      possui_condicao: item.saude?.possui_condicao || "nao_informado",
      condicao_saude: item.saude?.condicao_saude || "",
      usa_medicamento: item.saude?.usa_medicamento || "nao_informado",
      medicamentos: item.saude?.medicamentos || "",
      orientacao_medicamento: item.saude?.orientacao_medicamento || "",
    });
    setStudentOpen(true);
  }
  const [service, setService] = useState({
    aluno_id: alunoId || "",
    data: today,
    hora: new Date().toTimeString().slice(0, 5),
    area_profissional: "",
    tipo: "individual",
    motivo: "",
    origem: "demanda_espontanea",
    relato: "",
    marcadores: "",
    privacidade: "restrito" as JgcPrivacidade,
    necessita_retorno: false,
    retorno_data: "",
    retorno_motivo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s, c, v, a, e, profList, meuId] = await Promise.all([
      supabase.rpc("jgc_perfil_atual"),
      supabase
        .from("jgc_alunos")
        .select("*, turma:jgc_turmas!turma_id(nome), turmas:jgc_aluno_turmas(turma:jgc_turmas!turma_id(id, nome)), saude:jgc_aluno_saude(*)")
        .is("deleted_at", null)
        .order("nome_completo"),
      supabase.from("jgc_turmas").select("*, professores:jgc_turma_professores(perfil_usuario_id, perfil:perfis_usuarios(nome, sobrenome))").order("nome"),
      supabase
        .from("jgc_atendimentos")
        .select("*, aluno:jgc_alunos(nome_completo,matricula)")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50),
      supabase
        .from("jgc_acoes")
        .select("aluno_id")
        .in("status", ["pendente", "em_andamento"]),
      supabase
        .from("jgc_encaminhamentos")
        .select("aluno_id")
        .in("status", ["pendente", "encaminhado", "em_acompanhamento"]),
      supabase.rpc("jgc_listar_professores"),
      supabase.rpc("jgc_meu_perfil_usuario_id"),
    ]);
    setProfile((p.data as JgcPerfil | null) || null);
    if (s.error) {
      console.error("Erro ao carregar alunos em JGC:", s.error);
    }
    const rawAlunos = (s.data as any[]) || [];
    setAlunos(rawAlunos.map((item: any) => ({
      ...item,
      turmas: (item.turmas || []).map((t: any) => t.turma).filter(Boolean),
    })) as unknown as JgcAluno[]);
    setTurmas((c.data as JgcTurma[]) || []);
    setAtendimentos((v.data as unknown as JgcAtendimento[]) || []);
    setActions((a.data as {aluno_id:string}[]) || []);
    setReferrals((e.data as {aluno_id:string}[]) || []);
    setProfessores((profList.data as JgcProfessor[]) || []);
    setMeuPerfilUsuarioId((meuId.data as string | null) || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = sections.includes(section) ? section : "dashboard";
  const selected = alunos.find((item) => item.id === alunoId);
  const mobileTitle = selected ? selected.nome_completo : sectionTitles[active];
  const isProfessorOrMulti = (profile === "professor" || profile === "multiprofissional") && meuPerfilUsuarioId;
  const globalFilteredTurmas = isProfessorOrMulti
    ? turmas.filter((t) =>
        t.professores?.some((p) => p.perfil_usuario_id === meuPerfilUsuarioId),
      )
    : turmas;
  const filteredTurmas = profile === "professor" && meuPerfilUsuarioId
    ? turmas.filter((t) =>
        t.professores?.some((p) => p.perfil_usuario_id === meuPerfilUsuarioId),
      )
    : turmas;
  const globalFilteredTurmasIds = new Set(globalFilteredTurmas.map((t) => t.id));
  const globalFilteredAlunos = isProfessorOrMulti
    ? alunos.filter((a) =>
        (a.turma_id && globalFilteredTurmasIds.has(a.turma_id)) ||
        a.turmas?.some((t) => globalFilteredTurmasIds.has(t.id)),
      )
    : alunos;
  const globalFilteredAlunosIds = new Set(globalFilteredAlunos.map((a) => a.id));
  const filteredAtendimentosDashboard = isProfessorOrMulti
    ? atendimentos.filter((a) => globalFilteredAlunosIds.has(a.aluno_id))
    : atendimentos;
  const filteredActions = isProfessorOrMulti
    ? actions.filter((a) => globalFilteredAlunosIds.has(a.aluno_id)).length
    : actions.length;
  const filteredReferrals = isProfessorOrMulti
    ? referrals.filter((r) => globalFilteredAlunosIds.has(r.aluno_id)).length
    : referrals.length;
  const filtered = globalFilteredAlunos.filter((item) => {
    const matchesSearch = `${item.nome_completo} ${item.matricula} ${item.escola_nome || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesTurma =
      selectedTurmaFilter === "todos"
        ? true
        : item.turma_id === selectedTurmaFilter ||
          item.turmas?.some((t: any) => t.id === selectedTurmaFilter);

    return matchesSearch && matchesTurma;
  });
  const moduleForSection: Record<Section, string> = {
    dashboard: "jgc_dashboard",
    alunos: "jgc_alunos",
    responsaveis: "jgc_responsaveis",
    turmas: "jgc_turmas",
    diario: "jgc_frequencia",
    atividades: "jgc_atividades",
    acompanhamentos: "jgc_acompanhamentos",
    relatorios: "jgc_relatorios",
  };
  const unrestricted =
    isSuperAdmin ||
    account?.papel === "gestor" ||
    account?.papel === "admin_setor";
  const isAcompanhamentoModule = (moduleId: string) =>
    moduleId === "jgc_acompanhamentos" || moduleId === "acompanhamento" || moduleId === "acompanhamentos";
  const isResponsaveisModule = (moduleId: string) =>
    moduleId === "jgc_responsaveis" || moduleId === "responsaveis";
  const hasModule = (moduleId: string) => {
    if (profile === "professor" && (isAcompanhamentoModule(moduleId) || isResponsaveisModule(moduleId))) return false;
    if (profile === "multiprofissional" && isResponsaveisModule(moduleId)) return false;
    if (unrestricted) return true;
    if (
      profile === "multiprofissional" &&
      moduleId === "jgc_acompanhamentos"
    )
      return true;
    const aliases =
      moduleId === "jgc_acompanhamentos"
        ? ["jgc_acompanhamentos", "jgc_acompanhamento"]
        : [moduleId];
    return aliases.some((value) =>
      (account?.modulos as string[] | undefined)?.includes(value),
    );
  };
  const can = (moduleId: string, action: string) => {
    if (profile === "professor" && (isAcompanhamentoModule(moduleId) || isResponsaveisModule(moduleId))) return false;
    if (profile === "multiprofissional" && isResponsaveisModule(moduleId)) return false;
    if (moduleId === "turmas") {
      if (profile === "professor" || profile === "multiprofissional") return action === "visualizar";
      return true;
    }
    if (
      (moduleId === "frequencia" || moduleId === "jgc_frequencia" || moduleId === "diario") &&
      ["registrar", "editar", "criar"].includes(action)
    ) {
      return profile === "professor";
    }
    if (unrestricted) return true;
    if (
      profile === "multiprofissional" &&
      moduleId === "acompanhamento" &&
      ["visualizar", "criar", "editar"].includes(action)
    )
      return true;
    const aliases =
      moduleId === "acompanhamento"
        ? ["acompanhamento", "acompanhamentos"]
        : [moduleId];
    return aliases.some((value) =>
      (account?.modulos as string[] | undefined)?.includes(
        `jovem_guarda.${value}.${action}`,
      ),
    );
  };
  const firstAllowedSection = sections.find((item) =>
    hasModule(moduleForSection[item]),
  );
  if (!loading && !profile)
    return <Navigate to="/admin/dashboard/jovem-guarda" replace />;
  if (
    !loading &&
    ((alunoId && !hasModule("jgc_alunos")) ||
      (!alunoId &&
        active !== "dashboard" &&
        !hasModule(moduleForSection[active])))
  ) {
    if (firstAllowedSection)
      return (
        <Navigate
          to={`/admin/dashboard/jovem-guarda/${firstAllowedSection}`}
          replace
        />
      );
    return (
      <AdminLayout>
        <Empty
          icon={ShieldCheck}
          title="Sem módulos liberados"
          text="Você não possui permissão para acessar os módulos do Jovem Guarda."
        />
      </AdminLayout>
    );
  }

  const [isSavingStudent, setIsSavingStudent] = useState(false);

  async function saveStudent() {
    if (editingStudentId ? !can("alunos", "editar") : !can("alunos", "criar")) return;
    if (isSavingStudent) return;
    if (!student.nome_completo.trim() || !student.data_nascimento) {
      toast({
        title: "Informe nome e data de nascimento",
        variant: "destructive",
      });
      return;
    }
    setIsSavingStudent(true);
    try {
      const payload = {
        ...student,
        turma_id: (student as any).turmas_ids.length > 0 ? (student as any).turmas_ids[0] : "",
      };

      if (editingStudentId) {
        const rpcRes = await supabase.rpc("jgc_atualizar_aluno", {
          _aluno_id: editingStudentId,
          _dados: payload,
        });

        if (rpcRes.error) {
          const { error: alunoError } = await supabase
            .from("jgc_alunos")
            .update({
              nome_completo: student.nome_completo.trim(),
              data_nascimento: student.data_nascimento,
              cpf: student.cpf ? student.cpf.replace(/\D/g, "") : null,
              nis: student.nis || null,
              foto_url: student.foto_url || null,
              naturalidade_cidade: student.naturalidade_cidade || null,
              naturalidade_uf: student.naturalidade_uf ? student.naturalidade_uf.toUpperCase() : null,
              data_entrada: student.data_entrada,
              serie_ano: student.serie_ano || null,
              escola_nome: student.escola_nome ? student.escola_nome.trim() : null,
              turno_escola: student.turno_escola || null,
              horario_escola: student.horario_escola || null,
              turma_id: (student as any).turmas_ids.length > 0 ? (student as any).turmas_ids[0] : null,
              projeto_hora_inicio: student.projeto_hora_inicio || null,
              projeto_hora_fim: student.projeto_hora_fim || null,
              dias_projeto: student.dias_projeto || [],
              situacao: student.situacao || "ativo",
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingStudentId);

          if (alunoError) {
            toast({
              title: "Não foi possível atualizar o aluno",
              description: alunoError.message,
              variant: "destructive",
            });
            return;
          }

          await supabase.from("jgc_aluno_turmas").delete().eq("aluno_id", editingStudentId);
          if ((student as any).turmas_ids.length > 0) {
            await supabase.from("jgc_aluno_turmas").insert(
              (student as any).turmas_ids.map((tid: string) => ({
                aluno_id: editingStudentId,
                turma_id: tid,
              }))
            );
          }

          await supabase.from("jgc_aluno_saude").upsert({
            aluno_id: editingStudentId,
            tipo_sanguineo: student.tipo_sanguineo || "nao_informado",
            possui_condicao: student.possui_condicao || "nao_informado",
            condicao_saude: student.condicao_saude || null,
            usa_medicamento: student.usa_medicamento || "nao_informado",
            medicamentos: student.medicamentos || null,
            orientacao_medicamento: student.orientacao_medicamento || null,
            updated_at: new Date().toISOString(),
          });
        }

        toast({
          title: "Aluno atualizado",
          description: "As alterações no cadastro foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.rpc("jgc_criar_aluno", {
          _dados: payload,
        });
        if (error) {
          toast({
            title: "Não foi possível cadastrar",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Aluno cadastrado",
          description: "Matrícula gerada automaticamente pelo sistema.",
        });
      }

      setStudentOpen(false);
      setEditingStudentId(null);
      setStudent({ ...initialStudent });
      void load();
    } finally {
      setIsSavingStudent(false);
    }
  }
  const initialClassForm = {
    nome: "",
    descricao: "",
    turno: "",
    hora_inicio: "",
    hora_fim: "",
    status: "ativa",
  };
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [viewingClass, setViewingClass] = useState<JgcTurma | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);

  const [classForm, setClassForm] = useState({ ...initialClassForm });

  function handleOpenCreateClass() {
    setEditingClassId(null);
    setClassForm({ ...initialClassForm });
    setClassOpen(true);
  }

  function handleOpenEditClass(item: JgcTurma) {
    setEditingClassId(item.id);
    setClassForm({
      nome: item.nome || "",
      descricao: item.descricao || "",
      turno: item.turno || "",
      hora_inicio: item.hora_inicio || "",
      hora_fim: item.hora_fim || "",
      status: item.status || "ativa",
    });
    setClassOpen(true);
  }

  async function saveClass() {
    if (editingClassId ? !can("turmas", "editar") : !can("turmas", "criar")) return;
    if (!classForm.nome.trim()) {
      toast({ title: "Informe o nome da turma", variant: "destructive" });
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(classForm).map(([key, value]) => [key, value || null]),
    );

    if (editingClassId) {
      const { error } = await supabase
        .from("jgc_turmas")
        .update(payload)
        .eq("id", editingClassId);
      if (error) {
        toast({
          title: "Não foi possível atualizar a turma",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Turma atualizada com sucesso" });
    } else {
      const { error } = await supabase.from("jgc_turmas").insert(payload);
      if (error) {
        toast({
          title: "Não foi possível criar a turma",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Turma criada com sucesso" });
    }
    setClassOpen(false);
    setEditingClassId(null);
    setClassForm({ ...initialClassForm });
    void load();
  }

  async function deleteClass(id: string) {
    if (!can("turmas", "excluir")) return;
    const rpcRes = await supabase.rpc("jgc_excluir_turma", { _turma_id: id });
    let error = rpcRes.error;
    if (error) {
      const directRes = await supabase.from("jgc_turmas").delete().eq("id", id);
      error = directRes.error;
    }
    if (error) {
      toast({
        title: "Não foi possível excluir a turma",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Turma excluída com sucesso" });
    setDeletingClassId(null);
    if (viewingClass?.id === id) setViewingClass(null);
    void load();
  }
  async function saveProfessorLink() {
    if (!professorTurmaId) return;
    const { error } = await supabase.rpc("jgc_vincular_professores_turma", {
      _turma_id: professorTurmaId,
      _professor_ids: selectedProfessorIds,
    });
    if (error) {
      toast({ title: "Erro ao vincular professores", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Professores vinculados" });
    setProfessorTurmaId(null);
    void load();
  }
  async function saveService() {
    if (!can("acompanhamento", "criar")) return;
    if (
      !service.aluno_id ||
      !service.area_profissional.trim() ||
      !service.motivo.trim() ||
      !service.relato.trim()
    ) {
      toast({
        title: "Preencha aluno, área, motivo e relato",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      ...service,
      marcadores: service.marcadores
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      retorno_data: service.necessita_retorno
        ? service.retorno_data || null
        : null,
      retorno_motivo: service.necessita_retorno
        ? service.retorno_motivo || null
        : null,
    };
    const { error } = await supabase.from("jgc_atendimentos").insert(payload);
    if (error) {
      toast({
        title: "Não foi possível registrar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Atendimento registrado com auditoria" });
    setServiceOpen(false);
    void load();
  }

  return (
    <AdminLayout>
      <header className="hidden lg:block rounded-[24px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 px-8 py-6 text-white shadow-xl shadow-teal-950/15">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-teal-200">
              <ShieldCheck className="h-4 w-4" />
              Jovem Guarda Cidadã
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cuidar da trajetória, agir no momento certo.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-teal-50/75">
              Acompanhamento socioeducativo organizado em torno de cada jovem.
            </p>
          </div>
          <Badge className="w-fit border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">
            {profile || "carregando"} · acesso protegido
          </Badge>
        </div>
      </header>
      <div className="min-h-[calc(100vh-8rem)] p-3 sm:p-6 lg:mt-6 lg:p-0">
        {selected ? (
          <div className="flex items-center gap-1 lg:hidden px-1 py-2 mb-2">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard/jovem-guarda/alunos')}
              aria-label="Voltar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{mobileTitle}</h1>
          </div>
        ) : active !== 'dashboard' ? (
          <div className="flex items-center gap-1 lg:hidden px-1 py-2 mb-2">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard/jovem-guarda')}
              aria-label="Voltar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{mobileTitle}</h1>
          </div>
        ) : (
          <div className="lg:hidden px-1 py-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Jovem Guarda Cidadã</p>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{mobileTitle}</h1>
          </div>
        )}
        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
          </div>
        ) : selected ? (
          <StudentDetail
            student={selected}
            services={atendimentos.filter(
              (item) => item.aluno_id === selected.id,
            )}
            profile={profile!}
            can={can}
            onBack={() => navigate("/admin/dashboard/jovem-guarda/alunos")}
            onService={() => {
              setService((value) => ({ ...value, aluno_id: selected.id }));
              setServiceOpen(true);
            }}
            onEdit={(item) => handleOpenEditStudent(item)}
          />
        ) : active === "dashboard" ? (
          <Dashboard
            profile={profile!}
            alunos={globalFilteredAlunos}
            turmas={globalFilteredTurmas}
            services={filteredAtendimentosDashboard}
            actions={filteredActions}
            referrals={filteredReferrals}
            onService={
              can("acompanhamento", "criar")
                ? () => setServiceOpen(true)
                : undefined
            }
          />
        ) : active === "alunos" ? (
          <section>
            <PageHead
              title="Alunos"
              subtitle="Cadastro e trajetória centralizada do jovem"
              sectionKey="alunos"
              action={
                can("alunos", "criar") && (
                  <Button
                    onClick={handleOpenCreateStudent}
                    className="hidden gap-2 bg-teal-700 hover:bg-teal-800 sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" />
                    Novo aluno
                  </Button>
                )
              }
            />
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                {/* Busca de Alunos */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome, matrícula ou escola..."
                    className="bg-white pl-10"
                  />
                </div>

                {/* Filtro rápido de Turma */}
                <div className="w-full sm:w-56">
                  <Select
                    value={selectedTurmaFilter}
                    onValueChange={setSelectedTurmaFilter}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todas as turmas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as turmas ({globalFilteredAlunos.length})</SelectItem>
                      {globalFilteredTurmas.map((t) => {
                        const count = globalFilteredAlunos.filter(
                          (a) => a.turma_id === t.id || a.turmas?.some((item: any) => item.id === t.id),
                        ).length;
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de Ação de Impressão e PDF */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Imprimir Lista */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">
                      <Printer className="h-4 w-4 text-teal-700" />
                      <span>Imprimir lista</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={() =>
                        imprimirListaAlunos({
                          alunos: globalFilteredAlunos,
                        })
                      }
                      className="gap-2 cursor-pointer font-medium"
                    >
                      <Printer className="h-4 w-4 text-teal-700" />
                      <div>
                        <div>Lista completa de alunos</div>
                        <div className="text-xs text-slate-400">Todos os {globalFilteredAlunos.length} cadastrados</div>
                      </div>
                    </DropdownMenuItem>

                    {selectedTurmaFilter !== "todos" && (() => {
                      const currentTurma = globalFilteredTurmas.find((t) => t.id === selectedTurmaFilter);
                      const alunosTurma = globalFilteredAlunos.filter(
                        (a) => a.turma_id === selectedTurmaFilter || a.turmas?.some((item: any) => item.id === selectedTurmaFilter),
                      );
                      return (
                        <DropdownMenuItem
                          onClick={() =>
                            imprimirListaAlunos({
                              alunos: alunosTurma,
                              turmaNome: currentTurma?.nome,
                            })
                          }
                          className="gap-2 cursor-pointer font-medium bg-teal-50/60 text-teal-900"
                        >
                          <Printer className="h-4 w-4 text-teal-700" />
                          <div>
                            <div>Turma selecionada ({currentTurma?.nome})</div>
                            <div className="text-xs text-teal-700">{alunosTurma.length} alunos nesta turma</div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })()}

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                        <GraduationCap className="h-4 w-4 text-slate-500" />
                        <span>Por turma específica...</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                        {globalFilteredTurmas.map((t) => {
                          const alunosTurma = globalFilteredAlunos.filter(
                            (a) => a.turma_id === t.id || a.turmas?.some((item: any) => item.id === t.id),
                          );
                          return (
                            <DropdownMenuItem
                              key={t.id}
                              onClick={() =>
                                imprimirListaAlunos({
                                  alunos: alunosTurma,
                                  turmaNome: t.nome,
                                })
                              }
                              className="cursor-pointer"
                            >
                              <span>{t.nome}</span>
                              <span className="ml-auto text-xs text-slate-400">({alunosTurma.length})</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Baixar PDF */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">
                      <Download className="h-4 w-4 text-rose-700" />
                      <span>Baixar PDF</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={() =>
                        baixarPdfAlunos({
                          alunos: globalFilteredAlunos,
                        })
                      }
                      className="gap-2 cursor-pointer font-medium"
                    >
                      <FileText className="h-4 w-4 text-rose-700" />
                      <div>
                        <div>PDF - Lista completa</div>
                        <div className="text-xs text-slate-400">Todos os {globalFilteredAlunos.length} cadastrados</div>
                      </div>
                    </DropdownMenuItem>

                    {selectedTurmaFilter !== "todos" && (() => {
                      const currentTurma = globalFilteredTurmas.find((t) => t.id === selectedTurmaFilter);
                      const alunosTurma = globalFilteredAlunos.filter(
                        (a) => a.turma_id === selectedTurmaFilter || a.turmas?.some((item: any) => item.id === selectedTurmaFilter),
                      );
                      return (
                        <DropdownMenuItem
                          onClick={() =>
                            baixarPdfAlunos({
                              alunos: alunosTurma,
                              turmaNome: currentTurma?.nome,
                            })
                          }
                          className="gap-2 cursor-pointer font-medium bg-rose-50/60 text-rose-900"
                        >
                          <FileText className="h-4 w-4 text-rose-700" />
                          <div>
                            <div>PDF - Turma selecionada</div>
                            <div className="text-xs text-rose-700">{currentTurma?.nome} ({alunosTurma.length} alunos)</div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })()}

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                        <GraduationCap className="h-4 w-4 text-slate-500" />
                        <span>Por turma específica...</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                        {globalFilteredTurmas.map((t) => {
                          const alunosTurma = globalFilteredAlunos.filter(
                            (a) => a.turma_id === t.id || a.turmas?.some((item: any) => item.id === t.id),
                          );
                          return (
                            <DropdownMenuItem
                              key={t.id}
                              onClick={() =>
                                baixarPdfAlunos({
                                  alunos: alunosTurma,
                                  turmaNome: t.nome,
                                })
                              }
                              className="cursor-pointer"
                            >
                              <span>{t.nome}</span>
                              <span className="ml-auto text-xs text-slate-400">({alunosTurma.length})</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {filtered.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((item) => (
                  <Card
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
                  >
                    <CardContent className="flex flex-col items-center p-4 text-center">
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {can("alunos", "editar") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                            title="Editar aluno"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditStudent(item);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div
                        className="relative mb-3 flex aspect-[3/4] w-20 h-26 shrink-0 items-center justify-center cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xs group-hover:border-teal-400 group-hover:shadow-xs transition-all"
                        onClick={() =>
                          navigate(`/admin/dashboard/jovem-guarda/alunos/${item.id}`)
                        }
                      >
                        {item.foto_url ? (
                          <img
                            src={item.foto_url}
                            alt={item.nome_completo}
                            className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-teal-50 to-emerald-100 font-bold text-teal-800 text-xl">
                            {item.nome_completo
                              .split(" ")
                              .slice(0, 2)
                              .map((v) => v[0])
                              .join("")}
                          </div>
                        )}
                      </div>

                      <strong
                        className="line-clamp-1 w-full text-base font-bold text-slate-900 cursor-pointer hover:text-teal-700 transition-colors"
                        title={item.nome_completo}
                        onClick={() =>
                          navigate(`/admin/dashboard/jovem-guarda/alunos/${item.id}`)
                        }
                      >
                        {item.nome_completo}
                      </strong>

                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
                        <span className="text-xs font-medium text-slate-400">
                          {item.matricula}
                        </span>
                        <Badge
                          className={`${statusClass(item.situacao)} border-0 text-[10px] px-2 py-0.5`}
                        >
                          {item.situacao}
                        </Badge>
                      </div>

                      <div className="mt-3 w-full space-y-1 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                        <p className="line-clamp-1 font-semibold text-teal-950" title={(item.turmas && item.turmas.length > 0) ? item.turmas.map((t: any) => t.nome).join(", ") : "Sem turma"}>
                          {(item.turmas && item.turmas.length > 0)
                            ? item.turmas.map((t: any) => t.nome).join(", ")
                            : "Sem turma"}
                        </p>
                        <p className="line-clamp-1 text-slate-500" title={item.escola_nome || "Escola não informada"}>
                          {item.escola_nome || "Escola não informada"}
                        </p>
                      </div>
                    </CardContent>

                    <div className="flex border-t border-slate-100 p-2 gap-1.5 bg-slate-50/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 gap-1 text-xs text-slate-700 hover:text-teal-700 hover:bg-teal-50 border-slate-200"
                        onClick={() =>
                          navigate(`/admin/dashboard/jovem-guarda/alunos/${item.id}`)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver perfil
                      </Button>
                      {can("alunos", "editar") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs text-slate-700 hover:text-amber-700 hover:bg-amber-50 border-slate-200"
                          title="Editar cadastro"
                          onClick={() => handleOpenEditStudent(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                icon={Users}
                title="Nenhum aluno encontrado"
                text="Cadastre o primeiro participante ou ajuste sua busca."
              />
            )}
            {can("alunos", "criar") && (
              <button
                type="button"
                onClick={handleOpenCreateStudent}
                aria-label="Novo aluno"
                title="Novo aluno"
                className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </section>
        ) : active === "turmas" ? (
          <section>
            <PageHead
              title="Turmas"
              subtitle="Organize horários, professores e participantes"
              sectionKey="turmas"
              action={
                can("turmas", "criar") && (
                  <Button
                    onClick={handleOpenCreateClass}
                    className="hidden gap-2 bg-teal-700 sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" />
                    Nova turma
                  </Button>
                )
              }
            />
            {filteredTurmas.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTurmas.map((item) => {
                  const enrolledCount = globalFilteredAlunos.filter(
                    (studentItem) =>
                      studentItem.turma_id === item.id ||
                      studentItem.turmas?.some((t: any) => t.id === item.id),
                  ).length;
                  return (
                    <Card
                      key={item.id}
                      className="flex flex-col justify-between h-full rounded-2xl border-0 shadow-sm transition hover:shadow-md"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                              <GraduationCap />
                            </div>
                            <Badge
                              className={`${statusClass(item.status)} border-0`}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {can("turmas", "editar") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                                title="Editar turma"
                                onClick={() => handleOpenEditClass(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardTitle
                          className="pt-2 cursor-pointer hover:text-teal-700 transition-colors text-lg"
                          onClick={() => setViewingClass(item)}
                        >
                          {item.nome}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 justify-between p-5 pt-0 text-sm text-slate-600">
                        <div className="space-y-2.5 flex-1">
                          <p className="line-clamp-2">{item.descricao || "Sem descrição"}</p>
                          <p className="text-xs">
                            <Clock3 className="mr-2 inline h-4 w-4 text-slate-400" />
                            {item.turno || "Turno livre"} ·{" "}
                            {item.hora_inicio?.slice(0, 5) || "—"} às{" "}
                            {item.hora_fim?.slice(0, 5) || "—"}
                          </p>
                          <p
                            className="cursor-pointer hover:underline text-teal-800 font-medium text-xs"
                            onClick={() => setViewingClass(item)}
                          >
                            <Users className="mr-2 inline h-4 w-4 text-teal-600" />
                            {enrolledCount} aluno(s) matriculado(s)
                          </p>
                          {item.professores && item.professores.length > 0 && (
                            <p className="text-xs text-slate-500 truncate">
                              <strong className="text-slate-700">Professores:</strong>{" "}
                              {item.professores
                                .map((p) =>
                                  p.perfil
                                    ? `${p.perfil.nome} ${p.perfil.sobrenome}`
                                    : "",
                                )
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>

                        {/* Equalized action buttons container pinned at bottom */}
                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1 gap-1.5 text-xs justify-center"
                            onClick={() => setViewingClass(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver detalhes
                          </Button>
                          {can("turmas", "gerenciar_alunos") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 flex-1 gap-1.5 text-xs justify-center"
                              onClick={() => {
                                setProfessorTurmaId(item.id);
                                setSelectedProfessorIds(
                                  (item.professores || []).map(
                                    (p) => p.perfil_usuario_id,
                                  ),
                                );
                              }}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Professores
                            </Button>
                          )}
                          {can("turmas", "excluir") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 shrink-0 justify-center"
                              title="Excluir turma"
                              onClick={() => setDeletingClassId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty
                icon={UsersRound}
                title="Nenhuma turma cadastrada"
                text="Crie uma turma e depois vincule os alunos."
              />
            )}
            {can("turmas", "criar") && (
              <button
                type="button"
                onClick={handleOpenCreateClass}
                aria-label="Nova turma"
                title="Nova turma"
                className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </section>
        ) : active === "acompanhamentos" ? (
          <section>
            <PageHead
              title="Acompanhamentos"
              subtitle="Atendimentos, retornos, ações e encaminhamentos"
              sectionKey="acompanhamentos"
              action={
                can("acompanhamento", "criar") && <Button
                  onClick={() => setServiceOpen(true)}
                  className="hidden gap-2 bg-teal-700 sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  Registrar atendimento
                </Button>
              }
            />
            <div className="mb-5 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              <Stat
                label="Atendimentos visíveis"
                value={atendimentos.length}
                icon={HeartPulse}
              />
              <Stat label="Ações abertas" value={actions.length} icon={ListChecks} />
              <Stat
                label="Encaminhamentos"
                value={referrals.length}
                icon={ChevronRight}
              />
            </div>
            {atendimentos.length ? (
              <div className="space-y-3">
                {atendimentos.map((item) => (
                  <Card
                    key={item.id}
                    className="rounded-2xl border-0 shadow-sm"
                  >
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                        <HeartPulse />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          <strong>{item.aluno?.nome_completo}</strong>
                          <Badge variant="outline">{item.tipo}</Badge>
                          <Badge variant="outline">{item.privacidade}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.motivo}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {dateLabel(item.data)} · {item.area_profissional}
                        </p>
                      </div>
                      {item.necessita_retorno && (
                        <Badge className="bg-amber-100 text-amber-800">
                          Retorno {dateLabel(item.retorno_data)}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                icon={HeartPulse}
                title="Nenhum atendimento visível"
                text="Novos registros aparecerão conforme seu nível de acesso."
              />
            )}
            {can("acompanhamento", "criar") && (
              <button
                type="button"
                onClick={() => setServiceOpen(true)}
                aria-label="Registrar atendimento"
                title="Registrar atendimento"
                className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </section>
        ) : (
          <JgcOperationalSection
            section={active}
            alunos={globalFilteredAlunos}
            turmas={globalFilteredTurmas}
            can={can}
            reload={load}
            profile={profile}
          />
        )}
      </div>

      <ResponsiveDialog
        open={studentOpen}
        onOpenChange={(open) => {
          setStudentOpen(open);
          if (!open) {
            setEditingStudentId(null);
            setStudent({ ...initialStudent });
          }
        }}
        title={editingStudentId ? "Editar aluno" : "Novo aluno"}
        description={
          editingStudentId
            ? "Atualize as informações cadastrais e de saúde do aluno."
            : "A matrícula será gerada automaticamente pelo backend."
        }
        onCancel={() => {
          setStudentOpen(false);
          setEditingStudentId(null);
          setStudent({ ...initialStudent });
        }}
        onConfirm={saveStudent}
        confirmLabel={
          isSavingStudent
            ? "Salvando..."
            : editingStudentId
              ? "Salvar alterações"
              : "Cadastrar aluno"
        }
      >
        <Tabs defaultValue="pessoal" className="py-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
            <TabsTrigger value="escola">Escola</TabsTrigger>
            <TabsTrigger value="projeto">Projeto</TabsTrigger>
            <TabsTrigger value="saude">Saúde</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoal">
            <div className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nome completo *">
                  <Input
                    placeholder="Nome completo do aluno"
                    value={student.nome_completo}
                    onChange={(event) =>
                      setStudent({
                        ...student,
                        nome_completo: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                <Field label="Data de nascimento *">
                  <Input
                    type="date"
                    placeholder="Data de nascimento"
                    value={student.data_nascimento}
                    onChange={(event) =>
                      setStudent({
                        ...student,
                        data_nascimento: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="CPF">
                  <Input
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="000.000.000-00"
                    value={student.cpf}
                    onChange={(event) =>
                      setStudent({
                        ...student,
                        cpf: event.target.value.replace(/\D/g, "").slice(0, 11),
                      })
                    }
                  />
                </Field>
                <Field label="NIS">
                  <Input
                    placeholder="Número do NIS"
                    value={student.nis}
                    onChange={(event) =>
                      setStudent({ ...student, nis: event.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Cidade de nascimento">
                <Input
                  placeholder="Cidade de nascimento"
                  value={student.naturalidade_cidade}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      naturalidade_cidade: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="UF">
                <Input
                  maxLength={2}
                  placeholder="UF"
                  value={student.naturalidade_uf}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      naturalidade_uf: event.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>
              {editingStudentId && (
                <div className="sm:col-span-2">
                  <Field label="Situação do Aluno">
                    <Choice
                      value={student.situacao}
                      onChange={(value) => setStudent({ ...student, situacao: value })}
                      options={["ativo", "afastado", "desligado", "concluido"]}
                    />
                  </Field>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field label="Foto do aluno (Estilo 3×4)">
                  <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    {/* Moldura da Foto 3x4 */}
                    <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-xs flex flex-col items-center justify-center text-center transition-all hover:border-teal-400">
                      {student.foto_url ? (
                        <>
                          <img
                            src={student.foto_url}
                            alt="Foto 3x4 do aluno"
                            className="h-full w-full object-cover object-top"
                          />
                          <span className="absolute bottom-1 right-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                            3×4
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-slate-400">
                          <Camera className="mb-1 h-6 w-6 text-slate-400" />
                          <span className="text-[11px] font-semibold text-slate-600">Foto 3×4</span>
                          <span className="text-[9px] text-slate-400">Nenhuma foto</span>
                        </div>
                      )}
                    </div>

                    {/* Controles de upload e link */}
                    <div className="flex-1 space-y-3 w-full">
                      <div>
                        <Label className="text-xs text-slate-700 font-medium mb-1.5 block">
                          Selecionar imagem do dispositivo
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="cursor-pointer bg-white text-xs"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;

                            const ext = file.name.split('.').pop() || 'jpg';
                            const path = `alunos/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('jgc-fotos')
                              .upload(path, file, { upsert: true });

                            if (!uploadError) {
                              const { data: { publicUrl } } = supabase.storage
                                .from('jgc-fotos')
                                .getPublicUrl(path);
                              setStudent({ ...student, foto_url: publicUrl });
                            } else {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                if (e.target?.result) {
                                  setStudent({ ...student, foto_url: e.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Formatos aceitos: JPG, PNG ou WEBP. Ideal em proporção vertical 3×4.
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-700 font-medium mb-1 block">
                          Ou digite o link (URL) da foto:
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://exemplo.com/foto.jpg"
                          value={student.foto_url.startsWith('data:') ? '' : student.foto_url}
                          onChange={(e) => setStudent({ ...student, foto_url: e.target.value })}
                          className="bg-white text-xs"
                        />
                      </div>

                      {student.foto_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
                          onClick={() => setStudent({ ...student, foto_url: '' })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover foto
                        </Button>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="escola">
            <div className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Escola">
                  <Input
                    list="jgc-schools"
                    placeholder="Nome da escola"
                    value={student.escola_nome}
                    onChange={(event) =>
                      setStudent({
                        ...student,
                        escola_nome: event.target.value,
                      })
                    }
                  />
                  <datalist id="jgc-schools">
                    {[
                      ...new Set(
                        alunos.map((item) => item.escola_nome).filter(Boolean),
                      ),
                    ].map((value) => (
                      <option key={value!} value={value!} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                <Field label="Série/Ano">
                  <Input
                    placeholder="Ex: 7º ano"
                    value={student.serie_ano}
                    onChange={(event) =>
                      setStudent({ ...student, serie_ano: event.target.value })
                    }
                  />
                </Field>
                <Field label="Turno">
                  <Choice
                    value={student.turno_escola}
                    onChange={(value) =>
                      setStudent({ ...student, turno_escola: value })
                    }
                    options={["manha", "tarde", "noite", "integral"]}
                  />
                </Field>
                <Field label="Horário detalhado">
                  <Input
                    placeholder="07:00 às 11:30"
                    value={student.horario_escola}
                    onChange={(event) =>
                      setStudent({
                        ...student,
                        horario_escola: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="projeto">
            <Grid>
              <Field label="Data de entrada">
                <Input
                  type="date"
                  value={student.data_entrada}
                  onChange={(event) =>
                    setStudent({ ...student, data_entrada: event.target.value })
                  }
                />
              </Field>
              <Field label="Turmas">
                <button
                  type="button"
                  onClick={() => setIsTurmaModalOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm transition-all hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="flex-1">
                    {(student as any).turmas_ids.length === 0 ? (
                      <span className="text-slate-400">Nenhuma turma selecionada</span>
                    ) : (
                      <span className="text-slate-900">
                        {(student as any).turmas_ids.length} turma(s) selecionada(s)
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </Field>
              <Field label="Entrada">
                <Input
                  type="time"
                  value={student.projeto_hora_inicio}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      projeto_hora_inicio: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Saída">
                <Input
                  type="time"
                  value={student.projeto_hora_fim}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      projeto_hora_fim: event.target.value,
                    })
                  }
                />
              </Field>
            </Grid>

            {student.turno_escola === "integral" && (
              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-700 shrink-0" />
                    <strong className="text-sm font-semibold text-teal-900">
                      Dias no Projeto (Tempo Integral)
                    </strong>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-teal-300 bg-white text-teal-800 hover:bg-teal-100 shrink-0"
                    onClick={() => {
                      const allDays = ["segunda", "terca", "quarta", "quinta", "sexta"];
                      const current = (student as any).dias_projeto || [];
                      const isAll = allDays.every((d: string) => current.includes(d));
                      setStudent({
                        ...student,
                        dias_projeto: isAll ? [] : allDays,
                      });
                    }}
                  >
                    Segunda a Sexta
                  </Button>
                </div>
                <p className="text-xs text-teal-700">
                  Marque os dias da semana em que este aluno de tempo integral estará presente no projeto:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {[
                    { value: "segunda", label: "Segunda" },
                    { value: "terca", label: "Terça" },
                    { value: "quarta", label: "Quarta" },
                    { value: "quinta", label: "Quinta" },
                    { value: "sexta", label: "Sexta" },
                    { value: "sabado", label: "Sábado" },
                  ].map((day) => {
                    const currentDays = ((student as any).dias_projeto || []) as string[];
                    const isChecked = currentDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const nextDays = isChecked
                            ? currentDays.filter((d: string) => d !== day.value)
                            : [...currentDays, day.value];
                          setStudent({ ...student, dias_projeto: nextDays });
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                          isChecked
                            ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
                        }`}
                      >
                        <CheckSquare className={`h-3.5 w-3.5 ${isChecked ? "text-white" : "text-slate-400"}`} />
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <ResponsiveDialog
              open={isTurmaModalOpen}
              onOpenChange={setIsTurmaModalOpen}
              title="Selecionar turmas"
              description="Marque as turmas que este aluno frequentará."
              onCancel={() => setIsTurmaModalOpen(false)}
              onConfirm={() => setIsTurmaModalOpen(false)}
              confirmLabel="Concluído"
            >
              <div className="max-h-[55vh] space-y-2 overflow-y-auto py-2">
                {turmas.map((turma) => {
                  const selected = (student as any).turmas_ids.includes(turma.id);
                  return (
                    <button
                      key={turma.id}
                      type="button"
                      onClick={() => {
                        const current = (student as any).turmas_ids as string[];
                        const next = selected
                          ? current.filter((id: string) => id !== turma.id)
                          : [...current, turma.id];
                        const lastSelected = next.length > 0 ? turmas.find((t) => t.id === next[next.length - 1]) : null;
                        setStudent({
                          ...student,
                          turmas_ids: next,
                          projeto_hora_inicio: lastSelected?.hora_inicio?.slice(0, 5) || "",
                          projeto_hora_fim: lastSelected?.hora_fim?.slice(0, 5) || "",
                        });
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all',
                        selected
                          ? 'border-teal-300 bg-teal-50 font-medium text-teal-800'
                          : 'border-slate-200 text-slate-600 hover:border-teal-200 hover:bg-teal-50/50',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all',
                          selected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300',
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <span>{turma.nome}</span>
                      {turma.hora_inicio && (
                        <span className="ml-auto text-xs text-slate-400">
                          {turma.hora_inicio.slice(0, 5)} às {turma.hora_fim?.slice(0, 5) || "—"}
                        </span>
                      )}
                    </button>
                  );
                })}
                {turmas.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">Nenhuma turma cadastrada.</p>
                )}
              </div>
            </ResponsiveDialog>
          </TabsContent>
          <TabsContent value="saude">
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              Informações essenciais à segurança. Esta seção não é prontuário
              médico.
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Tipo sanguíneo">
                  <Choice
                    value={student.tipo_sanguineo}
                    onChange={(value) =>
                      setStudent({ ...student, tipo_sanguineo: value })
                    }
                    options={[
                      "A+",
                      "A-",
                      "B+",
                      "B-",
                      "AB+",
                      "AB-",
                      "O+",
                      "O-",
                      "nao_informado",
                    ]}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Possui condição de saúde?">
                  <Choice
                    value={student.possui_condicao}
                    onChange={(value) =>
                      setStudent({ ...student, possui_condicao: value })
                    }
                    options={["sim", "nao", "nao_informado"]}
                  />
                </Field>
                {student.possui_condicao === "sim" && (
                  <Field label="Qual condição?">
                    <Textarea
                      placeholder="Descreva a condição de saúde"
                      value={student.condicao_saude}
                      onChange={(event) =>
                        setStudent({
                          ...student,
                          condicao_saude: event.target.value,
                        })
                      }
                    />
                  </Field>
                )}
              </div>
              <div className="sm:col-span-2">
                <Field label="Usa medicamento?">
                  <Choice
                    value={student.usa_medicamento}
                    onChange={(value) =>
                      setStudent({ ...student, usa_medicamento: value })
                    }
                    options={["sim", "nao", "nao_informado"]}
                  />
                </Field>
                {student.usa_medicamento === "sim" && (
                  <Field label="Medicamento(s)">
                    <Textarea
                      placeholder="Quais medicamentos?"
                      value={student.medicamentos}
                      onChange={(event) =>
                        setStudent({
                          ...student,
                          medicamentos: event.target.value,
                        })
                      }
                    />
                  </Field>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ResponsiveDialog>
      <ResponsiveDialog
        open={classOpen}
        onOpenChange={(open) => {
          setClassOpen(open);
          if (!open) {
            setEditingClassId(null);
            setClassForm({ ...initialClassForm });
          }
        }}
        title={editingClassId ? "Editar turma" : "Nova turma"}
        description={editingClassId ? "Atualize as informações da turma." : "O horário padrão será sugerido nos cadastros dos alunos."}
        onCancel={() => {
          setClassOpen(false);
          setEditingClassId(null);
          setClassForm({ ...initialClassForm });
        }}
        onConfirm={saveClass}
        confirmLabel={editingClassId ? "Salvar alterações" : "Criar turma"}
      >
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Nome *">
            <Input
              placeholder="Nome da turma"
              value={classForm.nome}
              onChange={(event) =>
                setClassForm({ ...classForm, nome: event.target.value })
              }
            />
          </Field>
          <Field label="Turno">
            <Choice
              value={classForm.turno}
              onChange={(value) => setClassForm({ ...classForm, turno: value })}
              options={["manha", "tarde", "noite", "integral"]}
            />
          </Field>
          <Field label="Hora inicial">
            <Input
              type="time"
              placeholder="08:00"
              value={classForm.hora_inicio}
              onChange={(event) =>
                setClassForm({ ...classForm, hora_inicio: event.target.value })
              }
            />
          </Field>
          <Field label="Hora final">
            <Input
              type="time"
              placeholder="12:00"
              value={classForm.hora_fim}
              onChange={(event) =>
                setClassForm({ ...classForm, hora_fim: event.target.value })
              }
            />
          </Field>
          {editingClassId && (
            <div className="sm:col-span-2">
              <Field label="Status da turma">
                <Choice
                  value={classForm.status}
                  onChange={(value) => setClassForm({ ...classForm, status: value })}
                  options={["ativa", "inativa", "concluida"]}
                />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <Textarea
                placeholder="Descrição da turma"
                value={classForm.descricao}
                onChange={(event) =>
                  setClassForm({ ...classForm, descricao: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Modal para visualizar detalhes da turma */}
      <ResponsiveDialog
        open={!!viewingClass}
        onOpenChange={(open) => !open && setViewingClass(null)}
        title={viewingClass?.nome || "Detalhes da Turma"}
        description="Informações da turma e alunos matriculados."
      >
        {viewingClass && (() => {
          const enrolledAlunos = alunos.filter(
            (a) =>
              a.turma_id === viewingClass.id ||
              a.turmas?.some((t: any) => t.id === viewingClass.id),
          );
          return (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Turno:</span>{" "}
                  {viewingClass.turno || "Livre"} ·{" "}
                  <span className="font-semibold text-slate-700">Horário:</span>{" "}
                  {viewingClass.hora_inicio?.slice(0, 5) || "—"} às{" "}
                  {viewingClass.hora_fim?.slice(0, 5) || "—"}
                </div>
                <Badge className={`${statusClass(viewingClass.status)} border-0`}>
                  {viewingClass.status}
                </Badge>
              </div>

              {viewingClass.descricao && (
                <p className="text-sm text-slate-600 rounded-xl border p-3">
                  {viewingClass.descricao}
                </p>
              )}

              {viewingClass.professores && viewingClass.professores.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Professores Vinculados
                  </h4>
                  <p className="text-sm text-slate-700 font-medium">
                    {viewingClass.professores
                      .map((p) =>
                        p.perfil ? `${p.perfil.nome} ${p.perfil.sobrenome}` : "",
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Alunos Matriculados ({enrolledAlunos.length})
                </h4>
                {enrolledAlunos.length > 0 ? (
                  <div className="max-h-[35vh] space-y-1.5 overflow-y-auto pr-1">
                    {enrolledAlunos.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl border p-2.5 text-sm bg-white"
                      >
                        <div className="flex items-center gap-3">
                          {a.foto_url ? (
                            <img
                              src={a.foto_url}
                              alt={a.nome_completo}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <Initials name={a.nome_completo} />
                          )}
                          <div>
                            <strong className="block font-medium text-slate-900">
                              {a.nome_completo}
                            </strong>
                            <span className="text-xs text-slate-500">
                              {a.matricula} · {a.escola_nome || "Sem escola"}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={`${statusClass(a.situacao)} border-0 text-[10px]`}
                        >
                          {a.situacao}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    Nenhum aluno matriculado nesta turma.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                {can("turmas", "editar") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const target = viewingClass;
                      setViewingClass(null);
                      handleOpenEditClass(target);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar turma
                  </Button>
                )}
                {can("turmas", "excluir") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeletingClassId(viewingClass.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir turma
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </ResponsiveDialog>

      {/* Modal de confirmação de exclusão da turma com dupla confirmação */}
      <ResponsiveDialog
        open={!!deletingClassId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingClassId(null);
            setDeleteConfirmStep(1);
          }
        }}
        title={deleteConfirmStep === 1 ? "Excluir turma (Passo 1 de 2)?" : "⚠️ CONFIRMAÇÃO FINAL (Passo 2 de 2)"}
        description={
          deleteConfirmStep === 1
            ? `Tem certeza que deseja excluir esta turma? Todos os vínculos de alunos e professores associados a ela no Jovem Guarda Cidadã serão desvinculados.`
            : `Atenção: Esta ação é definitiva e irreversível! Ao prosseguir, todos os diários de classe e frequências desta turma serão excluídos permanentemente do banco de dados.`
        }
        onCancel={() => {
          setDeletingClassId(null);
          setDeleteConfirmStep(1);
        }}
        onConfirm={() => {
          if (deleteConfirmStep === 1) {
            setDeleteConfirmStep(2);
          } else {
            if (deletingClassId) deleteClass(deletingClassId);
          }
        }}
        confirmLabel={deleteConfirmStep === 1 ? "Confirmar e prosseguir" : "Sim, excluir definitivamente"}
      >
        <div className="py-2">
          {deleteConfirmStep === 1 ? (
            <p className="text-sm text-slate-600">
              Clique em confirmar para ir ao passo final de verificação de segurança.
            </p>
          ) : (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 border border-rose-100 font-medium">
              ⚠️ Confirme se realmente deseja apagar todos os registros associados a esta turma.
            </div>
          )}
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        open={professorTurmaId !== null}
        onOpenChange={(open) => { if (!open) setProfessorTurmaId(null); }}
        title="Vincular professores"
        description="Selecione os professores desta turma."
        onCancel={() => setProfessorTurmaId(null)}
        onConfirm={saveProfessorLink}
        confirmLabel="Salvar"
      >
        <div className="grid gap-3 py-2">
          {professores.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum professor cadastrado.</p>
          )}
          {professores.map((prof) => {
            const checked = selectedProfessorIds.includes(prof.id);
            return (
              <label
                key={prof.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelectedProfessorIds((prev) =>
                      checked
                        ? prev.filter((id) => id !== prof.id)
                        : [...prev, prof.id],
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{prof.nome} {prof.sobrenome}</span>
              </label>
            );
          })}
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        title="Registro de atendimento"
        description="O registro será auditado e respeitará o nível de privacidade."
        onCancel={() => setServiceOpen(false)}
        onConfirm={saveService}
        confirmLabel="Salvar atendimento"
      >
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Aluno *">
                <Choice
                  value={service.aluno_id}
                  onChange={(value) =>
                    setService({ ...service, aluno_id: value })
                  }
                  options={alunos.map((item) => ({
                    value: item.id,
                    label: `${item.nome_completo} · ${item.matricula}`,
                  }))}
                />
              </Field>
            </div>
            <Field label="Área profissional *">
              <Input
                placeholder="Psicologia, Serviço Social..."
                value={service.area_profissional}
                onChange={(event) =>
                  setService({
                    ...service,
                    area_profissional: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Tipo">
              <Choice
                value={service.tipo}
                onChange={(value) => setService({ ...service, tipo: value })}
                options={[
                  "individual",
                  "familiar",
                  "grupo",
                  "com_responsavel",
                  "visita",
                  "contato_telefonico",
                  "outro",
                ]}
              />
            </Field>
            <Field label="Privacidade">
              <Choice
                value={service.privacidade}
                onChange={(value) =>
                  setService({
                    ...service,
                    privacidade: value as JgcPrivacidade,
                  })
                }
                options={["compartilhado", "restrito", "sigiloso"]}
              />
            </Field>
          </div>
          <Field label="Motivo principal *">
            <Input
              placeholder="Descreva o motivo principal"
              value={service.motivo}
              onChange={(event) =>
                setService({ ...service, motivo: event.target.value })
              }
            />
          </Field>
          <Field label="Relato do atendimento *">
            <Textarea
              rows={5}
              placeholder="Relato detalhado do atendimento"
              value={service.relato}
              onChange={(event) =>
                setService({ ...service, relato: event.target.value })
              }
            />
          </Field>
          <Field label="Marcadores, separados por vírgula">
            <Input
              placeholder="Familiar, Frequência, Pedagógico"
              value={service.marcadores}
              onChange={(event) =>
                setService({ ...service, marcadores: event.target.value })
              }
            />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              checked={service.necessita_retorno}
              onChange={(event) =>
                setService({
                  ...service,
                  necessita_retorno: event.target.checked,
                })
              }
            />
            Necessita acompanhamento futuro
          </label>
          {service.necessita_retorno && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data prevista">
                <Input
                  type="date"
                  placeholder="Data de retorno"
                  value={service.retorno_data}
                  onChange={(event) =>
                    setService({ ...service, retorno_data: event.target.value })
                  }
                />
              </Field>
              <Field label="Motivo do retorno">
                <Input
                  placeholder="Motivo do acompanhamento"
                  value={service.retorno_motivo}
                  onChange={(event) =>
                    setService({
                      ...service,
                      retorno_motivo: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </AdminLayout>
  );
}

function PageHead({
  title,
  subtitle,
  action,
  sectionKey,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  sectionKey?: JgcSectionKey;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5 self-end sm:self-auto">
        {action}
        {sectionKey && <JgcSaibaMaisButton sectionKey={sectionKey} />}
      </div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 py-3 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Choice({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { value: option, label: option.replaceAll("_", " ") }
              : option;
          return (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
function Initials({ name }: { name: string }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 font-bold text-teal-800">
      {name
        .split(" ")
        .slice(0, 2)
        .map((value) => value[0])
        .join("")}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}
function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card className="min-w-[160px] shrink-0 rounded-2xl border-0 shadow-sm sm:min-w-0">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard({
  profile,
  alunos,
  turmas,
  services,
  actions,
  referrals,
  onService,
}: {
  profile: JgcPerfil;
  alunos: JgcAluno[];
  turmas: JgcTurma[];
  services: JgcAtendimento[];
  actions: number;
  referrals: number;
  onService?: () => void;
}) {
  const { alerts: birthdayAlerts, finishAlert } = useBirthdayAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const activeAlerts = birthdayAlerts.filter((a) => !dismissed.has(a.id));
  const ativos = alunos.filter((item) => item.situacao === "ativo").length;
  const semTurma = alunos.filter(
    (item) => item.situacao === "ativo" && (!item.turmas || item.turmas.length === 0),
  ).length;
  const turmasAtivas = turmas.filter((item) => item.status === "ativa").length;
  const alunoPorTurma = turmasAtivas ? Math.round(ativos / turmasAtivas) : 0;
  return (
    <section>
      <PageHead
        title="Visão geral"
        subtitle="Informações consolidadas do programa Jovem Guarda Cidadã."
        sectionKey="dashboard"
        action={
          onService && (
            <Button
              onClick={onService}
              className="hidden gap-2 bg-teal-700 hover:bg-teal-800 sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Registrar atendimento
            </Button>
          )
        }
      />
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-950 lg:hidden">
          Visão geral
        </h2>
        {activeAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeAlerts.map((alert) => (
              <JgcAlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() =>
                  setDismissed((prev) => new Set(prev).add(alert.id))
                }
                onFinish={() => finishAlert(alert.id)}
              />
            ))}
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Alunos ativos" value={ativos} icon={Users} />
          <Stat
            label="Turmas ativas"
            value={turmasAtivas}
            icon={GraduationCap}
          />
          <Stat
            label="Atendimentos"
            value={services.length}
            icon={HeartPulse}
          />
          <Stat label="Encaminhamentos" value={referrals} icon={ChevronRight} />
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 sm:grid sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Ações abertas" value={actions} icon={ListChecks} />
          <Stat
            label="Alunos sem turma"
            value={semTurma}
            icon={AlertTriangle}
          />
          <Stat
            label="Média alunos/turma"
            value={alunoPorTurma}
            icon={UsersRound}
          />
          <Stat label="Atividades do mês" value={0} icon={CalendarCheck} />
        </div>
        <div className={`mt-6 grid gap-6 ${(profile === 'gestor' || profile === 'administrativo') ? 'xl:grid-cols-[1.5fr_1fr]' : ''}`}>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-teal-700" />
                Atendimentos recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length ? (
                <div className="space-y-4">
                  {services.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 border-b pb-3 last:border-0"
                    >
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                      <div className="min-w-0">
                        <strong className="text-sm">
                          {item.aluno?.nome_completo}
                        </strong>
                        <p className="truncate text-sm text-slate-500">
                          {item.motivo}
                        </p>
                        <span className="text-xs text-slate-400">
                          {dateLabel(item.data)} · {item.area_profissional}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">
                  Nenhum atendimento registrado ainda.
                </p>
              )}
            </CardContent>
          </Card>
          {(profile === 'gestor' || profile === 'administrativo') && (
            <Card className="rounded-3xl border-0 bg-slate-950 text-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Exige atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Attention label="Encaminhamentos pendentes" value={referrals} />
                <Attention label="Ações em aberto" value={actions} />
                <Attention label="Alunos sem turma" value={semTurma} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {onService && (
        <button
          type="button"
          onClick={onService}
          aria-label="Registrar atendimento"
          title="Registrar atendimento"
          className="fixed bottom-[calc(6rem+var(--safe-area-bottom))] right-[calc(1.25rem+var(--safe-area-right))] z-40 flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-all active:scale-90 sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </section>
  );
}
function Attention({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3">
      <span className="text-sm text-slate-200">{label}</span>
      <strong className="grid h-8 min-w-8 place-items-center rounded-lg bg-amber-400 px-2 text-slate-950">
        {value}
      </strong>
    </div>
  );
}
function QuickLink({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: typeof Users;
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
    >
      <Icon className="h-4 w-4 text-teal-600" />
      {label}
    </Link>
  );
}

function StudentDetail({
  student,
  services,
  profile,
  onBack,
  onService,
  can,
}: {
  student: JgcAluno;
  services: JgcAtendimento[];
  profile: JgcPerfil;
  onBack: () => void;
  onService: () => void;
  can: (module: string, action: string) => boolean;
}) {
  const canSensitive = profile === "gestor" || profile === "multiprofissional";
  return (
    <JgcStudentJourney
      student={student}
      services={services}
      profile={profile}
      onBack={onBack}
      onService={onService}
      can={can}
    />
  );
  return (
    <section>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-teal-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos alunos
      </button>
      <div className="mb-5 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <Initials name={student.nome_completo} />
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <h2 className="text-2xl font-bold">{student.nome_completo}</h2>
            <Badge className={`${statusClass(student.situacao)} border-0`}>
              {student.situacao}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {student.matricula} · Entrada em {dateLabel(student.data_entrada)}
          </p>
        </div>
        {canSensitive && (
          <Button onClick={onService} className="bg-teal-700">
            <Plus className="mr-2 h-4 w-4" />
            Atendimento
          </Button>
        )}
      </div>
      <Tabs defaultValue="geral">
        <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto bg-white p-1">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="frequencia">Frequência</TabsTrigger>
          {canSensitive && (
            <TabsTrigger value="acompanhamentos">Acompanhamentos</TabsTrigger>
          )}
          <TabsTrigger value="familia">Família</TabsTrigger>
          {canSensitive && <TabsTrigger value="saude">Saúde</TabsTrigger>}
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="geral">
          <div className="grid gap-4 md:grid-cols-2">
            <Info
              title="Escola e projeto"
              rows={[
                ["Escola", student.escola_nome],
                ["Série/Ano", student.serie_ano],
                [
                  "Turno Escola",
                  student.turno_escola === "integral"
                    ? "Tempo Integral"
                    : student.turno_escola
                      ? student.turno_escola.toUpperCase()
                      : "—",
                ],
                ...(student.turno_escola === "integral" && student.dias_projeto?.length
                  ? [
                      [
                        "Dias no Projeto",
                        student.dias_projeto
                          .map(
                            (d) =>
                              ({
                                segunda: "Segunda",
                                terca: "Terça",
                                quarta: "Quarta",
                                quinta: "Quinta",
                                sexta: "Sexta",
                                sabado: "Sábado",
                              })[d] || d,
                          )
                          .join(", "),
                      ] as [string, string | null | undefined],
                    ]
                  : []),
                ["Turma", student.turma?.nome],
                [
                  "Horário",
                  `${student.projeto_hora_inicio?.slice(0, 5) || "—"} às ${student.projeto_hora_fim?.slice(0, 5) || "—"}`,
                ],
              ]}
            />
            <Info
              title="Dados pessoais"
              rows={[
                ["Nascimento", dateLabel(student.data_nascimento)],
                [
                  "Naturalidade",
                  [student.naturalidade_cidade, student.naturalidade_uf]
                    .filter(Boolean)
                    .join(" - "),
                ],
                [
                  "CPF",
                  student.cpf
                    ? `•••.•••.•••-${student.cpf.slice(-2)}`
                    : "Não informado",
                ],
                ["NIS", student.nis ? "Informado" : "Não informado"],
              ]}
            />
          </div>
        </TabsContent>
        <TabsContent value="frequencia">
          <Empty
            icon={ClipboardCheck}
            title="Frequência individual"
            text="As chamadas do Diário de Turma serão consolidadas aqui."
          />
        </TabsContent>
        {canSensitive && (
          <TabsContent value="acompanhamentos">
            {services.length ? (
              <div className="space-y-3">
                {services.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <strong>{item.motivo}</strong>
                        <Badge variant="outline">{item.privacidade}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                        {item.relato}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {dateLabel(item.data)} · {item.area_profissional}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                icon={HeartPulse}
                title="Sem acompanhamentos visíveis"
                text="Registros aparecerão conforme seu nível de acesso."
              />
            )}
          </TabsContent>
        )}
        <TabsContent value="familia">
          <Empty
            icon={UsersRound}
            title="Família e responsáveis"
            text="Responsáveis e ações familiares são reunidos nesta visão."
          />
        </TabsContent>
        {canSensitive && (
          <TabsContent value="saude">
            <Info
              title="Informações essenciais de saúde"
              rows={[
                ["Tipo sanguíneo", student.saude?.tipo_sanguineo],
                [
                  "Condição",
                  student.saude?.possui_condicao === "sim"
                    ? student.saude.condicao_saude
                    : "Não informada",
                ],
                [
                  "Medicamentos",
                  student.saude?.usa_medicamento === "sim"
                    ? student.saude.medicamentos
                    : "Não informado",
                ],
                ["Orientação", student.saude?.orientacao_medicamento],
              ]}
            />
          </TabsContent>
        )}
        <TabsContent value="historico">
          <Empty
            icon={Clock3}
            title="Linha do tempo"
            text="Mudanças de turma, atividades, frequência e acompanhamentos autorizados serão reunidos aqui."
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
function Info({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | null | undefined][];
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-slate-500">{key}</span>
            <strong className="text-right text-slate-800">
              {value || "Não informado"}
            </strong>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function PendingSection({ section }: { section: Section }) {
  const info = {
    diario: [
      "Diário de Turma",
      "Chamada, conteúdo, atividade e observações por encontro.",
      ClipboardCheck,
    ],
    atividades: [
      "Atividades",
      "Oficinas, eventos e ações pedagógicas, esportivas e culturais.",
      CalendarCheck,
    ],
    relatorios: [
      "Relatórios",
      "Indicadores conforme o perfil e a privacidade dos dados.",
      FileBarChart,
    ],
  } as const;
  const [title, text, Icon] = info[section as keyof typeof info] || [
    "Módulo",
    "",
    Sparkles,
  ];
  return (
    <section>
      <PageHead title={title} subtitle={text} />
      <Empty
        icon={Icon}
        title={`${title} preparado`}
        text="A estrutura segura de banco, vínculos e permissões está pronta para consolidar os registros desta área."
      />
    </section>
  );
}
