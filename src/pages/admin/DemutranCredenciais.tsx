import { useEffect, useMemo, useState } from 'react';
import { Accessibility, BarChart3, CheckCircle, Clock, Eye, FileSpreadsheet, FileText, IdCard, Search, SlidersHorizontal, ThumbsDown, ThumbsUp, Users, X, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { buildReportFileName, exportReportCsv, formatReportDateTime, openPdfPrintReport } from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { DemutranCredencialSolicitacao, DemutranSolicitacaoStatus } from '@/types/admin';
import { SecureLink } from '@/components/admin/SecureLink';
import { getSignedUrl } from '@/lib/demutranUploads';

const statusOptions: DemutranSolicitacaoStatus[] = ['pendente', 'em_analise', 'aprovado', 'rejeitado', 'concluido'];

const statusLabels: Record<DemutranSolicitacaoStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Aprovada',
  rejeitado: 'Rejeitada',
  concluido: 'Concluída',
};

const statusBadgeVariant: Record<DemutranSolicitacaoStatus, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  em_analise: 'bg-blue-100 text-blue-800 border-blue-200',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejeitado: 'bg-red-100 text-red-800 border-red-200',
  concluido: 'bg-slate-100 text-slate-800 border-slate-200',
};

const DemutranCredenciais = () => {
  const { isSuperAdmin, setorId } = useAuth();
  const [items, setItems] = useState<DemutranCredencialSolicitacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<DemutranCredencialSolicitacao | null>(null);
  const [viewingItem, setViewingItem] = useState<DemutranCredencialSolicitacao | null>(null);
  const [status, setStatus] = useState<DemutranSolicitacaoStatus>('pendente');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'todos' | DemutranSolicitacaoStatus>('todos');
  const [filterYear, setFilterYear] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState<string>('todas');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [selectedReportOption, setSelectedReportOption] = useState('todas');
  const [selectedReportFormat, setSelectedReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedCustomReportFormat, setSelectedCustomReportFormat] = useState<'csv' | 'pdf'>('csv');

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from('demutran_credenciais_solicitacoes')
      .select('*');

    if (!isSuperAdmin && setorId) {
      query = query.eq('setor_id', setorId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar solicitacoes', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as DemutranCredencialSolicitacao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (item: DemutranCredencialSolicitacao) => {
    setEditingItem(item);
    setStatus(item.status);
    setObservacao(item.observacao || '');
  };

  const handleView = (item: DemutranCredencialSolicitacao) => {
    setViewingItem(item);
  };

  const handleSave = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from('demutran_credenciais_solicitacoes')
      .update({
        status,
        observacao: observacao.trim() || null,
        analisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingItem.id);

    if (error) {
      toast({ title: 'Erro ao atualizar solicitacao', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Solicitacao atualizada' });
    setEditingItem(null);
    loadData();
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedStatus !== 'todos' && item.status !== selectedStatus) {
        return false;
      }
      if (filterYear !== 'todos') {
        const year = item.created_at ? new Date(item.created_at).getFullYear().toString() : null;
        if (year !== filterYear) return false;
      }
      const searchStr = [
        item.protocolo,
        item.nome_completo,
        item.cpf,
        item.rg,
        item.tipo,
        item.logradouro,
        item.numero,
        item.bairro,
      ].join(' ');
      return searchStr.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, selectedStatus, filterYear]);

  const handleStatusChange = async (id: string, newStatus: DemutranSolicitacaoStatus) => {
    const { error } = await supabase
      .from('demutran_credenciais_solicitacoes')
      .update({
        status: newStatus,
        analisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: `Solicitação ${statusLabels[newStatus]}` });
    setViewingItem(null);
    loadData();
  };

  const columns = [
    { header: 'Protocolo', accessor: 'protocolo' as const },
    { header: 'Solicitante', accessor: 'nome_completo' as const },
    { header: 'Tipo', accessor: 'tipo' as const },
    {
      header: 'Endereco',
      accessor: (item: DemutranCredencialSolicitacao) => {
        const parts = [item.logradouro, item.numero, item.bairro, item.complemento].filter(Boolean);
        return parts.join(', ') || '-';
      },
    },
    {
      header: 'Status',
      accessor: (item: DemutranCredencialSolicitacao) => (
        <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', statusBadgeVariant[item.status])}>
          {statusLabels[item.status]}
        </Badge>
      ),
    },
    {
      header: 'Arquivos',
      accessor: (item: DemutranCredencialSolicitacao) => (
        <div className="flex gap-2">
          {item.documento_identidade_url && <SecureLink url={item.documento_identidade_url} label="Identidade" />}
          {item.comprovante_residencia_url && <SecureLink url={item.comprovante_residencia_url} label="Residencia" />}
          {item.laudo_medico_url && <SecureLink url={item.laudo_medico_url} label="Laudo" />}
        </div>
      ),
      className: 'min-w-[220px]',
    },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'todos') count++;
    if (filterYear !== 'todos') count++;
    return count;
  }, [selectedStatus, filterYear]);

  const totalCount = items.length;
  const pendentesCount = items.filter((i) => i.status === 'pendente').length;
  const emAnaliseCount = items.filter((i) => i.status === 'em_analise').length;
  const aprovadasCount = items.filter((i) => i.status === 'aprovado' || i.status === 'concluido').length;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    items.forEach((item) => {
      const year = item.created_at ? new Date(item.created_at).getFullYear().toString() : null;
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [items]);

  const emitidasStats = useMemo(() => {
    const filtered = items.filter((item) => {
      if (selectedYear === 'todas') return true;
      const year = item.created_at ? new Date(item.created_at).getFullYear().toString() : null;
      return year === selectedYear;
    });
    const emitidas = filtered.filter((i) => i.status === 'aprovado' || i.status === 'concluido');
    return {
      total: emitidas.length,
      idosos: emitidas.filter((i) => i.tipo === 'idoso').length,
      pcd: emitidas.filter((i) => i.tipo === 'pcd').length,
    };
  }, [items, selectedYear]);

  const baseCredentialRows = (items: DemutranCredencialSolicitacao[]) =>
    items.map((item) => ({
      Protocolo: item.protocolo,
      Nome: item.nome_completo,
      Tipo: item.tipo === 'idoso' ? 'Idoso' : 'PCD',
      Status: statusLabels[item.status],
      CPF: item.cpf,
      RG: item.rg || '-',
      Telefone: item.telefone || '-',
      Email: item.email || '-',
      Endereco: [item.logradouro, item.numero, item.bairro, item.complemento].filter(Boolean).join(', '),
      Criado_em: formatReportDateTime(item.created_at),
      Analisado_em: formatReportDateTime(item.analisado_em),
      Observacao: item.observacao || '-',
    }));

  const handleGenerateReport = () => {
    const reportSourceMap: Record<string, { title: string; rows: ReturnType<typeof baseCredentialRows> }> = {
      filtros_aplicados: { title: 'Credenciais com filtros aplicados', rows: baseCredentialRows(filteredItems) },
      todas: { title: 'Todas as credenciais', rows: baseCredentialRows(filteredItems) },
      pendentes: { title: 'Credenciais pendentes', rows: baseCredentialRows(filteredItems.filter((item) => item.status === 'pendente')) },
      em_analise: { title: 'Credenciais em analise', rows: baseCredentialRows(filteredItems.filter((item) => item.status === 'em_analise')) },
      aprovadas: { title: 'Credenciais aprovadas', rows: baseCredentialRows(filteredItems.filter((item) => item.status === 'aprovado')) },
      concluidas: { title: 'Credenciais concluidas', rows: baseCredentialRows(filteredItems.filter((item) => item.status === 'concluido')) },
      idosos: { title: 'Credenciais de idosos', rows: baseCredentialRows(filteredItems.filter((item) => item.tipo === 'idoso')) },
      pcd: { title: 'Credenciais PCD', rows: baseCredentialRows(filteredItems.filter((item) => item.tipo === 'pcd')) },
    };

    const selected = reportSourceMap[selectedReportOption];
    if (!selected?.rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para o relatorio selecionado.', variant: 'destructive' });
      return;
    }

    const fileName = buildReportFileName('credenciais', selected.title);
    if (selectedReportFormat === 'csv') {
      exportReportCsv(fileName, selected.rows);
    } else {
      openPdfPrintReport(selected.title, [{ name: selected.title, rows: selected.rows }]);
    }
    setIsReportDialogOpen(false);
  };

  const handleGenerateCustomReport = () => {
    const rows = baseCredentialRows(filteredItems);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para os filtros aplicados.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('credenciais', 'filtros-aplicados');
    if (selectedCustomReportFormat === 'csv') {
      exportReportCsv(fileName, rows);
    } else {
      openPdfPrintReport('Credenciais com filtros aplicados', [{ name: 'Filtros aplicados', rows }]);
    }
    setIsCustomReportDialogOpen(false);
  };

  function renderMobileCard(item: DemutranCredencialSolicitacao) {
    const address = [item.logradouro, item.numero, item.bairro].filter(Boolean).join(', ');
    return (
      <div
        key={item.id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.nome_completo}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {item.protocolo} &middot; {item.tipo === 'idoso' ? 'Idoso' : 'PCD'}
            </p>
          </div>
          <Badge variant="outline" className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', statusBadgeVariant[item.status])}>
            {statusLabels[item.status]}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Endereco</p>
            <p className="mt-0.5 font-semibold text-slate-800">{address || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">CPF</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.cpf}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Telefone</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.telefone || '-'}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
            onClick={() => handleEdit(item)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
            onClick={() => handleView(item)}
          >
            Detalhes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-6 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Estacionamento rotativo</p>
                <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Credenciais</h1>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">
                  Analise pedidos de credencial para idosos e pessoas com deficiencia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={totalCount} subtitle="Solicitacoes registradas" icon={IdCard} />
              <SummaryCard title="Pendentes" value={pendentesCount} subtitle="Aguardando analise" icon={Clock} />
              <SummaryCard title="Em analise" value={emAnaliseCount} subtitle="Em processo de analise" icon={Eye} />
              <SummaryCard title="Aprovadas" value={aprovadasCount} subtitle="Credenciais emitidas" icon={CheckCircle} />
            </div>
          </div>
        </section>

        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Credenciais emitidas por ano</h2>
              <p className="text-sm text-muted-foreground">Total de credenciais aprovadas e concluidas, com separacao por tipo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFiltersCount > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomReportDialogOpen(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Relatorio personalizado
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReportDialogOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Gerar relatorio
              </Button>
              <Button
                type="button"
                variant={selectedYear === 'todas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear('todas')}
              >
                Todas
              </Button>
              {availableYears.map((year) => (
                <Button
                  key={year}
                  type="button"
                  variant={selectedYear === year ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">Total emitidas</h3>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black tracking-[-0.04em] text-foreground">{emitidasStats.total}</p>
                <p className="mt-1 text-sm text-muted-foreground">Credenciais emitidas</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">Idosos</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black tracking-[-0.04em] text-foreground">{emitidasStats.idosos}</p>
                <p className="mt-1 text-sm text-muted-foreground">Credenciais para idosos</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">PCD</h3>
                <Accessibility className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black tracking-[-0.04em] text-foreground">{emitidasStats.pcd}</p>
                <p className="mt-1 text-sm text-muted-foreground">Credenciais para deficientes</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`lg:block ${filtrosAbertos ? 'block' : 'hidden'}`}>
          <div className="bg-white pb-2 lg:rounded-[30px] lg:border lg:border-slate-200/80 lg:px-5 lg:pt-4">
            <div className="rounded-[28px] bg-white lg:px-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-[18px] bg-slate-900 p-2.5 text-white">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Painel de filtros</p>
                    <p className="mt-1 text-[17px] font-bold tracking-[-0.03em] text-slate-950">Refine a operacao</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {activeFiltersCount} ativo(s)
                  </div>
                  <button
                    onClick={() => setFiltrosAbertos(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 transition-colors hover:bg-slate-300/80 lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as 'todos' | DemutranSolicitacaoStatus)}
                  >
                    <option value="todos">Todos os status</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {statusLabels[option]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={filterYear}
                    onChange={(event) => setFilterYear(event.target.value)}
                  >
                    <option value="todos">Todos os anos</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-12 w-full rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Protocolo, nome ou CPF..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFiltrosAbertos(true)}
          className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] transition-all hover:bg-slate-800 active:scale-95 lg:hidden ${filtrosAbertos ? 'hidden' : ''}`}
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        {loading ? (
          <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando solicitacoes...</div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredItems.map((item) => renderMobileCard(item))}
              {filteredItems.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                  Nenhuma solicitacao encontrada
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable data={filteredItems} columns={columns} onView={handleView} onEdit={handleEdit} emptyMessage="Nenhuma solicitacao registrada" />
            </div>
          </>
        )}

        <ResponsiveDialog
          open={isCustomReportDialogOpen}
          onOpenChange={setIsCustomReportDialogOpen}
          title="Relatorio personalizado"
          description="Gerar relatorio exatamente com os filtros aplicados. Escolha o formato."
          onCancel={() => setIsCustomReportDialogOpen(false)}
          onConfirm={handleGenerateCustomReport}
          confirmLabel={selectedCustomReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedCustomReportFormat} onValueChange={(value) => setSelectedCustomReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          title="Gerar relatorio"
          description="Escolha o recorte das credenciais e o formato."
          onCancel={() => setIsReportDialogOpen(false)}
          onConfirm={handleGenerateReport}
          confirmLabel={selectedReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de relatorio</Label>
              <Select value={selectedReportOption} onValueChange={setSelectedReportOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtros_aplicados">Resultado dos filtros aplicados</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="em_analise">Em analise</SelectItem>
                  <SelectItem value="aprovadas">Aprovadas</SelectItem>
                  <SelectItem value="concluidas">Concluidas</SelectItem>
                  <SelectItem value="idosos">Somente idosos</SelectItem>
                  <SelectItem value="pcd">Somente PCD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedReportFormat} onValueChange={(value) => setSelectedReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(editingItem)}
          onOpenChange={(open) => { if (!open) setEditingItem(null); }}
          title="Analisar solicitacao"
          description={editingItem ? `${editingItem.nome_completo} • ${editingItem.protocolo}` : ''}
          onCancel={() => setEditingItem(null)}
          onConfirm={handleSave}
          confirmLabel="Salvar"
        >
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as DemutranSolicitacaoStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {statusLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={editingItem?.tipo === 'idoso' ? 'Idoso' : 'Pessoa com Deficiencia'} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observacao interna</Label>
              <Textarea rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} />
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(viewingItem)}
          onOpenChange={(open) => { if (!open) setViewingItem(null); }}
          title="Detalhes da solicitação"
          description={viewingItem ? `${viewingItem.nome_completo} • ${viewingItem.protocolo}` : ''}
        >
          {viewingItem && <ViewDetailsModalContent item={viewingItem} onStatusChange={handleStatusChange} />}
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof IdCard;
}) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{value}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-white/70">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DocPreview({ url, label }: { url: string | null; label: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    
    let active = true;
    async function fetchUrl() {
      try {
        const signed = await getSignedUrl(url);
        if (active) {
          setResolvedUrl(signed);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setResolvedUrl(url); // fallback
          setLoading(false);
        }
      }
    }

    fetchUrl();
    return () => {
      active = false;
    };
  }, [url]);

  if (!url) return null;
  if (loading) {
    return (
      <div className="flex h-36 w-full items-center justify-center rounded-xl border border-border bg-muted/30 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const finalUrl = resolvedUrl || url;
  const isImage = /\.(jpg|jpeg|png|gif|webp|avif|bmp)(\?.*)?$/i.test(finalUrl);

  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:shadow-md"
    >
      {isImage && !errored ? (
        <img
          src={finalUrl}
          alt={label}
          className="h-24 w-full rounded-lg object-cover ring-1 ring-black/5"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-lg bg-muted/50">
          <FileText className="h-10 w-10 text-muted-foreground/60" />
        </div>
      )}
      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </a>
  );
}

function ViewDetailsModalContent({
  item,
  onStatusChange,
}: {
  item: DemutranCredencialSolicitacao;
  onStatusChange: (id: string, status: DemutranSolicitacaoStatus) => void;
}) {
  const [observacao, setObservacao] = useState(item.observacao || '');
  const [saving, setSaving] = useState(false);

  const handleSaveObservacao = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('demutran_credenciais_solicitacoes')
      .update({ observacao: observacao.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Erro ao salvar observação', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Observação salva' });
    }
    setSaving(false);
  };

  const fullAddress = [item.logradouro, item.numero, item.bairro, item.complemento].filter(Boolean).join(', ') || '-';

  const personalInfo = [
    ['Nome completo', item.nome_completo],
    ['CPF', item.cpf],
    ['RG', item.rg],
    ['Tipo', item.tipo === 'idoso' ? 'Idoso' : 'Pessoa com Deficiência'],
    ['Telefone', item.telefone || '-'],
    ['E-mail', item.email || '-'],
  ];

  return (
    <div className="space-y-5 py-2">
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Protocolo</p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{item.protocolo}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.created_at && new Date(item.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', statusBadgeVariant[item.status])}>
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados pessoais</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {personalInfo.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</h4>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">{fullAddress}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</h4>
        <div className="grid grid-cols-3 gap-3">
          <DocPreview url={item.documento_identidade_url} label="Identidade" />
          <DocPreview url={item.comprovante_residencia_url} label="Comprovante de Residência" />
          <DocPreview url={item.laudo_medico_url} label="Laudo Médico" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações administrativas</h4>

        <div className="mb-4">
          <p className="mb-2 text-xs text-muted-foreground">Alterar status</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              onClick={() => onStatusChange(item.id, 'em_analise')}
            >
              <Clock className="h-3.5 w-3.5" />
              Em Análise
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={() => onStatusChange(item.id, 'aprovado')}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
              onClick={() => onStatusChange(item.id, 'rejeitado')}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => onStatusChange(item.id, 'concluido')}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Concluir
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Observação interna</Label>
          <Textarea
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Anote observações sobre esta solicitação..."
            className="w-full"
          />
          <Button variant="outline" size="sm" onClick={handleSaveObservacao} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DemutranCredenciais;
