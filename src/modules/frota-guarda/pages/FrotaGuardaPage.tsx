import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Hourglass,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useDemutranFrotaBase,
  useFrotaGuarda,
  useFrotaGuardaApoio,
  useFrotaGuardaCategorias,
  useFrotaGuardaDetalhe,
  useFrotaGuardaMutations,
} from '../hooks/useFrotaGuarda';
import type { GuardaFrotaManutencaoTipo, GuardaFrotaStatus, GuardaFrotaVeiculo, GuardaFrotaVeiculoPayload } from '../types/frota-guarda.types';
import {
  formatDateTime,
  formatKm,
  grupamentos,
  manutencaoTipoLabels,
  normalizePlate,
  statusClasses,
  statusLabels,
  tiposUso,
} from '../utils/frota-guarda.formatters';

const basePath = '/admin/guardas/guarda-municipal/frota';

const statusOptions = Object.keys(statusLabels) as GuardaFrotaStatus[];
const manutencaoTipos = Object.keys(manutencaoTipoLabels) as GuardaFrotaManutencaoTipo[];

const emptyForm = {
  demutran_veiculo_id: 'none',
  prefixo: '',
  placa: '',
  renavam: '',
  chassi: '',
  patrimonio: '',
  identificacao_interna: '',
  marca: '',
  modelo: '',
  versao: '',
  ano_fabricacao: '',
  ano_modelo: '',
  cor: '',
  combustivel: '',
  categoria_id: 'none',
  tipo_uso: [] as string[],
  grupamento: 'none',
  status: 'DISPONIVEL' as GuardaFrotaStatus,
  quilometragem_atual: '0',
  foto_principal_url: '',
  observacoes: '',
  motivo_inativacao: '',
};

function buildInitialForm(veiculo?: GuardaFrotaVeiculo | null) {
  if (!veiculo) return emptyForm;
  return {
    demutran_veiculo_id: veiculo.demutran_veiculo_id || 'none',
    prefixo: veiculo.prefixo || '',
    placa: veiculo.placa || '',
    renavam: veiculo.renavam || '',
    chassi: veiculo.chassi || '',
    patrimonio: veiculo.patrimonio || '',
    identificacao_interna: veiculo.identificacao_interna || '',
    marca: veiculo.marca || '',
    modelo: veiculo.modelo || '',
    versao: veiculo.versao || '',
    ano_fabricacao: veiculo.ano_fabricacao ? String(veiculo.ano_fabricacao) : '',
    ano_modelo: veiculo.ano_modelo ? String(veiculo.ano_modelo) : '',
    cor: veiculo.cor || '',
    combustivel: veiculo.combustivel || '',
    categoria_id: veiculo.categoria_id || 'none',
    tipo_uso: veiculo.tipo_uso || [],
    grupamento: veiculo.grupamento || 'none',
    status: veiculo.status,
    quilometragem_atual: String(veiculo.quilometragem_atual || 0),
    foto_principal_url: veiculo.foto_principal_url || '',
    observacoes: veiculo.observacoes || '',
    motivo_inativacao: veiculo.motivo_inativacao || '',
  };
}

function payloadFromForm(form: typeof emptyForm): GuardaFrotaVeiculoPayload {
  return {
    demutran_veiculo_id: form.demutran_veiculo_id === 'none' ? null : form.demutran_veiculo_id,
    prefixo: form.prefixo.trim().toUpperCase(),
    placa: normalizePlate(form.placa),
    renavam: form.renavam.trim() || null,
    chassi: form.chassi.trim().toUpperCase() || null,
    patrimonio: form.patrimonio.trim() || null,
    identificacao_interna: form.identificacao_interna.trim() || null,
    marca: form.marca.trim() || null,
    modelo: form.modelo.trim() || null,
    versao: form.versao.trim() || null,
    ano_fabricacao: form.ano_fabricacao ? Number(form.ano_fabricacao) : null,
    ano_modelo: form.ano_modelo ? Number(form.ano_modelo) : null,
    cor: form.cor.trim() || null,
    combustivel: form.combustivel.trim() || null,
    categoria_id: form.categoria_id === 'none' ? null : form.categoria_id,
    tipo_uso: form.tipo_uso,
    grupamento: form.grupamento === 'none' ? null : form.grupamento,
    status: form.status,
    quilometragem_atual: Number(form.quilometragem_atual || 0),
    foto_principal_url: form.foto_principal_url.trim() || null,
    observacoes: form.observacoes.trim() || null,
    motivo_inativacao: form.motivo_inativacao.trim() || null,
    ativo: form.status !== 'INATIVO',
  };
}

