import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";

const PoliticaDePrivacidade = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="h-16" />

      <Hero
        title="Política de Privacidade"
        subtitle="Proteção de Dados"
        description="Como a Secretaria de Segurança de Canindé coleta, usa e protege suas informações pessoais."
      />

      <section className="py-16 bg-background flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-gradient-card rounded-2xl p-8 shadow-md">
            <h2 className="text-2xl font-bold text-foreground mb-6">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A Secretaria de Segurança de Canindé respeita a sua privacidade e está empenhada em proteger 
              as informações pessoais que você fornece ao utilizar este site. Esta Política de Privacidade 
              explica como coletamos, usamos e protegemos as suas informações.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">2. Coleta de Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Podemos coletar informações pessoais quando você:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-6">
              <li>Utiliza os formulários de contato disponíveis no site</li>
              <li>Solicita serviços ou informações específicas</li>
              <li>Se inscreve em newsletters ou alertas</li>
              <li>Interage com os recursos disponíveis no site</li>
            </ul>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              As informações coletadas podem incluir nome, endereço de e-mail, número de telefone, 
              e outras informações de identificação pessoal que você opte por fornecer.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">3. Uso das Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              As informações coletadas são utilizadas para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-6">
              <li>Responder às suas solicitações e perguntas</li>
              <li>Fornecer serviços e informações solicitadas</li>
              <li>Melhorar a experiência do usuário no site</li>
              <li>Enviar comunicações institucionais relevantes</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-6">4. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A Secretaria de Segurança de Canindé não vende, comercializa ou aluga suas informações 
              pessoais a terceiros. Podemos compartilhar informações com autoridades competentes 
              somente quando exigido por lei ou para proteger os direitos, propriedade ou segurança 
              da instituição, de nossos usuários ou do público em geral.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">5. Segurança das Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Adotamos medidas de segurança técnicas, administrativas e físicas apropriadas para 
              proteger as informações pessoais contra acesso não autorizado, alteração, divulgação 
              ou destruição. No entanto, nenhum método de transmissão pela internet ou método de 
              armazenamento eletrônico é 100% seguro.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">6. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Este site pode utilizar cookies e tecnologias similares para melhorar a experiência 
              do usuário. Os cookies são pequenos arquivos de texto armazenados no seu dispositivo 
              que permitem reconhecer o seu navegador nas visitas subsequentes.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">7. Links para Sites de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Este site pode conter links para sites de terceiros. Esta Política de Privacidade 
              aplica-se apenas a este site. Recomendamos que você revise as políticas de privacidade 
              de quaisquer sites de terceiros que visitar.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">8. Direitos dos Titulares de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-6">
              <li>Confirmar a existência de tratamento de seus dados pessoais</li>
              <li>Obter informações sobre a finalidade do tratamento</li>
              <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Revogar o consentimento para o tratamento de dados pessoais</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-6">9. Atualizações da Política</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir 
              mudanças em nossas práticas de coleta e uso de dados. As alterações entrarão em 
              vigor imediatamente após a publicação no site. Recomendamos que você revise 
              periodicamente esta Política de Privacidade para estar ciente de quaisquer mudanças.
            </p>

            <h2 className="text-2xl font-bold text-foreground mb-6">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade ou quiser exercer seus 
              direitos como titular de dados, entre em contato conosco através dos canais 
              oficiais da Secretaria de Segurança de Canindé, disponíveis na seção "Contato" 
              deste site.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PoliticaDePrivacidade;