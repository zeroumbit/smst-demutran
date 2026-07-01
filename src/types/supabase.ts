Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          lida_em: string | null
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      auditoria_logs: {
        Row: {
          acao: string
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          payload_resumido: Json | null
          setor_id: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          payload_resumido?: Json | null
          setor_id?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          payload_resumido?: Json | null
          setor_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_logs_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          pagina_destino: string
          tipo: string
          updated_at: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          pagina_destino: string
          tipo: string
          updated_at?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          pagina_destino?: string
          tipo?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          email: string | null
          endereco: string | null
          id: string
          telefone: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          telefone?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          telefone?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guarda_municipal_graduacoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      guardas_municipais: {
        Row: {
          ativo: boolean
          created_at: string
          graduacao_id: string
          id: string
          matricula: string
          nome: string
          cpf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          graduacao_id: string
          id?: string
          matricula: string
          nome: string
          cpf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          graduacao_id?: string
          id?: string
          matricula?: string
          nome?: string
          cpf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardas_municipais_graduacao_id_fkey"
            columns: ["graduacao_id"]
            isOneToOne: false
            referencedRelation: "guarda_municipal_graduacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_concessionario_acessos: {
        Row: {
          concessionario_id: string
          cpf_normalizado: string
          created_at: string
          failed_attempts: number
          locked_until: string | null
          senha_hash: string
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          concessionario_id: string
          cpf_normalizado: string
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          senha_hash: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          concessionario_id?: string
          cpf_normalizado?: string
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          senha_hash?: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demutran_concessionario_acessos_concessionario_id_fkey"
            columns: ["concessionario_id"]
            isOneToOne: true
            referencedRelation: "demutran_concessionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_concessionario_notificacoes: {
        Row: {
          concessionario_id: string
          created_at: string
          created_by: string | null
          id: string
          lida_em: string | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          concessionario_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lida_em?: string | null
          mensagem: string
          tipo?: string
          titulo: string
        }
        Update: {
          concessionario_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lida_em?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "demutran_concessionario_notificacoes_concessionario_id_fkey"
            columns: ["concessionario_id"]
            isOneToOne: false
            referencedRelation: "demutran_concessionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_concessionario_sessoes: {
        Row: {
          concessionario_id: string
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          token: string
        }
        Insert: {
          concessionario_id: string
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          token?: string
        }
        Update: {
          concessionario_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "demutran_concessionario_sessoes_concessionario_id_fkey"
            columns: ["concessionario_id"]
            isOneToOne: false
            referencedRelation: "demutran_concessionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_concessionarios: {
        Row: {
          aceita_notificacoes: boolean
          atividade_remunerada: string | null
          ativo: boolean
          categoria: Database["public"]["Enums"]["demutran_concessionario_categoria"]
          categoria_cnh: string | null
          cnh_auxiliar: string | null
          cnh_numero: string | null
          cpf: string | null
          created_at: string
          curso: string | null
          email_notificacao: string | null
          endereco: string | null
          exercicio: string | null
          fabricacao: string | null
          id: string
          importado_planilha: boolean
          inicio_atividade: string | null
          motorista_auxiliar: string | null
          numero_vaga: string | null
          observacoes: string | null
          origem_planilha: string | null
          placa: string | null
          estacionamento: string | null
          ponto_referencia: string | null
          rota: string | null
          setor_id: string
          taxi_grupo: string | null
          telefone_notificacao: string | null
          titular_nome: string | null
          ultimo_alvara: string | null
          updated_at: string
          validade_cnh: string | null
          validade_cnh_auxiliar: string | null
          veiculo: string | null
        }
        Insert: {
          aceita_notificacoes?: boolean
          atividade_remunerada?: string | null
          ativo?: boolean
          categoria: Database["public"]["Enums"]["demutran_concessionario_categoria"]
          categoria_cnh?: string | null
          cnh_auxiliar?: string | null
          cnh_numero?: string | null
          cpf?: string | null
          created_at?: string
          curso?: string | null
          email_notificacao?: string | null
          endereco?: string | null
          exercicio?: string | null
          fabricacao?: string | null
          id?: string
          importado_planilha?: boolean
          inicio_atividade?: string | null
          motorista_auxiliar?: string | null
          numero_vaga?: string | null
          observacoes?: string | null
          origem_planilha?: string | null
          placa?: string | null
          estacionamento?: string | null
          ponto_referencia?: string | null
          rota?: string | null
          setor_id?: string
          taxi_grupo?: string | null
          telefone_notificacao?: string | null
          titular_nome?: string | null
          ultimo_alvara?: string | null
          updated_at?: string
          validade_cnh?: string | null
          validade_cnh_auxiliar?: string | null
          veiculo?: string | null
        }
        Update: {
          aceita_notificacoes?: boolean
          atividade_remunerada?: string | null
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["demutran_concessionario_categoria"]
          categoria_cnh?: string | null
          cnh_auxiliar?: string | null
          cnh_numero?: string | null
          cpf?: string | null
          created_at?: string
          curso?: string | null
          email_notificacao?: string | null
          endereco?: string | null
          exercicio?: string | null
          fabricacao?: string | null
          id?: string
          importado_planilha?: boolean
          inicio_atividade?: string | null
          motorista_auxiliar?: string | null
          numero_vaga?: string | null
          observacoes?: string | null
          origem_planilha?: string | null
          placa?: string | null
          estacionamento?: string | null
          ponto_referencia?: string | null
          rota?: string | null
          setor_id?: string
          taxi_grupo?: string | null
          telefone_notificacao?: string | null
          titular_nome?: string | null
          ultimo_alvara?: string | null
          updated_at?: string
          validade_cnh?: string | null
          validade_cnh_auxiliar?: string | null
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demutran_concessionarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_credenciais_solicitacoes: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          bairro: string | null
          complemento: string | null
          comprovante_residencia_url: string | null
          cpf: string
          created_at: string
          documento_identidade_url: string | null
          email: string | null
          endereco: string | null
          id: string
          laudo_medico_url: string | null
          logradouro: string | null
          nome_completo: string
          numero: string | null
          observacao: string | null
          protocolo: string
          rg: string | null
          setor_id: string
          status: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["demutran_credencial_tipo"]
          updated_at: string
          usuario_externo_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          bairro?: string | null
          complemento?: string | null
          comprovante_residencia_url?: string | null
          cpf: string
          created_at?: string
          documento_identidade_url?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          laudo_medico_url?: string | null
          logradouro?: string | null
          nome_completo: string
          numero?: string | null
          observacao?: string | null
          protocolo?: string
          rg?: string | null
          setor_id?: string
          status?: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone?: string | null
          tipo: Database["public"]["Enums"]["demutran_credencial_tipo"]
          updated_at?: string
          usuario_externo_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          bairro?: string | null
          complemento?: string | null
          comprovante_residencia_url?: string | null
          cpf?: string
          created_at?: string
          documento_identidade_url?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          laudo_medico_url?: string | null
          logradouro?: string | null
          nome_completo?: string
          numero?: string | null
          observacao?: string | null
          protocolo?: string
          rg?: string | null
          setor_id?: string
          status?: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["demutran_credencial_tipo"]
          updated_at?: string
          usuario_externo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demutran_credenciais_solicitacoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demutran_credenciais_solicitacoes_usuario_externo_id_fkey"
            columns: ["usuario_externo_id"]
            isOneToOne: false
            referencedRelation: "demutran_usuarios_externos"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_externo_sessoes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          token: string
          usuario_externo_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          token?: string
          usuario_externo_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          token?: string
          usuario_externo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demutran_externo_sessoes_usuario_externo_id_fkey"
            columns: ["usuario_externo_id"]
            isOneToOne: false
            referencedRelation: "demutran_usuarios_externos"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_midias: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          created_by: string | null
          descricao: string
          id: string
          setor_id: string
          tipo: string
          titulo: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao: string
          id?: string
          setor_id: string
          tipo: string
          titulo: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          id?: string
          setor_id?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demutran_midias_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_recursos: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          auto_infracao: string
          cpf: string
          created_at: string
          defesa_documento_url: string
          email: string | null
          id: string
          nome_completo: string
          observacao: string | null
          placa: string | null
          protocolo: string
          setor_id: string
          status: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["demutran_recurso_tipo"]
          updated_at: string
          usuario_externo_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          auto_infracao: string
          cpf: string
          created_at?: string
          defesa_documento_url: string
          email?: string | null
          id?: string
          nome_completo: string
          observacao?: string | null
          placa?: string | null
          protocolo?: string
          setor_id?: string
          status?: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone?: string | null
          tipo: Database["public"]["Enums"]["demutran_recurso_tipo"]
          updated_at?: string
          usuario_externo_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          auto_infracao?: string
          cpf?: string
          created_at?: string
          defesa_documento_url?: string
          email?: string | null
          id?: string
          nome_completo?: string
          observacao?: string | null
          placa?: string | null
          protocolo?: string
          setor_id?: string
          status?: Database["public"]["Enums"]["demutran_solicitacao_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["demutran_recurso_tipo"]
          updated_at?: string
          usuario_externo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demutran_recursos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demutran_recursos_usuario_externo_id_fkey"
            columns: ["usuario_externo_id"]
            isOneToOne: false
            referencedRelation: "demutran_usuarios_externos"
            referencedColumns: ["id"]
          },
        ]
      }
      demutran_usuarios_externos: {
        Row: {
          ativo: boolean
          cpf_normalizado: string
          created_at: string
          email: string | null
          failed_attempts: number
          id: string
          locked_until: string | null
          nome_completo: string
          senha_hash: string
          telefone: string | null
          tipo: string
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cpf_normalizado: string
          created_at?: string
          email?: string | null
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          nome_completo: string
          senha_hash: string
          telefone?: string | null
          tipo?: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cpf_normalizado?: string
          created_at?: string
          email?: string | null
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          nome_completo?: string
          senha_hash?: string
          telefone?: string | null
          tipo?: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      demutran_veiculos_municipais: {
        Row: {
          ativo: boolean
          chassi: string
          created_at: string
          id: string
          motorista_responsavel: string | null
          observacao: string | null
          placa: string
          secretaria_responsavel: string
          setor_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chassi: string
          created_at?: string
          id?: string
          motorista_responsavel?: string | null
          observacao?: string | null
          placa: string
          secretaria_responsavel: string
          setor_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chassi?: string
          created_at?: string
          id?: string
          motorista_responsavel?: string | null
          observacao?: string | null
          placa?: string
          secretaria_responsavel?: string
          setor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demutran_veiculos_municipais_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_url: string
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          local_exibicao: string | null
          nome: string
          setor_id: string | null
          updated_at: string | null
        }
        Insert: {
          arquivo_url: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          local_exibicao?: string | null
          nome: string
          setor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivo_url?: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          local_exibicao?: string | null
          nome?: string
          setor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe: {
        Row: {
          ativo: boolean | null
          cargo: string
          created_at: string | null
          email: string | null
          foto: string | null
          id: string
          nome: string
          pagina_destino: string | null
          setor: string | null
          setor_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo: string
          created_at?: string | null
          email?: string | null
          foto?: string | null
          id?: string
          nome: string
          pagina_destino?: string | null
          setor?: string | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string
          created_at?: string | null
          email?: string | null
          foto?: string | null
          id?: string
          nome?: string
          pagina_destino?: string | null
          setor?: string | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data: string
          descricao: string | null
          horario: string | null
          id: string
          local: string | null
          setor_id: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data: string
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          setor_id?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          setor_id?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      galeria_fotos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          link_destino: string | null
          pagina_exibicao: string | null
          possui_link: boolean | null
          setor_id: string | null
          titulo: string
          updated_at: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link_destino?: string | null
          pagina_exibicao?: string | null
          possui_link?: boolean | null
          setor_id?: string | null
          titulo: string
          updated_at?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link_destino?: string | null
          pagina_exibicao?: string | null
          possui_link?: boolean | null
          setor_id?: string | null
          titulo?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "galeria_fotos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias: {
        Row: {
          ativo: boolean | null
          conteudo: string
          created_at: string | null
          data: string | null
          id: string
          imagem: string | null
          resumo: string
          setor_id: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo: string
          created_at?: string | null
          data?: string | null
          id?: string
          imagem?: string | null
          resumo: string
          setor_id?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string
          created_at?: string | null
          data?: string | null
          id?: string
          imagem?: string | null
          resumo?: string
          setor_id?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noticias_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      paginas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      perfis_usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id?: string | null
          sobrenome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          papel?: Database["public"]["Enums"]["papel_usuario"]
          setor_id?: string | null
          sobrenome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_usuarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          imagem: string | null
          nome: string
          objetivo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome: string
          objetivo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome?: string
          objetivo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      veiculos_recolhidos: {
        Row: {
          bairro_apreensao: string | null
          chassi: string | null
          created_at: string
          data_liberacao: string | null
          data_recolhimento: string
          descricao_veiculo: string
          envolvimento_acidente: string | null
          genero_condutor: string | null
          id: string
          importado_planilha: boolean
          liberacao_registrada_no_sistema: boolean
          liberado_por: string | null
          local_custodia: Database["public"]["Enums"]["demutran_local_custodia"]
          logradouro: string | null
          motivo: string
          municipio: string | null
          ano: string | null
          cor: string | null
          modelo: string | null
          numero_liberacao: string | null
          observacao: string | null
          placa: string
          proprietario_cpf_cnpj: string | null
          proprietario_nome: string
          protocolo: string
          restricao_legal: string | null
          infrator_nome: string | null
          setor_id: string
          situacao: string
          status: string
          taxa_diaria: number
          updated_at: string
        }
        Insert: {
          bairro_apreensao?: string | null
          chassi?: string | null
          ano?: string | null
          cor?: string | null
          created_at?: string
          data_liberacao?: string | null
          data_recolhimento: string
          descricao_veiculo?: string
          envolvimento_acidente?: string | null
          genero_condutor?: string | null
          id?: string
          importado_planilha?: boolean
          infrator_nome?: string | null
          liberacao_registrada_no_sistema?: boolean
          liberado_por?: string | null
          local_custodia?: Database["public"]["Enums"]["demutran_local_custodia"]
          logradouro?: string | null
          motivo: string
          modelo?: string | null
          municipio?: string | null
          numero_liberacao?: string | null
          observacao?: string | null
          placa: string
          proprietario_cpf_cnpj?: string | null
          proprietario_nome: string
          protocolo?: string
          restricao_legal?: string | null
          setor_id: string
          situacao?: string
          status?: string
          taxa_diaria?: number
          updated_at?: string
        }
        Update: {
          ano?: string | null
          bairro_apreensao?: string | null
          chassi?: string | null
          cor?: string | null
          created_at?: string
          data_liberacao?: string | null
          data_recolhimento?: string
          descricao_veiculo?: string
          envolvimento_acidente?: string | null
          genero_condutor?: string | null
          id?: string
          importado_planilha?: boolean
          infrator_nome?: string | null
          liberacao_registrada_no_sistema?: boolean
          liberado_por?: string | null
          local_custodia?: Database["public"]["Enums"]["demutran_local_custodia"]
          logradouro?: string | null
          motivo?: string
          modelo?: string | null
          municipio?: string | null
          numero_liberacao?: string | null
          observacao?: string | null
          placa?: string
          proprietario_cpf_cnpj?: string | null
          proprietario_nome?: string
          protocolo?: string
          restricao_legal?: string | null
          setor_id?: string
          situacao?: string
          status?: string
          taxa_diaria?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_recolhidos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_profile: {
        Args: { _perfil_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfis_usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_user_to_setor: {
        Args: {
          _email: string
          _papel: Database["public"]["Enums"]["papel_usuario"]
          _setor_id: string
        }
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfis_usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      atualizar_cpf_veiculo_recolhido: {
        Args: { _cpf_cnpj: string; _justificativa: string; _veiculo_id: string }
        Returns: {
          chassi: string | null
          created_at: string
          data_liberacao: string | null
          data_recolhimento: string
          descricao_veiculo: string
          id: string
          importado_planilha: boolean
          liberacao_registrada_no_sistema: boolean
          liberado_por: string | null
          local_custodia: Database["public"]["Enums"]["demutran_local_custodia"]
          motivo: string
          numero_liberacao: string | null
          observacao: string | null
          placa: string
          proprietario_cpf_cnpj: string | null
          proprietario_nome: string
          protocolo: string
          setor_id: string
          situacao: string
          status: string
          taxa_diaria: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "veiculos_recolhidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      atualizar_perfil_concessionario_publico: {
        Args: {
          _aceita_notificacoes?: boolean
          _email_notificacao?: string
          _endereco?: string
          _nova_senha?: string
          _observacoes?: string
          _placa?: string
          _session_token: string
          _telefone_notificacao?: string
          _veiculo?: string
        }
        Returns: Json
      }
      atualizar_taxa_diaria_veiculos_recolhidos_setor: {
        Args: { _setor_id: string; _taxa_diaria: number }
        Returns: number
      }
      atualizar_taxa_veiculo_recolhido: {
        Args: { _taxa_diaria: number; _veiculo_id: string }
        Returns: {
          chassi: string | null
          created_at: string
          data_liberacao: string | null
          data_recolhimento: string
          descricao_veiculo: string
          id: string
          importado_planilha: boolean
          liberacao_registrada_no_sistema: boolean
          liberado_por: string | null
          local_custodia: Database["public"]["Enums"]["demutran_local_custodia"]
          motivo: string
          numero_liberacao: string | null
          observacao: string | null
          placa: string
          proprietario_cpf_cnpj: string | null
          proprietario_nome: string
          protocolo: string
          setor_id: string
          situacao: string
          status: string
          taxa_diaria: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "veiculos_recolhidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      autenticar_concessionario: {
        Args: { _cpf: string; _senha: string }
        Returns: {
          concessionario: Json
          session_token: string
        }[]
      }
      autenticar_usuario_externo: {
        Args: { _cpf: string; _senha: string }
        Returns: {
          session_token: string
          usuario: Json
        }[]
      }
      buscar_global_admin: {
        Args: { _limite_por_modulo?: number; _termo: string }
        Returns: {
          modulo: string
          registro_id: string
          rota: string
          subtitulo: string
          tabela: string
          titulo: string
        }[]
      }
      can_manage_demutran_content: {
        Args: { _setor_id: string }
        Returns: boolean
      }
      can_manage_setor_content: {
        Args: { _setor_id: string }
        Returns: boolean
      }
      can_view_setor_content: { Args: { _setor_id: string }; Returns: boolean }
      consultar_status_credencial_demutran: {
        Args: { _cpf: string; _protocolo: string }
        Returns: {
          analisado_em: string
          created_at: string
          nome_completo: string
          protocolo: string
          status: Database["public"]["Enums"]["demutran_solicitacao_status"]
          tipo: Database["public"]["Enums"]["demutran_credencial_tipo"]
        }[]
      }
      consultar_status_recurso_demutran: {
        Args: { _cpf: string; _protocolo: string }
        Returns: {
          analisado_em: string
          auto_infracao: string
          created_at: string
          placa: string
          protocolo: string
          status: Database["public"]["Enums"]["demutran_solicitacao_status"]
          tipo: Database["public"]["Enums"]["demutran_recurso_tipo"]
        }[]
      }
      consultar_veiculo_recolhido: {
        Args: { _termo: string }
        Returns: {
          chassi: string
          data_liberacao: string
          data_recolhimento: string
          motivo: string
          placa: string
          proprietario_nome: string
          setor_nome: string
          status: string
        }[]
      }
      consultar_veiculo_recolhido_por_protocolo: {
        Args: { _cpf_cnpj: string; _protocolo: string }
        Returns: {
          data_recolhimento: string
          descricao_veiculo: string
          dias_apreendido: number
          local_custodia: string
          motivo: string
          placa: string
          proprietario_nome: string
          protocolo: string
          situacao: string
          status: string
          taxa_diaria: number
          valor_estimado: number
        }[]
      }
      contar_notificacoes_admin_nao_lidas: { Args: never; Returns: number }
      criar_notificacao_admin: {
        Args: {
          _link?: string
          _mensagem: string
          _tipo?: string
          _titulo: string
          _user_id: string
        }
        Returns: string
      }
      criar_notificacao_admins_setor: {
        Args: {
          _link?: string
          _mensagem: string
          _setor_id: string
          _tipo?: string
          _titulo: string
        }
        Returns: number
      }
      criar_recurso_demutran: {
        Args: {
          _auto_infracao?: string
          _cpf: string
          _defesa_documento_url?: string
          _email?: string
          _nome_completo: string
          _observacao?: string
          _placa?: string
          _session_token?: string
          _telefone?: string
          _tipo: Database["public"]["Enums"]["demutran_recurso_tipo"]
        }
        Returns: {
          id: string
          protocolo: string
        }[]
      }
      criar_solicitacao_credencial: {
        Args: {
          _bairro?: string
          _complemento?: string
          _comprovante_residencia_url?: string
          _cpf: string
          _documento_identidade_url?: string
          _email?: string
          _laudo_medico_url?: string
          _logradouro?: string
          _nome_completo: string
          _numero?: string
          _observacao?: string
          _rg?: string
          _session_token?: string
          _telefone?: string
          _tipo: Database["public"]["Enums"]["demutran_credencial_tipo"]
        }
        Returns: {
          id: string
          protocolo: string
        }[]
      }
      deactivate_profile: {
        Args: { _perfil_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfis_usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      definir_acesso_concessionario: {
        Args: { _concessionario_id: string; _senha: string }
        Returns: Json
      }
      delete_profile: { Args: { _perfil_id: string }; Returns: boolean }
      enviar_notificacao_concessionario: {
        Args: {
          _concessionario_id: string
          _mensagem: string
          _tipo?: string
          _titulo: string
        }
        Returns: Json
      }
      generate_demutran_protocol: { Args: { _prefix: string }; Returns: string }
      get_admin_profiles: {
        Args: { _setor_id?: string }
        Returns: {
          ativo: boolean
          created_at: string
          email: string
          modulos: Json
          nome: string
          nome_completo: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          perfil_id: string
          setor_id: string
          setor_nome: string
          setor_slug: string
          sobrenome: string
          user_id: string
        }[]
      }
      get_demutran_setor_id: { Args: never; Returns: string }
      get_manageable_setores: {
        Args: never
        Returns: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          slug: string
          updated_at: string
        }[]
      }
      get_user_profile: { Args: never; Returns: Json }
      has_legacy_admin: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_of_setor: { Args: { _setor_id: string }; Returns: boolean }
      is_gestor_setor: { Args: { _setor_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      liberar_veiculo_recolhido: {
        Args: {
          _data_liberacao?: string
          _numero_liberacao?: string
          _observacao?: string
          _situacao?: string
          _veiculo_id: string
        }
        Returns: {
          chassi: string | null
          created_at: string
          data_liberacao: string | null
          data_recolhimento: string
          descricao_veiculo: string
          id: string
          importado_planilha: boolean
          liberacao_registrada_no_sistema: boolean
          liberado_por: string | null
          local_custodia: Database["public"]["Enums"]["demutran_local_custodia"]
          motivo: string
          numero_liberacao: string | null
          observacao: string | null
          placa: string
          proprietario_cpf_cnpj: string | null
          proprietario_nome: string
          protocolo: string
          setor_id: string
          situacao: string
          status: string
          taxa_diaria: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "veiculos_recolhidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      listar_minhas_solicitacoes: {
        Args: { _session_token: string }
        Returns: Json
      }
      listar_notificacoes_concessionario: {
        Args: { _session_token: string }
        Returns: {
          created_at: string
          id: string
          lida_em: string
          mensagem: string
          tipo: string
          titulo: string
        }[]
      }
      marcar_notificacao_admin_lida: {
        Args: { _notificacao_id: string }
        Returns: boolean
      }
      marcar_notificacao_concessionario_lida: {
        Args: { _notificacao_id: string; _session_token: string }
        Returns: Json
      }
      marcar_todas_notificacoes_admin_lidas: { Args: never; Returns: number }
      obter_perfil_concessionario: {
        Args: { _session_token: string }
        Returns: Json
      }
      provision_admin_user:
        | {
            Args: {
              _active?: boolean
              _email: string
              _first_name: string
              _last_name: string
              _papel: Database["public"]["Enums"]["papel_usuario"]
              _password: string
              _setor_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _active?: boolean
              _email: string
              _first_name: string
              _last_name: string
              _modulos?: Json
              _papel: Database["public"]["Enums"]["papel_usuario"]
              _password: string
              _setor_id: string
            }
            Returns: Json
          }
      recolher_veiculo: {
        Args: {
          _ano?: string
          _bairro_apreensao?: string
          _chassi?: string
          _cor?: string
          _data_recolhimento?: string
          _descricao_veiculo?: string
          _envolvimento_acidente?: string
          _genero_condutor?: string
          _infrator_nome?: string
          _local_custodia?: Database["public"]["Enums"]["demutran_local_custodia"]
          _logradouro?: string
          _motivo?: string
          _modelo?: string
          _municipio?: string
          _observacao?: string
          _placa: string
          _proprietario_cpf_cnpj?: string
          _proprietario_nome: string
          _restricao_legal?: string
          _situacao?: string
        }
        Returns: {
          id: string
          protocolo: string
        }[]
      }
      registrar_usuario_externo: {
        Args: {
          _cpf: string
          _email?: string
          _nome_completo: string
          _senha: string
          _telefone?: string
          _tipo?: string
        }
        Returns: Json
      }
      set_setor_gestor: {
        Args: { _email: string; _setor_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfis_usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_profile: {
        Args: {
          _nome?: string
          _papel?: Database["public"]["Enums"]["papel_usuario"]
          _perfil_id: string
          _setor_id?: string
          _sobrenome?: string
        }
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_usuario"]
          setor_id: string | null
          sobrenome: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "perfis_usuarios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_profile_modulos: {
        Args: { _modulos: Json; _user_id: string }
        Returns: Json
      }
      validar_sessao_externa: {
        Args: { _session_token: string }
        Returns: {
          usuario: Json
          valido: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      demutran_concessionario_categoria:
        | "mototaxi"
        | "taxi"
        | "carro_horario"
        | "fretista"
      demutran_credencial_tipo: "idoso" | "pcd"
      demutran_local_custodia:
        | "automoveis"
        | "motos"
        | "motos_delegacia"
        | "veiculos_forum"
      demutran_recurso_tipo: "defesa_previa" | "jari"
      demutran_solicitacao_status:
        | "pendente"
        | "em_analise"
        | "aprovado"
        | "rejeitado"
        | "concluido"
      papel_usuario: "super_admin" | "gestor" | "admin_setor" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
      demutran_concessionario_categoria: [
        "mototaxi",
        "taxi",
        "carro_horario",
        "fretista",
      ],
      demutran_credencial_tipo: ["idoso", "pcd"],
      demutran_local_custodia: [
        "automoveis",
        "motos",
        "motos_delegacia",
        "veiculos_forum",
      ],
      demutran_recurso_tipo: ["defesa_previa", "jari"],
      demutran_solicitacao_status: [
        "pendente",
        "em_analise",
        "aprovado",
        "rejeitado",
        "concluido",
      ],
      papel_usuario: ["super_admin", "gestor", "admin_setor", "tecnico"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.107.0 (currently installed v2.62.10)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
