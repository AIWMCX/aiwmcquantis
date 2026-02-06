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
      doc_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          template_id: string
          template_json: Json
          tier: string | null
          updated_at: string | null
          usage_count: number | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_id: string
          template_json: Json
          tier?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_id?: string
          template_json?: Json
          tier?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_id: string
          error_message: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          idempotency_key: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format: string
          id?: string
          idempotency_key?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          idempotency_key?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_exports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          created_by: string | null
          document_id: string
          id: string
          snapshot_json: Json
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          id?: string
          snapshot_json: Json
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          id?: string
          snapshot_json?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          deleted_at: string | null
          document_json: Json
          id: string
          is_shared: boolean | null
          share_expires_at: string | null
          share_token: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          variables_data: Json | null
          version: number | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document_json: Json
          id?: string
          is_shared?: boolean | null
          share_expires_at?: string | null
          share_token?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          variables_data?: Json | null
          version?: number | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document_json?: Json
          id?: string
          is_shared?: boolean | null
          share_expires_at?: string | null
          share_token?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          variables_data?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_log: {
        Row: {
          id: string
          sent_at: string
          sequence_name: string
          step_number: number
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string
          sequence_name: string
          step_number: number
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string
          sequence_name?: string
          step_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          delay_hours: number
          id: string
          is_active: boolean
          sequence_name: string
          skip_if_conditions: Json | null
          step_number: number
          subject: string
          template_key: string
          trigger_condition: Json | null
        }
        Insert: {
          created_at?: string
          delay_hours: number
          id?: string
          is_active?: boolean
          sequence_name: string
          skip_if_conditions?: Json | null
          step_number: number
          subject: string
          template_key: string
          trigger_condition?: Json | null
        }
        Update: {
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          sequence_name?: string
          skip_if_conditions?: Json | null
          step_number?: number
          subject?: string
          template_key?: string
          trigger_condition?: Json | null
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          analysis_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_url: string | null
          id: string
          idempotency_key: string | null
          status: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          idempotency_key?: string | null
          status?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          idempotency_key?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_benchmarks: {
        Row: {
          additional_metrics: Json | null
          average_check_max: number | null
          average_check_min: number | null
          cac_max: number | null
          cac_min: number | null
          cac_typical: number | null
          churn_rate_annual: number | null
          churn_rate_monthly: number | null
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
          seasonality_coefficients: Json | null
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
          churn_rate_annual?: number | null
          churn_rate_monthly?: number | null
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
          seasonality_coefficients?: Json | null
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
          churn_rate_annual?: number | null
          churn_rate_monthly?: number | null
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
          seasonality_coefficients?: Json | null
          source?: string | null
          utilities_fixed?: number | null
        }
        Relationships: []
      }
      launch_checklists: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          industry_id: string
          phases: Json
          region_requirements: Json
          template_id: string
          template_name: string
          total_estimated_cost: number | null
          total_estimated_weeks: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          industry_id: string
          phases?: Json
          region_requirements?: Json
          template_id: string
          template_name: string
          total_estimated_cost?: number | null
          total_estimated_weeks?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          industry_id?: string
          phases?: Json
          region_requirements?: Json
          template_id?: string
          template_name?: string
          total_estimated_cost?: number | null
          total_estimated_weeks?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          conversion_type: string | null
          converted_at: string | null
          created_at: string | null
          email_encrypted: string
          email_hash: string | null
          id: string
          metadata: Json | null
          offer: string
          score: number | null
          source: string
          status: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string | null
          email_encrypted: string
          email_hash?: string | null
          id?: string
          metadata?: Json | null
          offer: string
          score?: number | null
          source: string
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string | null
          email_encrypted?: string
          email_hash?: string | null
          id?: string
          metadata?: Json | null
          offer?: string
          score?: number | null
          source?: string
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      location_data: {
        Row: {
          city: string
          city_id: string
          confidence_score: number | null
          country: string
          created_at: string
          currency_code: string
          currency_symbol: string
          id: string
          keywords: string[] | null
          last_updated: string
          locale_code: string
          market_maturity: number | null
          overall_cost_index: number
          primary_language: string
          region: string
          regulatory_complexity: number | null
          rent_multiplier: number
          salary_multiplier: number
          source: string | null
          tax_burden: number | null
          timezone: string
          utility_multiplier: number
        }
        Insert: {
          city: string
          city_id: string
          confidence_score?: number | null
          country: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          id?: string
          keywords?: string[] | null
          last_updated?: string
          locale_code?: string
          market_maturity?: number | null
          overall_cost_index?: number
          primary_language?: string
          region: string
          regulatory_complexity?: number | null
          rent_multiplier?: number
          salary_multiplier?: number
          source?: string | null
          tax_burden?: number | null
          timezone?: string
          utility_multiplier?: number
        }
        Update: {
          city?: string
          city_id?: string
          confidence_score?: number | null
          country?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          id?: string
          keywords?: string[] | null
          last_updated?: string
          locale_code?: string
          market_maturity?: number | null
          overall_cost_index?: number
          primary_language?: string
          region?: string
          regulatory_complexity?: number | null
          rent_multiplier?: number
          salary_multiplier?: number
          source?: string | null
          tax_burden?: number | null
          timezone?: string
          utility_multiplier?: number
        }
        Relationships: []
      }
      marketing_channels: {
        Row: {
          benchmarks_by_industry: Json
          best_practices: string[] | null
          channel_category: string
          channel_id: string
          channel_name: string
          common_mistakes: string[] | null
          confidence_score: number | null
          created_at: string
          id: string
          tools_recommended: string[] | null
        }
        Insert: {
          benchmarks_by_industry?: Json
          best_practices?: string[] | null
          channel_category: string
          channel_id: string
          channel_name: string
          common_mistakes?: string[] | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          tools_recommended?: string[] | null
        }
        Update: {
          benchmarks_by_industry?: Json
          best_practices?: string[] | null
          channel_category?: string
          channel_id?: string
          channel_name?: string
          common_mistakes?: string[] | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          tools_recommended?: string[] | null
        }
        Relationships: []
      }
      newsletter_sends: {
        Row: {
          created_at: string
          email_id: string | null
          id: string
          lead_id: string
          send_date: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          email_id?: string | null
          id?: string
          lead_id: string
          send_date: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          email_id?: string | null
          id?: string
          lead_id?: string
          send_date?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone_encrypted: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone_encrypted?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_encrypted?: string | null
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
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          total_clicks: number | null
          total_conversions: number | null
          total_rewards_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_rewards_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_rewards_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          clicked_at: string | null
          id: string
          ip_hash: string | null
          qualified_at: string | null
          referral_code_id: string
          referred_user_id: string | null
          reward_applied_at: string | null
          signed_up_at: string | null
          status: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          ip_hash?: string | null
          qualified_at?: string | null
          referral_code_id: string
          referred_user_id?: string | null
          reward_applied_at?: string | null
          signed_up_at?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          ip_hash?: string | null
          qualified_at?: string | null
          referral_code_id?: string
          referred_user_id?: string | null
          reward_applied_at?: string | null
          signed_up_at?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_conversions_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          applied_at: string | null
          conversion_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          reward_type: string
          reward_value: number
          status: string | null
          stripe_coupon_id: string | null
          stripe_promotion_code: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          conversion_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reward_type: string
          reward_value: number
          status?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          conversion_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reward_type?: string
          reward_value?: number
          status?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "referral_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_factors: {
        Row: {
          applicable_industries: string[] | null
          applicable_regions: string[] | null
          applicable_stages: string[] | null
          confidence_score: number | null
          created_at: string
          description: string
          financial_impact: string | null
          id: string
          mitigation_strategies: Json
          probability: number | null
          related_risks: string[] | null
          risk_category: string
          risk_id: string
          risk_name: string
          time_to_materialize: string | null
          warning_signs: string[] | null
        }
        Insert: {
          applicable_industries?: string[] | null
          applicable_regions?: string[] | null
          applicable_stages?: string[] | null
          confidence_score?: number | null
          created_at?: string
          description: string
          financial_impact?: string | null
          id?: string
          mitigation_strategies?: Json
          probability?: number | null
          related_risks?: string[] | null
          risk_category: string
          risk_id: string
          risk_name: string
          time_to_materialize?: string | null
          warning_signs?: string[] | null
        }
        Update: {
          applicable_industries?: string[] | null
          applicable_regions?: string[] | null
          applicable_stages?: string[] | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          financial_impact?: string | null
          id?: string
          mitigation_strategies?: Json
          probability?: number | null
          related_risks?: string[] | null
          risk_category?: string
          risk_id?: string
          risk_name?: string
          time_to_materialize?: string | null
          warning_signs?: string[] | null
        }
        Relationships: []
      }
      scenario_library: {
        Row: {
          business_context: Json
          business_type: string
          category: string
          confidence_score: number | null
          created_at: string
          difficulty_level: string | null
          expert_analysis: Json
          id: string
          industry_benchmarks: Json
          recommendations: Json
          scenario_id: string
          source: string | null
          subcategory: string | null
          tags: string[] | null
          urgency: string | null
          user_query: string
        }
        Insert: {
          business_context?: Json
          business_type: string
          category: string
          confidence_score?: number | null
          created_at?: string
          difficulty_level?: string | null
          expert_analysis?: Json
          id?: string
          industry_benchmarks?: Json
          recommendations?: Json
          scenario_id: string
          source?: string | null
          subcategory?: string | null
          tags?: string[] | null
          urgency?: string | null
          user_query: string
        }
        Update: {
          business_context?: Json
          business_type?: string
          category?: string
          confidence_score?: number | null
          created_at?: string
          difficulty_level?: string | null
          expert_analysis?: Json
          id?: string
          industry_benchmarks?: Json
          recommendations?: Json
          scenario_id?: string
          source?: string | null
          subcategory?: string | null
          tags?: string[] | null
          urgency?: string | null
          user_query?: string
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
      shared_reports: {
        Row: {
          analysis_id: string
          created_at: string | null
          expires_at: string
          id: string
          is_revoked: boolean | null
          token: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          token?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          token?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_audit_log: {
        Row: {
          created_at: string
          event_source: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_state: Json
          previous_state: Json | null
          reason: string | null
          stripe_event_id: string | null
          subscription_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_source: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state: Json
          previous_state?: Json | null
          reason?: string | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_source?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json
          previous_state?: Json | null
          reason?: string | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_audit_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
          token_hash: string | null
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
          token_hash?: string | null
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
          token_hash?: string | null
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
      user_engagement: {
        Row: {
          activity_score: number
          churn_risk_score: number
          created_at: string
          current_streak: number
          email_frequency: string
          engagement_tier: string
          id: string
          last_active_date: string | null
          last_digest_sent: string | null
          longest_streak: number
          milestones_achieved: Json
          total_analyses: number
          total_exports: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_score?: number
          churn_risk_score?: number
          created_at?: string
          current_streak?: number
          email_frequency?: string
          engagement_tier?: string
          id?: string
          last_active_date?: string | null
          last_digest_sent?: string | null
          longest_streak?: number
          milestones_achieved?: Json
          total_analyses?: number
          total_exports?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_score?: number
          churn_risk_score?: number
          created_at?: string
          current_streak?: number
          email_frequency?: string
          engagement_tier?: string
          id?: string
          last_active_date?: string | null
          last_digest_sent?: string | null
          longest_streak?: number
          milestones_achieved?: Json
          total_analyses?: number
          total_exports?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          expires_at: string | null
          icon: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      admin_force_sync_subscription: {
        Args: {
          p_plan_id: string
          p_reason: string
          p_status: string
          p_user_email: string
        }
        Returns: Json
      }
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
      can_access_pii: { Args: { target_user_id: string }; Returns: boolean }
      capture_lead: {
        Args: {
          p_email: string
          p_metadata?: Json
          p_offer: string
          p_source: string
        }
        Returns: string
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
      check_pii_access_rate: { Args: { p_user_id?: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_expired_shares: { Args: never; Returns: undefined }
      cleanup_old_anonymous_usage: { Args: never; Returns: undefined }
      cleanup_old_api_logs: { Args: never; Returns: undefined }
      cleanup_old_export_jobs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      complete_referral_signup: {
        Args: { p_conversion_id: string; p_referred_user_id: string }
        Returns: boolean
      }
      decrypt_pii: { Args: { encrypted_data: string }; Returns: string }
      detect_orphaned_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          has_profile: boolean
          has_subscription: boolean
          user_id: string
        }[]
      }
      encrypt_pii: { Args: { plain_text: string }; Returns: string }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_admin_metrics: {
        Args: never
        Returns: {
          free_users: number
          monthly_analyses: number
          monthly_signups: number
          plus_subscribers: number
          total_analyses: number
          total_users: number
          weekly_signups: number
        }[]
      }
      get_ai_learning_metrics: { Args: never; Returns: Json }
      get_daily_signups: {
        Args: { days_back?: number }
        Returns: {
          signup_count: number
          signup_date: string
        }[]
      }
      get_lead_email: { Args: { p_lead_id: string }; Returns: string }
      get_monthly_analyses: {
        Args: { months_back?: number }
        Returns: {
          analysis_count: number
          month_year: string
        }[]
      }
      get_my_phone: { Args: never; Returns: string }
      get_recent_users: {
        Args: { days_back?: number }
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          plan_id: string
          user_id: string
        }[]
      }
      get_referral_stats: { Args: { p_user_id: string }; Returns: Json }
      get_subscription_summary: { Args: { p_user_id?: string }; Returns: Json }
      get_todays_activity: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_new_today: boolean
          last_sign_in_at: string
          user_id: string
        }[]
      }
      get_user_engagement_stats: { Args: { p_user_id: string }; Returns: Json }
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
      increment_export_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { p_template_id: string }
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
      log_sensitive_access: {
        Args: {
          p_accessed_resource: string
          p_additional_data?: Json
          p_event_type: string
          p_resource_id?: string
        }
        Returns: undefined
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
      rotate_pii_encryption_key: { Args: never; Returns: Json }
      run_scheduled_cleanup: { Args: never; Returns: Json }
      track_referral_click: {
        Args: { p_code: string; p_ip_hash?: string; p_user_agent?: string }
        Returns: string
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
