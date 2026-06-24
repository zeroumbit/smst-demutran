import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import NewsCard from "@/components/shared/NewsCard";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
        <div className="h-16" />
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
      <div className="h-16" />

      <Hero
        title="Notícias"
        subtitle="Fique por Dentro"
        description="Acompanhe as ações, eventos e novidades da Secretaria de Segurança de Canindé."
      />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

          {/* Placeholder for pagination - to be implemented with dynamic content */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Mostrando {newsItems.length} notícias
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Noticias;
