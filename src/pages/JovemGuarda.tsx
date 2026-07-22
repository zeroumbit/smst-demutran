import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import PhotoGallery from "@/components/shared/PhotoGallery";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import BannerCarousel from "@/components/BannerCarousel";
import { GraduationCap, Target, Users, Award } from "lucide-react";

const JovemGuarda = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Jovem Guarda Cidadã"
        subtitle="Formação de Jovens Cidadãos"
        description="Programa de desenvolvimento social que prepara jovens para serem cidadãos conscientes e participativos."
      />

      <PhotoGallery categoria="jovem guarda" />

      <BannerCarousel pagina="jovem_guarda_cidada" />

      <DocumentosExibicao paginaAtual="jovem-guarda" />

      <MembrosEquipe paginaAtual="jovem-guarda" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-primary" />
                Sobre o Programa
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O Programa Jovem Guarda Cidadã é uma iniciativa da Secretaria de Segurança de Canindé 
                voltada para a formação de jovens entre 14 e 17 anos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Através de atividades educativas, cívicas e de desenvolvimento pessoal, preparamos 
                nossos jovens para serem cidadãos conscientes, responsáveis e engajados na construção 
                de uma sociedade mais justa e segura.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Objetivo</h3>
                <p className="text-sm text-muted-foreground">
                  Formar jovens cidadãos com valores éticos e cívicos
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Participação</h3>
                <p className="text-sm text-muted-foreground">
                  Jovens de 14 a 17 anos, estudantes de escolas públicas
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Certificação</h3>
                <p className="text-sm text-muted-foreground">
                  Certificado de conclusão ao final do programa
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Atividades do Programa</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Formação Cidadã</h4>
                  <p className="text-sm text-muted-foreground">
                    Aulas sobre direitos e deveres do cidadão, ética, valores e participação social. 
                    Conteúdos que preparam os jovens para exercerem plenamente sua cidadania.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Ordem Unida e Disciplina</h4>
                  <p className="text-sm text-muted-foreground">
                    Exercícios de ordem unida, desenvolvimento da disciplina, trabalho em equipe e 
                    respeito à hierarquia de forma educativa e não militarizada.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Educação para o Trânsito</h4>
                  <p className="text-sm text-muted-foreground">
                    Noções de segurança no trânsito, respeito às normas de circulação e conscientização 
                    sobre a importância da mobilidade urbana segura.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Atividades Físicas e Esportivas</h4>
                  <p className="text-sm text-muted-foreground">
                    Práticas esportivas que promovem saúde, bem-estar, trabalho em equipe e disciplina.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Ações Comunitárias</h4>
                  <p className="text-sm text-muted-foreground">
                    Participação em eventos comunitários, campanhas educativas e ações sociais que 
                    promovem o engajamento cívico dos jovens.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Benefícios</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Desenvolvimento de valores éticos, morais e cívicos
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Melhora no desempenho escolar e na disciplina pessoal
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Fortalecimento da autoestima e desenvolvimento de habilidades sociais
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Oportunidade de participar ativamente da comunidade
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    Certificado de conclusão reconhecido pelo município
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Como Participar</h3>
              <p className="text-muted-foreground mb-4">
                As inscrições para o Programa Jovem Guarda Cidadã são realizadas anualmente. 
                Para mais informações sobre o próximo período de inscrições, requisitos e 
                documentação necessária, entre em contato:
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

export default JovemGuarda;
