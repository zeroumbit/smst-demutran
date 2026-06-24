import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Membro {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  foto?: string;
  pagina_destino?: string;
  ativo: boolean;
}

interface MembrosEquipeProps {
  paginaAtual: string;
}

const MembrosEquipe = ({ paginaAtual }: MembrosEquipeProps) => {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para obter o texto explicativo com base na página atual
  const getTextoExplicativo = () => {
    switch (paginaAtual) {
      case 'demutran':
        return 'Conheça os profissionais responsáveis pela gestão e fiscalização do trânsito em Canindé.';
      case 'defesa-civil':
        return 'Conheça os profissionais responsáveis pela proteção e prevenção contra desastres naturais.';
      case 'guarda-municipal':
        return 'Conheça os guardas municipais responsáveis pela proteção do patrimônio público e segurança.';
      case 'gmam':
        return 'Conheça os profissionais do Grupo Municipal de Apoio à Mulher.';
      case 'gsu':
        return 'Conheça os profissionais do Grupo de Socorro e Urgência.';
      case 'rope':
        return 'Conheça os profissionais da Ronda Preventiva Escolar.';
      case 'secretaria':
        return 'Conheça os profissionais da Secretaria de Segurança de Canindé.';
      case 'jovem-guarda':
        return 'Conheça os jovens participantes do programa de formação cidadã.';
      case 'guarda-cidada':
        return 'Conheça os participantes do programa de participação comunitária na segurança.';
      case 'todos':
      default:
        return 'Conheça os profissionais que atuam na segurança e proteção dos cidadãos de Canindé.';
    }
  };

  useEffect(() => {
    const fetchMembros = async () => {
      try {
        // Primeiro tentar buscar com todas as colunas
        let { data, error } = await supabase
          .from('equipe')
          .select('id, nome, cargo, setor, foto, pagina_destino, ativo')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        // Se ocorrer erro de coluna ausente, tentar com colunas essenciais
        if (error && error.message.includes('Could not find')) {
          console.log('Erro de coluna detectado, tentando consulta com colunas básicas...');
          const fallbackResult = await supabase
            .from('equipe')
            .select('id, nome, cargo, setor, ativo')
            .eq('ativo', true)
            .order('nome', { ascending: true });

          if (fallbackResult.error) {
            throw fallbackResult.error;
          }

          // Preencher valores padrão para colunas ausentes
          data = fallbackResult.data?.map((item: any) => ({
            ...item,
            foto: item.foto || null,
            pagina_destino: item.pagina_destino || null
          })) || [];
        } else if (error) {
          throw error;
        }

        // Filtrar membros por página
        let membrosFiltrados = data || [];
        if (paginaAtual && paginaAtual !== 'todos') {
          membrosFiltrados = membrosFiltrados.filter(membro =>
            membro.pagina_destino === paginaAtual ||  // Membros específicos para esta página
            membro.pagina_destino === 'todos' ||     // Membros que aparecem em todas as páginas
            membro.pagina_destino === null ||        // Membros sem página definida (padrão: aparecem em todos)
            membro.pagina_destino === ''             // Membros com página vazia (padrão: aparecem em todos)
          );
        } else if (paginaAtual === 'todos') {
          // Se for a página "todos", mostrar todos os membros
          membrosFiltrados = data || [];
        }

        // Filtrar membros que tenham foto válida ou não tenham foto (para mostrar placeholder)
        const membrosValidos = membrosFiltrados.filter(membro =>
          !membro.foto || // Incluir membros sem foto também
          (membro.foto &&
            typeof membro.foto === 'string' &&
            (membro.foto.startsWith('http://') || membro.foto.startsWith('https://')))
        );

        setMembros(membrosValidos);
      } catch (err: any) {
        console.error('Erro ao buscar membros da equipe:', err);
        // Silenciar erro para usuário e apenas não exibir membros
        setMembros([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembros();
  }, [paginaAtual]);

  if (loading) {
    return null; // Não exibe nada se estiver carregando
  }

  // Verificar se há membros com foto válida
  const membrosComFoto = membros.filter(membro =>
    membro.foto &&
    typeof membro.foto === 'string' &&
    (membro.foto.startsWith('http://') || membro.foto.startsWith('https://'))
  );

  // Só exibe a seção se houver membros com foto válida
  if (membrosComFoto.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-[900px] mx-auto w-full">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-left">Nossa Equipe</h2>
            <p className="text-muted-foreground mb-8 text-left">{getTextoExplicativo()}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-[900px] mx-auto">
            {membrosComFoto.map((membro) => (
              <div
                key={membro.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden text-center"
              >
                <div className="p-4">
                  <div className="flex justify-center mb-4">
                    <img
                      src={membro.foto}
                      alt={membro.nome}
                      className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/placeholder-avatar.png'; // Placeholder caso a imagem falhe
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{membro.nome}</h3>
                  <p className="text-sm font-medium text-primary mb-1">{membro.cargo}</p>
                  <p className="text-xs text-muted-foreground">{membro.setor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
    </section>
  );
};

export default MembrosEquipe;