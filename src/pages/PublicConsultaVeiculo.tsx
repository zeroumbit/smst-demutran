import { FormEvent, useState } from 'react';
import { Search, CarFront, ShieldAlert, MapPin, Calendar, Clock, DollarSign, FileText, X, Copy, Check } from 'lucide-react';
import Hero from '@/components/shared/Hero';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';
import { TermsGate } from '@/components/shared/TermsGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { supabase } from '@/lib/supabase';
import { maskCpf } from '@/lib/masks';

interface ConsultaResultado {
  protocolo: string;
  placa: string;
  descricao_veiculo: string;
  local_custodia: string;
  data_recolhimento: string;
  dias_apreendido: number;
  motivo: string;
  taxa_diaria: number | null;
  valor_estimado: number | null;
  status: string;
  situacao: string;
  proprietario_nome: string;
}

const localLabels: Record<string, string> = {
  automoveis: 'Patio de automoveis',
  motos: 'Patio de motos',
  motos_delegacia: 'Delegacia',
  veiculos_forum: 'Forum',
};

const PublicConsultaVeiculo = () => {
  const [protocolo, setProtocolo] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultadoModalOpen, setResultadoModalOpen] = useState(false);
  const [protocoloCopiado, setProtocoloCopiado] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResultado(null);

    if (!protocolo.trim() || !cpfCnpj.trim()) {
      setError('Informe o protocolo e o CPF/CNPJ.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('consultar_veiculo_recolhido_por_protocolo', {
        _protocolo: protocolo.trim().toUpperCase(),
        _cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
      });

      if (rpcError) {
        console.error('Erro ao consultar veiculo por protocolo', rpcError);
        setError('Nao foi possivel realizar a consulta agora. Tente novamente em instantes.');
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError('Nenhum veiculo encontrado com os dados informados. Verifique o protocolo e o CPF/CNPJ.');
      } else {
        const veiculo = (Array.isArray(data) ? data[0] : data) as ConsultaResultado;
        setResultado(veiculo);
        setResultadoModalOpen(true);
      }
    } catch (err) {
      setError('Erro inesperado ao realizar a consulta.');
    }

    setLoading(false);
  };

  const copiarProtocolo = async () => {
    if (!resultado?.protocolo) return;
    try {
      await navigator.clipboard.writeText(resultado.protocolo);
      setProtocoloCopiado(true);
      setTimeout(() => setProtocoloCopiado(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = resultado.protocolo;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setProtocoloCopiado(true);
      setTimeout(() => setProtocoloCopiado(false), 2000);
    }
  };

  return (
    <DemutranPortalLayout>
      <Hero
        title="Consulta de Veiculo Recolhido"
        subtitle="DEMUTRAN"
        description="Acompanhe a situacao do seu veiculo informando o protocolo fornecido no auto de apreensao e seu CPF/CNPJ."
        className="bg-gradient-hero"
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
            <TermsGate title="Aceite os termos para consultar" description="Para consultar a situacao de um veiculo, voce precisa aceitar nossos Termos de Uso e Politica de Privacidade.">
              <Card className="border-primary/10 shadow-lg">
                <CardHeader className="px-4 py-5 md:px-6 md:py-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                    <Search className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    Consultar situacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-5 md:px-6 md:pb-6">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="protocolo" className="text-sm font-semibold">Protocolo</Label>
                      <Input
                        id="protocolo"
                        className="h-12 md:h-10 text-base"
                        value={protocolo}
                        onChange={(event) => setProtocolo(event.target.value)}
                        placeholder="Ex.: APR-20260622000000-ABC123"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf" className="text-sm font-semibold">CPF/CNPJ</Label>
                      <Input
                        id="cpf"
                        className="h-12 md:h-10 text-base"
                        placeholder="000.000.000-00"
                        maxLength={18}
                        value={cpfCnpj}
                        onChange={(event) => setCpfCnpj(maskCpf(event.target.value))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="h-12 w-full text-base font-semibold md:h-10 md:w-auto" disabled={loading}>
                        {loading ? 'Consultando...' : 'Consultar'}
                      </Button>
                    </div>
                  </form>
                  <p className="mt-3 text-sm text-muted-foreground">
                    O protocolo esta impresso no auto de apreensao entregue no momento da remocao do veiculo.
                  </p>
                </CardContent>
              </Card>
            </TermsGate>

            {error && (
              <Card className="border-amber-200 bg-amber-50/40">
                <CardContent className="flex items-start gap-3 px-4 py-5 md:px-6 md:py-6">
                  <ShieldAlert className="mt-1 h-5 w-5 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-900">
                      {error.startsWith('Nao foi possivel') ? 'Erro na consulta' : 'Nenhum registro encontrado'}
                    </p>
                    <p className="text-sm text-amber-800">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {resultado && (
        <ResponsiveDialog
          open={resultadoModalOpen}
          onOpenChange={setResultadoModalOpen}
          title="Veiculo localizado"
          description={`${resultado.placa} • ${resultado.descricao_veiculo}`}
          onConfirm={() => setResultadoModalOpen(false)}
          confirmLabel="Fechar"
        >
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Protocolo</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold text-primary">{resultado.protocolo}</p>
                  <button
                    type="button"
                    onClick={copiarProtocolo}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-primary shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    title="Copiar protocolo"
                  >
                    {protocoloCopiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placa</p>
                <p className="text-sm font-semibold">{resultado.placa}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Veiculo</p>
                <p className="text-sm font-semibold">{resultado.descricao_veiculo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Proprietario</p>
                <p className="text-sm font-semibold">{resultado.proprietario_nome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Situacao</p>
                <p className="text-sm font-semibold">{resultado.situacao}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-semibold">
                  {resultado.status === 'liberado' ? 'Liberado' : 'Recolhido'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-100/40 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-800/70">Data do recolhimento</p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {new Date(resultado.data_recolhimento).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-800/70">Tempo apreendido</p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {resultado.dias_apreendido} {resultado.dias_apreendido === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-800/70">Local de custodia</p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {localLabels[resultado.local_custodia] || resultado.local_custodia}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-800/70">Valor estimado de taxas</p>
                    <p className="text-base font-bold text-emerald-900">
                      R$ {(resultado.valor_estimado ?? 0).toFixed(2)}
                    </p>
                    {(resultado.taxa_diaria ?? 0) > 0 && (
                      <p className="text-xs text-emerald-700/70">
                        Taxa diaria: R$ {(resultado.taxa_diaria ?? 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Motivo da apreensao</p>
                <p className="text-sm font-semibold">{resultado.motivo}</p>
              </div>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </DemutranPortalLayout>
  );
};

export default PublicConsultaVeiculo;
