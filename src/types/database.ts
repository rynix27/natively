export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          country: string | null
          created_at: string
          crunchbase_url: string | null
          description: string | null
          founded_year: number | null
          id: string
          last_enriched_at: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          sector: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          crunchbase_url?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          sector?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          crunchbase_url?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          sector?: string | null
          website?: string | null
        }
        Relationships: []
      }
      funding_events: {
        Row: {
          amount: number | null
          announced_date: string | null
          company_id: string
          created_at: string
          headline: string
          id: string
          is_critical: boolean | null
          lead_investor: string | null
          round_type: string | null
          scraped_at: string | null
          source_url: string | null
        }
        Insert: {
          amount?: number | null
          announced_date?: string | null
          company_id: string
          created_at?: string
          headline: string
          id?: string
          is_critical?: boolean | null
          lead_investor?: string | null
          round_type?: string | null
          scraped_at?: string | null
          source_url?: string | null
        }
        Update: {
          amount?: number | null
          announced_date?: string | null
          company_id?: string
          created_at?: string
          headline?: string
          id?: string
          is_critical?: boolean | null
          lead_investor?: string | null
          round_type?: string | null
          scraped_at?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_signals: {
        Row: {
          company_id: string
          created_at: string
          detail: string | null
          detected_at: string | null
          headline: string
          id: string
          signal_type: string | null
          source_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          detail?: string | null
          detected_at?: string | null
          headline: string
          id?: string
          signal_type?: string | null
          source_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          detail?: string | null
          detected_at?: string | null
          headline?: string
          id?: string
          signal_type?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      news_events: {
        Row: {
          company_id: string
          created_at: string
          event_type: string | null
          headline: string
          id: string
          published_date: string | null
          scraped_at: string | null
          source_url: string | null
          summary: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          event_type?: string | null
          headline: string
          id?: string
          published_date?: string | null
          scraped_at?: string | null
          source_url?: string | null
          summary?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          event_type?: string | null
          headline?: string
          id?: string
          published_date?: string | null
          scraped_at?: string | null
          source_url?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_name: string
          created_at: string
          event_id: string | null
          event_type: string
          headline: string
          id: string
          is_read: boolean
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          event_id?: string | null
          event_type: string
          headline: string
          id?: string
          is_read?: boolean
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          event_id?: string | null
          event_type?: string
          headline?: string
          id?: string
          is_read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          added_at: string
          company_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          company_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          company_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
