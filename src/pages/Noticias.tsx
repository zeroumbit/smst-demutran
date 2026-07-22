import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import NewsCard from "@/components/shared/NewsCard";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Newspaper } from 'lucide-react';

interface NewsItem {
  id: string;
  titulo: string;
  resumo: string;
  data: string | null;
  imagem: string | null;
}

const Noticias = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('noticias')
          .select('*')
          .eq('ativo', true)
          .order('data', { ascending: false });

        if (fetchError) {
          console.error('Error fetching news:', fetchError.message);
        } else {
          setNewsItems(data || []);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="public-navbar-spacer" />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Carregando notícias...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Notícias"
        subtitle="Fique por Dentro"
        description="Acompanhe as ações, eventos e novidades da Secretaria de Segurança de Canindé."
      />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {newsItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-[900px] mx-auto">
              <div className="flex justify-center mb-4">
                <Newspaper className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma notícia no momento</h3>
              <p className="text-muted-foreground">
                Não temos nenhuma notícia no momento, quando tivermos serão exibidas aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsItems.map((news, index) => (
                <div
                  key={news.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-fade-in-up h-full"
                >
                  <NewsCard 
                    title={news.titulo}
                    description={news.resumo}
                    date={news.data ? new Date(news.data).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'Data não disponível'}
                    imageUrl={news.imagem || undefined}
                    newsId={news.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Noticias;
