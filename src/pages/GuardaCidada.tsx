import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import PhotoGallery from "@/components/shared/PhotoGallery";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import BannerCarousel from "@/components/BannerCarousel";
import { Users, HandHeart, Eye, MessageSquare } from "lucide-react";

const GuardaCidada = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Guarda Cidadã"
        subtitle="Segurança Municipal"
        description="Projeto que fortalece a segurança em bens prédios e espaços públicos"
      />

      <PhotoGallery categoria="guarda cidadã" />

      <BannerCarousel pagina="guarda_cidada" />

      <DocumentosExibicao paginaAtual="guarda-cidada" />

      <MembrosEquipe paginaAtual="guarda-cidada" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Sobre o Programa Guarda Cidadã
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O Projeto Guarda Cidadã é uma iniciativa da Prefeitura que visa fortalecer a segurança municipal através da atuação de servidores concursados no cargo de vigia, transformados em guardas cidadãos após treinamento especializado. O projeto foca na proteção de bens públicos, como prédios e espaços públicos do município, contribuindo para a segurança e bem-estar da comunidade.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Os guardas cidadãos são profissionais capacitados que atuam na fiscalização de prédios públicos, hospitais, escolas, praças e outros espaços coletivos. Sua presença contribui para a manutenção da ordem, a proteção do patrimônio público e o apoio às ações da Guarda Municipal, especialmente no cumprimento de interdições de ruas e áreas determinadas conforme necessidade de segurança pública.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Esta iniciativa representa um reforço importante à estrutura de segurança do município, ampliando a capacidade de vigilância e fiscalização de locais estratégicos, sempre em coordenação com os órgãos de segurança municipais.
              </p>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Objetivos do Projeto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Fiscalização de Espaços Públicos</h4>
                  <p className="text-sm text-muted-foreground">
                    Garantir a integridade de prédios públicos, hospitais, escolas e praças municipais.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Apoio à Gestão de Tráfego</h4>
                  <p className="text-sm text-muted-foreground">
                    Apoiar o cumprimento de interdições de ruas e fiscalização de trânsito quando necessário.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Funciona</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">1. Recrutamento e Seleção</h4>
                  <p className="text-sm text-muted-foreground">
                    Os integrantes do projeto Guarda Cidadã são servidores concursados no cargo de vigia que passaram por treinamento e capacitações para exercer a função de guarda cidadão.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">2. Treinamento Especializado</h4>
                  <p className="text-sm text-muted-foreground">
                    Os guardas cidadãos recebem formação contínua para desempenhar suas funções de vigilância e segurança.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">3. Fiscalização de Bens Públicos</h4>
                  <p className="text-sm text-muted-foreground">
                    Atuação na proteção e fiscalização de prédios e espaços públicos do município.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">4. Apoio à Guarda Municipal</h4>
                  <p className="text-sm text-muted-foreground">
                    Colaboração com as equipes da Guarda Municipal nas ações de segurança.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <MessageSquare className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Atuação dos Guardas Cidadãos</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Fiscalizar prédios públicos, hospitais, escolas, praças e outros espaços coletivos
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Apoiar as ações da Guarda Municipal no cumprimento de interdições de ruas
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Manter a ordem e a segurança nos locais de atuação
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Entre em Contato</h3>
              <p className="text-muted-foreground mb-4">
                Para mais informações sobre o programa Guarda Cidadã, entre em contato:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong className="text-foreground">Telefone:</strong> (85) 3343-0413</p>
              </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GuardaCidada;
