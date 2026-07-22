import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem: string | null;
  ativo: boolean | null;
  data: string | null;
  created_at: string | null;
}

const NoticiaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNoticia = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('noticias')
          .select('*')
          .eq('id', id)
          .eq('ativo', true)
          .single();

        if (fetchError) {
          console.error('Error fetching news:', fetchError.message);
          setError('Erro ao carregar a notícia');
        } else {
          setNoticia(data);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Erro ao carregar a notícia');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchNoticia();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="public-navbar-spacer" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex justify-center items-center">
          <p>Carregando notícia...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !noticia) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="public-navbar-spacer" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="text-center">
            <p className="text-destructive">{error || 'Notícia não encontrada'}</p>
              <Button
                onClick={() => navigate('/noticias')}
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Notícias
              </Button>
            </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />
      
      <main className="flex-grow bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <Button
            variant="outline"
            onClick={() => navigate('/noticias')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notícias
          </Button>

          <article className="max-w-4xl bg-card rounded-2xl p-8 shadow-md">
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">{noticia.titulo}</h1>
              
              {noticia.data && (
                <div className="flex items-center text-muted-foreground text-sm mb-4">
                  <span>{new Date(noticia.data).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</span>
                </div>
              )}
              
              {noticia.imagem && (
                <div className="mt-6 rounded-lg overflow-hidden">
                  <img 
                    src={noticia.imagem} 
                    alt={noticia.titulo} 
                    className="w-full h-96 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.jpg'; // Placeholder image if the actual image fails to load
                    }}
                  />
                </div>
              )}
            </header>
            
            <section className="prose prose-lg max-w-none text-foreground">
              <div className="whitespace-pre-wrap break-words">{noticia.conteudo}</div>
            </section>
          </article>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NoticiaDetalhe;
