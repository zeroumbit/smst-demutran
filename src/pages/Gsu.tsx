import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import GaleriaExibicao from "@/components/shared/GaleriaExibicao";
import BannerCarousel from "@/components/BannerCarousel";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import { Shield, Ambulance, Users, Heart } from "lucide-react";

const Gsu = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="GSU"
        subtitle="Grupo de Socorro e Urgência"
        description="Equipe especializada no atendimento de emergências e situações de risco para a população."
      />

      <GaleriaExibicao paginaAtual="gsu" />

      <DocumentosExibicao paginaAtual="gsu" />

      <MembrosEquipe paginaAtual="gsu" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Sobre o Grupo de Socorro e Urgência (GSU)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O Grupo de Socorro e Urgência (GSU) é uma unidade especializada da Secretaria de Segurança de Canindé,
                dedicada ao atendimento de emergências e situações de risco para a população.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Com equipe treinada e equipamentos adequados, o GSU atua em situações que exigem resposta rápida
                e profissionalismo, contribuindo para a proteção e segurança dos cidadãos em momentos críticos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Ambulance className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Atendimento de Emergência</h3>
                <p className="text-muted-foreground">
                  Resposta rápida a situações de risco e emergências diversas
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Heart className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Capacitação Especializada</h3>
                <p className="text-muted-foreground">
                  Equipe treinada para situações de alta complexidade
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Funciona</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">1. Disponibilidade 24h</h4>
                  <p className="text-sm text-muted-foreground">
                    Equipe disponível para atendimento imediato a qualquer hora do dia ou da noite,
                    durante toda a semana.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">2. Atendimento Integrado</h4>
                  <p className="text-sm text-muted-foreground">
                    Coordenação com SAMU, bombeiros, polícia e outros órgãos de emergência para
                    garantir o melhor atendimento possível.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">3. Intervenção Tática</h4>
                  <p className="text-sm text-muted-foreground">
                    Atuação em situações de risco como resgates, acidentes e ocorrências de
                    natureza complexa.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">4. Prevenção e Apoio</h4>
                  <p className="text-sm text-muted-foreground">
                    Participação em eventos públicos de grande porte e campanhas de prevenção
                    a acidentes e situações de risco.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Áreas de Atuação</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Resgate em acidentes de trânsito e situações de risco
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Apoio em situações de emergência e catástrofes
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Intervenção em ocorrências complexas e de alto risco
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Apoio a eventos públicos e particulares de grande porte
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Coordenação com demais órgãos de segurança e emergência
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Benefícios para a Comunidade</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Atendimento rápido em situações de emergência
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Redução de danos e prejuízos em situações críticas
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Maior segurança e tranquilidade para a população
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Prevenção de acidentes e situações de risco
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Entre em Contato</h3>
              <p className="text-muted-foreground mb-4">
                Para mais informações sobre o Grupo de Socorro e Urgência (GSU), entre em contato:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong className="text-foreground">Telefone:</strong> (85) 3343-0413</p>
                <p><strong className="text-foreground">Emergência:</strong> 193 (Guarda Municipal)</p>
              </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gsu;
