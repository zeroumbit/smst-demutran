import { FormEvent, useRef, useState } from 'react';
import { Accessibility, FileSearch, FileText, ShieldCheck, Upload } from 'lucide-react';
import Hero from '@/components/shared/Hero';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';
import { TermsGate } from '@/components/shared/TermsGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { uploadDemutranAnexo } from '@/lib/demutranUploads';
import { maskCpf, isValidCpf, maskPhone, isValidEmail } from '@/lib/masks';

const initialForm = {
  tipo: 'idoso' as 'idoso' | 'pcd',
  nomeCompleto: '',
  cpf: '',
  rg: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  bairro: '',
  complemento: '',
  observacao: '',
};

type FieldErrors = Partial<Record<keyof typeof initialForm, string>>;
type CredencialStatus = {
  protocolo: string;
  status: string;
  tipo: string;
  nome_completo: string;
  created_at: string;
  analisado_em: string | null;
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Concluído',
};

function UploadZone({ id, label, accept, fileName, onFileChange }: {
  id: string;
  label: string;
  accept: string;
  fileName: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 transition hover:border-primary/50 hover:bg-muted/40"
      onClick={() => ref.current?.click()}
    >
      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{fileName || label}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">Clique para selecionar um arquivo</span>
      <input
        ref={ref}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

const PublicCredencialDemutran = () => {
  const [formData, setFormData] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [documentoIdentidade, setDocumentoIdentidade] = useState<File | null>(null);
  const [comprovanteResidencia, setComprovanteResidencia] = useState<File | null>(null);
  const [laudoMedico, setLaudoMedico] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaPrivacidade, setAceitaPrivacidade] = useState(false);
  const [consultaForm, setConsultaForm] = useState({ protocolo: '', cpf: '' });
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaStatus, setConsultaStatus] = useState<CredencialStatus | null>(null);

  const handleConsultarStatus = async (event: FormEvent) => {
    event.preventDefault();
    setConsultaLoading(true);
    setConsultaError(null);
    setConsultaStatus(null);

    const { data, error } = await supabase.rpc('consultar_status_credencial_demutran', {
      _protocolo: consultaForm.protocolo.trim().toUpperCase(),
      _cpf: consultaForm.cpf.trim(),
    });

    if (error) {
      setConsultaError('Nao foi possivel consultar a solicitacao agora.');
    } else {
      setConsultaStatus(data?.[0] ?? null);
      if (!data?.length) {
        setConsultaError('Nenhuma solicitacao encontrada com os dados informados.');
      }
    }

    setConsultaLoading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const errors: FieldErrors = {};

    if (!formData.nomeCompleto.trim()) {
      errors.nomeCompleto = 'Informe o nome completo.';
    }

    if (!formData.cpf.trim()) {
      errors.cpf = 'Informe o CPF.';
    } else if (!isValidCpf(formData.cpf)) {
      errors.cpf = 'CPF inválido.';
    }

    if (!formData.rg.trim()) {
      errors.rg = 'Informe o RG.';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Email inválido.';
    }

    if (!formData.logradouro.trim()) {
      errors.logradouro = 'Informe o logradouro.';
    }

    if (!formData.numero.trim()) {
      errors.numero = 'Informe o numero.';
    }

    if (!formData.bairro.trim()) {
      errors.bairro = 'Informe o bairro.';
    }

    if (!documentoIdentidade) {
      setErrorMessage('Anexe o documento de identidade (RG/CPF).');
    } else if (!comprovanteResidencia) {
      setErrorMessage('Anexe o comprovante de residencia.');
    } else if (formData.tipo === 'pcd' && !laudoMedico) {
      setErrorMessage('Anexe o laudo/atestado medico.');
    } else if (!aceitaTermos) {
      setErrorMessage('Voce precisa aceitar os Termos de Uso para continuar.');
    } else if (!aceitaPrivacidade) {
      setErrorMessage('Voce precisa aceitar a Politica de Privacidade para continuar.');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    if (!documentoIdentidade || !comprovanteResidencia || (formData.tipo === 'pcd' && !laudoMedico)) {
      if (!errorMessage) setErrorMessage('Anexe os documentos obrigatorios para concluir a solicitacao.');
      return;
    }

    setLoading(true);

    try {
      const [documentoIdentidadeUrl, comprovanteResidenciaUrl, laudoMedicoUrl] = await Promise.all([
        uploadDemutranAnexo(documentoIdentidade, 'credenciais'),
        uploadDemutranAnexo(comprovanteResidencia, 'credenciais'),
        laudoMedico ? uploadDemutranAnexo(laudoMedico, 'credenciais') : Promise.resolve(null),
      ]);

      const { data, error } = await supabase.rpc('criar_solicitacao_credencial', {
        _tipo: formData.tipo,
        _nome_completo: formData.nomeCompleto,
        _cpf: formData.cpf,
        _rg: formData.rg || null,
        _email: formData.email || null,
        _telefone: formData.telefone || null,
        _logradouro: formData.logradouro,
        _numero: formData.numero,
        _bairro: formData.bairro,
        _complemento: formData.complemento || null,
        _observacao: formData.observacao || null,
        _documento_identidade_url: documentoIdentidadeUrl,
        _comprovante_residencia_url: comprovanteResidenciaUrl,
        _laudo_medico_url: laudoMedicoUrl,
      });

      if (error) {
        throw error;
      }

      setProtocol(data?.[0]?.protocolo || null);
      setFormData(initialForm);
      setDocumentoIdentidade(null);
      setComprovanteResidencia(null);
      setLaudoMedico(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Nao foi possivel enviar a solicitacao.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <DemutranPortalLayout>
      <Hero
        title="Credencial de Idoso e PCD"
        subtitle="DEMUTRAN"
        description="Solicite sua credencial online e envie a documentação necessária para análise."
        className="bg-gradient-hero"
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="space-y-6 md:space-y-8">
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                  <FileSearch className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Consultar solicitação
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
                      placeholder="Ex.: CRD-20260616000000-ABC123"
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

                {consultaStatus && (
                  <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-2 md:p-5">
                    <div>
                      <p className="text-xs text-muted-foreground md:text-sm">Protocolo</p>
                      <p className="text-sm font-semibold md:text-base">{consultaStatus.protocolo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground md:text-sm">Status</p>
                      <p className="text-sm font-semibold md:text-base">{statusLabels[consultaStatus.status] || consultaStatus.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground md:text-sm">Tipo</p>
                      <p className="text-sm font-semibold md:text-base">{consultaStatus.tipo === 'pcd' ? 'PCD' : 'Idoso'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground md:text-sm">Solicitado em</p>
                      <p className="text-sm font-semibold md:text-base">{new Date(consultaStatus.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6 md:gap-8 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-6 md:space-y-8">
              <div className="rounded-xl border border-emerald-800/30 bg-emerald-900/10 p-5 md:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Accessibility className="h-5 w-5 text-emerald-800" />
                  <h2 className="text-sm font-bold text-emerald-900 md:text-base">Documentos necessários</h2>
                </div>
                <div className="space-y-3 text-xs md:text-sm text-emerald-800">
                  <div>
                    <strong className="text-emerald-900">Para Idoso (60+):</strong>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1">
                      <li>Documento de identificação (RG/CNH)</li>
                      <li>Comprovante de residência</li>
                      <li>CPF</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-emerald-900">Para PCD:</strong>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1">
                      <li>Documento de identificação (RG/CNH)</li>
                      <li>Comprovante de residência</li>
                      <li>CPF</li>
                      <li>Laudo médico com CID</li>
                    </ul>
                  </div>
                  <div className="rounded-md border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs">
                    <strong>Retirada presencial:</strong> Após a análise e aprovação, o solicitante deve comparecer pessoalmente ao DEMUTRAN para retirar a credencial. Não é permitido que terceiros retirem o documento.
                  </div>
                </div>
              </div>

              <TermsGate title="Aceite os termos para solicitar" description="Para solicitar uma credencial, voce precisa aceitar nossos Termos de Uso e Politica de Privacidade.">
                <Card className="border-primary/10 shadow-lg">
                  <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                    <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                      <Accessibility className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      Nova solicitação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Tipo *</Label>
                        <Select value={formData.tipo} onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value as 'idoso' | 'pcd' }))}>
                          <SelectTrigger className="h-12 md:h-10 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="idoso">Idoso</SelectItem>
                            <SelectItem value="pcd">Pessoa com deficiência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cpf" className="text-sm font-semibold">CPF *</Label>
                        <Input
                          id="cpf"
                          className="h-12 md:h-10 text-base"
                          placeholder="000.000.000-00"
                          maxLength={14}
                          value={formData.cpf}
                          onChange={(event) => updateField('cpf', maskCpf(event.target.value))}
                        />
                        {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rg" className="text-sm font-semibold">RG *</Label>
                      <Input
                        id="rg"
                        className="h-12 md:h-10 text-base"
                        placeholder="RG"
                        maxLength={20}
                        value={formData.rg}
                        onChange={(event) => updateField('rg', event.target.value)}
                      />
                        {fieldErrors.rg && <p className="text-xs text-destructive">{fieldErrors.rg}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="nomeCompleto" className="text-sm font-semibold">Nome completo *</Label>
                      <Input
                        id="nomeCompleto"
                        className="h-12 md:h-10 text-base"
                        placeholder="Seu nome completo sem abreviacoes"
                        maxLength={200}
                        value={formData.nomeCompleto}
                        onChange={(event) => updateField('nomeCompleto', event.target.value)}
                      />
                      {fieldErrors.nomeCompleto && <p className="text-xs text-destructive">{fieldErrors.nomeCompleto}</p>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                        <Input
                          id="email"
                          className="h-12 md:h-10 text-base"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(event) => updateField('email', event.target.value)}
                        />
                        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="telefone" className="text-sm font-semibold">Telefone</Label>
                        <Input
                          id="telefone"
                          className="h-12 md:h-10 text-base"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          value={formData.telefone}
                          onChange={(event) => updateField('telefone', maskPhone(event.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="logradouro" className="text-sm font-semibold">Logradouro *</Label>
                        <Input
                          id="logradouro"
                          className="h-12 md:h-10 text-base"
                          placeholder="Rua, Avenida, Travessa..."
                          maxLength={255}
                          value={formData.logradouro}
                          onChange={(event) => updateField('logradouro', event.target.value)}
                        />
                        {fieldErrors.logradouro && <p className="text-xs text-destructive">{fieldErrors.logradouro}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="numero" className="text-sm font-semibold">Numero *</Label>
                        <Input
                          id="numero"
                          className="h-12 md:h-10 text-base"
                          placeholder="Numero"
                          maxLength={20}
                          value={formData.numero}
                          onChange={(event) => updateField('numero', event.target.value)}
                        />
                        {fieldErrors.numero && <p className="text-xs text-destructive">{fieldErrors.numero}</p>}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="bairro" className="text-sm font-semibold">Bairro *</Label>
                        <Input
                          id="bairro"
                          className="h-12 md:h-10 text-base"
                          placeholder="Nome do bairro"
                          maxLength={100}
                          value={formData.bairro}
                          onChange={(event) => updateField('bairro', event.target.value)}
                        />
                        {fieldErrors.bairro && <p className="text-xs text-destructive">{fieldErrors.bairro}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="complemento" className="text-sm font-semibold">Complemento</Label>
                        <Input
                          id="complemento"
                          className="h-12 md:h-10 text-base"
                          placeholder="Apto, Bloco, Casa..."
                          maxLength={100}
                          value={formData.complemento}
                          onChange={(event) => updateField('complemento', event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="observacao" className="text-sm font-semibold">Observações</Label>
                      <Textarea id="observacao" className="text-base" rows={3} maxLength={1000} placeholder="Informacoes adicionais (opcional)" value={formData.observacao} onChange={(event) => updateField('observacao', event.target.value)} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="documentoIdentidade" className="text-sm font-semibold">RG/CPF *</Label>
                        <UploadZone
                          id="documentoIdentidade"
                          label="Documento de identidade"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          fileName={documentoIdentidade?.name || null}
                          onFileChange={setDocumentoIdentidade}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="comprovanteResidencia" className="text-sm font-semibold">Comprovante de residência *</Label>
                        <UploadZone
                          id="comprovanteResidencia"
                          label="Comprovante de residencia"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          fileName={comprovanteResidencia?.name || null}
                          onFileChange={setComprovanteResidencia}
                        />
                      </div>
                      {formData.tipo === 'pcd' && (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="laudoMedico" className="text-sm font-semibold">Laudo/atestado médico *</Label>
                          <UploadZone
                            id="laudoMedico"
                            label="Laudo ou atestado médico"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            fileName={laudoMedico?.name || null}
                            onFileChange={setLaudoMedico}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Termos e privacidade
                      </p>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={aceitaTermos}
                          onChange={(e) => setAceitaTermos(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Li e aceito os{" "}
                            <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                              Termos de Uso
                            </a>
                          </p>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={aceitaPrivacidade}
                          onChange={(e) => setAceitaPrivacidade(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Li e aceito a{" "}
                            <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                              Politica de Privacidade
                            </a>
                          </p>
                        </div>
                      </label>
                    </div>

                    {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

                    <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold md:h-10 md:w-auto">
                      {loading ? 'Enviando...' : 'Enviar solicitação'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              </TermsGate>

              {protocol && (
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-800 md:text-xl">
                      <FileText className="h-5 w-5" />
                      Solicitação registrada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                    <p className="text-sm text-emerald-900">
                      Seu protocolo é <strong>{protocol}</strong>. Guarde esse número para acompanhamento junto ao DEMUTRAN.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="w-full shrink-0 lg:w-80 xl:w-96">
              <div className="space-y-4 lg:sticky lg:top-24">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs md:text-sm">
                  <strong className="block text-amber-800">Atenção:</strong>
                  <span className="text-amber-700">A solicitação online é apenas o primeiro passo. A retirada da credencial é <strong>presencial</strong> e deve ser feita pelo próprio interessado (idoso ou PCD) no órgão de trânsito municipal, mediante apresentação dos documentos originais.</span>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Accessibility className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Direito às vagas exclusivas</h2>
                  </div>
                  <div className="space-y-3 text-xs md:text-sm text-muted-foreground">
                    <p>
                      As vagas para idosos (60+) e pessoas com deficiência (PCD) são garantidas em todo o Brasil por leis federais. O uso exige a credencial de estacionamento, regulamentada pelo CONTRAN.
                    </p>

                    <div>
                      <strong className="text-foreground">Percentuais obrigatórios</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>Idosos: 5% das vagas (Estatuto do Idoso)</li>
                        <li>PCD: 2% das vagas (Lei Brasileira de Inclusão)</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-foreground">Regras importantes</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>A credencial é pessoal e intransferível</li>
                        <li>Vale por 5 anos (não é vitalícia)</li>
                        <li>Use a vaga correta: idoso na vaga idoso, PCD na vaga PCD</li>
                        <li>A credencial pode ser física (painel) ou digital (app CDT)</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-foreground">Multa por uso indevido</strong>
                      <p className="mt-0.5">Estacionar sem credencial válida = infração gravíssima:</p>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>Multa de R$ 293,47</li>
                        <li>7 pontos na CNH</li>
                        <li>Remoção do veículo</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-foreground">Como emitir</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li><strong>Digital (recomendado):</strong> pelo app Carteira Digital de Trânsito (CDT) ou portal Gov.br. Idoso: solicita e o sistema valida sua idade pelo CPF. PCD: anexa laudo médico com CID.</li>
                        <li><strong>Presencial:</strong> no órgão municipal de trânsito da sua cidade (prefeitura, CET, AMC). Leve RG, CPF, comprovante de residência. PCD: leve laudo médico.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      </section>

    </DemutranPortalLayout>
  );
};

export default PublicCredencialDemutran;
