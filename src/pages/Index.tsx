import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import NewsCard from "@/components/shared/NewsCard";
import SectionCard from "@/components/shared/SectionCard";
import BannerCarousel from "@/components/BannerCarousel";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import { Shield, Car, Users, GraduationCap, FileText, Phone, Heart, AlertTriangle, Ambulance, Target, Award } from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  created_at: string;
  imagem?: string;
}

const Index = () => {
  const [newsItems, setNewsItems] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('noticias')
          .select('id, titulo, resumo, created_at, imagem')
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Erro ao buscar notícias:', error);
        } else {
          setNewsItems(data || []);
        }
      } catch (err: any) {
        console.error('Erro ao buscar notícias:', err);
        // Silenciar erro para usuário e apenas não exibir notícias
        setNewsItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const sections = [
    {
      icon: Shield,
      title: "Guarda Municipal",
      description: "Proteção e segurança para todos os cidadãos de Canindé.",
      link: "/guarda-municipal",
    },
    {
      icon: Car,
      title: "DEMUTRAN",
      description: "Departamento Municipal de Trânsito - Educação e fiscalização.",
      link: "/demutran",
    },
    {
      icon: GraduationCap,
      title: "Jovem Guarda Cidadã",
      description: "Formação de jovens cidadãos conscientes e preparados.",
      link: "/jovem-guarda",
    },
    {
      icon: Users,
      title: "Guarda Cidadã",
      description: "Patrimônio publico protegido.",
      link: "/guarda-cidada",
    },
    {
      icon: FileText,
      title: "ROPE",
      description: "Mais sgurança nas proximidades das escolas.",
      link: "/rope",
    },
    {
      icon: AlertTriangle,
      title: "Defesa Civil",
      description: "Proteção e prevenção contra desastres naturais e emergências.",
      link: "/defesa-civil",
    },
    {
      icon: Heart,
      title: "GMAM",
      description: "Grupo Municipal de Apoio à Mulher vítima de violência.",
      link: "/gmam",
    },
    {
      icon: Ambulance,
      title: "GSU",
      description: "Grupo Municipal de Socorro e Urgência.",
      link: "/gsu",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Offset for fixed navbar */}
      <div className="h-16" />

      {/* Hero Section */}
      <Hero
        title="Secretaria Municipal de Segurança de Canindé"
        subtitle="Juntos por uma cidade mais segura"
        description="Trabalhando pela proteção, educação e bem-estar da nossa comunidade."
        ctaText="Conheça nossos departamentos"
        ctaLink="#nossos-departamentos"
      />

      <div className="hidden md:block h-8"></div>
      <div className="md:hidden h-4"></div>
      <BannerCarousel pagina="home" />

      <div className="hidden md:block h-12"></div>
      <div className="md:hidden h-6"></div>

      {/* Sections Grid */}
      <section id="nossos-departamentos" className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nossos Departamentos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Conheça os departamentos e programas da Secretaria de Segurança
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {sections.map((section, index) => (
              <div
                key={section.title}
                style={{ animationDelay: `${index * 100}ms` }}
                className="animate-fade-in-up"
              >
                <SectionCard {...section} />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Secretaria Content Section */}
      <section id="secretaria" className="py-16 bg-background border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="prose prose-lg max-w-none space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Sobre a Secretaria
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A Secretaria Municipal de Segurança Pública e Trânsito de Canindé é o órgão responsável por planejar, propor e coordenar as políticas de segurança pública e defesa civil municipais, com ênfase na prevenção e redução da violência. Coordena as atividades da Guarda Civil Municipal e da Defesa Civil, além de atuar na formulação e execução de políticas públicas de mobilidade e acessibilidade urbana e rural.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Target className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Missão</h3>
                <p className="text-muted-foreground">
                  Planejar, propor e coordenar políticas de segurança pública e defesa civil municipais, com ênfase na prevenção e redução da violência, articulando ações com instâncias estadual e federal e com a sociedade civil organizada.
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Users className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Visão</h3>
                <p className="text-muted-foreground">
                  Ser reconhecida como órgão eficaz na coordenação de políticas públicas de segurança, trânsito e defesa civil, promovendo ações integradas e sustentáveis em parceria com a sociedade.
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md border-2 border-border">
              <Award className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Valores</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Compromisso com a proteção e segurança de todos os cidadãos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Transparência e ética em todas as ações</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Respeito aos direitos humanos e à dignidade da pessoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Integração e cooperação com a comunidade</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Excelência na prestação de serviços públicos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Promoção da educação e conscientização sobre trânsito e cidadania</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Atuação preventiva e integrada na segurança pública</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Estrutura Organizacional</h3>
              <p className="text-muted-foreground mb-6">
                A Secretaria de Segurança é responsável por coordenar diversos órgãos e programas que atuam
                de forma integrada para garantir a segurança, a defesa civil e a mobilidade urbana do município:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Guarda Municipal</h4>
                  <p className="text-sm text-muted-foreground">Proteção e segurança para todos os cidadãos de Canindé. Atua em monitoramento preventivo e comunitário, proteção de bens e serviços municipais e apoio às ações de segurança do trânsito.</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">DEMUTRAN</h4>
                  <p className="text-sm text-muted-foreground">Departamento Municipal de Trânsito responsável pela fiscalização, educação e planejamento do trânsito municipal. Departamento Municipal de Trânsito - Educação e fiscalização.</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Jovem Guarda Cidadã</h4>
                  <p className="text-sm text-muted-foreground">Formação de jovens cidadãos conscientes e preparados. Programa que visa capacitar e educar os jovens sobre cidadania, segurança e convivência social.</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">ROPE</h4>
                  <p className="text-sm text-muted-foreground">Ronda Preventiva Escolar - Segurança nas proximidades das escolas. Atua na proteção e promoção da segurança em áreas escolares e seus arredores.</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Defesa Civil</h4>
                  <p className="text-sm text-muted-foreground">Proteção e prevenção contra desastres naturais e emergências. Coordena ações de prevenção, socorro e recuperação em situações de emergência e calamidades públicas.</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">GMAM</h4>
                  <p className="text-sm text-muted-foreground">Grupo Municipal de Apoio à Mulher vítima de violência. Oferece suporte e assistência especializada às mulheres que sofrem algum tipo de violência.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Últimas Notícias
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Fique por dentro das ações e novidades da Secretaria de Segurança
            </p>
          </div>

          {loading || newsItems.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                // Exibir placeholders enquanto carrega
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-card border border-border rounded-lg p-6 h-full flex flex-col">
                      <div className="h-6 bg-muted rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-muted rounded mb-2 w-full"></div>
                      <div className="h-4 bg-muted rounded mb-2 w-5/6"></div>
                      <div className="h-4 bg-muted rounded mb-4 w-4/6"></div>
                      <div className="mt-auto">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">Nenhuma notícia publicada no momento</p>
                </div>
              )}
            </div>
          ) : newsItems.length === 1 ? (
            // Se houver apenas uma notícia, centralizá-la
            <div className="flex justify-center">
              <div className="animate-fade-in-up">
                <NewsCard
                  title={newsItems[0].titulo}
                  description={newsItems[0].resumo}
                  date={new Date(newsItems[0].created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                  newsId={newsItems[0].id}
                  imageUrl={newsItems[0].imagem}
                />
              </div>
            </div>
          ) : (
            // Se houver 2 ou mais notícias, exibí-las normalmente
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsItems.map((news, index) => (
                <div
                  key={news.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up"
                >
                  <NewsCard
                    title={news.titulo}
                    description={news.resumo}
                    date={new Date(news.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                    newsId={news.id}
                    imageUrl={news.imagem}
                  />
                </div>
              ))}
            </div>
          )}

          {newsItems.length > 3 && (
            <div className="text-center mt-8">
              <a href="/noticias">
                <button className="bg-primary text-primary-foreground hover:bg-primary-light px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg">
                  Ver todas as notícias
                </button>
              </a>
            </div>
          )}
        </div>
      </section>

      <DocumentosExibicao paginaAtual="todos" />

      {/* Quick Contact Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-secondary" />
          <h2 className="text-3xl font-bold mb-4">Precisa de Ajuda?</h2>
          <p className="text-lg mb-6 text-primary-foreground/90">
            Nossa equipe está pronta para atender você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="/contato">
              <button className="bg-secondary text-secondary-foreground hover:bg-secondary-dark px-8 py-3 rounded-lg font-bold transition-all duration-300 shadow-md hover:shadow-lg">
                Entre em Contato
              </button>
            </a>
            <a href="tel:153">
              <button className="bg-red-600 text-white hover:bg-red-700 px-8 py-3 rounded-lg font-bold transition-all duration-300 shadow-md hover:shadow-lg">
                🚨 Chamada de Emergência
              </button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
