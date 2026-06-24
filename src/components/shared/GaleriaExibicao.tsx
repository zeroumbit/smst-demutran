import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Image, X } from 'lucide-react';

interface Foto {
  id: string;
  url: string;
  titulo: string;
  descricao: string;
  pagina_exibicao: string;
  ativo: boolean;
  created_at?: string;
}

interface GaleriaExibicaoProps {
  paginaAtual: string;
}

const GaleriaExibicao = ({ paginaAtual }: GaleriaExibicaoProps) => {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<Foto | null>(null);

  useEffect(() => {
    const fetchFotos = async () => {
      try {
        const { data, error } = await supabase
          .from('galeria_fotos')
          .select('*')
          .eq('pagina_exibicao', paginaAtual)
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar fotos:', error);
        } else {
          // Filtrar fotos que tenham URLs válidas
          const fotosValidas = (data || []).filter(foto =>
            foto.url &&
            typeof foto.url === 'string' &&
            (foto.url.startsWith('http://') || foto.url.startsWith('https://'))
          );
          setFotos(fotosValidas);
        }
      } catch (err) {
        console.error('Erro ao buscar fotos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFotos();
  }, [paginaAtual]);

  const abrirImagemAmpliada = (foto: Foto) => {
    setFotoAmpliada(foto);
    setImagemAmpliada(foto.url);
  };

  const fecharImagemAmpliada = () => {
    setFotoAmpliada(null);
    setImagemAmpliada(null);
  };

  if (loading || fotos.length === 0) {
    return null; // Não exibe nada se estiver carregando ou não houver fotos
  }

  return (
    <section className="py-12 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Galeria de Fotos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {fotos.map((foto, index) => (
            <div 
              key={foto.id} 
              className={`
                relative overflow-hidden cursor-pointer
                ${index % 3 === 0 ? 'rounded-l-lg' : index % 3 === 2 ? 'rounded-r-lg' : ''}
                ${Math.floor(index / 3) === 0 ? 'rounded-t-lg' : ''}
                ${Math.floor(index / 3) === Math.floor((fotos.length - 1) / 3) ? 'rounded-b-lg' : ''}
              `}
              onClick={() => abrirImagemAmpliada(foto)}
            >
              <div className="aspect-square">
                <img
                  src={foto.url}
                  alt={foto.titulo}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-3 bg-white">
                <h3 className="font-semibold text-foreground truncate">{foto.titulo}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{foto.descricao}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de imagem ampliada */}
        {imagemAmpliada && fotoAmpliada && (
          <div 
            className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
            onClick={fecharImagemAmpliada}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/75 transition-colors"
                onClick={fecharImagemAmpliada}
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={imagemAmpliada}
                alt={fotoAmpliada.titulo}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <div className="mt-4 bg-white p-4 rounded-lg">
                <h3 className="text-xl font-bold text-foreground">{fotoAmpliada.titulo}</h3>
                <p className="text-muted-foreground mt-2">{fotoAmpliada.descricao}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GaleriaExibicao;