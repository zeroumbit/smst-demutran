import { useEffect, useState } from 'react';
import { Calendar, Video, Download, ExternalLink, MapPin, Users } from 'lucide-react';
import Hero from '@/components/shared/Hero';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import NewsCard from '@/components/shared/NewsCard';
import type { DemutranMidia } from '@/types/admin';

interface NewsItem {
  id: string;
  titulo: string;
  resumo: string;
  data: string | null;
  imagem: string | null;
}

interface EventoItem {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  data: string | null;
  horario: string | null;
}

interface FotoItem {
  id: string;
  url: string;
  titulo: string;
  descricao: string;
}

interface MembroItem {
  id: string;
  nome: string;
  cargo: string;
  foto?: string;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

const PublicMidiasDemutran = () => {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [eventos, setEventos] = useState<EventoItem[]>([]);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [membros, setMembros] = useState<MembroItem[]>([]);
  const [midias, setMidias] = useState<DemutranMidia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const [noticiasRes, eventosRes, fotosRes, membrosRes, midiasRes] = await Promise.all([
        supabase.from('noticias').select('id, titulo, resumo, data, imagem').eq('ativo', true).order('data', { ascending: false }).limit(12),
        supabase.from('eventos').select('id, titulo, descricao, local, data, horario').eq('ativo', true).order('data', { ascending: false }).limit(12),
        supabase.from('galeria_fotos').select('id, url, titulo, descricao').eq('ativo', true).order('created_at', { ascending: false }).limit(12),
        supabase.from('equipe').select('id, nome, cargo, foto').eq('ativo', true).order('nome', { ascending: true }).limit(12),
        supabase.from('demutran_midias').select('*').order('created_at', { ascending: false }).limit(12),
      ]);

      if (!noticiasRes.error && noticiasRes.data) setNoticias(noticiasRes.data as NewsItem[]);
      if (!eventosRes.error && eventosRes.data) setEventos(eventosRes.data as EventoItem[]);
      if (!fotosRes.error && fotosRes.data) setFotos(fotosRes.data as FotoItem[]);
      if (!membrosRes.error && membrosRes.data) setMembros(membrosRes.data as MembroItem[]);
      if (!midiasRes.error && midiasRes.data) setMidias(midiasRes.data as DemutranMidia[]);
      setLoading(false);
    };

    loadAll();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <DemutranPortalLayout>
      <Hero
        title="Midias do DEMUTRAN"
        subtitle="DEMUTRAN"
        description="Noticias, informacoes, interdições e conteudos educativos do Departamento Municipal de Transito de Caninde."
        className="bg-gradient-hero"
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16">
          {loading ? (
            <div className="text-center text-muted-foreground py-16">Carregando...</div>
          ) : (
            <>
              {noticias.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-8">Noticias</h2>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {noticias.map((item) => (
                      <NewsCard
                        key={item.id}
                        title={item.titulo}
                        description={item.resumo}
                        date={formatDate(item.data)}
                        imageUrl={item.imagem || undefined}
                        newsId={item.id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {eventos.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-8">Eventos</h2>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {eventos.map((item) => (
                      <Card key={item.id} className="border-2 border-border bg-gradient-card shadow-md flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-start gap-2 text-lg">
                            <Calendar className="h-5 w-5 mt-1 shrink-0 text-primary" />
                            <span>{item.titulo}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-1 flex flex-col">
                          <p className="text-sm text-muted-foreground flex-1">{item.descricao}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(item.data)}{item.horario ? ` as ${item.horario.slice(0, 5)}` : ''}</span>
                          </div>
                          {item.local && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{item.local}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {fotos.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-8">Galeria</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {fotos.map((foto) => (
                      <a
                        key={foto.id}
                        href={foto.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden rounded-xl aspect-square"
                      >
                        <img
                          src={foto.url}
                          alt={foto.titulo}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-white text-sm font-semibold">{foto.titulo}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {membros.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-8">Equipe</h2>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {membros.map((item) => (
                      <Card key={item.id} className="border-2 border-border bg-gradient-card shadow-md flex items-center gap-4 p-4">
                        {item.foto ? (
                          <img
                            src={item.foto}
                            alt={item.nome}
                            className="w-16 h-16 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground truncate">{item.nome}</h3>
                          <p className="text-sm text-muted-foreground truncate">{item.cargo}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {midias.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-8">Conteudos</h2>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {midias.map((midia) => (
                      <Card key={midia.id} className="border-2 border-border bg-gradient-card shadow-md flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-start gap-2 text-lg">
                            {midia.tipo === 'video' ? (
                              <Video className="h-5 w-5 mt-1 shrink-0 text-primary" />
                            ) : (
                              <span className="h-5 w-5 mt-1 shrink-0 text-primary font-mono font-bold text-base leading-none">PDF</span>
                            )}
                            <span>{midia.titulo}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 flex flex-col">
                          <p className="text-sm text-muted-foreground flex-1">{midia.descricao}</p>

                          {midia.tipo === 'video' && midia.video_url && (
                            <div className="pt-2">
                              {getYoutubeEmbedUrl(midia.video_url) ? (
                                <div className="aspect-video rounded-lg overflow-hidden">
                                  <iframe
                                    src={getYoutubeEmbedUrl(midia.video_url)!}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={midia.titulo}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={midia.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Assistir no YouTube
                                </a>
                              )}
                            </div>
                          )}

                          {midia.tipo === 'texto' && midia.arquivo_url && (
                            <div className="pt-2 mt-auto">
                              <a
                                href={midia.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition"
                              >
                                <Download className="h-4 w-4" />
                                Baixar PDF
                              </a>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground/60 pt-1">
                            {formatDate(midia.created_at)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {noticias.length === 0 && eventos.length === 0 && fotos.length === 0 && membros.length === 0 && midias.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  Nenhum conteudo publicado no momento. Volte em breve para acompanhar as novidades do DEMUTRAN.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </DemutranPortalLayout>
  );
};

export default PublicMidiasDemutran;
