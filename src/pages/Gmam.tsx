import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import GaleriaExibicao from "@/components/shared/GaleriaExibicao";
import BannerCarousel from "@/components/BannerCarousel";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import { Heart, Shield, Users, MessageCircle } from "lucide-react";

const Gmam = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="h-16" />

      <Hero
        title="GMAM"
        subtitle="Grupo Municipal de Apoio à Mulher"
        description="Programa especializado no atendimento e proteção das mulheres vítimas de violência doméstica e familiar."
      />


      <GaleriaExibicao paginaAtual="gmam" />

      <DocumentosExibicao paginaAtual="gmam" />

      <MembrosEquipe paginaAtual="gmam" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Heart className="h-8 w-8 text-primary" />
                Sobre o Programa GMAM
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O Grupo Municipal de Apoio à Mulher (GMAM) é uma iniciativa da Secretaria de Segurança de Canindé
                especializada no atendimento e proteção das mulheres vítimas de violência doméstica e familiar.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Com uma equipe multidisciplinar e treinada, o GMAM oferece apoio psicológico, orientação jurídica
                e encaminhamentos necessários para a proteção e recuperação das vítimas de violência.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Shield className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Proteção</h3>
                <p className="text-muted-foreground">
                  Ações específicas para proteger mulheres em situações de risco imediato
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <MessageCircle className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Orientação</h3>
                <p className="text-muted-foreground">
                  Acompanhamento psicológico e jurídico para mulheres vítimas de violência
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Funciona</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">1. Atendimento Personalizado</h4>
                  <p className="text-sm text-muted-foreground">
                    Equipe multidisciplinar (psicólogos, assistentes sociais e juristas) atende
                    mulheres vítimas de violência com confidencialidade e empatia.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">2. Encaminhamentos</h4>
                  <p className="text-sm text-muted-foreground">
                    Direcionamento para serviços de saúde, justiça e assistência social conforme
                    as necessidades de cada caso.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">3. Ações Integradas</h4>
                  <p className="text-sm text-muted-foreground">
                    Coordenação com demais órgãos municipais e estaduais para garantir a proteção
                    e os direitos das mulheres vítimas de violência.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">4. Campanhas de Conscientização</h4>
                  <p className="text-sm text-muted-foreground">
                    Ações educativas e preventivas para combater a violência contra as mulheres
                    e promover a igualdade de gênero.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Direitos da Mulher</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Direito à vida, liberdade e segurança
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Proteção contra qualquer forma de violência
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Acesso à justiça e aos serviços de seguridade social
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Direito à proteção e assistência jurídica gratuita
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Acesso a serviços de saúde física e mental
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Canais de Atendimento</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong>Disque 180</strong> - Central de Atendimento à Mulher (24h)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong>Delegacia da Mulher</strong> - Denúncias e apoio jurídico
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong>GMAM</strong> - (85) 3343-0413 - Atendimento presencial
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong>CRAS e CREAS</strong> - Acompanhamento social
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Entre em Contato</h3>
              <p className="text-muted-foreground mb-4">
                Se você ou alguém que você conhece está sofrendo violência doméstica,
                não fique em silêncio. Procure ajuda:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong className="text-foreground">Telefone:</strong> (85) 3343-0413 (GMAM)</p>
                <p><strong className="text-foreground">Disque 180:</strong> Central de Atendimento à Mulher (24h)</p>
              </div>
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">Lembre-se: A violência contra a mulher é crime. Denuncie!</p>
              </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gmam;