import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import GaleriaExibicao from "@/components/shared/GaleriaExibicao";
import BannerCarousel from "@/components/BannerCarousel";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import { Shield, AlertTriangle, CloudRain, Waves, HeartHandshake } from "lucide-react";

const DefesaCivil = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="h-16" />

      <Hero
        title="Defesa Civil"
        subtitle="Proteção e Prevenção"
        description="Proteção e prevenção contra desastres naturais e emergências em Canindé."
      />


      <GaleriaExibicao paginaAtual="defesa-civil" />

      <DocumentosExibicao paginaAtual="defesa-civil" />

      <MembrosEquipe paginaAtual="defesa-civil" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Sobre a Defesa Civil
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Defesa Civil Municipal é o órgão responsável por coordenar e executar as ações 
                de proteção e defesa da comunidade contra desastres naturais, provocados pelo 
                homem ou por acidentes tecnológicos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Nosso trabalho visa minimizar os impactos de eventos adversos, garantindo a 
                segurança e bem-estar da população de Canindé por meio de ações preventivas, 
                de preparação, resposta e recuperação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <AlertTriangle className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Prevenção</h3>
                <p className="text-muted-foreground">
                  Ações preventivas para reduzir riscos e vulnerabilidades em áreas propensas a desastres.
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <HeartHandshake className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Socorro</h3>
                <p className="text-muted-foreground">
                  Atendimento em situações de emergência e desastres, com equipes preparadas para resgate.
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Áreas de Atuação</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">1. Prevenção e Mitigação</h4>
                  <p className="text-sm text-muted-foreground">
                    Identificação de áreas de risco e elaboração de planos de contingência para 
                    minimizar os impactos de desastres.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">2. Preparação e Planejamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Capacitação de equipes e voluntários, elaboração de planos de emergência 
                    e realização de simulações.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">3. Resposta e Emergência</h4>
                  <p className="text-sm text-muted-foreground">
                    Atuação imediata em situações de emergência, com equipes de resgate e 
                    assistência humanitária.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">4. Recuperação</h4>
                  <p className="text-sm text-muted-foreground">
                    Apoio à recuperação de áreas atingidas por desastres, com ações de 
                    reconstrução e prevenção de danos futuros.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <CloudRain className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Atuação em Situações de Risco</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Chuvas intensas e alagamentos
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Enchentes e inundações
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Ventos fortes e granizo
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Incêndios florestais
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Situações de seca e escassez hídrica
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <Waves className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Atuação em Combate à Seca</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Como um dos pilares no combate aos efeitos da seca em Canindé, a Defesa Civil atua de forma coordenada na identificação de áreas críticas e distribuição de recursos de emergência.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Coordenação de ações emergenciais para mitigar os impactos da estiagem na população e no abastecimento hídrico.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Distribuição de água em áreas afetadas por escassez hídrica com veículos-pipa e outras estratégias de abastecimento.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Parcerias com órgãos estaduais e federais para implementação de soluções de médio e longo prazo contra os efeitos da seca.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <Waves className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Funciona</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Monitoramento constante de condições climáticas e geológicas
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Coordenação com órgãos estaduais e federais
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Disponibilidade 24 horas para atendimento de emergência
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Campanhas educativas e de conscientização
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Entre em Contato</h3>
              <p className="text-muted-foreground mb-4">
                Em caso de emergência, procure a Defesa Civil de Canindé:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong className="text-foreground">Emergência:</strong> 199 (Defesa Civil)</p>
                <p><strong className="text-foreground">Telefone:</strong> (85) 3343-0413</p>
              </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DefesaCivil;