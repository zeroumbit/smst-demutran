import { supabase } from '@/lib/supabase';
import type { OrdemServico, OrdemServicoFormData, OrdemServicoStatus } from '@/types/ordem-servico.types';

export const ordemServicoService = {
  async salvarRascunho(form: OrdemServicoFormData) {
    const { data, error } = await supabase.rpc('salvar_rascunho_ordem_servico', {
      p_id: form.id || null,
      p_origem: form.origem,
      p_origem_outros: form.origem_outros || null,
      p_numero_documento_origem: form.numero_documento_origem || null,
      p_assunto: form.assunto,
      p_data_execucao_inicio: form.data_execucao_inicio,
      p_data_execucao_fim: form.data_execucao_fim || null,
      p_hora_inicio: form.hora_inicio,
      p_hora_fim: form.hora_fim || null,
      p_ate_termino: form.ate_termino,
      p_descricao: form.descricao,
      p_local_execucao: form.local_execucao,
      p_ponto_apresentacao: form.ponto_apresentacao || null,
      p_observacoes: form.observacoes || null,
      p_solicitante_nome: form.solicitante_nome || null,
      p_solicitante_orgao: form.solicitante_orgao || null,
      p_solicitante_funcao: form.solicitante_funcao || null,
      p_solicitante_telefone: form.solicitante_telefone || null,
      p_solicitante_whatsapp: form.solicitante_whatsapp || null,
      p_solicitante_email: form.solicitante_email || null,
      p_equipes_ids: form.equipes_ids,
    });
    if (error) throw error;
    return data as { sucesso: boolean; ordem_servico_id: string };
  },

  async publicar(id: string) {
    const { data, error } = await supabase.rpc('publicar_ordem_servico', { p_id: id });
    if (error) throw error;
    return data as { sucesso: boolean; numero_formatado: string };
  },

  async substituir(id: string, formValues?: Partial<OrdemServicoFormData>) {
    const { data, error } = await supabase.rpc('substituir_ordem_servico', {
      p_ordem_antiga_id: id,
      p_assunto: formValues?.assunto || null,
      p_descricao: formValues?.descricao || null,
      p_local_execucao: formValues?.local_execucao || null,
      p_observacoes: formValues?.observacoes || null,
      p_equipes_ids: formValues?.equipes_ids || [],
    });
    if (error) throw error;
    return data as { sucesso: boolean; nova_ordem_id: string; versao: number };
  },

  async cancelar(id: string, motivo: string) {
    const { data, error } = await supabase.rpc('cancelar_ordem_servico', {
      p_id: id,
      p_motivo: motivo,
    });
    if (error) throw error;
    return data as { sucesso: boolean };
  },

  async arquivar(id: string) {
    const { data, error } = await supabase.rpc('arquivar_ordem_servico', { p_id: id });
    if (error) throw error;
    return data as { sucesso: boolean };
  },

  async registrarAcesso(id: string, acao: 'VISUALIZACAO' | 'DOWNLOAD' | 'IMPRESSAO' = 'VISUALIZACAO') {
    const { data, error } = await supabase.rpc('registrar_acesso_ordem_servico', {
      p_ordem_id: id,
      p_acao: acao,
    });
    if (error) throw error;
    return data as { sucesso: boolean };
  },

  async listar(status?: OrdemServicoStatus | null, ano?: number | null, busca?: string | null) {
    const { data, error } = await supabase.rpc('listar_ordens_servico', {
      p_status: status || null,
      p_ano: ano || null,
      p_busca: busca || null,
    });
    if (error) throw error;
    return (data || []) as OrdemServico[];
  },
};
