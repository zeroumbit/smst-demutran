import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';

interface Banner {
  id: string;
  pagina_destino: string;
  nome: string;
  tipo: 'imagem' | 'video';
  url: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

interface BannerCarouselProps {
  pagina: string; // Página específica para mostrar os banners
}

// Função para extrair o ID do vídeo do YouTube de uma URL
const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const BannerCarousel: React.FC<BannerCarouselProps> = ({ pagina }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const query = supabase
        .from('banners')
        .select('*')
        .eq('ativo', true)
        .eq('pagina_destino', pagina);

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar banners:', error);
        // Verificar se é erro de tabela não encontrada (PGRST205 é específico do PostgREST)
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('Could not find the table')) {
          // Apenas definir como array vazio, não mostrar erro nas páginas públicas
          setBanners([]);
        } else {
          console.error('Erro ao buscar banners:', error.message);
          setBanners([]); // Definir como array vazio em caso de erro
        }
      } else {
        // Embaralhar os banners aleatoriamente
        const shuffledBanners = [...(data || [])].sort(() => Math.random() - 0.5);
        setBanners(shuffledBanners);

        // Se houver banners, selecionar um aleatoriamente
        if (shuffledBanners.length > 0) {
          setCurrentIndex(Math.floor(Math.random() * shuffledBanners.length));
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar banners:', err);
      // Silenciar erro para usuário e apenas não exibir banners
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  // Carregar banners ativos da página específica
  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  // Avançar para o próximo banner
  const nextBanner = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === banners.length - 1 ? 0 : prevIndex + 1
    );
  }, [banners.length]);

  // Voltar para o banner anterior
  const prevBanner = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
  };

  // Auto-avanço do carrossel a cada 5 segundos
  useEffect(() => {
    if (banners.length <= 1) return; // Não avançar se tiver 1 ou nenhum banner

    const interval = setInterval(() => {
      nextBanner();
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length, nextBanner]);

  if (loading || banners.length === 0) {
    return null; // Não mostrar nada se estiver carregando ou não tiver banners
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="w-full max-w-6xl mx-auto relative group">
      <Card className="overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
            {currentBanner.tipo === 'imagem' ? (
              <img
                src={currentBanner.url}
                alt={currentBanner.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="relative w-full h-full">
                  {/* Exibir vídeo do YouTube */}
                  {extractYouTubeId(currentBanner.url) ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${extractYouTubeId(currentBanner.url)}`}
                      title={currentBanner.nome}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Play className="h-16 w-16 text-white mb-4" />
                      <p className="text-white text-lg">Vídeo do YouTube</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controles de navegação */}
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
              onClick={prevBanner}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
              onClick={nextBanner}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Indicadores de posição */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BannerCarousel;
