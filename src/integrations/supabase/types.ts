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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          chave: string
          updated_at: string
          valor: Json | null
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: Json | null
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json
          empresa_id: string
          id: string
          ip: string | null
          is_support_action: boolean
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json
          empresa_id: string
          id?: string
          ip?: string | null
          is_support_action?: boolean
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json
          empresa_id?: string
          id?: string
          ip?: string | null
          is_support_action?: boolean
          usuario_id?: string | null
        }
        Relationships: []
      }
      banco_horas: {
        Row: {
          id: string
          pin: string | null
          saldo: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          pin?: string | null
          saldo?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          pin?: string | null
          saldo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batidas: {
        Row: {
          empresa_id: string
          funcionario_id: string
          horario_utc: string | null
          id: string
          nsr: number
          tipo: string
        }
        Insert: {
          empresa_id: string
          funcionario_id: string
          horario_utc?: string | null
          id?: string
          nsr: number
          tipo: string
        }
        Update: {
          empresa_id?: string
          funcionario_id?: string
          horario_utc?: string | null
          id?: string
          nsr?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "batidas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batidas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      dados: {
        Row: {
          atualizado_em: string
          chave: string
          conta: string
          valor: Json | null
        }
        Insert: {
          atualizado_em?: string
          chave: string
          conta: string
          valor?: Json | null
        }
        Update: {
          atualizado_em?: string
          chave?: string
          conta?: string
          valor?: Json | null
        }
        Relationships: []
      }
      dev_config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      empregador: {
        Row: {
          atualizado_em: string
          dados: Json
          email_dono: string
        }
        Insert: {
          atualizado_em?: string
          dados?: Json
          email_dono: string
        }
        Update: {
          atualizado_em?: string
          dados?: Json
          email_dono?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          atualizado_em: string
          cei: string | null
          cnpj: string
          criado_em: string
          email: string | null
          fantasia: string | null
          id: string
          logo_base64: string | null
          nsr_atual: number
          razao: string | null
          razao_social: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          cei?: string | null
          cnpj: string
          criado_em?: string
          email?: string | null
          fantasia?: string | null
          id?: string
          logo_base64?: string | null
          nsr_atual?: number
          razao?: string | null
          razao_social: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          cei?: string | null
          cnpj?: string
          criado_em?: string
          email?: string | null
          fantasia?: string | null
          id?: string
          logo_base64?: string | null
          nsr_atual?: number
          razao?: string | null
          razao_social?: string
          user_id?: string
        }
        Relationships: []
      }
      escala: {
        Row: {
          dados: Json | null
          data: string | null
          depto: string | null
          dia: string | null
          email_dono: string | null
          folga: string | null
          func: string | null
          horario: string | null
          id: string
          pin: string | null
          semana: string | null
          tipo: string | null
          user_id: string | null
        }
        Insert: {
          dados?: Json | null
          data?: string | null
          depto?: string | null
          dia?: string | null
          email_dono?: string | null
          folga?: string | null
          func?: string | null
          horario?: string | null
          id?: string
          pin?: string | null
          semana?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Update: {
          dados?: Json | null
          data?: string | null
          depto?: string | null
          dia?: string | null
          email_dono?: string | null
          folga?: string | null
          func?: string | null
          horario?: string | null
          id?: string
          pin?: string | null
          semana?: string | null
          tipo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feriados: {
        Row: {
          conta: string
          dados: Json | null
          data: string
          nome: string
          tipo: string | null
        }
        Insert: {
          conta: string
          dados?: Json | null
          data: string
          nome: string
          tipo?: string | null
        }
        Update: {
          conta?: string
          dados?: Json | null
          data?: string
          nome?: string
          tipo?: string | null
        }
        Relationships: []
      }
      folha_access_tokens: {
        Row: {
          competencia: string
          created_at: string
          email_dono: string
          expires_at: string
          funcionario_pin: string
          id: string
          last_accessed_at: string | null
          revoked_at: string | null
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competencia: string
          created_at?: string
          email_dono: string
          expires_at: string
          funcionario_pin: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competencia?: string
          created_at?: string
          email_dono?: string
          expires_at?: string
          funcionario_pin?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      folhas: {
        Row: {
          ano: number | null
          dados: Json | null
          id: string
          mes: number | null
          pin: string | null
          user_id: string | null
        }
        Insert: {
          ano?: number | null
          dados?: Json | null
          id?: string
          mes?: number | null
          pin?: string | null
          user_id?: string | null
        }
        Update: {
          ano?: number | null
          dados?: Json | null
          id?: string
          mes?: number | null
          pin?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          criado_em: string
          dados: Json | null
          departamento: string | null
          depto: string | null
          email_dono: string | null
          empresa_id: string | null
          escala: string | null
          id: string
          inicio_vigencia_banco: string | null
          inicio_vigencia_banco_horas: string | null
          intervalo: Json | null
          jornada: Json | null
          nome: string
          pin: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          criado_em?: string
          dados?: Json | null
          departamento?: string | null
          depto?: string | null
          email_dono?: string | null
          empresa_id?: string | null
          escala?: string | null
          id?: string
          inicio_vigencia_banco?: string | null
          inicio_vigencia_banco_horas?: string | null
          intervalo?: Json | null
          jornada?: Json | null
          nome: string
          pin: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          criado_em?: string
          dados?: Json | null
          departamento?: string | null
          depto?: string | null
          email_dono?: string | null
          empresa_id?: string | null
          escala?: string | null
          id?: string
          inicio_vigencia_banco?: string | null
          inicio_vigencia_banco_horas?: string | null
          intervalo?: Json | null
          jornada?: Json | null
          nome?: string
          pin?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      gestor_vinculos: {
        Row: {
          created_at: string
          email_dono: string
          email_gestor: string
          funcao: string | null
          nome: string | null
        }
        Insert: {
          created_at?: string
          email_dono: string
          email_gestor: string
          funcao?: string | null
          nome?: string | null
        }
        Update: {
          created_at?: string
          email_dono?: string
          email_gestor?: string
          funcao?: string | null
          nome?: string | null
        }
        Relationships: []
      }
      licencas: {
        Row: {
          aceite_termos: Json | null
          created_at: string
          data_vencimento: string
          email_dono: string
          observacao: string | null
          plano: number
          status: string
          tipo_pagamento: string
          updated_at: string
          user_id: string | null
          valor_mensal: number | null
        }
        Insert: {
          aceite_termos?: Json | null
          created_at?: string
          data_vencimento?: string
          email_dono: string
          observacao?: string | null
          plano?: number
          status?: string
          tipo_pagamento?: string
          updated_at?: string
          user_id?: string | null
          valor_mensal?: number | null
        }
        Update: {
          aceite_termos?: Json | null
          created_at?: string
          data_vencimento?: string
          email_dono?: string
          observacao?: string | null
          plano?: number
          status?: string
          tipo_pagamento?: string
          updated_at?: string
          user_id?: string | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          acao: string
          criado_em: string
          email_dono: string
          id: string
          por: string | null
          quando: string
        }
        Insert: {
          acao: string
          criado_em?: string
          email_dono: string
          id?: string
          por?: string | null
          quando: string
        }
        Update: {
          acao?: string
          criado_em?: string
          email_dono?: string
          id?: string
          por?: string | null
          quando?: string
        }
        Relationships: []
      }
      marketing_site_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pontos: {
        Row: {
          criado_em: string
          dados: Json | null
          data: string | null
          email_dono: string
          hora: string | null
          id: string
          nsr: string
          origem: string | null
          pin: string | null
          timestamp: string | null
          tipo: string | null
        }
        Insert: {
          criado_em?: string
          dados?: Json | null
          data?: string | null
          email_dono: string
          hora?: string | null
          id?: string
          nsr: string
          origem?: string | null
          pin?: string | null
          timestamp?: string | null
          tipo?: string | null
        }
        Update: {
          criado_em?: string
          dados?: Json | null
          data?: string | null
          email_dono?: string
          hora?: string | null
          id?: string
          nsr?: string
          origem?: string | null
          pin?: string | null
          timestamp?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      support_sessions: {
        Row: {
          empresa_id: string
          empresa_nome: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string
          ip: string | null
          motivo: string
          super_admin_id: string
        }
        Insert: {
          empresa_id: string
          empresa_nome?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          ip?: string | null
          motivo?: string
          super_admin_id: string
        }
        Update: {
          empresa_id?: string
          empresa_nome?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          ip?: string | null
          motivo?: string
          super_admin_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      conta_gestor: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_ponto: {
        Args: { p_empresa_id: string; p_pin: string; p_tipo: string }
        Returns: Json
      }
      suporte_conta: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
