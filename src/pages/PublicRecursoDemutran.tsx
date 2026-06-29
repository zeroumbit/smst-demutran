import { FormEvent, useState } from 'react';
import { FileSearch, FileWarning, Gavel, Info, ShieldCheck } from 'lucide-react';
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
import { validateFileUpload, DOCUMENT_UPLOAD_RULES } from '@/lib/upload';
import { isValidCpf, isValidEmail, maskCpf, maskPhone } from '@/lib/masks';

const initialForm = {
  tipo: 'defesa_previa',
  nomeCompleto: '',
  cpf: '',
  email: '',
  telefone: '',
  placa: '',
  autoInfracao: '',
  observacao: '',
};

type RecursoStatus = {
  protocolo: string;
  status: string;
  tipo: string;
  auto_infracao: string;
  placa: string | null;
  created_at: string;
  analisado_em: string | null;
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Deferido',
  rejeitado: 'Indeferido',
  concluido: 'Concluído',
};

const tipoLabels: Record<string, string> = {
  defesa_previa: 'Defesa Prévia',
  jari: 'JARI',
};

const PublicRecursoDemutran = () => {
  const [formData, setFormData] = useState(initialForm);
  const [documento, setDocumento] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consultaForm, setConsultaForm] = useState({ protocolo: '', cpf: '' });
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaStatus, setConsultaStatus] = useState<RecursoStatus | null>(null);

  const handleConsultarStatus = async (event: FormEvent) => {
    event.preventDefault();
    setConsultaLoading(true);
    setConsultaError(null);
    setConsultaStatus(null);

    const { data, error } = await supabase.rpc('consultar_status_recurso_demutran', {
      _protocolo: consultaForm.protocolo.trim().toUpperCase(),
      _cpf: consultaForm.cpf.trim(),
    });

    if (error) {
      setConsultaError('Nao foi possivel consultar o recurso agora.');
    } else {
      setConsultaStatus(data?.[0] ?? null);
      if (!data?.length) {
        setConsultaError('Nenhum recurso encontrado com os dados informados.');
      }
    }

    setConsultaLoading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formData.nomeCompleto.trim() || !formData.cpf.trim() || !formData.autoInfracao.trim() || !documento) {
      setErrorMessage('Preencha os dados obrigatorios e anexe o documento da defesa.');
      return;
    }

    if (!isValidCpf(formData.cpf)) {
      setErrorMessage('CPF invalido.');
      return;
    }

    try {
      validateFileUpload(documento, DOCUMENT_UPLOAD_RULES);
    } catch (err: any) {
      setErrorMessage(err.message);
      return;
    }

    setLoading(true);

    try {
      const documentoUrl = await uploadDemutranAnexo(documento, 'recursos');
      const { data, error } = await supabase.rpc('criar_recurso_demutran', {
        _tipo: formData.tipo,
        _nome_completo: formData.nomeCompleto,
        _cpf: formData.cpf,
        _email: formData.email || null,
        _telefone: formData.telefone || null,
        _placa: formData.placa || null,
        _auto_infracao: formData.autoInfracao,
        _defesa_documento_url: documentoUrl,
        _observacao: formData.observacao || null,
      });

      if (error) {
        throw error;
      }

      setProtocol(data?.[0]?.protocolo || null);
      setFormData(initialForm);
      setDocumento(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Nao foi possivel enviar o recurso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemutranPortalLayout>
      <Hero
        title="Defesa Previa e JARI"
        subtitle="DEMUTRAN"
        description="Envie online sua defesa de autuação com o documento do recurso e os dados do auto de infração."
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
                    Consultar recurso
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
                        placeholder="Ex.: RCR-20260616000000-ABC123"
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
                        <p className="text-sm font-semibold md:text-base">{tipoLabels[consultaStatus.tipo] || consultaStatus.tipo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground md:text-sm">Auto de Infração</p>
                        <p className="text-sm font-semibold md:text-base">{consultaStatus.auto_infracao}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground md:text-sm">Placa</p>
                        <p className="text-sm font-semibold md:text-base">{consultaStatus.placa || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground md:text-sm">Solicitado em</p>
                        <p className="text-sm font-semibold md:text-base">{new Date(consultaStatus.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-xl border border-emerald-800/30 bg-emerald-900/10 p-5 md:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-emerald-800" />
                  <h2 className="text-sm font-bold text-emerald-900 md:text-base">Prazos e procedimentos</h2>
                </div>
                <div className="space-y-3 text-xs md:text-sm text-emerald-800">
                  <div>
                    <strong className="text-emerald-900">Defesa prévia (1ª instância):</strong>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1">
                      <li>Prazo de 30 dias após a notificação da autuação</li>
                      <li>Apresenta por escrito as razões contra a infração</li>
                      <li>Não é necessário recolhimento de multa ou assinatura de termo</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-emerald-900">JARI (2ª instância):</strong>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1">
                      <li>Prazo de 30 dias após a decisão da defesa prévia</li>
                      <li>Recurso à Junta Administrativa de Recursos de Infração</li>
                      <li>Necessário protocolo do recurso conforme legislação vigente</li>
                    </ul>
                  </div>
                  <div className="rounded-md border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs">
                    <strong>Documentos necessários:</strong> Documento de identificação (RG/CPF), auto de infração e documentação que comprove as alegações (fotos, boletim de ocorrência, etc.).
                  </div>
                </div>
              </div>

            <TermsGate title="Aceite os termos para protocolar" description="Para protocolar um recurso, voce precisa aceitar nossos Termos de Uso e Politica de Privacidade.">
              <Card className="border-primary/10 shadow-lg">
                <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                    <FileWarning className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    Novo recurso
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                  <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Tipo de recurso *</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value as 'defesa_previa' | 'jari' }))}>
                        <SelectTrigger className="h-12 md:h-10 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defesa_previa">Defesa prévia</SelectItem>
                          <SelectItem value="jari">JARI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="autoInfracao" className="text-sm font-semibold">Auto de infração *</Label>
                        <Input id="autoInfracao" className="h-12 md:h-10 text-base" maxLength={50} placeholder="Ex.: AE-12345678" value={formData.autoInfracao} onChange={(event) => setFormData((current) => ({ ...current, autoInfracao: event.target.value }))} />
                      </div>
                  </div>

                  <div className="space-y-1.5">
                      <Label htmlFor="nomeCompleto" className="text-sm font-semibold">Nome completo *</Label>
                      <Input id="nomeCompleto" className="h-12 md:h-10 text-base" maxLength={200} placeholder="Seu nome completo sem abreviacoes" value={formData.nomeCompleto} onChange={(event) => setFormData((current) => ({ ...current, nomeCompleto: event.target.value }))} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf" className="text-sm font-semibold">CPF *</Label>
                      <Input id="cpf" className="h-12 md:h-10 text-base" placeholder="000.000.000-00" maxLength={14} value={formData.cpf} onChange={(event) => setFormData((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="placa" className="text-sm font-semibold">Placa do veiculo</Label>
                      <Input id="placa" className="h-12 md:h-10 text-base" placeholder="AAA1A11" maxLength={7} value={formData.placa} onChange={(event) => setFormData((current) => ({ ...current, placa: event.target.value.toUpperCase() }))} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                      <Input id="email" className="h-12 md:h-10 text-base" type="email" placeholder="seu@email.com" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone" className="text-sm font-semibold">Telefone</Label>
                      <Input id="telefone" className="h-12 md:h-10 text-base" placeholder="(00) 00000-0000" maxLength={15} value={formData.telefone} onChange={(event) => setFormData((current) => ({ ...current, telefone: maskPhone(event.target.value) }))} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="observacao" className="text-sm font-semibold">Resumo do pedido</Label>
                      <Textarea id="observacao" className="text-base" rows={4} maxLength={1000} placeholder="Descreva sucintamente os motivos do recurso..." value={formData.observacao} onChange={(event) => setFormData((current) => ({ ...current, observacao: event.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="documento" className="text-sm font-semibold">Documento da defesa *</Label>
                    <Input id="documento" className="h-12 md:h-10 text-base" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setDocumento(event.target.files?.[0] || null)} />
                  </div>

                  {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

                  <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold md:h-10 md:w-auto">
                    {loading ? 'Enviando...' : 'Enviar recurso'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            </TermsGate>

            {protocol && (
              <Card className="border-emerald-200 bg-emerald-50/40">
                <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-800 md:text-xl">
                    <ShieldCheck className="h-5 w-5" />
                    Recurso protocolado
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                  <p className="text-sm text-emerald-900">
                    Seu protocolo e <strong>{protocol}</strong>. Guarde esse numero para acompanhamento administrativo.
                  </p>
                </CardContent>
              </Card>
            )}
            </div>

            <aside className="w-full shrink-0 lg:w-80 xl:w-96">
              <div className="space-y-4 lg:sticky lg:top-24">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs md:text-sm">
                  <strong className="block text-amber-800">Atenção:</strong>
                  <span className="text-amber-700">A defesa prévia e o recurso JARI não substituem o pagamento da multa. O prazo para recorrer é de 30 dias em ambas as instâncias e o não cumprimento implica em preclusão do direito de defesa.</span>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Direito de defesa</h2>
                  </div>
                  <div className="space-y-3 text-xs md:text-sm text-muted-foreground">
                    <p>
                      O contraditório e a ampla defesa são garantidos constitucionalmente a todo cidadão autuado por infração de trânsito. Você pode questionar a validade da autuação em duas instâncias administrativas.
                    </p>

                    <div>
                      <strong className="text-foreground">Prazos importantes</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>Defesa prévia: 30 dias da notificação</li>
                        <li>Recurso JARI: 30 dias da decisão da defesa prévia</li>
                        <li>Resposta JARI: até 60 dias para julgamento</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-foreground">Como funciona</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>1. Receba o auto de infracao</li>
                        <li>2. Faça a defesa prévia (1ª instância)</li>
                        <li>3. Se negado, recorra à JARI (2ª instância)</li>
                        <li>4. Acompanhe o julgamento pelo protocolo</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-foreground">Efeito suspensivo</strong>
                      <p className="mt-0.5">A apresentação da defesa prévia ou recurso JARI suspende a exigibilidade da multa até o julgamento final.</p>
                    </div>

                    <div>
                      <strong className="text-foreground">Documentação recomendada</strong>
                      <ul className="mt-0.5 list-inside list-disc space-y-0.5 pl-1">
                        <li>Auto de infração (obrigatório)</li>
                        <li>Documentos que comprovem as alegações</li>
                        <li>Fotos, vídeos ou testemunhas</li>
                        <li>Boletim de ocorrência (se aplicável)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

    </DemutranPortalLayout>
  );
};

export default PublicRecursoDemutran;
