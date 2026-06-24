import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Car, CarFront, FileText, GraduationCap, LogIn } from "lucide-react";
import Hero from "@/components/shared/Hero";
import PhotoGallery from "@/components/shared/PhotoGallery";
import DocumentosExibicao from "@/components/shared/DocumentosExibicao";
import MembrosEquipe from "@/components/shared/MembrosEquipe";
import BannerCarousel from "@/components/BannerCarousel";
import { DemutranPortalLayout } from "@/components/demutran/DemutranPortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Demutran = () => {
  return (
    <DemutranPortalLayout>
      <Hero
        title="Portal Público do DEMUTRAN"
        subtitle="Departamento Municipal de Trânsito"
        description="Acesse os serviços do DEMUTRAN em páginas específicas e acompanhe orientações operacionais do trânsito municipal."
        ctaText="Ver áreas do portal"
        ctaLink="#areas-demutran"
        className="bg-gradient-hero"
      />

      <PhotoGallery categoria="demutran" />
      <BannerCarousel pagina="demutran" />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <Card className="border-2 border-border bg-gradient-card shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
                    <Car className="h-8 w-8 text-primary" />
                    Sobre o DEMUTRAN
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    O Departamento Municipal de Transito de Caninde e o orgao responsavel por planejar,
                    fixar diretrizes, coordenar e executar a fiscalizacao e o policiamento de transito de
                    competencia do Municipio, nos termos da legislacao em vigor.
                  </p>
                  <p>
                    Atua tambem na formulacao e divulgacao de politicas publicas de mobilidade e
                    acessibilidade urbana e rural, promovendo seguranca para pedestres, ciclistas,
                    motociclistas e motoristas.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-slate-950 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Atalhos operacionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a href="/demutran/credenciais" className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4 transition hover:bg-white/10">
                    <span>Solicitar credencial</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href="/demutran/recursos" className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4 transition hover:bg-white/10">
                    <span>Protocolar recurso</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href="/demutran/apreensoes" className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4 transition hover:bg-white/10">
                    <span>Consultar apreensao</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-4 font-semibold text-secondary-foreground transition hover:opacity-90">
                    <span>Acesso administrativo</span>
                    <LogIn className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="border-2 border-border bg-gradient-card shadow-md">
                <CardContent className="p-6 space-y-3">
                  <AlertTriangle className="h-10 w-10 text-primary" />
                  <h3 className="text-xl font-bold">Fiscalizacao e policiamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Autuacao, medidas administrativas e ordenamento viario conforme o CTB e normas complementares.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-border bg-gradient-card shadow-md">
                <CardContent className="p-6 space-y-3">
                  <GraduationCap className="h-10 w-10 text-primary" />
                  <h3 className="text-xl font-bold">Educacao e conscientizacao</h3>
                  <p className="text-sm text-muted-foreground">
                    Campanhas educativas nas vias e nas escolas, com foco no respeito a vida e as regras de transito.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-border bg-gradient-card shadow-md">
                <CardContent className="p-6 space-y-3">
                  <FileText className="h-10 w-10 text-primary" />
                  <h3 className="text-xl font-bold">Regulamentacao de servicos</h3>
                  <p className="text-sm text-muted-foreground">
                    Regras para taxis, moto-taxis, transportes alternativos e organizacao da mobilidade urbana.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-border bg-gradient-card shadow-md">
                <CardContent className="p-6 space-y-3">
                  <CarFront className="h-10 w-10 text-primary" />
                  <h3 className="text-xl font-bold">Acessibilidade e mobilidade</h3>
                  <p className="text-sm text-muted-foreground">
                    Acoes em acessibilidade, sinalizacao, estacionamentos e seguranca para todos os modais.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="areas-demutran" className="py-16 bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Areas do portal</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-foreground">Acesse o servico que precisa</h2>
            <p className="mt-3 text-muted-foreground">
              Visite a pagina exclusiva de cada serviço que você precisa.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <a href="/demutran/credenciais" className="block">
              <Card className="h-full border-2 border-border bg-background shadow-md transition hover:border-primary hover:shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-bold">Credenciais</h3>
                  <p className="text-sm text-muted-foreground">Solicitacao, consulta de andamento, orientacoes e documentacao para idosos e PCD.</p>
                </CardContent>
              </Card>
            </a>
            <a href="/demutran/recursos" className="block">
              <Card className="h-full border-2 border-border bg-background shadow-md transition hover:border-primary hover:shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-bold">Recursos</h3>
                  <p className="text-sm text-muted-foreground">Pagina especifica para defesa previa, JARI, protocolo e acompanhamento de recursos.</p>
                </CardContent>
              </Card>
            </a>
            <a href="/demutran/apreensoes" className="block">
              <Card className="h-full border-2 border-border bg-background shadow-md transition hover:border-primary hover:shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-bold">Apreensoes</h3>
                  <p className="text-sm text-muted-foreground">Consulta exclusiva da situacao de veiculos recolhidos e informacoes operacionais do processo.</p>
                </CardContent>
              </Card>
            </a>
            <a href="/demutran/midias" className="block">
              <Card className="h-full border-2 border-border bg-background shadow-md transition hover:border-primary hover:shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-bold">Midias</h3>
                  <p className="text-sm text-muted-foreground">Noticias, eventos, galeria, materiais de apoio e acoes educativas promovidas pelo DEMUTRAN.</p>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      <DocumentosExibicao paginaAtual="demutran" />
      <MembrosEquipe paginaAtual="demutran" />

      <section className="py-16 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardContent className="p-8 space-y-4">
                <LogIn className="h-10 w-10 text-secondary" />
                <h2 className="text-2xl font-bold">Login administrativo</h2>
                <p className="text-white/80">
                  Acesso para servidores da SMST e do DEMUTRAN, com redirecionamento para as areas administrativas conforme o perfil cadastrado.
                </p>
                <a href="/admin/login" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="lg">Ir para o login</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-transparent text-white">
              <CardContent className="p-8 space-y-4">
                <h3 className="text-xl font-bold">Contato do setor</h3>
                <p className="text-white/80">Telefone: (85) 3343-0413</p>
                <p className="text-white/80">E-mail: demutran.smstcaninde@gmail.com</p>
                <Link to="/contato" className="inline-flex items-center gap-2 text-secondary hover:underline">
                  Falar com a SMST
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </DemutranPortalLayout>
  );
};

export default Demutran;
