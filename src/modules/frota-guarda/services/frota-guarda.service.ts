import { supabase } from '@/lib/supabase';
import type {
  GuardaFrotaCategoria,
  GuardaFrotaDocumento,
  GuardaFrotaHistorico,
  GuardaFrotaIndisponibilidade,
  GuardaFrotaManutencao,
  GuardaFrotaStatus,
  GuardaFrotaVeiculo,
  GuardaFrotaVeiculoPayload,
} from '../types/frota-guarda.types';

const veiculoSelect = `
  *,
  categoria:guarda_frota_categorias(id,nome),
  demutran_veiculo:demutran_veiculos_municipais(id,placa,chassi,marca,modelo,cor,ano,tipo,secretaria_responsavel)
`;

export type DemutranBaseVehicle = {
  id: string;
  placa: string;
  chassi: string;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  ano: string | null;
  tipo: string | null;
  secretaria_responsavel: string;
  ativo: boolean;
};

export const frotaGuardaService = {
  async listVeiculos() {
    const { data, error } = await supabase
      .from('guarda_frota_veiculos')
      .select(veiculoSelect)
      .order('prefixo');

    if (error) throw error;
    return (data || []) as GuardaFrotaVeiculo[];
  },

  async getVeiculo(id: string) {
    const { data, error } = await supabase
      .from('guarda_frota_veiculos')
      .select(veiculoSelect)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as GuardaFrotaVeiculo;
  },

  async listCategorias() {
    const { data, error } = await supabase
      .from('guarda_frota_categorias')
      .select('*')
      .order('ordem')
      .order('nome');

    if (error) throw error;
    return (data || []) as GuardaFrotaCategoria[];
  },

  async createCategoria(payload: { nome: string; descricao?: string | null; ordem?: number; ativo?: boolean }) {
    const { data, error } = await supabase
      .from('guarda_frota_categorias')
      .insert([{
        nome: payload.nome.trim(),
        descricao: payload.descricao?.trim() || null,
        ordem: payload.ordem ?? 0,
        ativo: payload.ativo ?? true,
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardaFrotaCategoria;
  },

  async updateCategoria(id: string, payload: { nome?: string; descricao?: string | null; ordem?: number; ativo?: boolean }) {
    const nextPayload: Record<string, unknown> = {};
    if (payload.nome !== undefined) nextPayload.nome = payload.nome.trim();
    if (payload.descricao !== undefined) nextPayload.descricao = payload.descricao?.trim() || null;
    if (payload.ordem !== undefined) nextPayload.ordem = payload.ordem;
    if (payload.ativo !== undefined) nextPayload.ativo = payload.ativo;

    const { data, error } = await supabase
      .from('guarda_frota_categorias')
      .update(nextPayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardaFrotaCategoria;
  },

  async listDemutranVehicles() {
    const { data, error } = await supabase
      .from('demutran_veiculos_municipais')
      .select('id, placa, chassi, marca, modelo, cor, ano, tipo, secretaria_responsavel, ativo')
      .eq('ativo', true)
      .order('placa');

    if (error) throw error;
    return (data || []) as DemutranBaseVehicle[];
  },

  async createVeiculo(payload: GuardaFrotaVeiculoPayload) {
    const { data, error } = await supabase
      .from('guarda_frota_veiculos')
      .insert([{ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id || null }])
      .select(veiculoSelect)
      .single();

    if (error) throw error;
    return data as GuardaFrotaVeiculo;
  },

  async updateVeiculo(id: string, payload: GuardaFrotaVeiculoPayload) {
    const { data, error } = await supabase
      .from('guarda_frota_veiculos')
      .update(payload)
      .eq('id', id)
      .select(veiculoSelect)
      .single();

    if (error) throw error;
    return data as GuardaFrotaVeiculo;
  },

  async updateStatus(id: string, status: GuardaFrotaStatus, motivo?: string) {
    const payload: Record<string, unknown> = {
      status,
      ativo: status !== 'INATIVO',
    };
    if (status === 'INATIVO') payload.motivo_inativacao = motivo || 'Inativacao administrativa';

    const { error } = await supabase.from('guarda_frota_veiculos').update(payload).eq('id', id);
    if (error) throw error;
  },

  async listHistorico(veiculoId: string) {
    const { data, error } = await supabase
      .from('guarda_frota_historico')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GuardaFrotaHistorico[];
  },

  async listIndisponibilidades(veiculoId: string) {
    const { data, error } = await supabase
      .from('guarda_frota_indisponibilidades')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('inicio', { ascending: false });

    if (error) throw error;
    return (data || []) as GuardaFrotaIndisponibilidade[];
  },

  async createIndisponibilidade(payload: {
    veiculo_id: string;
    inicio: string;
    fim_previsto?: string | null;
    motivo: string;
    descricao?: string | null;
  }) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase
      .from('guarda_frota_indisponibilidades')
      .insert([{ ...payload, created_by: userId }]);
    if (error) throw error;

    await this.updateStatus(payload.veiculo_id, payload.motivo.toLowerCase().includes('manut') ? 'EM_MANUTENCAO' : 'INDISPONIVEL');
  },

  async listManutencoes(veiculoId: string) {
    const { data, error } = await supabase
      .from('guarda_frota_manutencoes')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('data_entrada', { ascending: false });

    if (error) throw error;
    return (data || []) as GuardaFrotaManutencao[];
  },

  async createManutencao(payload: Partial<GuardaFrotaManutencao> & { veiculo_id: string; descricao_problema: string }) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase
      .from('guarda_frota_manutencoes')
      .insert([{ ...payload, created_by: userId }]);
    if (error) throw error;
    await this.updateStatus(payload.veiculo_id, 'EM_MANUTENCAO');
  },

  async listDocumentos(veiculoId: string) {
    const { data, error } = await supabase
      .from('guarda_frota_documentos')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GuardaFrotaDocumento[];
  },

  async createDocumento(payload: Omit<GuardaFrotaDocumento, 'id' | 'created_at'>) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase
      .from('guarda_frota_documentos')
      .insert([{ ...payload, created_by: userId }]);
    if (error) throw error;
  },
};
