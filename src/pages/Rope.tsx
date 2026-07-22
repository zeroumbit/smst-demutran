import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import GaleriaExibicao from "@/components/shared/GaleriaExibicao";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import BannerCarousel from "@/components/BannerCarousel";
import { Shield, Target, Users, Eye } from "lucide-react";

const Rope = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="ROPE"
        subtitle="Ronda Preventiva Escolar"
        description="Programa de segurança escolar que atua na prevenção de situações de risco nas proximidades das escolas."
      />


      <GaleriaExibicao paginaAtual="rope" />

      <DocumentosExibicao paginaAtual="rope" />

      <MembrosEquipe paginaAtual="rope" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Sobre o Programa ROPE
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O Programa Ronda Preventiva Escolar (ROPE) é uma iniciativa da Secretaria de Segurança de Canindé
                que visa garantir a segurança dos alunos nas proximidades das escolas e no trajeto entre casa e escola.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Através de ações preventivas e de presença ostensiva, o ROPE contribui para a redução de situações de
                risco e a promoção de um ambiente seguro e propício ao aprendizado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Target className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Objetivo</h3>
                <p className="text-muted-foreground">
                  Prevenir situações de risco e garantir a segurança dos estudantes nas proximidades das escolas
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300">
                <Users className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-3">Atuação</h3>
                <p className="text-muted-foreground">
                  Patrulhamento preventivo nas proximidades de escolas públicas e particulares
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Funciona</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">1. Patrulhamento Preventivo</h4>
                  <p className="text-sm text-muted-foreground">
                    Equipes da Guarda Municipal realizam rondas preventivas nas proximidades das escolas,
                    especialmente nos horários de entrada e saída dos alunos.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">2. Intervenção Rápida</h4>
                  <p className="text-sm text-muted-foreground">
                    Ações imediatas para conter situações de conflito ou risco nas imediações das unidades escolares.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">3. Trabalho Integrado</h4>
                  <p className="text-sm text-muted-foreground">
                    Coordenação com a Secretaria de Educação, polícias e demais órgãos para garantir
                    a segurança dos estudantes.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">4. Orientação e Prevenção</h4>
                  <p className="text-sm text-muted-foreground">
                    Ações educativas e de orientação para alunos, pais e comunidade sobre prevenção
                    de situações de risco.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <Eye className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">Benefícios</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Aumento da sensação de segurança para alunos, pais e professores
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Redução de situações de risco e conflitos na área escolar
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Maior tranquilidade para o ambiente de aprendizagem
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Prevenção de atos infracionais e situações de vulnerabilidade
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Fortalecimento da parceria entre escola e comunidade
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Áreas de Atuação</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Escolas públicas e particulares do município
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Trajetos de acesso às unidades escolares
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Eventos escolares e atividades comunitárias
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Coordenação com Conselho Tutelar e demais órgãos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Entre em Contato</h3>
              <p className="text-muted-foreground mb-4">
                Para mais informações sobre o programa ROPE (Ronda Preventiva Escolar), entre em contato:
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

export default Rope;
