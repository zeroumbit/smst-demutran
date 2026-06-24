// Tipos gerados manualmente baseados no esquema do banco de dados
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      contatos: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          ativo: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auditoria_logs: {
        Row: {
          id: string
          user_id: string | null
          setor_id: string | null
          entidade: string
          entidade_id: string | null
          acao: string
          payload_resumido: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          setor_id?: string | null
          entidade: string
          entidade_id?: string | null
          acao: string
          payload_resumido?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          setor_id?: string | null
          entidade?: string
          entidade_id?: string | null
          acao?: string
          payload_resumido?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      equipe: {
        Row: {
          id: string
          nome: string
          cargo: string
          setor: string | null
          setor_id: string | null
          email: string | null
          telefone: string | null
          ativo: boolean | null
          created_at: string | null
          updated_at: string | null
          pagina_destino: string | null
          foto: string | null
        }
        Insert: {
          id?: string
          nome: string
          cargo: string
          setor?: string | null
          setor_id?: string | null
          email?: string | null
          telefone?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          pagina_destino?: string | null
          foto?: string | null
        }
        Update: {
          id?: string
          nome?: string
          cargo?: string
          setor?: string | null
          setor_id?: string | null
          email?: string | null
          telefone?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          pagina_destino?: string | null
          foto?: string | null
        }
        Relationships: []
      }
      eventos: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          local: string | null
          data: string
          horario: string | null
          ativo: boolean | null
          setor_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          local?: string | null
          data: string
          horario?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          local?: string | null
          data?: string
          horario?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      galeria_fotos: {
        Row: {
          id: string
          url: string
          titulo: string
          descricao: string | null
          possui_link: boolean | null
          link_destino: string | null
          categoria: string | null
          ativo: boolean | null
          setor_id: string | null
          created_at: string | null
          updated_at: string | null
          pagina_exibicao: string | null
        }
        Insert: {
          id?: string
          url: string
          titulo: string
          descricao?: string | null
          possui_link?: boolean | null
          link_destino?: string | null
          categoria?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          pagina_exibicao?: string | null
        }
        Update: {
          id?: string
          url?: string
          titulo?: string
          descricao?: string | null
          possui_link?: boolean | null
          link_destino?: string | null
          categoria?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          pagina_exibicao?: string | null
        }
        Relationships: []
      }
      noticias: {
        Row: {
          id: string
          titulo: string
          resumo: string
          conteudo: string
          imagem: string | null
          ativo: boolean | null
          data: string | null
          setor_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          titulo: string
          resumo: string
          conteudo: string
          imagem?: string | null
          ativo?: boolean | null
          data?: string | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          titulo?: string
          resumo?: string
          conteudo?: string
          imagem?: string | null
          ativo?: boolean | null
          data?: string | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      paginas: {
        Row: {
          id: string
          nome: string
          titulo: string
          descricao: string | null
          ativo: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          titulo: string
          descricao?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          titulo?: string
          descricao?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      perfis_      admin_notifications: {
        Row: {
          id: string
          user_id: string
          titulo: string
          mensagem: string
          tipo: string
          link: string | null
          created_at: string
          lida_em: string | null
        }
        Insert: {
          id?: string
          user_id: string
          titulo: string
          mensagem: string
          tipo?: string
          link?: string | null
          created_at?: string
          lida_em?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          titulo?: string
          mensagem?: string
          tipo?: string
          link?: string | null
          created_at?: string
          lida_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios: {
        Row: {
          id: string
          user_id: string
          setor_id: string | null
          papel: Database['public']['Enums']['papel_usuario']
          nome: string | null
          sobrenome: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          setor_id?: string | null
          papel: Database['public']['Enums']['papel_usuario']
          nome?: string | null
          sobrenome?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          setor_id?: string | null
          papel?: Database['public']['Enums']['papel_usuario']
          nome?: string | null
          sobrenome?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          objetivo: string | null
          imagem: string | null
          ativo: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          objetivo?: string | null
          imagem?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          objetivo?: string | null
          imagem?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          id: string
          nome: string
          slug: string
          descricao: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          slug: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          slug?: string
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database['public']['Enums']['app_role']
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: Database['public']['Enums']['app_role']
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database['public']['Enums']['app_role']
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      veiculos_recolhidos: {
        Row: {
          id: string
          setor_id: string
          placa: string
          chassi: string | null
          descricao_veiculo: string
          proprietario_nome: string
          proprietario_cpf_cnpj: string | null
          data_recolhimento: string
          data_liberacao: string | null
          motivo: string
          status: string
          situacao: string
          local_custodia: Database['public']['Enums']['demutran_local_custodia']
          numero_liberacao: string | null
          taxa_diaria: number
          importado_planilha: boolean
          liberacao_registrada_no_sistema: boolean
          liberado_por: string | null
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setor_id: string
          placa: string
          chassi?: string | null
          descricao_veiculo?: string
          proprietario_nome: string
          proprietario_cpf_cnpj?: string | null
          data_recolhimento: string
          data_liberacao?: string | null
          motivo: string
          status?: string
          situacao?: string
          local_custodia?: Database['public']['Enums']['demutran_local_custodia']
          numero_liberacao?: string | null
          taxa_diaria?: number
          importado_planilha?: boolean
          liberacao_registrada_no_sistema?: boolean
          liberado_por?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setor_id?: string
          placa?: string
          chassi?: string | null
          descricao_veiculo?: string
          proprietario_nome?: string
          proprietario_cpf_cnpj?: string | null
          data_recolhimento?: string
          data_liberacao?: string | null
          motivo?: string
          status?: string
          situacao?: string
          local_custodia?: Database['public']['Enums']['demutran_local_custodia']
          numero_liberacao?: string | null
          taxa_diaria?: number
          importado_planilha?: boolean
          liberacao_registrada_no_sistema?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          arquivo_url: string
          local_exibicao: string | null
          ativo: boolean | null
          setor_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          arquivo_url: string
          local_exibicao?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          arquivo_url?: string
          local_exibicao?: string | null
          ativo?: boolean | null
          setor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contar_notificacoes_admin_nao_lidas: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      criar_notificacao_admin: {
        Args: {
          _user_id: string
          _titulo: string
          _mensagem: string
          _tipo?: string
          _link?: string | null
        }
        Returns: string
      }
      criar_notificacao_admins_setor: {
        Args: {
          _setor_id: string
          _titulo: string
          _mensagem: string
          _tipo?: string
          _link?: string | null
        }
        Returns: number
      }
      marcar_notificacao_admin_lida: {
        Args: {
          _notificacao_id: string
        }
        Returns: boolean
      }
      marcar_todas_notificacoes_admin_lidas: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      atualizar_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_manage_setor_content: {
        Args: {
          _setor_id: string
        }
        Returns: boolean
      }
      can_view_setor_content: {
        Args: {
          _setor_id: string
        }
        Returns: boolean
      }
      consultar_veiculo_recolhido: {
        Args: {
          _termo: string
        }
        Returns: {
          placa: string
          chassi: string | null
          proprietario_nome: string
          data_recolhimento: string
          data_liberacao: string | null
          motivo: string
          status: string
          setor_nome: string
        }[]
      }
      liberar_veiculo_recolhido: {
        Args: {
          _veiculo_id: string
          _data_liberacao?: string | null
          _numero_liberacao?: string | null
          _situacao?: string | null
          _observacao?: string | null
        }
        Returns: Database['public']['Tables']['veiculos_recolhidos']['Row']
      }
      assign_user_to_setor: {
        Args: {
          _email: string
          _setor_id: string
          _papel: Database['public']['Enums']['papel_usuario']
        }
        Returns: Database['public']['Tables']['perfis_usuarios']['Row']
      }
      deactivate_profile: {
        Args: {
          _perfil_id: string
        }
        Returns: Database['public']['Tables']['perfis_usuarios']['Row']
      }
      get_admin_profiles: {
        Args: {
          _setor_id?: string | null
        }
        Returns: {
          perfil_id: string
          user_id: string
          email: string
          nome: string
          sobrenome: string | null
          nome_completo: string
          setor_id: string | null
          setor_nome: string | null
          setor_slug: string | null
          papel: Database['public']['Enums']['papel_usuario']
          ativo: boolean
          created_at: string
        }[]
      }
      get_manageable_setores: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Tables']['setores']['Row'][]
      }
      get_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database['public']['Enums']['app_role']
        }
        Returns: boolean
      }
      is_admin_of_setor: {
        Args: {
          _setor_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_gestor_setor: {
        Args: {
          _setor_id: string
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_setor_gestor: {
        Args: {
          _email: string
          _setor_id: string
        }
        Returns: Database['public']['Tables']['perfis_usuarios']['Row']
      }
    }
    Enums: {
      app_role: "admin" | "user"
      demutran_local_custodia: "automoveis" | "motos" | "motos_delegacia" | "veiculos_forum"
      papel_usuario: "super_admin" | "gestor" | "admin_setor" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
