import { supabase } from '@/lib/supabase';
import type {
  GuardaSolicitacao,
  GuardaSolicitacaoTipo,
  GuardaSolicitacaoStatus,
  RpcResult,
} from '@/modules/escalas/types/escalas.types';

export const solicitacoesService = {
  async listarSolicitacoes(status?: GuardaSolicitacaoStatus | null, tipo?: GuardaSolicitacaoTipo | null) {
    const { data, error } = await supabase.rpc('listar_guarda_solicitacoes', {
      p_status: status || null,
      p_tipo: tipo || null,
    });
    if (error) throw error;
    return (data || []) as GuardaSolicitacao[];
  },

  async obterDetalhes(solicitacaoId: string) {
    const { data, error } = await supabase.rpc('obter_detalhes_solicitacao', {
      p_solicitacao_id: solicitacaoId,
    });
    if (error) throw error;
    return data as {
      sucesso: boolean;
      mensagem?: string;
      solicitacao: GuardaSolicitacao;
      interacoes: import('@/modules/escalas/types/escalas.types').GuardaSolicitacaoInteracao[];
    };
  },

  async criarSolicitacao(payload: {
    tipo: GuardaSolicitacaoTipo;
    assunto: string;
    descricao?: string | null;
    escala_id?: string | null;
    anexos?: Array<{ nome: string; url: string }>;
  }) {
    const { data, error } = await supabase.rpc('criar_guarda_solicitacao', {
      p_tipo: payload.tipo,
      p_assunto: payload.assunto,
      p_descricao: payload.descricao || null,
      p_escala_id: payload.escala_id || null,
      p_anexos: payload.anexos || [],
    });
    if (error) throw error;
    return data as RpcResult;
  },

  async adicionarInteracao(payload: {
    solicitacao_id: string;
    mensagem: string;
    anexos?: Array<{ nome: string; url: string }>;
    novo_status?: GuardaSolicitacaoStatus | null;
  }) {
    const { data, error } = await supabase.rpc('adicionar_solicitacao_interacao', {
      p_solicitacao_id: payload.solicitacao_id,
      p_mensagem: payload.mensagem,
      p_anexos: payload.anexos || [],
      p_novo_status: payload.novo_status || null,
    });
    if (error) throw error;
    return data as RpcResult;
  },

  async cancelarSolicitacao(solicitacaoId: string) {
    const { data, error } = await supabase.rpc('cancelar_guarda_solicitacao', {
      p_solicitacao_id: solicitacaoId,
    });
    if (error) throw error;
    return data as RpcResult;
  },
};
