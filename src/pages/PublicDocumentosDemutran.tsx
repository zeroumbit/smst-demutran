import Hero from '@/components/shared/Hero';
import DocumentosExibicao from '@/components/shared/DocumentosExibicao';
import { DemutranPortalLayout } from '@/components/demutran/DemutranPortalLayout';

const PublicDocumentosDemutran = () => {
  return (
    <DemutranPortalLayout>
      <Hero
        title="Documentos DEMUTRAN"
        subtitle="Departamento Municipal de Trânsito"
        description="Acesse os documentos oficiais do DEMUTRAN, incluindo decretos, portarias e demais publicações."
        className="bg-gradient-hero"
      />
      <section className="py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <DocumentosExibicao paginaAtual="demutran" />
        </div>
      </section>
    </DemutranPortalLayout>
  );
};

export default PublicDocumentosDemutran;
