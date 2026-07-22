import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import PhotoGallery from "@/components/shared/PhotoGallery";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import BannerCarousel from "@/components/BannerCarousel";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import { Shield, Building, Users, Eye } from "lucide-react";

const GuardaMunicipal = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Guarda Municipal"
        subtitle="Proteção e Segurança"
        description="Proteção dos bens públicos e fiscalização do trânsito"
      />

      <PhotoGallery categoria="guarda municipal" />

      <BannerCarousel pagina="guarda_municipal" />

      <DocumentosExibicao paginaAtual="guarda-municipal" />

      <MembrosEquipe paginaAtual="guarda-municipal" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Sobre a Guarda Municipal
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Guarda Civil Municipal é vinculada à Secretaria Municipal de Segurança Pública e Trânsito e atua em monitoramento preventivo e comunitário de atos que possam configurar desvio da ordem, do sossego e da paz pública, promovendo a mediação de conflitos e o respeito aos direitos fundamentais dos cidadãos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Nosso trabalho se concentra em prevenir e inibir atos que atentem contra os bens, instalações e serviços municipais, com prioridade na segurança escolar, além de apoiar atividades preventivas voltadas à segurança do trânsito.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Building className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Proteção Patrimonial</h3>
                <p className="text-sm text-muted-foreground">
                  Vigilância de prédios públicos e equipamentos municipais
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Segurança Comunitária</h3>
                <p className="text-sm text-muted-foreground">
                  Patrulhamento preventivo em eventos e áreas públicas
                </p>
              </div>

              <div className="bg-gradient-card rounded-2xl p-6 shadow-md border-2 border-border hover:border-primary transition-all duration-300 text-center">
                <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Prevenção</h3>
                <p className="text-sm text-muted-foreground">
                  Ações preventivas e orientativas na comunidade
                </p>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Áreas de Atuação</h3>
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Monitoramento Preventivo e Comunitário</h4>
                  <p className="text-sm text-muted-foreground">
                    Atuação em apoio à Polícia Militar Estadual no monitoramento preventivo e comunitário de atos que possam configurar desvio da ordem, do sossego e da paz pública, promovendo a mediação de conflitos e o respeito aos direitos fundamentais dos cidadãos.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Proteção de Bens e Serviços Municipais</h4>
                  <p className="text-sm text-muted-foreground">
                    Prevenção e inibição de atos que atentem contra os bens, instalações, serviços municipais e seus usuários, priorizando a segurança escolar.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Segurança no Trânsito</h4>
                  <p className="text-sm text-muted-foreground">
                    Apoio às atividades preventivas voltadas à segurança do trânsito, nas vias e logradouros municipais, em articulação com o DEMUTRAN.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Proteção ao Patrimônio Municipal</h4>
                  <p className="text-sm text-muted-foreground">
                    Proteção do patrimônio ecológico, cultural, arquitetônico e ambiental do Município, adotando medidas educativas e preventivas.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Intervenção e Mediação de Conflitos</h4>
                  <p className="text-sm text-muted-foreground">
                    Intervenção, gestão e mediação de conflitos e crises em bens, serviços e instalações municipais ou relacionadas ao exercício de atividades controladas pelo poder público municipal.
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Integração com Órgãos de Polícia</h4>
                  <p className="text-sm text-muted-foreground">
                    Estabelecimento de integração com órgãos de poder de polícia administrativa, visando contribuir para a normatização e fiscalização das posturas e ordenamento urbano municipal.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-foreground mb-4">Missão e Valores</h3>
              <p className="text-muted-foreground mb-6">
                Nossa missão é exercer monitoramento preventivo e comunitário de atos que possam configurar desvio da ordem, do sossego e da paz pública, promovendo a mediação de conflitos e o respeito aos direitos fundamentais dos cidadãos, prevenindo e inibindo atos que atentem contra os bens, instalações e serviços municipais, priorizando a segurança escolar e apoiando atividades preventivas de segurança do trânsito.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Ética:</strong> Agir com integridade e respeito em todas as situações
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Profissionalismo:</strong> Capacitação contínua e excelência no serviço
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Proximidade:</strong> Vínculo estreito com a comunidade
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Integração:</strong> Coordenação com órgãos municipais, estaduais e federais em ações integradas e preventivas
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Proteção Ambiental:</strong> Atuação na proteção do patrimônio ecológico, cultural, arquitetônico e ambiental do município
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-2xl">•</span>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Justiça Social:</strong> Atuação com foco na garantia dos direitos do cidadão e na prevenção da exploração sexual de menores e adolescentes
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-2xl p-8 border-2 border-secondary">
              <h3 className="text-2xl font-bold text-foreground mb-4">Contato</h3>
              <div className="space-y-2 text-muted-foreground">
                <p><strong className="text-foreground">Emergências:</strong> 153</p>
                <p><strong className="text-foreground">Telefone:</strong> (85) 3343-0413</p>
              </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GuardaMunicipal;
