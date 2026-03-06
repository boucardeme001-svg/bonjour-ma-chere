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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      comptes: {
        Row: {
          actif: boolean
          classe: number
          created_at: string
          id: string
          libelle: string
          nature: string
          numero: string
          parent_numero: string | null
          type: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          classe: number
          created_at?: string
          id?: string
          libelle: string
          nature: string
          numero: string
          parent_numero?: string | null
          type: string
          user_id: string
        }
        Update: {
          actif?: boolean
          classe?: number
          created_at?: string
          id?: string
          libelle?: string
          nature?: string
          numero?: string
          parent_numero?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ecritures: {
        Row: {
          created_at: string
          date_ecriture: string
          exercice_id: string
          id: string
          journal_id: string
          libelle: string
          numero_piece: string | null
          statut: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_ecriture: string
          exercice_id: string
          id?: string
          journal_id: string
          libelle: string
          numero_piece?: string | null
          statut?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_ecriture?: string
          exercice_id?: string
          id?: string
          journal_id?: string
          libelle?: string
          numero_piece?: string | null
          statut?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecritures_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecritures_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journaux"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices: {
        Row: {
          cloture: boolean
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          libelle: string
          user_id: string
        }
        Insert: {
          cloture?: boolean
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          libelle: string
          user_id: string
        }
        Update: {
          cloture?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          libelle?: string
          user_id?: string
        }
        Relationships: []
      }
      journaux: {
        Row: {
          code: string
          created_at: string
          id: string
          libelle: string
          type: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          libelle: string
          type: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      lignes_ecriture: {
        Row: {
          compte_id: string
          created_at: string
          credit: number
          debit: number
          ecriture_id: string
          id: string
          libelle: string | null
        }
        Insert: {
          compte_id: string
          created_at?: string
          credit?: number
          debit?: number
          ecriture_id: string
          id?: string
          libelle?: string | null
        }
        Update: {
          compte_id?: string
          created_at?: string
          credit?: number
          debit?: number
          ecriture_id?: string
          id?: string
          libelle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lignes_ecriture_compte_id_fkey"
            columns: ["compte_id"]
            isOneToOne: false
            referencedRelation: "comptes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_ecriture_ecriture_id_fkey"
            columns: ["ecriture_id"]
            isOneToOne: false
            referencedRelation: "ecritures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
