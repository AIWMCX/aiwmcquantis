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
  public: {
    Tables: {
      accuracy_runs: {
        Row: {
          commit_sha: string
          created_at: string
          dataset_version: string
          duration_ms: number | null
          engine_version: string
          error_code: string | null
          formula_registry_version: string
          id: number
          invariant_results: Json
          metric_results: Json
          output_hash: string | null
          passed: boolean
          run_date: string
          run_id: string
          seed: string | null
          vector_id: string
          worst_deviation_pct: number | null
        }
        Insert: {
          commit_sha: string
          created_at?: string
          dataset_version: string
          duration_ms?: number | null
          engine_version: string
          error_code?: string | null
          formula_registry_version: string
          id?: never
          invariant_results: Json
          metric_results: Json
          output_hash?: string | null
          passed: boolean
          run_date?: string
          run_id?: string
          seed?: string | null
          vector_id: string
          worst_deviation_pct?: number | null
        }
        Update: {
          commit_sha?: string
          created_at?: string
          dataset_version?: string
          duration_ms?: number | null
          engine_version?: string
          error_code?: string | null
          formula_registry_version?: string
          id?: never
          invariant_results?: Json
          metric_results?: Json
          output_hash?: string | null
          passed?: boolean
          run_date?: string
          run_id?: string
          seed?: string | null
          vector_id?: string
          worst_deviation_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accuracy_runs_vector_id_fkey"
            columns: ["vector_id"]
            isOneToOne: false
            referencedRelation: "golden_test_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_events: {
        Row: {
          created_at: string
          event_type: string
          event_value: number
          id: string
          metadata: Json
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          event_value?: number
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          event_value?: number
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_calls: {
        Row: {
          analysis_id: string | null
          cost_usd: number
          created_at: string
          error: string | null
          id: string
          input_tokens: number
          latency_ms: number
          metadata: Json | null
          model: string
          ok: boolean
          output_tokens: number
          provider: string
          repair_attempted: boolean | null
          request_id: string | null
          retry_count: number | null
          status: string
          task: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          metadata?: Json | null
          model: string
          ok?: boolean
          output_tokens?: number
          provider: string
          repair_attempted?: boolean | null
          request_id?: string | null
          retry_count?: number | null
          status?: string
          task: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          metadata?: Json | null
          model?: string
          ok?: boolean
          output_tokens?: number
          provider?: string
          repair_attempted?: boolean | null
          request_id?: string | null
          retry_count?: number | null
          status?: string
          task?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_calls_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_calls_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analyses: {
        Row: {
          analysis_correlation_id: string | null
          confidence_score: number | null
          created_at: string | null
          depth: string | null
          documents: Json | null
          id: string
          idea: string
          idempotency_key: string | null
          location: string
          monthly_profit: number | null
          origin_scenario_run_id: string | null
          parent_analysis_id: string | null
          payback_months: number | null
          result: Json
          rvce_latency_ms: number | null
          rvce_observation_count: number | null
          rvce_status: string | null
          rvce_tavily_queries: number | null
          scenario_base_input: Json | null
          startup_investment: number | null
          team_id: string | null
          tier_at_creation: string | null
          user_id: string
        }
        Insert: {
          analysis_correlation_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          id?: string
          idea: string
          idempotency_key?: string | null
          location: string
          monthly_profit?: number | null
          origin_scenario_run_id?: string | null
          parent_analysis_id?: string | null
          payback_months?: number | null
          result: Json
          rvce_latency_ms?: number | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          rvce_tavily_queries?: number | null
          scenario_base_input?: Json | null
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
          user_id: string
        }
        Update: {
          analysis_correlation_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          id?: string
          idea?: string
          idempotency_key?: string | null
          location?: string
          monthly_profit?: number | null
          origin_scenario_run_id?: string | null
          parent_analysis_id?: string | null
          payback_months?: number | null
          result?: Json
          rvce_latency_ms?: number | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          rvce_tavily_queries?: number | null
          scenario_base_input?: Json | null
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_origin_scenario_run_id_fkey"
            columns: ["origin_scenario_run_id"]
            isOneToOne: false
            referencedRelation: "scenario_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_parent_analysis_id_fkey"
            columns: ["parent_analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_parent_analysis_id_fkey"
            columns: ["parent_analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
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
      analysis_attempts: {
        Row: {
          claude_attempts: number
          completed_at: string | null
          created_at: string
          degraded: boolean
          id: string
          idempotency_key: string
          identity_key: string
          latency_ms: number | null
          reason: string | null
          result_json: Json | null
          status: string
          tier: string
        }
        Insert: {
          claude_attempts?: number
          completed_at?: string | null
          created_at?: string
          degraded?: boolean
          id?: string
          idempotency_key: string
          identity_key: string
          latency_ms?: number | null
          reason?: string | null
          result_json?: Json | null
          status?: string
          tier?: string
        }
        Update: {
          claude_attempts?: number
          completed_at?: string | null
          created_at?: string
          degraded?: boolean
          id?: string
          idempotency_key?: string
          identity_key?: string
          latency_ms?: number | null
          reason?: string | null
          result_json?: Json | null
          status?: string
          tier?: string
        }
        Relationships: []
      }
      analysis_cases: {
        Row: {
          analysis_id: string | null
          assumption_graph: Json | null
          benchmark_version: string | null
          confidence_score: number | null
          created_at: string | null
          engine_version: string
          id: string
          industry_id: string
          input_snapshot: Json
          location: string
          output_snapshot: Json
          sanity_flags: Json | null
          user_corrections: Json | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          assumption_graph?: Json | null
          benchmark_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          engine_version: string
          id?: string
          industry_id: string
          input_snapshot: Json
          location: string
          output_snapshot: Json
          sanity_flags?: Json | null
          user_corrections?: Json | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          assumption_graph?: Json | null
          benchmark_version?: string | null
          confidence_score?: number | null
          created_at?: string | null
          engine_version?: string
          id?: string
          industry_id?: string
          input_snapshot?: Json
          location?: string
          output_snapshot?: Json
          sanity_flags?: Json | null
          user_corrections?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      analysis_complete_events: {
        Row: {
          analysis_id: string | null
          benchmark_match_type: string | null
          cost_usd: number | null
          created_at: string
          degraded: boolean
          id: number
          layer_latency_ms: Json
          ok: boolean
          reason: string | null
          rvce_observation_count: number | null
          rvce_status: string | null
          tier: string
          tokens_input: number | null
          tokens_output: number | null
          total_latency_ms: number | null
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          benchmark_match_type?: string | null
          cost_usd?: number | null
          created_at?: string
          degraded?: boolean
          id?: number
          layer_latency_ms?: Json
          ok: boolean
          reason?: string | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          tier: string
          tokens_input?: number | null
          tokens_output?: number | null
          total_latency_ms?: number | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          benchmark_match_type?: string | null
          cost_usd?: number | null
          created_at?: string
          degraded?: boolean
          id?: number
          layer_latency_ms?: Json
          ok?: boolean
          reason?: string | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          tier?: string
          tokens_input?: number | null
          tokens_output?: number | null
          total_latency_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_complete_events_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_complete_events_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_complete_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_complete_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_complete_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          depth_requested: string
          depth_used: string | null
          error_code: string | null
          error_message: string | null
          failed_step: string | null
          fell_back_from: string | null
          id: string
          input_snapshot: Json
          request_id: string
          result: Json | null
          started_at: string | null
          status: string
          step_timings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          depth_requested: string
          depth_used?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_step?: string | null
          fell_back_from?: string | null
          id?: string
          input_snapshot: Json
          request_id: string
          result?: Json | null
          started_at?: string | null
          status?: string
          step_timings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          depth_requested?: string
          depth_used?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_step?: string | null
          fell_back_from?: string | null
          id?: string
          input_snapshot?: Json
          request_id?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          step_timings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_outcome_schedule: {
        Row: {
          analysis_id: string
          checkpoint_months: number
          created_at: string
          due_at: string
          id: number
          prompt_sent_at: string | null
          responded_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          checkpoint_months: number
          created_at?: string
          due_at: string
          id?: number
          prompt_sent_at?: string | null
          responded_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          checkpoint_months?: number
          created_at?: string
          due_at?: string
          id?: number
          prompt_sent_at?: string | null
          responded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_outcome_schedule_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcome_schedule_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcome_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcome_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcome_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analysis_outcomes: {
        Row: {
          actual_customers: number | null
          actual_mrr: number | null
          actual_net_profit: number | null
          analysis_id: string
          business_status: string
          checkpoint_months: number
          created_at: string
          id: number
          schedule_id: number
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          actual_customers?: number | null
          actual_mrr?: number | null
          actual_net_profit?: number | null
          analysis_id: string
          business_status: string
          checkpoint_months: number
          created_at?: string
          id?: number
          schedule_id: number
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          actual_customers?: number | null
          actual_mrr?: number | null
          actual_net_profit?: number | null
          analysis_id?: string
          business_status?: string
          checkpoint_months?: number
          created_at?: string
          id?: number
          schedule_id?: number
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_outcomes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcomes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcomes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: true
            referencedRelation: "analysis_outcome_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analysis_snapshots: {
        Row: {
          analysis_id: string | null
          cac_payback: Json | null
          correlation_id: string
          created_at: string
          dataset_version: string | null
          engine_version: string
          formula_registry_version: string
          id: number
          input_hash: string
          investment_payback: Json
          numeric_output_hash: string
          user_id: string | null
          validation_issues: Json
          validation_status: string
        }
        Insert: {
          analysis_id?: string | null
          cac_payback?: Json | null
          correlation_id: string
          created_at?: string
          dataset_version?: string | null
          engine_version: string
          formula_registry_version: string
          id?: number
          input_hash: string
          investment_payback: Json
          numeric_output_hash: string
          user_id?: string | null
          validation_issues?: Json
          validation_status: string
        }
        Update: {
          analysis_id?: string | null
          cac_payback?: Json | null
          correlation_id?: string
          created_at?: string
          dataset_version?: string | null
          engine_version?: string
          formula_registry_version?: string
          id?: number
          input_hash?: string
          investment_payback?: Json
          numeric_output_hash?: string
          user_id?: string | null
          validation_issues?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
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
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      autoposter_analytics_weekly: {
        Row: {
          app_visits: number | null
          created_at: string
          fb_ig_engagements: number | null
          fb_ig_reach: number | null
          id: string
          li_engagement_pct: number | null
          linkedin_impressions: number | null
          mrr_usd: number | null
          notes: string | null
          paid_conversions: number | null
          period_end: string
          period_start: string
          reddit_upvotes: number | null
          signups: number | null
          social_traffic_pct: number | null
          top_post_id: string | null
          website_visitors: number | null
          week_number: number | null
        }
        Insert: {
          app_visits?: number | null
          created_at?: string
          fb_ig_engagements?: number | null
          fb_ig_reach?: number | null
          id?: string
          li_engagement_pct?: number | null
          linkedin_impressions?: number | null
          mrr_usd?: number | null
          notes?: string | null
          paid_conversions?: number | null
          period_end: string
          period_start: string
          reddit_upvotes?: number | null
          signups?: number | null
          social_traffic_pct?: number | null
          top_post_id?: string | null
          website_visitors?: number | null
          week_number?: number | null
        }
        Update: {
          app_visits?: number | null
          created_at?: string
          fb_ig_engagements?: number | null
          fb_ig_reach?: number | null
          id?: string
          li_engagement_pct?: number | null
          linkedin_impressions?: number | null
          mrr_usd?: number | null
          notes?: string | null
          paid_conversions?: number | null
          period_end?: string
          period_start?: string
          reddit_upvotes?: number | null
          signups?: number | null
          social_traffic_pct?: number | null
          top_post_id?: string | null
          website_visitors?: number | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "autoposter_analytics_weekly_top_post_id_fkey"
            columns: ["top_post_id"]
            isOneToOne: false
            referencedRelation: "autoposter_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      autoposter_credentials: {
        Row: {
          access_token_secret_id: string | null
          account_id: string | null
          id: string
          is_active: boolean
          last_tested: string | null
          page_id: string | null
          platform: string
          refresh_token_secret_id: string | null
          token_expires: string | null
          updated_at: string
        }
        Insert: {
          access_token_secret_id?: string | null
          account_id?: string | null
          id?: string
          is_active?: boolean
          last_tested?: string | null
          page_id?: string | null
          platform: string
          refresh_token_secret_id?: string | null
          token_expires?: string | null
          updated_at?: string
        }
        Update: {
          access_token_secret_id?: string | null
          account_id?: string | null
          id?: string
          is_active?: boolean
          last_tested?: string | null
          page_id?: string | null
          platform?: string
          refresh_token_secret_id?: string | null
          token_expires?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      autoposter_oauth_state: {
        Row: {
          code_verifier: string | null
          created_at: string
          platform: string
          redirect_uri: string | null
          state: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          platform: string
          redirect_uri?: string | null
          state: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          platform?: string
          redirect_uri?: string | null
          state?: string
        }
        Relationships: []
      }
      autoposter_post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          engagement_rate: number | null
          fetched_at: string
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_platform_id: string
          reach: number | null
          saves: number | null
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_platform_id: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_platform_id?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "autoposter_post_analytics_post_platform_id_fkey"
            columns: ["post_platform_id"]
            isOneToOne: false
            referencedRelation: "autoposter_post_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      autoposter_post_platforms: {
        Row: {
          best_time_mt: string | null
          content: string
          created_at: string
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          post_id: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          best_time_mt?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          post_id: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          best_time_mt?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoposter_post_platforms_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "autoposter_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      autoposter_posts: {
        Row: {
          asset_alt: string | null
          asset_path: string | null
          content_brief: string
          created_at: string
          cta: string | null
          day_number: number | null
          expected_reach: string | null
          hashtags: string[] | null
          hook: string
          id: string
          notes: string | null
          post_date: string
          post_type: string | null
          status: string
          updated_at: string
          visual_type: string | null
          week_number: number | null
        }
        Insert: {
          asset_alt?: string | null
          asset_path?: string | null
          content_brief: string
          created_at?: string
          cta?: string | null
          day_number?: number | null
          expected_reach?: string | null
          hashtags?: string[] | null
          hook: string
          id?: string
          notes?: string | null
          post_date: string
          post_type?: string | null
          status?: string
          updated_at?: string
          visual_type?: string | null
          week_number?: number | null
        }
        Update: {
          asset_alt?: string | null
          asset_path?: string | null
          content_brief?: string
          created_at?: string
          cta?: string | null
          day_number?: number | null
          expected_reach?: string | null
          hashtags?: string[] | null
          hook?: string
          id?: string
          notes?: string | null
          post_date?: string
          post_type?: string | null
          status?: string
          updated_at?: string
          visual_type?: string | null
          week_number?: number | null
        }
        Relationships: []
      }
      autoposter_publishing_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          id: string
          post_platform_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          post_platform_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          post_platform_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoposter_publishing_logs_post_platform_id_fkey"
            columns: ["post_platform_id"]
            isOneToOne: false
            referencedRelation: "autoposter_post_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_master_core: {
        Row: {
          business_model: string | null
          city_tier: string | null
          company_stage: string | null
          country: string | null
          days_payable: number | null
          days_receivable: number | null
          ebitda_margin_p50: number | null
          geo_region: string | null
          gm_margin_p25: number | null
          gm_margin_p50: number | null
          gm_margin_p75: number | null
          id: number
          inventory_turnover: number | null
          marketing_pct_rev_p50: number | null
          op_margin_p50: number | null
          payroll_pct_rev_p50: number | null
          rent_pct_rev_p50: number | null
          revenue_growth_yoy_p50: number | null
          revenue_volatility: number | null
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          days_payable?: number | null
          days_receivable?: number | null
          ebitda_margin_p50?: number | null
          geo_region?: string | null
          gm_margin_p25?: number | null
          gm_margin_p50?: number | null
          gm_margin_p75?: number | null
          id?: number
          inventory_turnover?: number | null
          marketing_pct_rev_p50?: number | null
          op_margin_p50?: number | null
          payroll_pct_rev_p50?: number | null
          rent_pct_rev_p50?: number | null
          revenue_growth_yoy_p50?: number | null
          revenue_volatility?: number | null
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          days_payable?: number | null
          days_receivable?: number | null
          ebitda_margin_p50?: number | null
          geo_region?: string | null
          gm_margin_p25?: number | null
          gm_margin_p50?: number | null
          gm_margin_p75?: number | null
          id?: number
          inventory_turnover?: number | null
          marketing_pct_rev_p50?: number | null
          op_margin_p50?: number | null
          payroll_pct_rev_p50?: number | null
          rent_pct_rev_p50?: number | null
          revenue_growth_yoy_p50?: number | null
          revenue_volatility?: number | null
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Relationships: []
      }
      benchmark_master_geo: {
        Row: {
          business_model: string | null
          city_tier: string | null
          company_stage: string | null
          consumer_spend_index: number | null
          cost_of_living_index: number | null
          country: string | null
          geo_region: string | null
          id: number
          rent_multiplier: number | null
          sector_level1: string | null
          sector_level2: string | null
          size_bucket: string | null
          wage_multiplier: number | null
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country?: string | null
          geo_region?: string | null
          id?: number
          rent_multiplier?: number | null
          sector_level1?: string | null
          sector_level2?: string | null
          size_bucket?: string | null
          wage_multiplier?: number | null
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country?: string | null
          geo_region?: string | null
          id?: number
          rent_multiplier?: number | null
          sector_level1?: string | null
          sector_level2?: string | null
          size_bucket?: string | null
          wage_multiplier?: number | null
        }
        Relationships: []
      }
      benchmark_master_invoice: {
        Row: {
          avg_invoice_terms_days: number | null
          bad_debt_pct_rev: number | null
          business_model: string | null
          city_tier: string | null
          company_stage: string | null
          country: string | null
          geo_region: string | null
          id: number
          late_payment_rate: number | null
          max_safe_invoice_to_rev_ratio: number | null
          safe_dscr_threshold: number | null
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
        }
        Insert: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          geo_region?: string | null
          id?: number
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Update: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          geo_region?: string | null
          id?: number
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Relationships: []
      }
      benchmark_master_risk: {
        Row: {
          business_model: string | null
          city_tier: string | null
          company_stage: string | null
          country: string | null
          failure_mode_1: string | null
          failure_mode_2: string | null
          failure_mode_3: string | null
          geo_region: string | null
          id: number
          median_survival_years: number | null
          risk_customer_concentration: number | null
          risk_market_volatility: number | null
          risk_operational: number | null
          risk_regulatory: number | null
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          geo_region?: string | null
          id?: number
          median_survival_years?: number | null
          risk_customer_concentration?: number | null
          risk_market_volatility?: number | null
          risk_operational?: number | null
          risk_regulatory?: number | null
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          geo_region?: string | null
          id?: number
          median_survival_years?: number | null
          risk_customer_concentration?: number | null
          risk_market_volatility?: number | null
          risk_operational?: number | null
          risk_regulatory?: number | null
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Relationships: []
      }
      benchmark_master_unit_econ: {
        Row: {
          arpu_median: number | null
          business_model: string | null
          cac_p25: number | null
          cac_p50: number | null
          cac_p75: number | null
          cac_payback_p25: number | null
          cac_payback_p50: number | null
          cac_payback_p75: number | null
          churn_monthly_p25: number | null
          churn_monthly_p50: number | null
          churn_monthly_p75: number | null
          city_tier: string | null
          company_stage: string | null
          country: string | null
          geo_region: string | null
          id: number
          ltv_cac_ratio_p25: number | null
          ltv_cac_ratio_p50: number | null
          ltv_cac_ratio_p75: number | null
          ltv_p25: number | null
          ltv_p50: number | null
          ltv_p75: number | null
          retention_12m: number | null
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
        }
        Insert: {
          arpu_median?: number | null
          business_model?: string | null
          cac_p25?: number | null
          cac_p50?: number | null
          cac_p75?: number | null
          cac_payback_p25?: number | null
          cac_payback_p50?: number | null
          cac_payback_p75?: number | null
          churn_monthly_p25?: number | null
          churn_monthly_p50?: number | null
          churn_monthly_p75?: number | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          geo_region?: string | null
          id?: number
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Update: {
          arpu_median?: number | null
          business_model?: string | null
          cac_p25?: number | null
          cac_p50?: number | null
          cac_p75?: number | null
          cac_payback_p25?: number | null
          cac_payback_p50?: number | null
          cac_payback_p75?: number | null
          churn_monthly_p25?: number | null
          churn_monthly_p50?: number | null
          churn_monthly_p75?: number | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          geo_region?: string | null
          id?: number
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "branding_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calibration_metrics: {
        Row: {
          archetype: string
          baseline_comparison: Json
          bias: number | null
          brier_score: number | null
          cohort_end: string
          cohort_start: string
          dataset_version: string
          engine_version: string
          evaluated_at: string
          horizon_months: number
          id: number
          interval_coverage_p80: number | null
          interval_coverage_p90: number | null
          mae: number | null
          mape: number | null
          metric_code: string
          sample_size: number
          wape: number | null
        }
        Insert: {
          archetype: string
          baseline_comparison: Json
          bias?: number | null
          brier_score?: number | null
          cohort_end: string
          cohort_start: string
          dataset_version: string
          engine_version: string
          evaluated_at?: string
          horizon_months: number
          id?: never
          interval_coverage_p80?: number | null
          interval_coverage_p90?: number | null
          mae?: number | null
          mape?: number | null
          metric_code: string
          sample_size: number
          wape?: number | null
        }
        Update: {
          archetype?: string
          baseline_comparison?: Json
          bias?: number | null
          brier_score?: number | null
          cohort_end?: string
          cohort_start?: string
          dataset_version?: string
          engine_version?: string
          evaluated_at?: string
          horizon_months?: number
          id?: never
          interval_coverage_p80?: number | null
          interval_coverage_p90?: number | null
          mae?: number | null
          mape?: number | null
          metric_code?: string
          sample_size?: number
          wape?: number | null
        }
        Relationships: []
      }
      content_studio_generations: {
        Row: {
          angle: string | null
          audience: string | null
          created_at: string
          created_by: string
          cta: string | null
          emoji_enabled: boolean
          hashtags_enabled: boolean
          id: string
          language: string
          length: string | null
          meta: Json
          model: string | null
          platforms: string[]
          tone: string | null
          topic: string
          variants: Json
        }
        Insert: {
          angle?: string | null
          audience?: string | null
          created_at?: string
          created_by: string
          cta?: string | null
          emoji_enabled?: boolean
          hashtags_enabled?: boolean
          id?: string
          language?: string
          length?: string | null
          meta?: Json
          model?: string | null
          platforms?: string[]
          tone?: string | null
          topic: string
          variants?: Json
        }
        Update: {
          angle?: string | null
          audience?: string | null
          created_at?: string
          created_by?: string
          cta?: string | null
          emoji_enabled?: boolean
          hashtags_enabled?: boolean
          id?: string
          language?: string
          length?: string | null
          meta?: Json
          model?: string | null
          platforms?: string[]
          tone?: string | null
          topic?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_studio_generations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_studio_generations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_studio_generations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      data_provenance: {
        Row: {
          coverage_description: string | null
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          id: string
          license_type: string
          record_count: number | null
          source_name: string
          source_url: string | null
        }
        Insert: {
          coverage_description?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          license_type: string
          record_count?: number | null
          source_name: string
          source_url?: string | null
        }
        Update: {
          coverage_description?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          license_type?: string
          record_count?: number | null
          source_name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      dataset_releases: {
        Row: {
          approved_by: string
          dataset_version: string
          geography_coverage: Json
          license_manifest: Json
          modeled_cell_count: number
          observation_count: number
          quality_report: Json
          released_at: string
          row_count: number
          source_manifest_hash: string
          temporal_cutoff: string
          transform_code_sha: string
        }
        Insert: {
          approved_by: string
          dataset_version: string
          geography_coverage: Json
          license_manifest: Json
          modeled_cell_count: number
          observation_count: number
          quality_report: Json
          released_at: string
          row_count: number
          source_manifest_hash: string
          temporal_cutoff: string
          transform_code_sha: string
        }
        Update: {
          approved_by?: string
          dataset_version?: string
          geography_coverage?: Json
          license_manifest?: Json
          modeled_cell_count?: number
          observation_count?: number
          quality_report?: Json
          released_at?: string
          row_count?: number
          source_manifest_hash?: string
          temporal_cutoff?: string
          transform_code_sha?: string
        }
        Relationships: []
      }
      doc_performance_signals: {
        Row: {
          context: Json | null
          created_at: string
          document_id: string | null
          id: string
          signal_type: string
          signal_value: number | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          document_id?: string | null
          id?: string
          signal_type: string
          signal_value?: number | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          document_id?: string | null
          id?: string
          signal_type?: string
          signal_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_performance_signals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_performance_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_performance_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_performance_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      doc_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          template_id: string
          template_json: Json
          tier: string
          updated_at: string
          usage_count: number
          version: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_id: string
          template_json?: Json
          tier: string
          updated_at?: string
          usage_count?: number
          version?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_id?: string
          template_json?: Json
          tier?: string
          updated_at?: string
          usage_count?: number
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_downloads: {
        Row: {
          download_format: string
          downloaded_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          download_format: string
          downloaded_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          download_format?: string
          downloaded_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string | null
          error_message: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          idempotency_key: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format: string
          id?: string
          idempotency_key?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          idempotency_key?: string | null
          status?: string
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
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          snapshot_json: Json
          user_id: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          snapshot_json: Json
          user_id: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          snapshot_json?: Json
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documents: {
        Row: {
          analysis_id: string | null
          created_at: string
          deleted_at: string | null
          document_json: Json
          id: string
          is_shared: boolean
          share_expires_at: string | null
          share_token: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
          variables_data: Json
          version: number
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_json?: Json
          id?: string
          is_shared?: boolean
          share_expires_at?: string | null
          share_token?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          variables_data?: Json
          version?: number
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_json?: Json
          id?: string
          is_shared?: boolean
          share_expires_at?: string | null
          share_token?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          variables_data?: Json
          version?: number
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
            foreignKeyName: "documents_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
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
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_engagement: {
        Row: {
          created_at: string | null
          email_send_log_id: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          email_send_log_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          email_send_log_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          email: string
          id: string
          lead_id: string | null
          resend_id: string | null
          sent_at: string
          template_key: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          lead_id?: string | null
          resend_id?: string | null
          sent_at?: string
          template_key: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          lead_id?: string | null
          resend_id?: string | null
          sent_at?: string
          template_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      entitlement_denials: {
        Row: {
          created_at: string
          feature: string
          id: string
          metadata: Json | null
          path: string | null
          tier: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          metadata?: Json | null
          path?: string | null
          tier: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_denials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_denials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_denials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          analysis_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_url: string | null
          filename: string | null
          id: string
          idempotency_key: string | null
          kind: string | null
          status: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          filename?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string | null
          status?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          filename?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_invariant_sweep_runs: {
        Row: {
          applied_count: number
          created_at: string
          engine_version: string | null
          environment: string
          failure_summary: string | null
          finished_at: string | null
          id: number
          malformed_count: number
          mode: string
          run_at: string
          scanned_count: number
          status: string
          violation_categories: Json
          violation_count: number
          violation_ids: Json
        }
        Insert: {
          applied_count?: number
          created_at?: string
          engine_version?: string | null
          environment?: string
          failure_summary?: string | null
          finished_at?: string | null
          id?: never
          malformed_count?: number
          mode: string
          run_at?: string
          scanned_count?: number
          status?: string
          violation_categories?: Json
          violation_count?: number
          violation_ids?: Json
        }
        Update: {
          applied_count?: number
          created_at?: string
          engine_version?: string | null
          environment?: string
          failure_summary?: string | null
          finished_at?: string | null
          id?: never
          malformed_count?: number
          mode?: string
          run_at?: string
          scanned_count?: number
          status?: string
          violation_categories?: Json
          violation_count?: number
          violation_ids?: Json
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json
          path: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          path?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      golden_test_vectors: {
        Row: {
          active: boolean
          archetype: string
          created_at: string
          evidence_urls: Json
          expected_invariants: Json
          expected_ranges: Json
          expected_statuses: Json
          id: string
          input_data: Json
          oracle_method: string
          oracle_version: string
          promotion_status: string
          reviewer_engineering: string | null
          reviewer_finance: string | null
          tolerance_pct: number
          updated_at: string
          vector_code: string
        }
        Insert: {
          active?: boolean
          archetype: string
          created_at?: string
          evidence_urls?: Json
          expected_invariants?: Json
          expected_ranges: Json
          expected_statuses?: Json
          id?: string
          input_data: Json
          oracle_method: string
          oracle_version: string
          promotion_status?: string
          reviewer_engineering?: string | null
          reviewer_finance?: string | null
          tolerance_pct?: number
          updated_at?: string
          vector_code: string
        }
        Update: {
          active?: boolean
          archetype?: string
          created_at?: string
          evidence_urls?: Json
          expected_invariants?: Json
          expected_ranges?: Json
          expected_statuses?: Json
          id?: string
          input_data?: Json
          oracle_method?: string
          oracle_version?: string
          promotion_status?: string
          reviewer_engineering?: string | null
          reviewer_finance?: string | null
          tolerance_pct?: number
          updated_at?: string
          vector_code?: string
        }
        Relationships: []
      }
      gsc_verification: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          site_url: string
          status: string
          updated_at: string
          updated_by: string | null
          verification_method: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          site_url: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          verification_method?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          site_url?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          verification_method?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gsc_verification_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gsc_verification_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gsc_verification_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      idea_generation_usage: {
        Row: {
          created_at: string
          id: string
          month_key: string
          plan_tier_snapshot: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_key: string
          plan_tier_snapshot?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_key?: string
          plan_tier_snapshot?: string
          updated_at?: string
          usage_count?: number
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
      invoices: {
        Row: {
          analysis_ref_id: string | null
          client_address: string | null
          client_company: string | null
          client_email: string | null
          client_name: string
          created_at: string | null
          currency: string | null
          discount_amount: number
          document_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          paid_at: string | null
          payment_terms: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          user_id: string
        }
        Insert: {
          analysis_ref_id?: string | null
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name: string
          created_at?: string | null
          currency?: string | null
          discount_amount?: number
          document_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          user_id: string
        }
        Update: {
          analysis_ref_id?: string | null
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          created_at?: string | null
          currency?: string | null
          discount_amount?: number
          document_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          email: string | null
          email_encrypted: string | null
          email_hash: string | null
          id: string
          marketing_opt_in: boolean | null
          metadata: Json | null
          offer: string
          source: string
          status: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          email_encrypted?: string | null
          email_hash?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          offer: string
          source: string
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          email_encrypted?: string | null
          email_hash?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          offer?: string
          source?: string
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metric_formula_registry: {
        Row: {
          active: boolean
          definition: string
          expression: string
          formula_id: string
          implementation_path: string
          implementation_sha: string
          input_contract: Json
          invalid_state_policy: Json
          metric_code: string
          output_contract: Json
          reviewed_at: string | null
          rounding_policy: Json
          source_standard: string | null
          units: Json
          version: string
        }
        Insert: {
          active?: boolean
          definition: string
          expression: string
          formula_id: string
          implementation_path: string
          implementation_sha: string
          input_contract: Json
          invalid_state_policy: Json
          metric_code: string
          output_contract: Json
          reviewed_at?: string | null
          rounding_policy: Json
          source_standard?: string | null
          units: Json
          version: string
        }
        Update: {
          active?: boolean
          definition?: string
          expression?: string
          formula_id?: string
          implementation_path?: string
          implementation_sha?: string
          input_contract?: Json
          invalid_state_policy?: Json
          metric_code?: string
          output_contract?: Json
          reviewed_at?: string | null
          rounding_policy?: Json
          source_standard?: string | null
          units?: Json
          version?: string
        }
        Relationships: []
      }
      paid_engagements: {
        Row: {
          analysis_id: string | null
          completed_at: string | null
          consultant_notes: string | null
          contact_email: string | null
          contact_name: string
          created_at: string
          created_by: string | null
          decision_question: string | null
          engaged_at: string
          engagement_type: string
          id: string
          price_usd: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          completed_at?: string | null
          consultant_notes?: string | null
          contact_email?: string | null
          contact_name: string
          created_at?: string
          created_by?: string | null
          decision_question?: string | null
          engaged_at?: string
          engagement_type: string
          id?: string
          price_usd?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          completed_at?: string | null
          consultant_notes?: string | null
          contact_email?: string | null
          contact_name?: string
          created_at?: string
          created_by?: string | null
          decision_question?: string | null
          engaged_at?: string
          engagement_type?: string
          id?: string
          price_usd?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paid_engagements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "paid_engagements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_engagements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pending_plan_grants: {
        Row: {
          created_at: string
          duration_days: number
          email: string
          granted_at: string | null
          granted_user_id: string | null
          id: string
          note: string | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          email: string
          granted_at?: string | null
          granted_user_id?: string | null
          id?: string
          note?: string | null
          plan_id: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          email?: string
          granted_at?: string | null
          granted_user_id?: string | null
          id?: string
          note?: string | null
          plan_id?: string
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          features: Json
          label: string
          limits: Json
          monthly_analyses: number
          price_annual: number
          price_monthly: number
          stripe_price_ids: Json
          tier: string
          updated_at: string
        }
        Insert: {
          features?: Json
          label: string
          limits?: Json
          monthly_analyses?: number
          price_annual?: number
          price_monthly?: number
          stripe_price_ids?: Json
          tier: string
          updated_at?: string
        }
        Update: {
          features?: Json
          label?: string
          limits?: Json
          monthly_analyses?: number
          price_annual?: number
          price_monthly?: number
          stripe_price_ids?: Json
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_feedback: {
        Row: {
          created_at: string
          id: string
          least_trusted_output: string | null
          likelihood_to_recommend: number
          main_reason: string | null
          missing_decision: string | null
          most_trusted_output: string | null
          product_version: string | null
          tier: string | null
          user_id: string | null
          would_use_again: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          least_trusted_output?: string | null
          likelihood_to_recommend: number
          main_reason?: string | null
          missing_decision?: string | null
          most_trusted_output?: string | null
          product_version?: string | null
          tier?: string | null
          user_id?: string | null
          would_use_again?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          least_trusted_output?: string | null
          likelihood_to_recommend?: number
          main_reason?: string | null
          missing_decision?: string | null
          most_trusted_output?: string | null
          product_version?: string | null
          tier?: string | null
          user_id?: string | null
          would_use_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email_marketing_opt_in: boolean | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_marketing_opt_in?: boolean | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_marketing_opt_in?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_redemptions: {
        Row: {
          id: string
          promo_code: string
          redeemed_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          promo_code: string
          redeemed_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          promo_code?: string
          redeemed_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_metrics: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      qoc_audit: {
        Row: {
          analysis_id: string | null
          correlation_id: string
          created_at: string
          detail: Json
          duration_ms: number | null
          error_message: string | null
          id: number
          ok: boolean
          stage: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          correlation_id: string
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          ok?: boolean
          stage: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          correlation_id?: string
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          ok?: boolean
          stage?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qoc_audit_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qoc_audit_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qoc_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qoc_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qoc_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      qoc_audit_envelopes: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          overall_verdict: string
          qoc_version: string
          report: Json | null
          request_id: string
          short_circuit: Json | null
          total_cost_usd: number
          total_duration_ms: number
          traces: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          overall_verdict: string
          qoc_version: string
          report?: Json | null
          request_id: string
          short_circuit?: Json | null
          total_cost_usd?: number
          total_duration_ms?: number
          traces?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          overall_verdict?: string
          qoc_version?: string
          report?: Json | null
          request_id?: string
          short_circuit?: Json | null
          total_cost_usd?: number
          total_duration_ms?: number
          traces?: Json
          user_id?: string
        }
        Relationships: []
      }
      quote_gen_usage: {
        Row: {
          created_at: string
          id: string
          month_key: string
          plan_tier_snapshot: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_key: string
          plan_tier_snapshot?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_key?: string
          plan_tier_snapshot?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
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
        Relationships: []
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
      rvce_observations: {
        Row: {
          accepted: boolean
          analysis_id: string | null
          comparability_score: number
          correlation_id: string
          currency: string | null
          extraction_method: string
          extraction_quote_hash: string | null
          geography: string | null
          id: number
          metric_code: string
          normalized_value: number | null
          period_end: string | null
          period_start: string | null
          published_at: string | null
          publisher: string | null
          raw_value: number | null
          rejection_reason: string | null
          retrieved_at: string
          source_quality: number
          source_title: string | null
          source_url: string | null
          unit: string
        }
        Insert: {
          accepted: boolean
          analysis_id?: string | null
          comparability_score: number
          correlation_id: string
          currency?: string | null
          extraction_method: string
          extraction_quote_hash?: string | null
          geography?: string | null
          id?: never
          metric_code: string
          normalized_value?: number | null
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          publisher?: string | null
          raw_value?: number | null
          rejection_reason?: string | null
          retrieved_at?: string
          source_quality: number
          source_title?: string | null
          source_url?: string | null
          unit: string
        }
        Update: {
          accepted?: boolean
          analysis_id?: string | null
          comparability_score?: number
          correlation_id?: string
          currency?: string | null
          extraction_method?: string
          extraction_quote_hash?: string | null
          geography?: string | null
          id?: never
          metric_code?: string
          normalized_value?: number | null
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          publisher?: string | null
          raw_value?: number | null
          rejection_reason?: string | null
          retrieved_at?: string
          source_quality?: number
          source_title?: string | null
          source_url?: string | null
          unit?: string
        }
        Relationships: []
      }
      scenario_runs: {
        Row: {
          base_snapshot_id: number
          canonical_run_key: string
          correlation_id: string | null
          created_at: string
          dataset_version: string
          engine_version: string
          formula_version: string
          id: string
          input_hash: string
          latency_ms: number | null
          normalized_delta: Json
          output: Json
          output_hash: string
          reconciliation_issues: Json | null
          reconciliation_status: string
          research_snapshot_id: string | null
          scenario_version_id: string
          user_id: string
        }
        Insert: {
          base_snapshot_id: number
          canonical_run_key: string
          correlation_id?: string | null
          created_at?: string
          dataset_version: string
          engine_version: string
          formula_version: string
          id?: string
          input_hash: string
          latency_ms?: number | null
          normalized_delta: Json
          output: Json
          output_hash: string
          reconciliation_issues?: Json | null
          reconciliation_status?: string
          research_snapshot_id?: string | null
          scenario_version_id: string
          user_id: string
        }
        Update: {
          base_snapshot_id?: number
          canonical_run_key?: string
          correlation_id?: string | null
          created_at?: string
          dataset_version?: string
          engine_version?: string
          formula_version?: string
          id?: string
          input_hash?: string
          latency_ms?: number | null
          normalized_delta?: Json
          output?: Json
          output_hash?: string
          reconciliation_issues?: Json | null
          reconciliation_status?: string
          research_snapshot_id?: string | null
          scenario_version_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_runs_base_snapshot_id_fkey"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "analysis_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_runs_scenario_version_id_fkey"
            columns: ["scenario_version_id"]
            isOneToOne: false
            referencedRelation: "scenario_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scenario_sets: {
        Row: {
          analysis_id: string
          archived_at: string | null
          base_snapshot_id: number | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          archived_at?: string | null
          base_snapshot_id?: number | null
          created_at?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          archived_at?: string | null
          base_snapshot_id?: number | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_sets_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_base_snapshot_id_fkey"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "analysis_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scenario_versions: {
        Row: {
          author: string | null
          created_at: string
          delta: Json
          id: string
          scenario_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          author?: string | null
          created_at?: string
          delta: Json
          id?: string
          scenario_id: string
          user_id: string
          version_number: number
        }
        Update: {
          author?: string | null
          created_at?: string
          delta?: Json
          id?: string
          scenario_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          name: string
          scenario_set_id: string
          starting_case: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          name: string
          scenario_set_id: string
          starting_case?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          name?: string
          scenario_set_id?: string
          starting_case?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_scenario_set_id_fkey"
            columns: ["scenario_set_id"]
            isOneToOne: false
            referencedRelation: "scenario_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
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
      self_learned_priors: {
        Row: {
          business_model: string
          created_at: string
          data_window_days: number
          id: string
          industry: string
          last_updated_at: string
          metric_priors: Json
          quality_score: number
          sample_size: number
        }
        Insert: {
          business_model: string
          created_at?: string
          data_window_days?: number
          id?: string
          industry: string
          last_updated_at?: string
          metric_priors?: Json
          quality_score?: number
          sample_size?: number
        }
        Update: {
          business_model?: string
          created_at?: string
          data_window_days?: number
          id?: string
          industry?: string
          last_updated_at?: string
          metric_priors?: Json
          quality_score?: number
          sample_size?: number
        }
        Relationships: []
      }
      self_learning_runs: {
        Row: {
          analyses_processed: number
          error_message: string | null
          groups_found: number
          groups_updated: number
          id: string
          latency_ms: number | null
          priors_upserted: number
          run_at: string
        }
        Insert: {
          analyses_processed?: number
          error_message?: string | null
          groups_found?: number
          groups_updated?: number
          id?: string
          latency_ms?: number | null
          priors_upserted?: number
          run_at?: string
        }
        Update: {
          analyses_processed?: number
          error_message?: string | null
          groups_found?: number
          groups_updated?: number
          id?: string
          latency_ms?: number | null
          priors_upserted?: number
          run_at?: string
        }
        Relationships: []
      }
      service_job_assemblies: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          labor_hours_p25: number
          labor_hours_p50: number
          labor_hours_p75: number
          materials: Json
          name: string
          notes: string | null
          trade_id: string
          unit: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          labor_hours_p25: number
          labor_hours_p50: number
          labor_hours_p75: number
          materials?: Json
          name: string
          notes?: string | null
          trade_id: string
          unit?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          labor_hours_p25?: number
          labor_hours_p50?: number
          labor_hours_p75?: number
          materials?: Json
          name?: string
          notes?: string | null
          trade_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_job_assemblies_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "service_job_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      service_job_outcomes: {
        Row: {
          actual_labor_hours: number | null
          actual_materials_cost: number | null
          actual_revenue: number | null
          actual_total_cost: number | null
          id: string
          job_id: string
          notes: string | null
          recorded_at: string
        }
        Insert: {
          actual_labor_hours?: number | null
          actual_materials_cost?: number | null
          actual_revenue?: number | null
          actual_total_cost?: number | null
          id?: string
          job_id: string
          notes?: string | null
          recorded_at?: string
        }
        Update: {
          actual_labor_hours?: number | null
          actual_materials_cost?: number | null
          actual_revenue?: number | null
          actual_total_cost?: number | null
          id?: string
          job_id?: string
          notes?: string | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_job_outcomes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_job_trades: {
        Row: {
          active: boolean
          default_margin_pct: number
          default_overhead_pct: number
          display_name: string
          id: string
        }
        Insert: {
          active?: boolean
          default_margin_pct?: number
          default_overhead_pct?: number
          display_name: string
          id: string
        }
        Update: {
          active?: boolean
          default_margin_pct?: number
          default_overhead_pct?: number
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      service_jobs: {
        Row: {
          building_type: string | null
          client_name: string | null
          created_at: string
          id: string
          modifiers: Json
          pricing_profile: Json
          quote_result: Json | null
          scope_items: Json
          site_address: string | null
          site_zip: string | null
          status: string
          trade_id: string
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          building_type?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          modifiers?: Json
          pricing_profile?: Json
          quote_result?: Json | null
          scope_items?: Json
          site_address?: string | null
          site_zip?: string | null
          status?: string
          trade_id: string
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          building_type?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          modifiers?: Json
          pricing_profile?: Json
          quote_result?: Json | null
          scope_items?: Json
          site_address?: string | null
          site_zip?: string | null
          status?: string
          trade_id?: string
          updated_at?: string
          user_id?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_jobs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "service_job_trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: []
      }
      status_incidents: {
        Row: {
          component: string
          created_at: string
          detected_at: string
          id: string
          postmortem_url: string | null
          resolved_at: string | null
          severity: string
          status: string
          summary: string
          title: string
          updated_at: string
          updates: Json
        }
        Insert: {
          component: string
          created_at?: string
          detected_at?: string
          id?: string
          postmortem_url?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          updates?: Json
        }
        Update: {
          component?: string
          created_at?: string
          detected_at?: string
          id?: string
          postmortem_url?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updates?: Json
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
            referencedRelation: "commercial_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_audit_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_audit_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          history_readonly_until: string | null
          id: string
          is_legacy_price: boolean
          payment_failed_at: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          history_readonly_until?: string | null
          id?: string
          is_legacy_price?: boolean
          payment_failed_at?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          history_readonly_until?: string | null
          id?: string
          is_legacy_price?: boolean
          payment_failed_at?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
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
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tier_qa_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          failed_cases: number
          failures: Json
          finished_at: string | null
          id: string
          pass_rate: number
          passed_cases: number
          run_id: string
          started_at: string
          status: string
          summary: Json
          tier: string | null
          total_cases: number
          triggered_by: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_cases?: number
          failures?: Json
          finished_at?: string | null
          id?: string
          pass_rate?: number
          passed_cases?: number
          run_id: string
          started_at?: string
          status?: string
          summary?: Json
          tier?: string | null
          total_cases?: number
          triggered_by?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_cases?: number
          failures?: Json
          finished_at?: string | null
          id?: string
          pass_rate?: number
          passed_cases?: number
          run_id?: string
          started_at?: string
          status?: string
          summary?: Json
          tier?: string | null
          total_cases?: number
          triggered_by?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          analyses_used: number
          id: string
          identity_key: string
          period_start: string
          tier: string
          updated_at: string
        }
        Insert: {
          analyses_used?: number
          id?: string
          identity_key: string
          period_start?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          analyses_used?: number
          id?: string
          identity_key?: string
          period_start?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          analyses_count: number
          created_at: string
          downloads_date: string | null
          downloads_today: number
          id: string
          idea_gen_count: number
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses_count?: number
          created_at?: string
          downloads_date?: string | null
          downloads_today?: number
          id?: string
          idea_gen_count?: number
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses_count?: number
          created_at?: string
          downloads_date?: string | null
          downloads_today?: number
          id?: string
          idea_gen_count?: number
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_brand_profiles: {
        Row: {
          accent_color: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          email_encrypted: string | null
          font_preference: string | null
          id: string
          invoice_counter: number | null
          invoice_prefix: string | null
          logo_url: string | null
          phone_encrypted: string | null
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          tax_id_encrypted: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          accent_color?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email_encrypted?: string | null
          font_preference?: string | null
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone_encrypted?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          accent_color?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email_encrypted?: string | null
          font_preference?: string | null
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone_encrypted?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          zip?: string | null
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
      user_realism_feedback: {
        Row: {
          analysis_id: string | null
          business_type: string | null
          created_at: string
          dimension_scores: Json | null
          engine_version: string | null
          feedback_text: string | null
          id: string
          location: string | null
          realism_score: number
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          business_type?: string | null
          created_at?: string
          dimension_scores?: Json | null
          engine_version?: string | null
          feedback_text?: string | null
          id?: string
          location?: string | null
          realism_score: number
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          business_type?: string | null
          created_at?: string
          dimension_scores?: Json | null
          engine_version?: string | null
          feedback_text?: string | null
          id?: string
          location?: string | null
          realism_score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_realism_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_realism_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "commercial_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_realism_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_realism_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_realism_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
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
      analysis_health: {
        Row: {
          day: string | null
          degraded: number | null
          failed: number | null
          ok_rate_pct: number | null
          p50_ms: number | null
          p95_ms: number | null
          succeeded: number | null
          tier: string | null
          total: number | null
        }
        Relationships: []
      }
      clean_users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string | null
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean | null
          is_sso_user: boolean | null
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commercial_analyses: {
        Row: {
          analysis_correlation_id: string | null
          confidence_score: number | null
          created_at: string | null
          depth: string | null
          documents: Json | null
          id: string | null
          idea: string | null
          idempotency_key: string | null
          location: string | null
          monthly_profit: number | null
          payback_months: number | null
          result: Json | null
          rvce_latency_ms: number | null
          rvce_observation_count: number | null
          rvce_status: string | null
          rvce_tavily_queries: number | null
          startup_investment: number | null
          team_id: string | null
          tier_at_creation: string | null
          user_id: string | null
        }
        Insert: {
          analysis_correlation_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          id?: string | null
          idea?: string | null
          idempotency_key?: string | null
          location?: string | null
          monthly_profit?: number | null
          payback_months?: number | null
          result?: Json | null
          rvce_latency_ms?: number | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          rvce_tavily_queries?: number | null
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_correlation_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          id?: string | null
          idea?: string | null
          idempotency_key?: string | null
          location?: string | null
          monthly_profit?: number | null
          payback_months?: number | null
          result?: Json | null
          rvce_latency_ms?: number | null
          rvce_observation_count?: number | null
          rvce_status?: string | null
          rvce_tavily_queries?: number | null
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
          user_id?: string | null
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
      commercial_subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          history_readonly_until: string | null
          id: string | null
          is_founder_grant: boolean | null
          is_legacy_price: boolean | null
          is_unbacked_by_stripe: boolean | null
          payment_failed_at: string | null
          plan_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          history_readonly_until?: string | null
          id?: string | null
          is_founder_grant?: never
          is_legacy_price?: boolean | null
          is_unbacked_by_stripe?: never
          payment_failed_at?: string | null
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          history_readonly_until?: string | null
          id?: string | null
          is_founder_grant?: never
          is_legacy_price?: boolean | null
          is_unbacked_by_stripe?: never
          payment_failed_at?: string | null
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_funnel_30d: {
        Row: {
          by_template: Json | null
          click_to_open_rate_pct: number | null
          confirmed: number | null
          open_rate_pct: number | null
          pending_confirmation: number | null
          total_clicks: number | null
          total_emails_sent: number | null
          total_leads: number | null
          total_opens: number | null
          unique_clicks: number | null
          unique_opens: number | null
          unique_recipients: number | null
          unsubscribed: number | null
        }
        Relationships: []
      }
      external_commercial_users: {
        Row: {
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          last_sign_in_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "clean_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "external_commercial_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_cohorts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_cohorts: {
        Row: {
          cohort: Database["public"]["Enums"]["user_cohort"] | null
          created_at: string | null
          email: string | null
          last_sign_in_at: string | null
          user_id: string | null
        }
        Insert: {
          cohort?: never
          created_at?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          user_id?: string | null
        }
        Update: {
          cohort?: never
          created_at?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _quote_gen_plan_tier: { Args: { p_user_id: string }; Returns: string }
      admin_fix_subscription: {
        Args: {
          p_email: string
          p_plan_id?: string
          p_status?: string
          p_trial_days?: number
        }
        Returns: Json
      }
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
      autoposter_read_token: { Args: { p_id: string }; Returns: string }
      autoposter_store_token: {
        Args: { p_name: string; p_secret: string }
        Returns: string
      }
      benchmark_lookup: {
        Args: {
          p_business_model?: string
          p_city_tier?: string
          p_country?: string
          p_metric: string
          p_sector?: string
          p_size?: string
          p_stage?: string
        }
        Returns: Json
      }
      bump_public_metric: {
        Args: { p_delta?: number; p_key: string }
        Returns: number
      }
      capture_lead: {
        Args: {
          p_email: string
          p_metadata?: Json
          p_offer: string
          p_source: string
        }
        Returns: string
      }
      charge_free_analysis: {
        Args: { p_dry_run?: boolean; p_identity: string }
        Returns: {
          allowed: boolean
          remaining: number
          used: number
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
      claim_admin_if_allowlisted: { Args: never; Returns: boolean }
      claim_anonymous_analysis: {
        Args: { p_analysis_id: string; p_anonymous_session_id: string }
        Returns: Json
      }
      claim_content_admin_if_allowlisted: { Args: never; Returns: boolean }
      claim_pending_plan_grant: {
        Args: never
        Returns: {
          applied: boolean
          current_period_end: string
          plan_id: string
        }[]
      }
      classify_user_cohort: {
        Args: { _email: string; _user_id: string }
        Returns: Database["public"]["Enums"]["user_cohort"]
      }
      cleanup_old_analysis_jobs: { Args: never; Returns: undefined }
      cleanup_old_anonymous_usage: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      complete_referral_signup: {
        Args: { p_conversion_id: string; p_referred_user_id: string }
        Returns: boolean
      }
      confirm_lead_email: {
        Args: { p_token: string }
        Returns: {
          email_hash: string
          lead_id: string
        }[]
      }
      consume_analysis_quota: {
        Args: { p_limit: number; p_user_id: string }
        Returns: Json
      }
      consume_download_quota: {
        Args: { p_limit: number; p_user_id: string }
        Returns: Json
      }
      consume_idea_gen_quota: {
        Args: { p_limit: number; p_month_year: string; p_user_id: string }
        Returns: Json
      }
      consume_scenario_set_quota: {
        Args: {
          p_analysis_id: string
          p_base_snapshot_id?: number
          p_limit: number
          p_name: string
          p_user_id: string
        }
        Returns: Json
      }
      decrement_idea_generation_usage: { Args: never; Returns: undefined }
      decrement_quote_gen_usage: { Args: never; Returns: undefined }
      decrypt_pii: { Args: { encrypted_data: string }; Returns: string }
      encrypt_pii: { Args: { plain_text: string }; Returns: string }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_activation_funnel: { Args: { p_days?: number }; Returns: Json }
      get_activation_kpis: { Args: never; Returns: Json }
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
      get_analysis_case_grid: { Args: { p_case_id: string }; Returns: Json }
      get_analysis_step_funnel: {
        Args: { _days?: number }
        Returns: {
          abandon_rate: number
          median_ms_from_prev: number
          step_name: string
          total_events: number
          unique_sessions: number
        }[]
      }
      get_conversion_by_source: {
        Args: { _days?: number }
        Returns: {
          event_name: string
          tier: string
          total_events: number
          unique_sessions: number
          unique_users: number
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }[]
      }
      get_daily_signups: {
        Args: { days_back?: number }
        Returns: {
          signup_count: number
          signup_date: string
        }[]
      }
      get_email_funnel_30d: { Args: never; Returns: Json }
      get_idea_generation_status: { Args: never; Returns: Json }
      get_latest_audit_timestamp: { Args: never; Returns: string }
      get_lead_email: { Args: { p_lead_id: string }; Returns: string }
      get_monthly_analyses: {
        Args: { months_back?: number }
        Returns: {
          analyses_count: number
          month_year: string
        }[]
      }
      get_monthly_analyses_stats: {
        Args: { p_months?: number }
        Returns: {
          anonymous_count: number
          free_count: number
          month_start: string
          plus_count: number
          pro_count: number
          total_analyses: number
          unique_users: number
        }[]
      }
      get_next_invoice_number: { Args: { p_user_id: string }; Returns: string }
      get_quote_gen_status: { Args: never; Returns: Json }
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
      get_sample_report_funnel: { Args: { p_days?: number }; Returns: Json }
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
      get_unique_users_with_analysis: { Args: never; Returns: number }
      get_user_activation_score: { Args: { p_user_id: string }; Returns: Json }
      get_user_brand_profile: {
        Args: never
        Returns: {
          accent_color: string
          address_line1: string
          address_line2: string
          city: string
          company_name: string
          created_at: string
          email: string
          font_preference: string
          id: string
          invoice_counter: number
          invoice_prefix: string
          logo_url: string
          phone: string
          primary_color: string
          secondary_color: string
          state: string
          tax_id: string
          updated_at: string
          user_id: string
          website: string
          zip: string
        }[]
      }
      get_user_engagement_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_plan_tier: { Args: { _uid: string }; Returns: string }
      get_weekly_leaderboard: {
        Args: never
        Returns: {
          idea_score: number
          industry: string
          location: string
          monthly_profit: number
          net_margin: number
          payback_months: number
          rank_position: number
          share_token: string
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
      increment_export_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_idea_generation_usage: { Args: never; Returns: Json }
      increment_quote_gen_usage: { Args: never; Returns: Json }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      increment_usage: {
        Args: { p_month_year: string; p_user_id: string }
        Returns: undefined
      }
      is_admin_allowlisted: { Args: { _email: string }; Returns: boolean }
      is_content_admin_allowlisted: {
        Args: { _email: string }
        Returns: boolean
      }
      is_in_readonly_window: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      log_entitlement_denial: {
        Args: {
          p_feature: string
          p_metadata?: Json
          p_path?: string
          p_tier: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_subscription_canceled: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      provision_pro_features: {
        Args: {
          p_period_end?: string
          p_stripe_customer_id?: string
          p_stripe_subscription_id?: string
          p_user_id: string
        }
        Returns: Json
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
      record_funnel_event: {
        Args: {
          _event_name: string
          _metadata?: Json
          _path?: string
          _referrer?: string
          _session_id: string
          _utm_campaign?: string
          _utm_medium?: string
          _utm_source?: string
        }
        Returns: string
      }
      resubscribe_lead: { Args: { p_email_hash: string }; Returns: boolean }
      track_referral_click: {
        Args: { p_code: string; p_ip_hash?: string; p_user_agent?: string }
        Returns: string
      }
      unsubscribe_lead: { Args: { p_email_hash: string }; Returns: boolean }
      upsert_user_brand_profile: { Args: { p: Json }; Returns: string }
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
      app_role: "admin" | "moderator" | "user" | "content_admin"
      user_cohort:
        | "EXTERNAL_REAL"
        | "FOUNDER"
        | "STAFF"
        | "QA"
        | "TEST"
        | "BOT"
        | "SYNTHETIC"
        | "DEMO"
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
      app_role: ["admin", "moderator", "user", "content_admin"],
      user_cohort: [
        "EXTERNAL_REAL",
        "FOUNDER",
        "STAFF",
        "QA",
        "TEST",
        "BOT",
        "SYNTHETIC",
        "DEMO",
      ],
    },
  },
} as const
