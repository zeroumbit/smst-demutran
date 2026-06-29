import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { FalaCidadaoLayout } from '@/components/fala-cidadao/FalaCidadaoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { maskCpf, maskPhone, isValidCpf, isValidEmail } from '@/lib/masks';
import { createFalaDemanda, falaPrioridadeLabels, getStoredFalaSession, listFalaAssuntos, listFalaSecretarias } from '@/lib/falaCidadao';
import type { FalaAssunto, FalaDemandaFormData, FalaSecretaria } from '@/types/fala-cidadao';

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

  const updateField = (field: keyof FalaDemandaFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!isValidCpf(form.cpf)) nextErrors.cpf = 'Informe um CPF valido.';
    if (!form.nome_cidadao.trim()) nextErrors.nome_cidadao = 'Informe o nome completo.';
    if (form.email && !isValidEmail(form.email)) nextErrors.email = 'Informe um email valido.';
    if (!form.secretaria_id) nextErrors.secretaria_id = 'Selecione a secretaria responsavel.';
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
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MessageSquarePlus className="h-6 w-6 text-blue-600" />
                  Nova solicitacao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CPF *" error={fieldErrors.cpf}>
                      <Input value={form.cpf} maxLength={14} placeholder="000.000.000-00" onChange={(e) => updateField('cpf', maskCpf(e.target.value))} />
                    </Field>
                    <Field label="Telefone" error={fieldErrors.telefone}>
                      <Input value={form.telefone} maxLength={15} placeholder="(00) 00000-0000" onChange={(e) => updateField('telefone', maskPhone(e.target.value))} />
                    </Field>
                  </div>

                  <Field label="Nome completo *" error={fieldErrors.nome_cidadao}>
                    <Input value={form.nome_cidadao} placeholder="Seu nome completo" onChange={(e) => updateField('nome_cidadao', e.target.value)} />
                  </Field>

                  <Field label="Email" error={fieldErrors.email}>
                    <Input type="email" value={form.email} placeholder="voce@email.com" onChange={(e) => updateField('email', e.target.value)} />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Secretaria *" error={fieldErrors.secretaria_id}>
                      <Select value={form.secretaria_id} onValueChange={(value) => {
                        setForm((current) => ({ ...current, secretaria_id: value, assunto_id: '' }));
                        setFieldErrors((current) => ({ ...current, secretaria_id: undefined, assunto_id: undefined }));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha a secretaria" />
                        </SelectTrigger>
                        <SelectContent>
                          {secretarias.map((secretaria) => (
                            <SelectItem key={secretaria.id} value={secretaria.id}>{secretaria.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Prioridade">
                      <Select value={form.prioridade} onValueChange={(value) => updateField('prioridade', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(falaPrioridadeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Assunto" error={fieldErrors.assunto_id}>
                      <Select value={form.assunto_id || undefined} onValueChange={(value) => updateField('assunto_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={form.secretaria_id ? 'Escolha um assunto' : 'Selecione a secretaria antes'} />
                        </SelectTrigger>
                        <SelectContent>
                          {assuntosFiltrados.map((assunto) => (
                            <SelectItem key={assunto.id} value={assunto.id}>{assunto.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Outro assunto">
                      <Input value={form.assunto_outro} placeholder="Use se o assunto nao estiver na lista" onChange={(e) => updateField('assunto_outro', e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Endereco *" error={fieldErrors.endereco}>
                      <Input value={form.endereco} placeholder="Rua, numero e complemento principal" onChange={(e) => updateField('endereco', e.target.value)} />
                    </Field>
                    <Field label="Bairro">
                      <Input value={form.bairro} placeholder="Nome do bairro" onChange={(e) => updateField('bairro', e.target.value)} />
                    </Field>
                  </div>

                  <Field label="Ponto de referencia">
                    <Input value={form.ponto_referencia} placeholder="Escola, praca, esquina..." onChange={(e) => updateField('ponto_referencia', e.target.value)} />
                  </Field>

                  <Field label="Descricao da demanda *" error={fieldErrors.descricao}>
                    <Textarea value={form.descricao} rows={6} placeholder="Explique o problema, o impacto e como encontrar o local." onChange={(e) => updateField('descricao', e.target.value)} />
                  </Field>

                  {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  {protocolo && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Solicitacao registrada com sucesso
                      </div>
                      <p className="mt-1">Guarde o protocolo <strong>{protocolo}</strong> para acompanhar o andamento.</p>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Enviando...' : 'Enviar solicitacao'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-blue-100 bg-blue-50/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Como acelerar o atendimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p>Informe o endereco da forma mais completa possivel.</p>
                  <p>Explique o risco ou impacto para moradores, motoristas ou pedestres.</p>
                  <p>Se o assunto nao estiver na lista, use o campo "Outro assunto".</p>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-amber-50/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Privacidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p>Seus dados pessoais nao aparecem nas consultas publicas.</p>
                  <p>O CPF e usado apenas para identificacao segura do protocolo.</p>
                </CardContent>
              </Card>
            </div>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default FalaCidadaoNovaSolicitacao;

