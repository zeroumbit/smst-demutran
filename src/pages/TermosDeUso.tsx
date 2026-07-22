import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";

const TermosDeUso = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Termos de Uso"
        subtitle="Condições de Utilização"
        description="Termos e condições aplicáveis ao uso do site da Secretaria de Segurança de Canindé."
      />

      <section className="py-16 bg-background flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
            <h2 className="text-2xl font-bold text-foreground mb-6">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Ao acessar e utilizar este site, você concorda automaticamente com estes Termos de Uso e 
              todas as regras nele estabelecidas. Caso você não concorde com estes termos, por favor, 
              não utilize este site.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">2. Informações do Site</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Este site é mantido pela Secretaria de Segurança de Canindé com o objetivo de fornecer 
              informações institucionais, serviços públicos e permitir a interação com a comunidade.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              As informações contidas neste site são fornecidas como estão, sem garantias de qualquer 
              natureza. A Secretaria de Segurança de Canindé se reserva o direito de alterar, modificar 
              ou remover qualquer conteúdo a qualquer momento, com ou sem aviso prévio.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">3. Uso do Site</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              O uso deste site é destinado exclusivamente para fins legais e éticos. É proibido qualquer 
              uso que viole leis federais, estaduais ou municipais, ou que infrinja direitos de terceiros.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              O usuário concorda em não utilizar o site para fins comerciais ou promocionais sem a 
              autorização prévia por escrito da Secretaria de Segurança de Canindé.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">4. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A Secretaria de Segurança de Canindé não será responsável por quaisquer danos diretos, 
              indiretos, incidentais, consequenciais ou punitivos resultantes do uso ou incapacidade 
              de uso deste site, mesmo que tenha sido avisada da possibilidade de tais danos.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              A informação contida neste site pode conter imprecisões técnicas ou erros tipográficos. 
              A Secretaria de Segurança de Canindé não garante a exatidão ou a integridade das 
              informações fornecidas.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">5. Links para Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Este site pode conter links para sites de terceiros. A Secretaria de Segurança de Canindé 
              não tem controle sobre o conteúdo desses sites e não assume responsabilidade por quaisquer 
              informações, materiais ou práticas de privacidade de sites de terceiros.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">6. Modificações nos Termos de Uso</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A Secretaria de Segurança de Canindé se reserva o direito de modificar estes Termos de 
              Uso a qualquer momento. As modificações entrarão em vigor imediatamente após sua 
              publicação no site. O uso contínuo do site constitui aceitação das modificações.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">7. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Estes Termos de Uso serão regidos pelas leis da República Federativa do Brasil. 
              Quaisquer disputas decorrentes destes termos serão resolvidas exclusivamente nos 
              tribunais do município de Canindé, estado do Ceará.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas, sugestões ou reclamações sobre estes Termos de Uso, entre em contato conosco 
              através dos canais de comunicação oficiais da Secretaria de Segurança de Canindé, 
              disponíveis na seção "Contato" deste site.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermosDeUso;
