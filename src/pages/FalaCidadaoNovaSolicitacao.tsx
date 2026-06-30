import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSearch, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import Hero from '@/components/shared/Hero';
import { FalaCidadaoLayout } from '@/components/fala-cidadao/FalaCidadaoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { maskCpf, maskPhone, isValidCpf, isValidEmail } from '@/lib/masks';
import { consultarDemandaPorProtocolo, createFalaDemanda, falaPrioridadeLabels, falaStatusLabels, getStoredFalaSession, listFalaAssuntos, listFalaSecretarias } from '@/lib/falaCidadao';
import type { FalaAssunto, FalaDemandaFormData, FalaDemandaPublica, FalaSecretaria } from '@/types/fala-cidadao';

const initialForm: FalaDemandaFormData = {
  cpf: '',
  nome_cidadao: '',
  email: '',
  telefone: '',
  secretaria_id: '',
  assunto_id: '',
  assunto_outro: '',
  descricao: '',
  endereco: '',
  bairro: '',
  ponto_referencia: '',
  prioridade: 'media',
};

type FieldErrors = Partial<Record<keyof FalaDemandaFormData, string>>;

const FalaCidadaoNovaSolicitacao = () => {
  const [secretarias, setSecretarias] = useState<FalaSecretaria[]>([]);
  const [assuntos, setAssuntos] = useState<FalaAssunto[]>([]);
  const [form, setForm] = useState<FalaDemandaFormData>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const [consultaForm, setConsultaForm] = useState({ protocolo: '', cpf: '' });
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaResult, setConsultaResult] = useState<FalaDemandaPublica | null>(null);

  useEffect(() => {
    void (async () => {
      const [secretariasData, assuntosData] = await Promise.all([
        listFalaSecretarias(),
        listFalaAssuntos(),
      ]);
      setSecretarias(secretariasData);
      setAssuntos(assuntosData);
    })();
  }, []);

  const assuntosFiltrados = useMemo(
    () => assuntos.filter((item) => item.secretaria_id === form.secretaria_id),
    [assuntos, form.secretaria_id],
  );

  const assuntoSelecionado = useMemo(
    () => assuntos.find((a) => a.id === form.assunto_id) ?? null,
    [assuntos, form.assunto_id],
  );

  const assuntoSelecionadoEhOutro = useMemo(
    () => assuntoSelecionado?.nome === 'Outro',
    [assuntoSelecionado],
  );

  const prioridadeInfo = useMemo(() => {
    const prioridade = assuntoSelecionado?.prioridade_padrao;
    if (!prioridade) return null;
    return {
      baixa: { label: 'Baixa', cor: 'border-emerald-300 bg-emerald-50 text-emerald-800', badge: 'bg-emerald-500' },
      media: { label: 'Media', cor: 'border-blue-300 bg-blue-50 text-blue-800', badge: 'bg-blue-500' },
      alta: { label: 'Alta', cor: 'border-amber-300 bg-amber-50 text-amber-800', badge: 'bg-amber-500' },
      urgente: { label: 'Urgente', cor: 'border-red-300 bg-red-50 text-red-800', badge: 'bg-red-500' },
    }[prioridade];
  }, [assuntoSelecionado]);

  const updateField = (field: keyof FalaDemandaFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleConsultarStatus = async (event: FormEvent) => {
    event.preventDefault();
    setConsultaLoading(true);
    setConsultaError(null);
    setConsultaResult(null);

    try {
      const data = await consultarDemandaPorProtocolo(consultaForm.protocolo, consultaForm.cpf);
      if (!data) {
        setConsultaError('Nenhuma solicitacao encontrada com os dados informados.');
      } else {
        setConsultaResult(data);
      }
    } catch (err: any) {
      setConsultaError(err.message || 'Nao foi possivel consultar o protocolo.');
    } finally {
      setConsultaLoading(false);
    }
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!isValidCpf(form.cpf)) nextErrors.cpf = 'Informe um CPF valido.';
    if (!form.nome_cidadao.trim()) nextErrors.nome_cidadao = 'Informe o nome completo.';
    if (form.email && !isValidEmail(form.email)) nextErrors.email = 'Informe um email valido.';
    if (!form.secretaria_id) nextErrors.secretaria_id = 'Selecione o departamento responsavel.';
    if (!form.assunto_id && !form.assunto_outro.trim()) nextErrors.assunto_id = 'Selecione um assunto ou informe outro.';
    if (form.descricao.trim().length < 10) nextErrors.descricao = 'Descreva o problema com mais detalhes.';
    if (form.endereco.trim().length < 5) nextErrors.endereco = 'Informe um endereco valido.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setProtocolo(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const sessionToken = getStoredFalaSession();
      const result = await createFalaDemanda(form, sessionToken);
      setProtocolo(result?.protocolo ?? null);
      setForm(initialForm);
    } catch (error: any) {
      setSubmitError(error.message || 'Nao foi possivel registrar a solicitacao agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FalaCidadaoLayout>
      <Hero
        title="Fala Cidadao"
        subtitle="Secretaria de Seguranca"
        description="Registre sua demanda para os orgaos de seguranca do municipio. Acompanhe o andamento pelo protocolo gerado."
        className="bg-gradient-hero"
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:gap-8 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-6 md:space-y-8">
              <Card className="border-primary/10 shadow-lg">
                <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                    <FileSearch className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    Acompanhar protocolo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-4 pb-5 md:px-6 md:pb-6">
                  <form onSubmit={handleConsultarStatus} className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="consulta-protocolo" className="text-sm font-semibold">Protocolo</Label>
                      <Input
                        id="consulta-protocolo"
                        className="h-12 md:h-10 text-base"
                        value={consultaForm.protocolo}
                        onChange={(event) => setConsultaForm((current) => ({ ...current, protocolo: event.target.value }))}
                        placeholder="Ex.: FALA-20260629-ABC123"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="consulta-cpf" className="text-sm font-semibold">CPF</Label>
                      <Input
                        id="consulta-cpf"
                        className="h-12 md:h-10 text-base"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        value={consultaForm.cpf}
                        onChange={(event) => setConsultaForm((current) => ({ ...current, cpf: maskCpf(event.target.value) }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="h-12 w-full text-base font-semibold md:h-10 md:w-auto" disabled={consultaLoading}>
                        {consultaLoading ? 'Consultando...' : 'Consultar'}
                      </Button>
                    </div>
                  </form>

                  {consultaError && <p className="text-sm text-destructive">{consultaError}</p>}

                  {consultaResult && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Protocolo</p>
                          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">{consultaResult.protocolo}</h2>
                        </div>
                        <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-700">
                          {falaStatusLabels[consultaResult.status]}
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Info label="Departamento" value={consultaResult.secretaria_nome} />
                        <Info label="Assunto" value={consultaResult.assunto_nome || 'Nao informado'} />
                        <Info label="Prioridade" value={falaPrioridadeLabels[consultaResult.prioridade]} />
                        <Info label="Abertura" value={new Date(consultaResult.data_abertura).toLocaleString('pt-BR')} />
                        <Info label="Endereco" value={consultaResult.endereco} />
                        <Info label="Bairro" value={consultaResult.bairro || 'Nao informado'} />
                      </div>
                      {consultaResult.descricao && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Descricao</p>
                          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {consultaResult.descricao}
                          </p>
                        </div>
                      )}
                      {consultaResult.resposta_cidadao && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <p className="font-bold">Resposta da equipe</p>
                          <p className="mt-1">{consultaResult.resposta_cidadao}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/10 shadow-lg">
                <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                    <MessageSquarePlus className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    Nova solicitacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                  <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="CPF *" error={fieldErrors.cpf}>
                        <Input className="h-12 md:h-10 text-base" value={form.cpf} maxLength={14} placeholder="000.000.000-00" onChange={(e) => updateField('cpf', maskCpf(e.target.value))} />
                      </Field>
                      <Field label="Telefone" error={fieldErrors.telefone}>
                        <Input className="h-12 md:h-10 text-base" value={form.telefone} maxLength={15} placeholder="(00) 00000-0000" onChange={(e) => updateField('telefone', maskPhone(e.target.value))} />
                      </Field>
                      <Field label="Email" error={fieldErrors.email}>
                        <Input className="h-12 md:h-10 text-base" type="email" value={form.email} placeholder="voce@email.com" onChange={(e) => updateField('email', e.target.value)} />
                      </Field>
                    </div>

                    <Field label="Nome completo *" error={fieldErrors.nome_cidadao}>
                      <Input className="h-12 md:h-10 text-base" value={form.nome_cidadao} placeholder="Seu nome completo" onChange={(e) => updateField('nome_cidadao', e.target.value)} />
                    </Field>

                    <Field label="Departamento *" error={fieldErrors.secretaria_id}>
                      <Select value={form.secretaria_id} onValueChange={(value) => {
                        setForm((current) => ({ ...current, secretaria_id: value, assunto_id: '', prioridade: 'media' }));
                        setFieldErrors((current) => ({ ...current, secretaria_id: undefined, assunto_id: undefined }));
                      }}>
                        <SelectTrigger className="h-12 md:h-10 text-base">
                          <SelectValue placeholder="Escolha o departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {secretarias.map((secretaria) => (
                            <SelectItem key={secretaria.id} value={secretaria.id}>{secretaria.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Assunto" error={fieldErrors.assunto_id}>
                      <Select value={form.assunto_id || undefined} onValueChange={(value) => {
                        updateField('assunto_id', value);
                        if (value) {
                          const assunto = assuntos.find((a) => a.id === value);
                          if (assunto?.nome !== 'Outro') {
                            updateField('assunto_outro', '');
                          }
                          if (assunto?.prioridade_padrao) {
                            updateField('prioridade', assunto.prioridade_padrao);
                          }
                        }
                      }}>
                        <SelectTrigger className="h-12 md:h-10 text-base">
                          <SelectValue placeholder={form.secretaria_id ? 'Escolha um assunto' : 'Selecione o departamento antes'} />
                        </SelectTrigger>
                        <SelectContent>
                          {assuntosFiltrados.map((assunto) => (
                            <SelectItem key={assunto.id} value={assunto.id}>{assunto.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {assuntoSelecionado && prioridadeInfo && (
                      <div className={`rounded-2xl border px-4 py-3 text-sm leading-5 ${prioridadeInfo.cor}`}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${prioridadeInfo.badge}`} />
                          <span className="font-bold">Prioridade {prioridadeInfo.label}</span>
                        </div>
                        <p className="mt-1">
                          {assuntoSelecionado.prioridade_padrao === 'baixa' && 'Este assunto sera atendido conforme a disponibilidade da equipe.'}
                          {assuntoSelecionado.prioridade_padrao === 'media' && 'Este assunto esta na prioridade normal e sera atendido em breve.'}
                          {assuntoSelecionado.prioridade_padrao === 'alta' && 'Este assunto tem prioridade alta. A equipe sera acionada em breve.'}
                          {assuntoSelecionado.prioridade_padrao === 'urgente' && 'Este assunto e urgente. A equipe sera acionada imediatamente para atendimento.'}
                        </p>
                      </div>
                    )}

                    {assuntoSelecionadoEhOutro && (
                      <Field label="Outro assunto" error={fieldErrors.assunto_outro}>
                        <Input className="h-12 md:h-10 text-base" value={form.assunto_outro} placeholder="Descreva o assunto" onChange={(e) => updateField('assunto_outro', e.target.value)} />
                      </Field>
                    )}

                    <Field label="Endereco *" error={fieldErrors.endereco}>
                      <Input className="h-12 md:h-10 text-base" value={form.endereco} placeholder="Rua, numero e complemento principal" onChange={(e) => updateField('endereco', e.target.value)} />
                    </Field>

                    <Field label="Bairro">
                      <Input className="h-12 md:h-10 text-base" value={form.bairro} placeholder="Nome do bairro" onChange={(e) => updateField('bairro', e.target.value)} />
                    </Field>

                    <Field label="Ponto de referencia">
                      <Input className="h-12 md:h-10 text-base" value={form.ponto_referencia} placeholder="Escola, praca, esquina..." onChange={(e) => updateField('ponto_referencia', e.target.value)} />
                    </Field>

                    <Field label="Descricao da demanda *" error={fieldErrors.descricao}>
                      <Textarea className="text-base" value={form.descricao} rows={6} placeholder="Explique o problema, o impacto e como encontrar o local." onChange={(e) => updateField('descricao', e.target.value)} />
                    </Field>

                    {submitError && (
                      <p className="text-sm text-destructive">{submitError}</p>
                    )}

                    {protocolo && (
                      <Card className="border-emerald-200 bg-emerald-50/40">
                        <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                          <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-800 md:text-xl">
                            <CheckCircle2 className="h-5 w-5" />
                            Solicitacao registrada
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                          <p className="text-sm text-emerald-900">
                            Seu protocolo e <strong>{protocolo}</strong>. Guarde esse numero para acompanhar o andamento.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold md:h-10 md:w-auto">
                      {loading ? 'Enviando...' : 'Enviar solicitacao'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <aside className="w-full shrink-0 lg:w-80 xl:w-96">
              <div className="space-y-4 lg:sticky lg:top-24">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs md:text-sm">
                  <strong className="block text-amber-800">Atencao:</strong>
                  <span className="text-amber-700">A prioridade e definida automaticamente com base no assunto selecionado. Em caso de urgencia, ligue para o numero de emergencia do orgao responsavel.</span>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Privacidade e seguranca</h2>
                  </div>
                  <div className="space-y-3 text-xs md:text-sm text-muted-foreground">
                    <p>Seus dados pessoais nao aparecem nas consultas publicas. O CPF e usado apenas para identificacao segura do protocolo.</p>
                    <div>
                      <strong className="text-foreground">Dicas para agilizar</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>Informe o endereco da forma mais completa possivel</li>
                        <li>Explique o risco ou impacto para moradores, motoristas ou pedestres</li>
                        <li>Se o assunto nao estiver na lista, selecione "Outro" e descreva</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </FalaCidadaoLayout>
  );
};

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default FalaCidadaoNovaSolicitacao;
