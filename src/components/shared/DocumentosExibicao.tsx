import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Download, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModalDetalhesDocumento from './ModalDetalhesDocumento';

interface Documento {
  id: string;
  nome: string;
  descricao: string;
  arquivo_url: string;
  local_exibicao: string;
  ativo: boolean;
  created_at?: string;
}

interface DocumentosExibicaoProps {
  paginaAtual: string;
}

const DocumentosExibicao = ({ paginaAtual }: DocumentosExibicaoProps) => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<Documento | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Função para obter o texto explicativo com base na página atual
  const getTextoExplicativo = () => {
    switch (paginaAtual) {
      case 'demutran':
        return 'Para agilizar suas demandas junto DEMUTRAN veja e baixe documentos que serão solicitados.';
      case 'defesa-civil':
        return 'Documentos importantes para solicitações e informações sobre prevenção e emergência.';
      case 'guarda-municipal':
        return 'Documentos relacionados aos serviços e procedimentos da Guarda Municipal.';
      case 'gmam':
        return 'Documentos de apoio e informações sobre os serviços de assistência da GMAM.';
      case 'gsu':
        return 'Documentos necessários para procedimentos e informações sobre o Grupo de Socorro e Urgência.';
      case 'rope':
        return 'Documentos referentes à Ronda Preventiva Escolar e procedimentos escolares.';
      case 'secretaria':
        return 'Documentos institucionais e administrativos da Secretaria de Segurança.';
      case 'jovem-guarda':
        return 'Documentos para inscrições e informações sobre o programa Jovem Guarda Cidadã.';
      case 'guarda-cidada':
        return 'Documentos sobre o programa de participação comunitária e fiscalização.';
      case 'todos':
      default:
        return 'Documentos institucionais e administrativos.';
    }
  };

  const abrirModalDetalhes = (documento: Documento) => {
    setDocumentoSelecionado(documento);
    setModalAberto(true);
  };

  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        let query = supabase
          .from('documentos')
          .select('*')
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (paginaAtual === 'todos') {
          // Para página 'todos', buscar documentos que sejam 'todos' ou que correspondam a páginas específicas
          query = query.or('local_exibicao.eq.todos,local_exibicao.eq.' + paginaAtual);
        } else {
          // Para páginas específicas, buscar documentos dessa página ou marcados como 'todos'
          query = query.or('local_exibicao.eq.' + paginaAtual + ',local_exibicao.eq.todos');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar documentos:', error);
        } else {
          // Filtrar documentos que tenham URLs válidas
          const documentosValidos = (data || []).filter(doc =>
            doc.arquivo_url &&
            typeof doc.arquivo_url === 'string' &&
            (doc.arquivo_url.startsWith('http://') || doc.arquivo_url.startsWith('https://'))
          );
          setDocumentos(documentosValidos);
        }
      } catch (err: any) {
        console.error('Erro ao buscar documentos:', err);
        // Silenciar erro para usuário e apenas não exibir documentos
        setDocumentos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, [paginaAtual]);

  if (loading || documentos.length === 0) {
    return null; // Não exibe nada se estiver carregando ou não houver documentos
  }

  const getFileIcon = (url: string) => {
    const fileName = url.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getFileType = (url: string) => {
    const fileName = url.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      return 'PDF';
    } else if (fileName.endsWith('.doc')) {
      return 'DOC';
    } else if (fileName.endsWith('.docx')) {
      return 'DOCX';
    }
    return 'ARQUIVO';
  };

  return (
    <section className="py-12 bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="w-full">
          <div className="w-full">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-left">Documentos</h2>
            <p className="text-muted-foreground mb-8 text-left">{getTextoExplicativo()}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {documentos.map((documento) => (
              <div
                key={documento.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-border flex flex-col h-full"
              >
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getFileIcon(documento.arquivo_url)}
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full">
                        {getFileType(documento.arquivo_url)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', lineHeight: '1.25' }}>
                      {documento.nome}
                    </h3>
                    {documento.descricao && (
                      <p className="text-sm text-muted-foreground overflow-hidden flex-grow" style={{ display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', lineHeight: '1.25' }}>
                        {documento.descricao}
                      </p>
                    )}
                    <div className="flex gap-3 mt-auto pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-sm py-2 min-h-8 flex-1 justify-center"
                        onClick={() => abrirModalDetalhes(documento)}
                      >
                        <Plus className="h-4 w-4" />
                        Detalhes
                      </Button>
                      <a
                        href={documento.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline py-2 min-h-8 flex-1 justify-center"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </a>
                      <a
                        href={documento.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline py-2 min-h-8 flex-1 justify-center"
                        onClick={(e) => {
                          e.preventDefault();
                          // Força o download usando a API do navegador
                          fetch(documento.arquivo_url)
                            .then(response => response.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = documento.nome || 'documento';
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            })
                            .catch(error => console.error('Erro ao baixar o arquivo:', error));
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {documentoSelecionado && (
        <ModalDetalhesDocumento
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          titulo={documentoSelecionado.nome}
          descricao={documentoSelecionado.descricao}
        />
      )}
    </section>
  );
};

export default DocumentosExibicao;