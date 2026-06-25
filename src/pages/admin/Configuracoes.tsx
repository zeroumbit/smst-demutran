import { useEffect, useState, useRef } from 'react';
import { CreditCard, Edit2, ImageIcon, Percent, Plus, Settings2, Trash2, Upload, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { sanitizeFileName, validateFileUpload, IMAGE_UPLOAD_RULES } from '@/lib/upload';
import { cn } from '@/lib/utils';
import type { Configuracao, PixChaveTipo } from '@/types/admin';

type PixManualForm = {
  chave_tipo: PixChaveTipo;
  chave_valor: string;
  qrcode_ativo: boolean;
  qrcode_url: string | null;
  favorecido: string;
  telefone: string;
};

const CHAVE_TIPOS: { value: PixChaveTipo; label: string }[] = [
  { value: 'email', label: 'E-mail' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'aleatoria', label: 'Aleatória' },
];

const initialForm: PixManualForm = {
  chave_tipo: 'email',
  chave_valor: '',
  qrcode_ativo: false,
  qrcode_url: null,
  favorecido: '',
  telefone: '',
};

async function uploadQrcode(file: File): Promise<string> {
  validateFileUpload(file, IMAGE_UPLOAD_RULES);
  const fileName = `configuracoes/pix_manual/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from('demutran-anexos').upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('demutran-anexos').getPublicUrl(fileName);
  return data.publicUrl;
}

type DemutranTaxa = {
  id: string;
  tipo: 'demutran' | 'carro_horario' | 'mototaxi';
  servico: string;
  valor: number | null;
  observacao: string | null;
  setor_id: string;
};

const Configuracoes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pixConfig, setPixConfig] = useState<Configuracao | null>(null);
  const [form, setForm] = useState<PixManualForm>(initialForm);
  const [qrcodeFile, setQrcodeFile] = useState<File | null>(null);
  const [qrcodePreview, setQrcodePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Taxas
  const [taxas, setTaxas] = useState<DemutranTaxa[]>([]);
  const [loadingTaxas, setLoadingTaxas] = useState(false);
  const [showTaxaDialog, setShowTaxaDialog] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<DemutranTaxa | null>(null);
  const [taxaForm, setTaxaForm] = useState({
    tipo: 'demutran' as DemutranTaxa['tipo'],
    servico: '',
    valor: '',
    observacao: '',
  });
  const [activeTab, setActiveTab] = useState<DemutranTaxa['tipo']>('demutran');

  useEffect(() => {
    loadPixConfig();
    loadTaxas();
  }, []);

  async function loadTaxas() {
    setLoadingTaxas(true);
    try {
      const { data, error } = await supabase
        .from('demutran_taxas')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTaxas((data as DemutranTaxa[]) ?? []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar taxas', description: err.message });
    } finally {
      setLoadingTaxas(false);
    }
  }

  async function handleSaveTaxa() {
    if (!taxaForm.servico.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o nome do serviço.' });
      return;
    }

    setSaving(true);
    try {
      const valorLimpo = taxaForm.valor.trim().replace(',', '.');
      const valorNumerico = valorLimpo ? parseFloat(valorLimpo) : null;
      
      const payload = {
        tipo: taxaForm.tipo,
        servico: taxaForm.servico.trim(),
        valor: valorNumerico,
        observacao: taxaForm.observacao.trim() || null,
      };

      if (editingTaxa) {
        const { error } = await supabase
          .from('demutran_taxas')
          .update(payload)
          .eq('id', editingTaxa.id);

        if (error) throw error;
        toast({ title: 'Taxa atualizada', description: 'A taxa foi atualizada com sucesso.' });
      } else {
        const { error } = await supabase
          .from('demutran_taxas')
          .insert([payload]);

        if (error) throw error;
        toast({ title: 'Taxa criada', description: 'A taxa foi criada com sucesso.' });
      }

      setShowTaxaDialog(false);
      setEditingTaxa(null);
      setTaxaForm({ tipo: 'demutran', servico: '', valor: '', observacao: '' });
      await loadTaxas();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar taxa', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTaxa(id: string) {
    if (!confirm('Deseja realmente excluir esta taxa?')) return;
    try {
      const { error } = await supabase
        .from('demutran_taxas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Taxa excluída', description: 'A taxa foi removida com sucesso.' });
      await loadTaxas();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir taxa', description: err.message });
    }
  }

  function startEditTaxa(taxa: DemutranTaxa) {
    setEditingTaxa(taxa);
    setTaxaForm({
      tipo: taxa.tipo,
      servico: taxa.servico,
      valor: taxa.valor !== null ? taxa.valor.toString().replace('.', ',') : '',
      observacao: taxa.observacao || '',
    });
    setShowTaxaDialog(true);
  }

  function startCreateTaxa() {
    setEditingTaxa(null);
    setTaxaForm({
      tipo: activeTab,
      servico: '',
      valor: '',
      observacao: '',
    });
    setShowTaxaDialog(true);
  }

  async function loadPixConfig() {
    setLoading(true);
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('grupo', 'meio_pagamento')
      .eq('tipo', 'pix_manual')
      .maybeSingle();

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar configuração', description: error.message });
    } else if (data) {
      setPixConfig(data);
      setForm({
        chave_tipo: (data.config as any).chave_tipo || 'email',
        chave_valor: (data.config as any).chave_valor || '',
        qrcode_ativo: (data.config as any).qrcode_ativo || false,
        qrcode_url: (data.config as any).qrcode_url || null,
        favorecido: (data.config as any).favorecido || '',
        telefone: (data.config as any).telefone || '',
      });
    }
    setLoading(false);
  }

  function handleQrcodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrcodeFile(file);
    setQrcodePreview(URL.createObjectURL(file));
  }

  function removeQrcode() {
    setQrcodeFile(null);
    setQrcodePreview(null);
    setForm((prev) => ({ ...prev, qrcode_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!form.favorecido.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o nome do favorecido.' });
      return;
    }
    if (!form.chave_valor.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe a chave PIX.' });
      return;
    }

    setSaving(true);
    try {
      let qrcode_url = form.qrcode_url;

      if (qrcodeFile) {
        qrcode_url = await uploadQrcode(qrcodeFile);
      }

      if (!form.qrcode_ativo) {
        qrcode_url = null;
      }

      const configPayload = {
        chave_tipo: form.chave_tipo,
        chave_valor: form.chave_valor.trim(),
        qrcode_ativo: form.qrcode_ativo,
        qrcode_url,
        favorecido: form.favorecido.trim(),
        telefone: form.telefone.trim(),
      };

      if (pixConfig) {
        const { error } = await supabase
          .from('configuracoes')
          .update({ config: configPayload as any, ativo: true })
          .eq('id', pixConfig.id);

        if (error) throw error;
        toast({ title: 'Configuração salva', description: 'PIX Manual atualizado com sucesso.' });
      } else {
        const { error } = await supabase
          .from('configuracoes')
          .insert({
            grupo: 'meio_pagamento',
            tipo: 'pix_manual',
            config: configPayload as any,
            ativo: true,
            ordem: 1,
          });

        if (error) throw error;
        toast({ title: 'Configuração salva', description: 'PIX Manual criado com sucesso.' });
      }

      await loadPixConfig();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-6 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Administracao</p>
                <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Configuracoes</h1>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">
                  Gerencie as configuracoes do sistema.
                </p>
              </div>
              <div className="mt-3 hidden shrink-0 sm:block">
                <div className="rounded-[18px] bg-white/15 p-3.5 text-white backdrop-blur-sm">
                  <Settings2 className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARD CONFIGURAÇÕES DE TAXAS */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-[14px] bg-primary/10 p-2.5 text-primary">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Configurações de Taxas</CardTitle>
                <CardDescription>Configure as taxas cobradas pelo DEMUTRAN por tipo de serviço.</CardDescription>
              </div>
            </div>
            <Button onClick={startCreateTaxa} className="rounded-xl flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nova Taxa
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingTaxas ? (
              <p className="text-sm text-muted-foreground">Carregando taxas...</p>
            ) : (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DemutranTaxa['tipo'])} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger value="demutran" className="rounded-lg text-xs font-semibold py-2">Taxas do DEMUTRAN</TabsTrigger>
                  <TabsTrigger value="carro_horario" className="rounded-lg text-xs font-semibold py-2">Carros de Horário</TabsTrigger>
                  <TabsTrigger value="mototaxi" className="rounded-lg text-xs font-semibold py-2">Mototaxistas</TabsTrigger>
                </TabsList>

                {['demutran', 'carro_horario', 'mototaxi'].map((tabTipo) => {
                  const filteredTaxas = taxas.filter((taxa) => taxa.tipo === tabTipo);
                  return (
                    <TabsContent key={tabTipo} value={tabTipo} className="mt-0">
                      {filteredTaxas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-2xl bg-muted/10">
                          <p className="text-sm text-muted-foreground">Nenhuma taxa cadastrada nesta categoria.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3.5 font-semibold">Serviço</th>
                                <th className="px-4 py-3.5 font-semibold text-right">Valor</th>
                                <th className="px-4 py-3.5 font-semibold">Observação</th>
                                <th className="px-4 py-3.5 font-semibold text-center w-24">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredTaxas.map((taxa) => (
                                <tr key={taxa.id} className="transition-colors hover:bg-muted/10">
                                  <td className="px-4 py-3.5 font-medium text-foreground">{taxa.servico}</td>
                                  <td className="px-4 py-3.5 text-right font-medium text-foreground">
                                    {taxa.valor !== null ? (
                                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxa.valor)
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                    {taxa.observacao || <span className="italic text-muted-foreground/50">Sem observação</span>}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => startEditTaxa(taxa)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteTaxa(taxa.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* CARD MEIO DE PAGAMENTO */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-[14px] bg-primary/10 p-2.5 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Meio de Pagamento</CardTitle>
                <CardDescription>Configure os meios de pagamento disponiveis no sistema.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">PIX Manual</p>
                      <Badge variant="outline" className="text-[10px]">Manual</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chave: {form.chave_valor || 'Nao configurada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pixConfig?.ativo ?? false}
                      onCheckedChange={async (checked) => {
                        if (!pixConfig) return;
                        await supabase.from('configuracoes').update({ ativo: checked }).eq('id', pixConfig.id);
                        await loadPixConfig();
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {pixConfig?.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground">Configurar PIX Manual</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="favorecido">Nome do favorecido *</Label>
                      <Input
                        id="favorecido"
                        value={form.favorecido}
                        onChange={(e) => setForm((prev) => ({ ...prev, favorecido: e.target.value }))}
                        placeholder="Nome completo do favorecido"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone com DDD</Label>
                      <Input
                        id="telefone"
                        value={form.telefone}
                        onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
                        placeholder="(85) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="chave_tipo">Tipo de chave PIX *</Label>
                      <Select
                        value={form.chave_tipo}
                        onValueChange={(value: PixChaveTipo) => setForm((prev) => ({ ...prev, chave_tipo: value }))}
                      >
                        <SelectTrigger id="chave_tipo">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAVE_TIPOS.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chave_valor">Chave PIX *</Label>
                      <Input
                        id="chave_valor"
                        value={form.chave_valor}
                        onChange={(e) => setForm((prev) => ({ ...prev, chave_valor: e.target.value }))}
                        placeholder={
                          form.chave_tipo === 'email' ? 'exemplo@email.com' :
                          form.chave_tipo === 'cpf' ? '000.000.000-00' :
                          form.chave_tipo === 'cnpj' ? '00.000.000/0000-00' :
                          'Chave aleatoria'
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="qrcode_ativo"
                        checked={form.qrcode_ativo}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, qrcode_ativo: checked }))}
                      />
                      <Label htmlFor="qrcode_ativo">Adicionar QRCODE</Label>
                    </div>

                    {form.qrcode_ativo && (
                      <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                        {qrcodePreview || form.qrcode_url ? (
                          <div className="relative inline-block">
                            <img
                              src={qrcodePreview || form.qrcode_url!}
                              alt="QR Code PIX"
                              className="h-40 w-40 rounded-lg border border-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeQrcode}
                              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer flex-col items-center gap-2 py-6">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">
                              Clique para fazer upload do QR Code
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG ou WebP (max. 5MB)
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={handleQrcodeChange}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Salvando...' : 'Salvar configuração'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* DIALOG DE TAXAS */}
        <Dialog open={showTaxaDialog} onOpenChange={setShowTaxaDialog}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingTaxa ? 'Editar Taxa' : 'Nova Taxa'}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da taxa cobrada pelo serviço do DEMUTRAN.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="taxa_tipo">Tipo de Taxa *</Label>
                <Select
                  value={taxaForm.tipo}
                  onValueChange={(value: DemutranTaxa['tipo']) => setTaxaForm((prev) => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger id="taxa_tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demutran">Taxas do DEMUTRAN</SelectItem>
                    <SelectItem value="carro_horario">Carros de Horário</SelectItem>
                    <SelectItem value="mototaxi">Mototaxistas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa_servico">Serviço / Descrição *</Label>
                <Input
                  id="taxa_servico"
                  value={taxaForm.servico}
                  onChange={(e) => setTaxaForm((prev) => ({ ...prev, servico: e.target.value }))}
                  placeholder="Ex: Vistoria Especial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa_valor">Valor (R$)</Label>
                <Input
                  id="taxa_valor"
                  value={taxaForm.valor}
                  onChange={(e) => setTaxaForm((prev) => ({ ...prev, valor: e.target.value }))}
                  placeholder="Ex: 111,23 (deixe em branco se for isento/variável)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa_observacao">Observação</Label>
                <Input
                  id="taxa_observacao"
                  value={taxaForm.observacao}
                  onChange={(e) => setTaxaForm((prev) => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Ex: 80 UFIR's do Ceará"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaxaDialog(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTaxa} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Taxa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Configuracoes;