export default function FrotaGuardaPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isNew = location.pathname.endsWith('/novo');
  const isEdit = location.pathname.endsWith('/editar');

  if (isNew || isEdit) {
    return <FrotaFormPage id={params.id} onDone={(id) => navigate(id ? `${basePath}/${id}` : basePath)} />;
  }

  if (params.id) {
    return <FrotaDetalhePage id={params.id} />;
  }

  return <FrotaListaPage />;
}

function FrotaListaPage() {
  const { data = [], isLoading } = useFrotaGuarda();
  const { data: categorias = [] } = useFrotaGuardaCategorias();
  const mutations = useFrotaGuardaMutations();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [categoria, setCategoria] = useState('todos');
  const [grupamento, setGrupamento] = useState('todos');
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [editingCategoriaId, setEditingCategoriaId] = useState<string | null>(null);
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    descricao: '',
    ordem: '0',
    ativo: true,
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return data.filter((item) => {
      if (status !== 'todos' && item.status !== status) return false;
      if (categoria !== 'todos' && item.categoria_id !== categoria) return false;
      if (grupamento !== 'todos' && item.grupamento !== grupamento) return false;
      return `${item.prefixo} ${item.placa} ${item.marca || ''} ${item.modelo || ''}`.toLowerCase().includes(term);
    });
  }, [categoria, data, grupamento, search, status]);

  const stats = useMemo(() => {
    const result: Record<GuardaFrotaStatus | 'TOTAL', number> = {
      TOTAL: data.length,
      DISPONIVEL: 0,
      EM_SERVICO: 0,
      EM_MANUTENCAO: 0,
      INDISPONIVEL: 0,
      RESERVADO: 0,
      INATIVO: 0,
    };
    data.forEach((item) => {
      result[item.status] += 1;
    });
    return result;
  }, [data]);

  const [section, setSection] = useState<'geral' | 'frota'>('geral');

  const resetCategoriaForm = () => {
    setEditingCategoriaId(null);
    setCategoriaForm({ nome: '', descricao: '', ordem: '0', ativo: true });
  };

  const editCategoria = (categoriaAtual: typeof categorias[number]) => {
    setEditingCategoriaId(categoriaAtual.id);
    setCategoriaForm({
      nome: categoriaAtual.nome,
      descricao: categoriaAtual.descricao || '',
      ordem: String(categoriaAtual.ordem || 0),
      ativo: categoriaAtual.ativo,
    });
  };

  const saveCategoria = async () => {
    if (!categoriaForm.nome.trim()) {
      toast({ title: 'Nome obrigatorio', description: 'Informe o nome da categoria.', variant: 'destructive' });
      return;
    }

    const payload = {
      nome: categoriaForm.nome,
      descricao: categoriaForm.descricao || null,
      ordem: Number(categoriaForm.ordem || 0),
      ativo: categoriaForm.ativo,
    };

    try {
      if (editingCategoriaId) {
        await mutations.updateCategoria.mutateAsync({ id: editingCategoriaId, payload });
        toast({ title: 'Categoria atualizada' });
      } else {
        await mutations.createCategoria.mutateAsync(payload);
        toast({ title: 'Categoria criada' });
      }
      resetCategoriaForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar categoria', description: error instanceof Error ? error.message : 'Erro inesperado.', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[34px] font-black tracking-[-0.08em]">Frota da Guarda</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">
                Controle operacional das viaturas, disponibilidade, manutenções e histórico de uso da corporação.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setCategoriasOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Categorias
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to={`${basePath}/novo`}>
                  <Plus className="h-4 w-4" />
                  Nova viatura
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total" value={String(stats.TOTAL)} icon={CarFront} />
            <StatCard label="Disponíveis" value={String(stats.DISPONIVEL)} icon={CheckCircle2} />
            <StatCard label="Em serviço" value={String(stats.EM_SERVICO)} icon={CalendarClock} />
            <StatCard label="Manutenção" value={String(stats.EM_MANUTENCAO)} icon={Wrench} />
            <StatCard label="Indisponíveis" value={String(stats.INDISPONIVEL)} icon={AlertTriangle} />
            <StatCard label="Inativos" value={String(stats.INATIVO)} icon={History} />
          </div>
        </section>

        {section === 'frota' && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_220px_180px]">
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por prefixo, placa, marca ou modelo" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {statusOptions.map((item) => <SelectItem key={item} value={item}>{statusLabels[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas categorias</SelectItem>
                    {categorias.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={grupamento} onValueChange={setGrupamento}>
                  <SelectTrigger><SelectValue placeholder="Grupamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {grupamentos.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-[26px] bg-slate-100/80 p-1.5">
            {(['geral', 'frota'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={cn(
                  'rounded-[20px] px-5 py-2.5 text-sm font-bold tracking-[-0.02em] transition-all',
                  section === key
                    ? 'bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {key === 'geral' ? 'Visão Geral' : 'Frota'}
              </button>
            ))}
          </div>
        </div>

        {section === 'geral' && (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Resumo da Frota</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Viaturas disponíveis', value: stats.DISPONIVEL, total: stats.TOTAL },
                  { label: 'Viaturas em serviço', value: stats.EM_SERVICO, total: stats.TOTAL },
                  { label: 'Viaturas em manutenção', value: stats.EM_MANUTENCAO, total: stats.TOTAL },
                  { label: 'Viaturas inativas', value: stats.INATIVO, total: stats.TOTAL },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-brand-600 transition-all"
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Últimas Viaturas</h3>
              <div className="mt-4 space-y-2">
                {data.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma viatura cadastrada.</p>
                ) : (
                  data.slice(0, 5).map((veiculo) => (
                    <button
                      key={veiculo.id}
                      type="button"
                      onClick={() => navigate(`${basePath}/${veiculo.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-200"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-900">{veiculo.prefixo}</span>
                        <span className="ml-2 text-xs text-slate-500">{veiculo.placa}</span>
                      </div>
                      <Badge variant="outline" className={cn('rounded-full shrink-0', statusClasses[veiculo.status])}>{statusLabels[veiculo.status]}</Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'frota' && (
          <>
            {isLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando frota...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">Nenhuma viatura encontrada.</div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filtered.map((veiculo) => (
                  <button
                    key={veiculo.id}
                    type="button"
                    onClick={() => navigate(`${basePath}/${veiculo.id}`)}
                    className="rounded-[34px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-950 px-3 py-1 text-lg font-black tracking-wide text-white">{veiculo.prefixo}</span>
                          <Badge variant="outline" className={cn('rounded-full', statusClasses[veiculo.status])}>{statusLabels[veiculo.status]}</Badge>
                        </div>
                        <p className="mt-3 text-lg font-bold text-slate-900">{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ') || 'Veículo sem modelo'}</p>
                        <p className="mt-1 text-sm text-slate-500">{veiculo.placa} - {veiculo.categoria?.nome || 'Sem categoria'} - {veiculo.grupamento || 'Frota geral'}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Quilometragem</p>
                        <p className="mt-1 text-base font-bold text-slate-800">{formatKm(veiculo.quilometragem_atual)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <ResponsiveDialog
          open={categoriasOpen}
          onOpenChange={(open) => {
            setCategoriasOpen(open);
            if (!open) resetCategoriaForm();
          }}
          title="Categorias da frota"
          description="Cadastre, ordene e desative categorias utilizadas nas viaturas."
          footer={(
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetCategoriaForm}>
                Limpar
              </Button>
              <Button type="button" onClick={saveCategoria} disabled={mutations.createCategoria.isPending || mutations.updateCategoria.isPending}>
                {editingCategoriaId ? 'Salvar categoria' : 'Criar categoria'}
              </Button>
            </div>
          )}
        >
          <div className="space-y-5 py-2">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_100px]">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input value={categoriaForm.nome} onChange={(event) => setCategoriaForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Ex: Viatura Operacional" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descricao</Label>
                <Textarea value={categoriaForm.descricao} onChange={(event) => setCategoriaForm((current) => ({ ...current, descricao: event.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={categoriaForm.ordem} onChange={(event) => setCategoriaForm((current) => ({ ...current, ordem: event.target.value }))} />
              </div>
              <label className="flex items-end gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <Switch checked={categoriaForm.ativo} onCheckedChange={(checked) => setCategoriaForm((current) => ({ ...current, ativo: checked }))} />
                <span className="pb-0.5 text-sm font-medium text-slate-700">Ativa</span>
              </label>
            </div>

            <div className="space-y-2">
              {categorias.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{item.nome}</p>
                      <Badge variant="outline" className={cn('rounded-full', item.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500')}>
                        {item.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-400">ordem {item.ordem}</span>
                    </div>
                    {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => editCategoria(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await mutations.updateCategoria.mutateAsync({ id: item.id, payload: { ativo: !item.ativo } });
                          toast({ title: item.ativo ? 'Categoria desativada' : 'Categoria ativada' });
                        } catch (error) {
                          toast({ title: 'Erro ao alterar categoria', description: error instanceof Error ? error.message : 'Erro inesperado.', variant: 'destructive' });
                        }
                      }}
                    >
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
}

function FrotaFormPage({ id, onDone }: { id?: string; onDone: (id?: string) => void }) {
  const isEdit = Boolean(id);
  const { data: veiculo, isLoading } = useFrotaGuardaDetalhe(id);
  const { data: categorias = [] } = useFrotaGuardaCategorias();
  const { data: baseVehicles = [] } = useDemutranFrotaBase();
  const mutations = useFrotaGuardaMutations();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (veiculo) setForm(buildInitialForm(veiculo));
  }, [veiculo]);

  const handleBaseVehicle = (value: string) => {
    const base = baseVehicles.find((item) => item.id === value);
    setForm((current) => ({
      ...current,
      demutran_veiculo_id: value,
      placa: base?.placa || current.placa,
      chassi: base?.chassi || current.chassi,
      marca: base?.marca || current.marca,
      modelo: base?.modelo || current.modelo,
      cor: base?.cor || current.cor,
      ano_modelo: base?.ano || current.ano_modelo,
    }));
  };

  const handleSave = async () => {
    if (!form.prefixo.trim() || !form.placa.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha prefixo e placa.', variant: 'destructive' });
      return;
    }

    try {
      const payload = payloadFromForm(form);
      const saved = isEdit && id
        ? await mutations.updateVeiculo.mutateAsync({ id, payload })
        : await mutations.createVeiculo.mutateAsync(payload);
      toast({ title: isEdit ? 'Viatura atualizada' : 'Viatura cadastrada' });
      onDone(saved.id);
    } catch (error) {
      toast({ title: 'Erro ao salvar viatura', description: error instanceof Error ? error.message : 'Erro inesperado.', variant: 'destructive' });
    }
  };

  if (isEdit && isLoading) {
    return <AdminLayout><div className="rounded-lg bg-white p-8 text-center text-slate-500">Carregando viatura...</div></AdminLayout>;
  }

  return (
    <AdminLayout backPath={basePath} backLabel="Voltar para frota">
      <div className="mx-auto max-w-5xl space-y-5">
        <Button type="button" variant="ghost" className="gap-2" onClick={() => onDone(id)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{isEdit ? 'Editar viatura' : 'Nova viatura'}</h1>
          <p className="mt-1 text-sm text-slate-500">Use o cadastro municipal como base quando o veiculo ja existir no DEMUTRAN.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Identificacao operacional</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Veiculo base da Frota Municipal</Label>
              <Select value={form.demutran_veiculo_id} onValueChange={handleBaseVehicle}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vinculo com DEMUTRAN</SelectItem>
                  {baseVehicles.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.placa} - {[item.marca, item.modelo].filter(Boolean).join(' ') || item.secretaria_responsavel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Prefixo *" value={form.prefixo} onChange={(value) => setForm({ ...form, prefixo: value.toUpperCase() })} placeholder="GM-01" />
            <Field label="Placa *" value={form.placa} onChange={(value) => setForm({ ...form, placa: normalizePlate(value) })} />
            <Field label="Renavam" value={form.renavam} onChange={(value) => setForm({ ...form, renavam: value })} />
            <Field label="Chassi" value={form.chassi} onChange={(value) => setForm({ ...form, chassi: value.toUpperCase() })} />
            <Field label="Patrimonio" value={form.patrimonio} onChange={(value) => setForm({ ...form, patrimonio: value })} />
            <Field label="Identificacao interna" value={form.identificacao_interna} onChange={(value) => setForm({ ...form, identificacao_interna: value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dados do veiculo</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Marca" value={form.marca} onChange={(value) => setForm({ ...form, marca: value })} />
            <Field label="Modelo" value={form.modelo} onChange={(value) => setForm({ ...form, modelo: value })} />
            <Field label="Versao" value={form.versao} onChange={(value) => setForm({ ...form, versao: value })} />
            <Field label="Ano fabricacao" type="number" value={form.ano_fabricacao} onChange={(value) => setForm({ ...form, ano_fabricacao: value })} />
            <Field label="Ano modelo" type="number" value={form.ano_modelo} onChange={(value) => setForm({ ...form, ano_modelo: value })} />
            <Field label="Cor" value={form.cor} onChange={(value) => setForm({ ...form, cor: value })} />
            <Field label="Combustivel" value={form.combustivel} onChange={(value) => setForm({ ...form, combustivel: value })} />
            <Field label="Quilometragem atual" type="number" value={form.quilometragem_atual} onChange={(value) => setForm({ ...form, quilometragem_atual: value })} />
            <Field label="Foto principal (URL)" value={form.foto_principal_url} onChange={(value) => setForm({ ...form, foto_principal_url: value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operacao</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={(value) => setForm({ ...form, categoria_id: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categorias.filter((item) => item.ativo).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupamento</Label>
              <Select value={form.grupamento} onValueChange={(value) => setForm({ ...form, grupamento: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Frota geral</SelectItem>
                  {grupamentos.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as GuardaFrotaStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((item) => <SelectItem key={item} value={item}>{statusLabels[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipos de uso</Label>
              <div className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
                {tiposUso.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={form.tipo_uso.includes(item)}
                      onCheckedChange={(checked) => setForm((current) => ({
                        ...current,
                        tipo_uso: checked ? [...current.tipo_uso, item] : current.tipo_uso.filter((value) => value !== item),
                      }))}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observacoes</Label>
              <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} rows={3} />
            </div>
            {form.status === 'INATIVO' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Motivo da inativacao</Label>
                <Textarea value={form.motivo_inativacao} onChange={(event) => setForm({ ...form, motivo_inativacao: event.target.value })} rows={2} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onDone(id)}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={mutations.createVeiculo.isPending || mutations.updateVeiculo.isPending}>Salvar viatura</Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function FrotaDetalhePage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: veiculo, isLoading } = useFrotaGuardaDetalhe(id);
  const apoio = useFrotaGuardaApoio(id);
  const mutations = useFrotaGuardaMutations();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [status, setStatus] = useState<GuardaFrotaStatus>('DISPONIVEL');
  const [statusMotivo, setStatusMotivo] = useState('');
  const [indispOpen, setIndispOpen] = useState(false);
  const [manutOpen, setManutOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [indisp, setIndisp] = useState({ inicio: '', fim_previsto: '', motivo: '', descricao: '' });
  const [manut, setManut] = useState({ tipo: 'CORRETIVA' as GuardaFrotaManutencaoTipo, data_entrada: '', data_prevista_saida: '', descricao_problema: '', oficina: '', valor: '', quilometragem: '', observacoes: '' });
  const [doc, setDoc] = useState({ nome: '', tipo: 'CRLV', arquivo_url: '', data_emissao: '', data_validade: '', observacao: '' });

  useEffect(() => {
    if (veiculo) setStatus(veiculo.status);
  }, [veiculo]);

  if (isLoading || !veiculo) {
    return <AdminLayout><div className="rounded-lg bg-white p-8 text-center text-slate-500">Carregando ficha da viatura...</div></AdminLayout>;
  }

  const changeStatus = async () => {
    try {
      await mutations.updateStatus.mutateAsync({ id, status, motivo: statusMotivo });
      toast({ title: 'Status atualizado' });
      setStatusDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao alterar status', description: error instanceof Error ? error.message : 'Erro inesperado.', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout backPath={basePath} backLabel="Voltar para frota">
      <div className="space-y-5">
        <Button type="button" variant="ghost" className="gap-2" onClick={() => navigate(basePath)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-950 px-4 py-2 text-2xl font-black tracking-wide text-white">{veiculo.prefixo}</span>
                <Badge variant="outline" className={cn('rounded-full', statusClasses[veiculo.status])}>{statusLabels[veiculo.status]}</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ') || 'Veiculo da Guarda'}</h1>
              <p className="mt-2 text-sm text-slate-500">{veiculo.placa} - {veiculo.categoria?.nome || 'Sem categoria'} - {veiculo.grupamento || 'Frota geral'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(true)}>Alterar status</Button>
              <Button type="button" variant="outline" onClick={() => setIndispOpen(true)}>Indisponibilidade</Button>
              <Button type="button" variant="outline" onClick={() => setManutOpen(true)}>Manutencao</Button>
              <Button type="button" variant="outline" onClick={() => setDocOpen(true)}>Documento</Button>
              <Button type="button" onClick={() => navigate(`${basePath}/${id}/editar`)}>Editar</Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="geral">Visao geral</TabsTrigger>
            <TabsTrigger value="manutencoes">Manutencoes</TabsTrigger>
            <TabsTrigger value="indisponibilidades">Indisponibilidades</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="historico">Historico</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard title="Placa" value={veiculo.placa} />
              <InfoCard title="Quilometragem" value={formatKm(veiculo.quilometragem_atual)} />
              <InfoCard title="Vinculo municipal" value={veiculo.demutran_veiculo ? veiculo.demutran_veiculo.secretaria_responsavel : 'Cadastro proprio da Guarda'} />
              <InfoCard title="Chassi" value={veiculo.chassi || '-'} />
              <InfoCard title="Combustivel" value={veiculo.combustivel || '-'} />
              <InfoCard title="Uso" value={veiculo.tipo_uso?.join(', ') || '-'} />
            </div>
          </TabsContent>

          <TabsContent value="manutencoes">
            <TimelineList
              items={apoio.manutencoes.data || []}
              empty="Nenhuma manutencao registrada."
              render={(item: any) => (
                <>
                  <div className="flex items-center gap-2"><Wrench className="h-4 w-4" /><strong>{manutencaoTipoLabels[item.tipo]}</strong></div>
                  <p className="text-sm text-slate-500">{item.descricao_problema}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(item.data_entrada)} - {item.oficina || 'Oficina nao informada'}</p>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="indisponibilidades">
            <TimelineList
              items={apoio.indisponibilidades.data || []}
              empty="Nenhuma indisponibilidade registrada."
              render={(item: any) => (
                <>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><strong>{item.motivo}</strong></div>
                  <p className="text-sm text-slate-500">{item.descricao || '-'}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(item.inicio)} ate {formatDateTime(item.fim_previsto)}</p>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="documentos">
            <TimelineList
              items={apoio.documentos.data || []}
              empty="Nenhum documento anexado."
              render={(item: any) => (
                <>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><a href={item.arquivo_url} target="_blank" rel="noreferrer" className="font-bold text-brand-700 hover:underline">{item.nome}</a></div>
                  <p className="text-sm text-slate-500">{item.tipo} - validade: {item.data_validade ? new Date(item.data_validade).toLocaleDateString('pt-BR') : '-'}</p>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="historico">
            <TimelineList
              items={apoio.historico.data || []}
              empty="Historico ainda vazio."
              render={(item: any) => (
                <>
                  <div className="flex items-center gap-2"><History className="h-4 w-4" /><strong>{item.acao.replaceAll('_', ' ')}</strong></div>
                  <p className="text-sm text-slate-500">{item.descricao || '-'}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                </>
              )}
            />
          </TabsContent>
        </Tabs>

        <ResponsiveDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} title="Alterar status" onConfirm={changeStatus} confirmLabel="Salvar status">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as GuardaFrotaStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{statusLabels[item]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo ou observacao</Label>
              <Textarea value={statusMotivo} onChange={(event) => setStatusMotivo(event.target.value)} rows={3} />
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={indispOpen} onOpenChange={setIndispOpen} title="Registrar indisponibilidade" onConfirm={async () => {
          await mutations.createIndisponibilidade.mutateAsync({ veiculo_id: id, inicio: indisp.inicio, fim_previsto: indisp.fim_previsto || null, motivo: indisp.motivo, descricao: indisp.descricao || null });
          toast({ title: 'Indisponibilidade registrada' });
          setIndispOpen(false);
        }}>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Inicio" type="datetime-local" value={indisp.inicio} onChange={(value) => setIndisp({ ...indisp, inicio: value })} />
            <Field label="Fim previsto" type="datetime-local" value={indisp.fim_previsto} onChange={(value) => setIndisp({ ...indisp, fim_previsto: value })} />
            <Field label="Motivo" value={indisp.motivo} onChange={(value) => setIndisp({ ...indisp, motivo: value })} />
            <div className="space-y-2 sm:col-span-2"><Label>Descricao</Label><Textarea value={indisp.descricao} onChange={(event) => setIndisp({ ...indisp, descricao: event.target.value })} /></div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={manutOpen} onOpenChange={setManutOpen} title="Registrar manutencao" onConfirm={async () => {
          await mutations.createManutencao.mutateAsync({ veiculo_id: id, tipo: manut.tipo, data_entrada: manut.data_entrada || new Date().toISOString(), data_prevista_saida: manut.data_prevista_saida || null, descricao_problema: manut.descricao_problema, oficina: manut.oficina || null, valor: manut.valor ? Number(manut.valor) : null, quilometragem: manut.quilometragem ? Number(manut.quilometragem) : null, observacoes: manut.observacoes || null });
          toast({ title: 'Manutencao registrada' });
          setManutOpen(false);
        }}>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tipo</Label><Select value={manut.tipo} onValueChange={(value) => setManut({ ...manut, tipo: value as GuardaFrotaManutencaoTipo })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{manutencaoTipos.map((item) => <SelectItem key={item} value={item}>{manutencaoTipoLabels[item]}</SelectItem>)}</SelectContent></Select></div>
            <Field label="Entrada" type="datetime-local" value={manut.data_entrada} onChange={(value) => setManut({ ...manut, data_entrada: value })} />
            <Field label="Saida prevista" type="datetime-local" value={manut.data_prevista_saida} onChange={(value) => setManut({ ...manut, data_prevista_saida: value })} />
            <Field label="Oficina" value={manut.oficina} onChange={(value) => setManut({ ...manut, oficina: value })} />
            <Field label="Valor" type="number" value={manut.valor} onChange={(value) => setManut({ ...manut, valor: value })} />
            <Field label="Quilometragem" type="number" value={manut.quilometragem} onChange={(value) => setManut({ ...manut, quilometragem: value })} />
            <div className="space-y-2 sm:col-span-2"><Label>Problema</Label><Textarea value={manut.descricao_problema} onChange={(event) => setManut({ ...manut, descricao_problema: event.target.value })} /></div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={docOpen} onOpenChange={setDocOpen} title="Adicionar documento" onConfirm={async () => {
          await mutations.createDocumento.mutateAsync({ veiculo_id: id, nome: doc.nome, tipo: doc.tipo, arquivo_url: doc.arquivo_url, data_emissao: doc.data_emissao || null, data_validade: doc.data_validade || null, observacao: doc.observacao || null });
          toast({ title: 'Documento adicionado' });
          setDocOpen(false);
        }}>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Nome" value={doc.nome} onChange={(value) => setDoc({ ...doc, nome: value })} />
            <Field label="Tipo" value={doc.tipo} onChange={(value) => setDoc({ ...doc, tipo: value })} />
            <Field label="URL do arquivo" value={doc.arquivo_url} onChange={(value) => setDoc({ ...doc, arquivo_url: value })} />
            <Field label="Emissao" type="date" value={doc.data_emissao} onChange={(value) => setDoc({ ...doc, data_emissao: value })} />
            <Field label="Validade" type="date" value={doc.data_validade} onChange={(value) => setDoc({ ...doc, data_validade: value })} />
            <div className="space-y-2 sm:col-span-2"><Label>Observacao</Label><Textarea value={doc.observacao} onChange={(event) => setDoc({ ...doc, observacao: event.target.value })} /></div>
          </div>
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CarFront }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{label}</p>
        <p className="mt-0.5 text-2xl font-black tracking-tight text-white">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 break-words text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TimelineList({ items, empty, render }: { items: any[]; empty: string; render: (item: any) => React.ReactNode }) {
  if (!items.length) {
    return <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">{empty}</div>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
          {render(item)}
        </div>
      ))}
    </div>
  );
}
