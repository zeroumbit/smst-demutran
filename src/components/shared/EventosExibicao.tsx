import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  data: string | null; // Format: YYYY-MM-DD
  horario: string | null; // Format: HH:MM:SS
  ativo: boolean;
  created_at?: string;
}

interface EventosExibicaoProps {
  paginaAtual?: string;
}

const EventosExibicao = ({ paginaAtual = 'home' }: EventosExibicaoProps) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        let query = supabase
          .from('eventos')
          .select('*')
          .eq('ativo', true)
          .order('data', { ascending: true }) // Ordenar por data
          .order('horario', { ascending: true }); // Depois por horário

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar eventos:', error);
        } else {
          console.log('Eventos encontrados:', data); // Adicionando log para debug
          setEventos(data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar eventos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, []);

  const abrirModalDescricao = (evento: Evento) => {
    setEventoSelecionado(evento);
    setModalAberto(true);
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-[900px]">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-left">Eventos</h2>
            <p className="text-muted-foreground mb-8 text-left">
              Confira os próximos eventos e atividades programadas
            </p>
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando eventos...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (eventos.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-[900px]">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-left">Eventos</h2>
            <p className="text-muted-foreground mb-8 text-left">
              Confira os próximos eventos e atividades programadas
            </p>
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center mb-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum evento programado</h3>
              <p className="text-muted-foreground">
                Não há eventos disponíveis no momento.
                <br />
                Confira novamente mais tarde para novas atualizações.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Agrupar eventos por data
  const eventosAgrupados: Record<string, Evento[]> = {};
  eventos.forEach(evento => {
    const dataFormatada = evento.data ? new Date(evento.data).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : 'Data não disponível';

    if (!eventosAgrupados[dataFormatada]) {
      eventosAgrupados[dataFormatada] = [];
    }
    eventosAgrupados[dataFormatada].push(evento);
  });

  // Converter o objeto em array para renderização
  const gruposPorData = Object.entries(eventosAgrupados);

  return (
    <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-[900px]">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-left">Eventos</h2>
            <p className="text-muted-foreground mb-8 text-left">
              Confira os próximos eventos e atividades programadas
          </p>

          <div className="space-y-12">
            {gruposPorData.map(([dataFormatada, eventosDoDia]) => (
              <div key={dataFormatada} className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                  {dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)}
                </h3>

                <div className="space-y-4">
                  {eventosDoDia.map((evento) => {
                    const horarioFormatado = evento.horario 
                      ? new Date(`2000-01-01T${evento.horario}`).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Horário não definido';

                    return (
                      <div
                        key={evento.id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-border mx-auto group hover:scale-[1.01]"
                        style={{ width: '900px', height: '150px' }}
                      >
                        <div className="p-5 h-full flex">
                          <div className="w-[42%] flex flex-col justify-center pr-4">
                            <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                              {evento.titulo}
                            </h4>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium">{horarioFormatado}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="truncate max-w-xs">{evento.local}</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-[58%] flex flex-col justify-center">
                            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-4 h-full flex items-center justify-between border border-border">
                              <p className="text-sm text-foreground text-left leading-relaxed flex-grow mr-4">
                                {evento.descricao.length > 150 ? evento.descricao.substring(0, 150) + '...' : evento.descricao}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalDescricao(evento)}
                                className="h-8 w-8 p-0 flex items-center justify-center ml-2"
                                aria-label="Ver descrição completa"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modal para exibir a descrição completa do evento */}
      <ResponsiveDialog
        open={modalAberto}
        onOpenChange={setModalAberto}
        title={eventoSelecionado?.titulo || ''}
      >
        <div className="py-2">
          <p className="text-foreground whitespace-pre-line">{eventoSelecionado?.descricao}</p>
        </div>
      </ResponsiveDialog>
    </section>
  );
};

export default EventosExibicao;