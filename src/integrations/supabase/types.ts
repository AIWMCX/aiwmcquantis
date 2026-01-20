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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          documents: Json | null
          id: string
          idea: string
          location: string
          monthly_profit: number | null
          payback_months: number | null
          result: Json
          startup_investment: number | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          idea: string
          location: string
          monthly_profit?: number | null
          payback_months?: number | null
          result: Json
          startup_investment?: number | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          idea?: string
          location?: string
          monthly_profit?: number | null
          payback_months?: number | null
          result?: Json
          startup_investment?: number | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_usage: {
        Row: {
          created_at: string | null
          device_id: string
          fingerprint_hash: string | null
          id: string
          idea_hash: string
          ip_hash: string
          location_hash: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          fingerprint_hash?: string | null
          id?: string
          idea_hash: string
          ip_hash: string
          location_hash: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          fingerprint_hash?: string | null
          id?: string
          idea_hash?: string
          ip_hash?: string
          location_hash?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_hour: number | null
          scopes: string[] | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          latency_ms: number | null
          request_body: Json | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          request_body?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          request_body?: Json | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          company_name: string | null
          created_at: string | null
          footer_text: string | null
          header_text: string | null
          hide_quantis_branding: boolean | null
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          hide_quantis_branding?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          hide_quantis_branding?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      industry_benchmarks: {
        Row: {
          additional_metrics: Json | null
          average_check_max: number | null
          average_check_min: number | null
          cac_max: number | null
          cac_min: number | null
          cac_typical: number | null
          client_lifetime_months: number | null
          cogs_percent_avg: number | null
          cogs_percent_max: number | null
          cogs_percent_min: number | null
          competition_level: string | null
          confidence_score: number | null
          created_at: string | null
          gross_margin_avg: number | null
          gross_margin_max: number | null
          gross_margin_min: number | null
          growth_rate_percent: number | null
          id: string
          industry_id: string
          industry_name: string
          keywords: string[] | null
          last_updated: string | null
          ltv_cac_ratio_max: number | null
          ltv_cac_ratio_min: number | null
          ltv_max: number | null
          ltv_min: number | null
          ltv_typical: number | null
          market_size_usd: number | null
          net_margin_avg: number | null
          net_margin_max: number | null
          net_margin_min: number | null
          orders_per_client: number | null
          other_fixed: number | null
          region: string | null
          rent_fixed: number | null
          salaries_fixed: number | null
          sample_size: number | null
          source: string | null
          utilities_fixed: number | null
        }
        Insert: {
          additional_metrics?: Json | null
          average_check_max?: number | null
          average_check_min?: number | null
          cac_max?: number | null
          cac_min?: number | null
          cac_typical?: number | null
          client_lifetime_months?: number | null
          cogs_percent_avg?: number | null
          cogs_percent_max?: number | null
          cogs_percent_min?: number | null
          competition_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          gross_margin_avg?: number | null
          gross_margin_max?: number | null
          gross_margin_min?: number | null
          growth_rate_percent?: number | null
          id?: string
          industry_id: string
          industry_name: string
          keywords?: string[] | null
          last_updated?: string | null
          ltv_cac_ratio_max?: number | null
          ltv_cac_ratio_min?: number | null
          ltv_max?: number | null
          ltv_min?: number | null
          ltv_typical?: number | null
          market_size_usd?: number | null
          net_margin_avg?: number | null
          net_margin_max?: number | null
          net_margin_min?: number | null
          orders_per_client?: number | null
          other_fixed?: number | null
          region?: string | null
          rent_fixed?: number | null
          salaries_fixed?: number | null
          sample_size?: number | null
          source?: string | null
          utilities_fixed?: number | null
        }
        Update: {
          additional_metrics?: Json | null
          average_check_max?: number | null
          average_check_min?: number | null
          cac_max?: number | null
          cac_min?: number | null
          cac_typical?: number | null
          client_lifetime_months?: number | null
          cogs_percent_avg?: number | null
          cogs_percent_max?: number | null
          cogs_percent_min?: number | null
          competition_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          gross_margin_avg?: number | null
          gross_margin_max?: number | null
          gross_margin_min?: number | null
          growth_rate_percent?: number | null
          id?: string
          industry_id?: string
          industry_name?: string
          keywords?: string[] | null
          last_updated?: string | null
          ltv_cac_ratio_max?: number | null
          ltv_cac_ratio_min?: number | null
          ltv_max?: number | null
          ltv_min?: number | null
          ltv_typical?: number | null
          market_size_usd?: number | null
          net_margin_avg?: number | null
          net_margin_max?: number | null
          net_margin_min?: number | null
          orders_per_client?: number | null
          other_fixed?: number | null
          region?: string | null
          rent_fixed?: number | null
          salaries_fixed?: number | null
          sample_size?: number | null
          source?: string | null
          utilities_fixed?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: string
          team_id: string
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: string
          team_id: string
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: string
          team_id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          analyses_count: number
          created_at: string
          id: string
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses_count?: number
          created_at?: string
          id?: string
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses_count?: number
          created_at?: string
          id?: string
          month_year?: string
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      admin_metrics: {
        Row: {
          free_users: number | null
          monthly_analyses: number | null
          monthly_signups: number | null
          plus_subscribers: number | null
          total_analyses: number | null
          total_users: number | null
          weekly_signups: number | null
        }
        Relationships: []
      }
      subscriptions_public: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string | null
          plan_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit_rls_security: {
        Args: never
        Returns: {
          has_anon_deny: boolean
          policy_count: number
          rls_enabled: boolean
          rls_forced: boolean
          table_name: string
        }[]
      }
      check_anonymous_rate_limit:
        | {
            Args: {
              p_device_id: string
              p_device_limit?: number
              p_fingerprint_hash?: string
              p_fingerprint_limit?: number
              p_idea_hash: string
              p_ip_hash: string
              p_ip_limit?: number
              p_location_hash: string
              p_window_minutes?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_device_id: string
              p_device_limit?: number
              p_idea_hash: string
              p_ip_hash: string
              p_ip_limit?: number
              p_location_hash: string
              p_window_minutes?: number
            }
            Returns: Json
          }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: Json
      }
      cleanup_old_anonymous_usage: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      get_daily_signups: {
        Args: { days_back?: number }
        Returns: {
          signup_count: number
          signup_date: string
        }[]
      }
      get_monthly_analyses: {
        Args: { months_back?: number }
        Returns: {
          analyses_count: number
          month_year: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_api_key_usage: {
        Args: { p_key_id: string }
        Returns: undefined
      }
      increment_usage: {
        Args: { p_month_year: string; p_user_id: string }
        Returns: undefined
      }
      is_service_role: { Args: never; Returns: boolean }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      record_anonymous_usage:
        | {
            Args: {
              p_device_id: string
              p_idea_hash: string
              p_ip_hash: string
              p_location_hash: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_device_id: string
              p_fingerprint_hash?: string
              p_idea_hash: string
              p_ip_hash: string
              p_location_hash: string
            }
            Returns: undefined
          }
      user_owns_subscription: {
        Args: { subscription_user_id: string }
        Returns: boolean
      }
      verify_paid_subscription: { Args: { p_user_id: string }; Returns: string }
      verify_plus_subscription: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      verify_pro_subscription: { Args: { p_user_id: string }; Returns: boolean }
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
