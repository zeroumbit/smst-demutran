import { FormEvent, useState } from 'react';
import { SearchCheck } from 'lucide-react';
import { FalaCidadaoLayout } from '@/components/fala-cidadao/FalaCidadaoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { consultarDemandaPorProtocolo, falaPrioridadeLabels, falaStatusLabels } from '@/lib/falaCidadao';
import { maskCpf } from '@/lib/masks';
import type { FalaDemandaPublica } from '@/types/fala-cidadao';

const FalaCidadaoAcompanhar = () => {
  const [form, setForm] = useState({ protocolo: '', cpf: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FalaDemandaPublica | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await consultarDemandaPorProtocolo(form.protocolo, form.cpf);
      if (!data) {
        setError('Nenhuma solicitacao encontrada com os dados informados.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel consultar o protocolo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FalaCidadaoLayout>
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <SearchCheck className="h-6 w-6 text-blue-600" />
                Acompanhar protocolo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label>Protocolo</Label>
                  <Input value={form.protocolo} placeholder="FALA-20260629-ABC123" onChange={(e) => setForm((current) => ({ ...current, protocolo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} maxLength={14} placeholder="000.000.000-00" onChange={(e) => setForm((current) => ({ ...current, cpf: maskCpf(e.target.value) }))} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Consultando...' : 'Consultar'}
                  </Button>
                </div>
              </form>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {result ? (
                <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Protocolo</p>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">{result.protocolo}</h2>
                    </div>
                    <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-700">
                      {falaStatusLabels[result.status]}
                    </Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Info label="Secretaria" value={result.secretaria_nome} />
                    <Info label="Assunto" value={result.assunto_nome || 'Nao informado'} />
                    <Info label="Prioridade" value={falaPrioridadeLabels[result.prioridade]} />
                    <Info label="Abertura" value={new Date(result.data_abertura).toLocaleString('pt-BR')} />
                    <Info label="Endereco" value={result.endereco} />
                    <Info label="Bairro" value={result.bairro || 'Nao informado'} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Descricao</p>
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                      {result.descricao}
                    </p>
                  </div>

                  {result.resposta_cidadao ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Resposta da equipe</p>
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        {result.resposta_cidadao}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </FalaCidadaoLayout>
  );
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default FalaCidadaoAcompanhar;

