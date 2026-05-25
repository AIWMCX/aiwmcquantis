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
      accuracy_runs: {
        Row: {
          actual: Json
          created_at: string
          deviation_pct: number | null
          engine_version: string | null
          error_message: string | null
          expected: Json
          failed_metrics: string[]
          id: string
          latency_ms: number | null
          passed: boolean
          run_id: string
          vector_code: string
          vector_id: string
        }
        Insert: {
          actual?: Json
          created_at?: string
          deviation_pct?: number | null
          engine_version?: string | null
          error_message?: string | null
          expected?: Json
          failed_metrics?: string[]
          id?: string
          latency_ms?: number | null
          passed: boolean
          run_id: string
          vector_code: string
          vector_id: string
        }
        Update: {
          actual?: Json
          created_at?: string
          deviation_pct?: number | null
          engine_version?: string | null
          error_message?: string | null
          expected?: Json
          failed_metrics?: string[]
          id?: string
          latency_ms?: number | null
          passed?: boolean
          run_id?: string
          vector_code?: string
          vector_id?: string
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
          request_id: string | null
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
          request_id?: string | null
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
          request_id?: string | null
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
        ]
      }
      analyses: {
        Row: {
          anonymous_session_id: string | null
          confidence_score: number | null
          created_at: string | null
          depth: string | null
          documents: Json | null
          founder_display_name: string | null
          id: string
          idea: string
          idea_summary: string | null
          idempotency_key: string | null
          is_public: boolean
          location: string
          made_public_at: string | null
          monthly_profit: number | null
          payback_months: number | null
          public_slug: string | null
          result: Json
          startup_investment: number | null
          team_id: string | null
          tier_at_creation: string | null
          user_id: string
        }
        Insert: {
          anonymous_session_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          founder_display_name?: string | null
          id?: string
          idea: string
          idea_summary?: string | null
          idempotency_key?: string | null
          is_public?: boolean
          location: string
          made_public_at?: string | null
          monthly_profit?: number | null
          payback_months?: number | null
          public_slug?: string | null
          result: Json
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
          user_id: string
        }
        Update: {
          anonymous_session_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          depth?: string | null
          documents?: Json | null
          founder_display_name?: string | null
          id?: string
          idea?: string
          idea_summary?: string | null
          idempotency_key?: string | null
          is_public?: boolean
          location?: string
          made_public_at?: string | null
          monthly_profit?: number | null
          payback_months?: number | null
          public_slug?: string | null
          result?: Json
          startup_investment?: number | null
          team_id?: string | null
          tier_at_creation?: string | null
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
      analysis_break_even: {
        Row: {
          be_signal: string | null
          break_even_revenue: number | null
          break_even_units: number | null
          business: string | null
          case_id: string
          cm_ratio: number | null
          contribution_margin: number | null
          current_revenue: number | null
          current_units: number | null
          d_a_mo: number | null
          data_date: string
          data_version: string
          fixed_costs_mo: number | null
          interest_mo: number | null
          months_to_be_from_launch: number | null
          price: number | null
          safety_margin: number | null
          sample_size: number
          source: string
          total_fixed_mo: number | null
          units_above_be: number | null
          variable_cost: number | null
        }
        Insert: {
          be_signal?: string | null
          break_even_revenue?: number | null
          break_even_units?: number | null
          business?: string | null
          case_id: string
          cm_ratio?: number | null
          contribution_margin?: number | null
          current_revenue?: number | null
          current_units?: number | null
          d_a_mo?: number | null
          data_date?: string
          data_version?: string
          fixed_costs_mo?: number | null
          interest_mo?: number | null
          months_to_be_from_launch?: number | null
          price?: number | null
          safety_margin?: number | null
          sample_size?: number
          source?: string
          total_fixed_mo?: number | null
          units_above_be?: number | null
          variable_cost?: number | null
        }
        Update: {
          be_signal?: string | null
          break_even_revenue?: number | null
          break_even_units?: number | null
          business?: string | null
          case_id?: string
          cm_ratio?: number | null
          contribution_margin?: number | null
          current_revenue?: number | null
          current_units?: number | null
          d_a_mo?: number | null
          data_date?: string
          data_version?: string
          fixed_costs_mo?: number | null
          interest_mo?: number | null
          months_to_be_from_launch?: number | null
          price?: number | null
          safety_margin?: number | null
          sample_size?: number
          source?: string
          total_fixed_mo?: number | null
          units_above_be?: number | null
          variable_cost?: number | null
        }
        Relationships: []
      }
      analysis_burn_runway: {
        Row: {
          business: string | null
          case_id: string
          cash_at_12mo: number | null
          cash_at_24mo: number | null
          data_date: string
          data_version: string
          death_date_months: number | null
          dilution_seed: number | null
          efficiency_score: number | null
          funding_need: number | null
          gross_burn_mo: number | null
          initial_cash: number | null
          months_to_breakeven: number | null
          net_burn_mo: number | null
          pre_money_val_est: number | null
          revenue_mo: number | null
          runway_grade: string | null
          runway_months: string | null
          runway_ok: string | null
          sample_size: number
          source: string
          survival_score: number | null
        }
        Insert: {
          business?: string | null
          case_id: string
          cash_at_12mo?: number | null
          cash_at_24mo?: number | null
          data_date?: string
          data_version?: string
          death_date_months?: number | null
          dilution_seed?: number | null
          efficiency_score?: number | null
          funding_need?: number | null
          gross_burn_mo?: number | null
          initial_cash?: number | null
          months_to_breakeven?: number | null
          net_burn_mo?: number | null
          pre_money_val_est?: number | null
          revenue_mo?: number | null
          runway_grade?: string | null
          runway_months?: string | null
          runway_ok?: string | null
          sample_size?: number
          source?: string
          survival_score?: number | null
        }
        Update: {
          business?: string | null
          case_id?: string
          cash_at_12mo?: number | null
          cash_at_24mo?: number | null
          data_date?: string
          data_version?: string
          death_date_months?: number | null
          dilution_seed?: number | null
          efficiency_score?: number | null
          funding_need?: number | null
          gross_burn_mo?: number | null
          initial_cash?: number | null
          months_to_breakeven?: number | null
          net_burn_mo?: number | null
          pre_money_val_est?: number | null
          revenue_mo?: number | null
          runway_grade?: string | null
          runway_months?: string | null
          runway_ok?: string | null
          sample_size?: number
          source?: string
          survival_score?: number | null
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
        Relationships: [
          {
            foreignKeyName: "analysis_cases_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_cash_flow: {
        Row: {
          annual_fcf: number | null
          business: string | null
          capex_mo: number | null
          case_id: string
          cash_signal: string | null
          cumul_cf_m12: number | null
          cumul_cf_m6: number | null
          data_date: string
          data_version: string
          debt_service_mo: number | null
          dso_days: number | null
          fcf_yield: number | null
          free_cf_mo: number | null
          mo_ebitda: number | null
          months_to_fcf: number | null
          net_cf_mo: number | null
          op_cf_mo: number | null
          sample_size: number
          source: string
          working_cap: number | null
        }
        Insert: {
          annual_fcf?: number | null
          business?: string | null
          capex_mo?: number | null
          case_id: string
          cash_signal?: string | null
          cumul_cf_m12?: number | null
          cumul_cf_m6?: number | null
          data_date?: string
          data_version?: string
          debt_service_mo?: number | null
          dso_days?: number | null
          fcf_yield?: number | null
          free_cf_mo?: number | null
          mo_ebitda?: number | null
          months_to_fcf?: number | null
          net_cf_mo?: number | null
          op_cf_mo?: number | null
          sample_size?: number
          source?: string
          working_cap?: number | null
        }
        Update: {
          annual_fcf?: number | null
          business?: string | null
          capex_mo?: number | null
          case_id?: string
          cash_signal?: string | null
          cumul_cf_m12?: number | null
          cumul_cf_m6?: number | null
          data_date?: string
          data_version?: string
          debt_service_mo?: number | null
          dso_days?: number | null
          fcf_yield?: number | null
          free_cf_mo?: number | null
          mo_ebitda?: number | null
          months_to_fcf?: number | null
          net_cf_mo?: number | null
          op_cf_mo?: number | null
          sample_size?: number
          source?: string
          working_cap?: number | null
        }
        Relationships: []
      }
      analysis_dcf: {
        Row: {
          business: string | null
          case_id: string
          current_revenue: number | null
          data_date: string
          data_version: string
          debt: number | null
          enterprise_value: number | null
          equity_value: number | null
          ev_ebitda: number | null
          ev_rev: number | null
          fcf_yr1: number | null
          fcf_yr2: number | null
          fcf_yr3: number | null
          fcf_yr4: number | null
          fcf_yr5: number | null
          pv_fcfs: number | null
          sample_size: number
          source: string
          term_growth_g: number | null
          terminal_value: number | null
          valuation_grade: string | null
          wacc: number | null
        }
        Insert: {
          business?: string | null
          case_id: string
          current_revenue?: number | null
          data_date?: string
          data_version?: string
          debt?: number | null
          enterprise_value?: number | null
          equity_value?: number | null
          ev_ebitda?: number | null
          ev_rev?: number | null
          fcf_yr1?: number | null
          fcf_yr2?: number | null
          fcf_yr3?: number | null
          fcf_yr4?: number | null
          fcf_yr5?: number | null
          pv_fcfs?: number | null
          sample_size?: number
          source?: string
          term_growth_g?: number | null
          terminal_value?: number | null
          valuation_grade?: string | null
          wacc?: number | null
        }
        Update: {
          business?: string | null
          case_id?: string
          current_revenue?: number | null
          data_date?: string
          data_version?: string
          debt?: number | null
          enterprise_value?: number | null
          equity_value?: number | null
          ev_ebitda?: number | null
          ev_rev?: number | null
          fcf_yr1?: number | null
          fcf_yr2?: number | null
          fcf_yr3?: number | null
          fcf_yr4?: number | null
          fcf_yr5?: number | null
          pv_fcfs?: number | null
          sample_size?: number
          source?: string
          term_growth_g?: number | null
          terminal_value?: number | null
          valuation_grade?: string | null
          wacc?: number | null
        }
        Relationships: []
      }
      analysis_dscr_credit: {
        Row: {
          annual_debt_svc: number | null
          annual_noi: number | null
          bad_debt_rev: number | null
          business: string | null
          case_id: string
          credit_tier: string | null
          current_debt: number | null
          current_ratio: number | null
          data_date: string
          data_version: string
          debt_equity: number | null
          dscr: number | null
          dscr_after_tax: number | null
          dscr_vs_1_25_min: number | null
          effective_tax_rate: number | null
          invoice_terms_days: number | null
          lender_signal: string | null
          max_safe_ar: number | null
          max_safe_debt: number | null
          sample_size: number
          source: string
        }
        Insert: {
          annual_debt_svc?: number | null
          annual_noi?: number | null
          bad_debt_rev?: number | null
          business?: string | null
          case_id: string
          credit_tier?: string | null
          current_debt?: number | null
          current_ratio?: number | null
          data_date?: string
          data_version?: string
          debt_equity?: number | null
          dscr?: number | null
          dscr_after_tax?: number | null
          dscr_vs_1_25_min?: number | null
          effective_tax_rate?: number | null
          invoice_terms_days?: number | null
          lender_signal?: string | null
          max_safe_ar?: number | null
          max_safe_debt?: number | null
          sample_size?: number
          source?: string
        }
        Update: {
          annual_debt_svc?: number | null
          annual_noi?: number | null
          bad_debt_rev?: number | null
          business?: string | null
          case_id?: string
          credit_tier?: string | null
          current_debt?: number | null
          current_ratio?: number | null
          data_date?: string
          data_version?: string
          debt_equity?: number | null
          dscr?: number | null
          dscr_after_tax?: number | null
          dscr_vs_1_25_min?: number | null
          effective_tax_rate?: number | null
          invoice_terms_days?: number | null
          lender_signal?: string | null
          max_safe_ar?: number | null
          max_safe_debt?: number | null
          sample_size?: number
          source?: string
        }
        Relationships: []
      }
      analysis_edge_cases: {
        Row: {
          business_idea: string | null
          cac: number | null
          cac_payback_mo: number | null
          case_id: string
          churn_mo: number | null
          city: string | null
          data_date: string
          data_version: string
          edge_case_note: string | null
          gross_margin: number | null
          industry: string | null
          initial_inv: number | null
          ltv: number | null
          ltv_cac: number | null
          mo_customers: number | null
          mo_ebitda: number | null
          mo_gross_profit: number | null
          mo_op_costs: number | null
          mo_revenue: number | null
          net_margin: number | null
          opex_rev: number | null
          sample_size: number
          source: string
          tam_b: number | null
          unit_price: number | null
        }
        Insert: {
          business_idea?: string | null
          cac?: number | null
          cac_payback_mo?: number | null
          case_id: string
          churn_mo?: number | null
          city?: string | null
          data_date?: string
          data_version?: string
          edge_case_note?: string | null
          gross_margin?: number | null
          industry?: string | null
          initial_inv?: number | null
          ltv?: number | null
          ltv_cac?: number | null
          mo_customers?: number | null
          mo_ebitda?: number | null
          mo_gross_profit?: number | null
          mo_op_costs?: number | null
          mo_revenue?: number | null
          net_margin?: number | null
          opex_rev?: number | null
          sample_size?: number
          source?: string
          tam_b?: number | null
          unit_price?: number | null
        }
        Update: {
          business_idea?: string | null
          cac?: number | null
          cac_payback_mo?: number | null
          case_id?: string
          churn_mo?: number | null
          city?: string | null
          data_date?: string
          data_version?: string
          edge_case_note?: string | null
          gross_margin?: number | null
          industry?: string | null
          initial_inv?: number | null
          ltv?: number | null
          ltv_cac?: number | null
          mo_customers?: number | null
          mo_ebitda?: number | null
          mo_gross_profit?: number | null
          mo_op_costs?: number | null
          mo_revenue?: number | null
          net_margin?: number | null
          opex_rev?: number | null
          sample_size?: number
          source?: string
          tam_b?: number | null
          unit_price?: number | null
        }
        Relationships: []
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
      analysis_logs: {
        Row: {
          analysis_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          severity: string
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          severity?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_monte_carlo: {
        Row: {
          business: string | null
          case_id: string
          data_date: string
          data_version: string
          growth_rate: number | null
          mo_rev_base: number | null
          p10_mo1: number | null
          p10_mo12: number | null
          p10_mo6: number | null
          p50_mo1: number | null
          p50_mo12: number | null
          p50_mo6: number | null
          p90_mo1: number | null
          p90_mo12: number | null
          p90_mo6: number | null
          quantis_signal: string | null
          rev_at_risk_p10_p50: number | null
          sample_size: number
          source: string
          var: number | null
          volatility: number | null
        }
        Insert: {
          business?: string | null
          case_id: string
          data_date?: string
          data_version?: string
          growth_rate?: number | null
          mo_rev_base?: number | null
          p10_mo1?: number | null
          p10_mo12?: number | null
          p10_mo6?: number | null
          p50_mo1?: number | null
          p50_mo12?: number | null
          p50_mo6?: number | null
          p90_mo1?: number | null
          p90_mo12?: number | null
          p90_mo6?: number | null
          quantis_signal?: string | null
          rev_at_risk_p10_p50?: number | null
          sample_size?: number
          source?: string
          var?: number | null
          volatility?: number | null
        }
        Update: {
          business?: string | null
          case_id?: string
          data_date?: string
          data_version?: string
          growth_rate?: number | null
          mo_rev_base?: number | null
          p10_mo1?: number | null
          p10_mo12?: number | null
          p10_mo6?: number | null
          p50_mo1?: number | null
          p50_mo12?: number | null
          p50_mo6?: number | null
          p90_mo1?: number | null
          p90_mo12?: number | null
          p90_mo6?: number | null
          quantis_signal?: string | null
          rev_at_risk_p10_p50?: number | null
          sample_size?: number
          source?: string
          var?: number | null
          volatility?: number | null
        }
        Relationships: []
      }
      analysis_pre_mortem: {
        Row: {
          business: string | null
          case_id: string
          composite_risk: number | null
          data_date: string
          data_version: string
          failure_mode_1: string | null
          failure_mode_2: string | null
          failure_mode_3: string | null
          i1: number | null
          i2: number | null
          i3: number | null
          mitigation_priority: string | null
          p1: number | null
          p2: number | null
          p3: number | null
          sample_size: number
          score1: number | null
          score2: number | null
          score3: number | null
          source: string
          survival_prob: number | null
          time_horizon: string | null
        }
        Insert: {
          business?: string | null
          case_id: string
          composite_risk?: number | null
          data_date?: string
          data_version?: string
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          i1?: number | null
          i2?: number | null
          i3?: number | null
          mitigation_priority?: string | null
          p1?: number | null
          p2?: number | null
          p3?: number | null
          sample_size?: number
          score1?: number | null
          score2?: number | null
          score3?: number | null
          source?: string
          survival_prob?: number | null
          time_horizon?: string | null
        }
        Update: {
          business?: string | null
          case_id?: string
          composite_risk?: number | null
          data_date?: string
          data_version?: string
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          i1?: number | null
          i2?: number | null
          i3?: number | null
          mitigation_priority?: string | null
          p1?: number | null
          p2?: number | null
          p3?: number | null
          sample_size?: number
          score1?: number | null
          score2?: number | null
          score3?: number | null
          source?: string
          survival_prob?: number | null
          time_horizon?: string | null
        }
        Relationships: []
      }
      analysis_run_logs: {
        Row: {
          analysis_id: string
          benchmarks: Json
          created_at: string
          engine_version: string | null
          financial_core: Json
          geo: string | null
          id: string
          input: Json
          inserted_at: string
          metadata: Json
          model_type: string | null
          monte_carlo: Json
          pl36: Json
          risk_summary: Json
          rvce: Json
          rvce_version: string | null
          sector: string | null
          source: string
          status: string | null
          tier: string
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          benchmarks?: Json
          created_at?: string
          engine_version?: string | null
          financial_core?: Json
          geo?: string | null
          id?: string
          input?: Json
          inserted_at?: string
          metadata?: Json
          model_type?: string | null
          monte_carlo?: Json
          pl36?: Json
          risk_summary?: Json
          rvce?: Json
          rvce_version?: string | null
          sector?: string | null
          source?: string
          status?: string | null
          tier?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          benchmarks?: Json
          created_at?: string
          engine_version?: string | null
          financial_core?: Json
          geo?: string | null
          id?: string
          input?: Json
          inserted_at?: string
          metadata?: Json
          model_type?: string | null
          monte_carlo?: Json
          pl36?: Json
          risk_summary?: Json
          rvce?: Json
          rvce_version?: string | null
          sector?: string | null
          source?: string
          status?: string | null
          tier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_scenario: {
        Row: {
          base_ebitda_yr5: number | null
          base_irr: number | null
          base_npv: number | null
          base_rev_yr5: number | null
          bear_ebitda_yr5: number | null
          bear_irr: number | null
          bear_npv: number | null
          bear_rev_yr5: number | null
          bull_ebitda_yr5: number | null
          bull_irr: number | null
          bull_npv: number | null
          bull_rev_yr5: number | null
          business: string | null
          case_id: string
          data_date: string
          data_version: string
          npv_range: number | null
          sample_size: number
          scenario_grade: string | null
          source: string
          upside_downside: number | null
          wacc: number | null
        }
        Insert: {
          base_ebitda_yr5?: number | null
          base_irr?: number | null
          base_npv?: number | null
          base_rev_yr5?: number | null
          bear_ebitda_yr5?: number | null
          bear_irr?: number | null
          bear_npv?: number | null
          bear_rev_yr5?: number | null
          bull_ebitda_yr5?: number | null
          bull_irr?: number | null
          bull_npv?: number | null
          bull_rev_yr5?: number | null
          business?: string | null
          case_id: string
          data_date?: string
          data_version?: string
          npv_range?: number | null
          sample_size?: number
          scenario_grade?: string | null
          source?: string
          upside_downside?: number | null
          wacc?: number | null
        }
        Update: {
          base_ebitda_yr5?: number | null
          base_irr?: number | null
          base_npv?: number | null
          base_rev_yr5?: number | null
          bear_ebitda_yr5?: number | null
          bear_irr?: number | null
          bear_npv?: number | null
          bear_rev_yr5?: number | null
          bull_ebitda_yr5?: number | null
          bull_irr?: number | null
          bull_npv?: number | null
          bull_rev_yr5?: number | null
          business?: string | null
          case_id?: string
          data_date?: string
          data_version?: string
          npv_range?: number | null
          sample_size?: number
          scenario_grade?: string | null
          source?: string
          upside_downside?: number | null
          wacc?: number | null
        }
        Relationships: []
      }
      analysis_self_learning: {
        Row: {
          adjustments: Json
          analysis_id: string
          benchmark_alignment: number | null
          evaluated_at: string
          global_status: string
          id: string
          issues: Json
          learning_config_version: number | null
          mc_stability: number | null
          numeric_consistency: number | null
          pl36_coherence: number | null
          rvce_agreement: number | null
          user_id: string | null
        }
        Insert: {
          adjustments?: Json
          analysis_id: string
          benchmark_alignment?: number | null
          evaluated_at?: string
          global_status?: string
          id?: string
          issues?: Json
          learning_config_version?: number | null
          mc_stability?: number | null
          numeric_consistency?: number | null
          pl36_coherence?: number | null
          rvce_agreement?: number | null
          user_id?: string | null
        }
        Update: {
          adjustments?: Json
          analysis_id?: string
          benchmark_alignment?: number | null
          evaluated_at?: string
          global_status?: string
          id?: string
          issues?: Json
          learning_config_version?: number | null
          mc_stability?: number | null
          numeric_consistency?: number | null
          pl36_coherence?: number | null
          rvce_agreement?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_tam_sam_som: {
        Row: {
          arpu_implied: number | null
          bottoms_up_rev_yr1_m: number | null
          bottoms_up_rev_yr3_m: number | null
          business: string | null
          case_id: string
          data_date: string
          data_version: string
          industry: string | null
          market_growth_yr: number | null
          market_signal: string | null
          penetration_needed: number | null
          sam_m: number | null
          sam_tam: number | null
          sample_size: number
          som_sam_yr1: number | null
          som_sam_yr3: number | null
          som_yr1_m: number | null
          som_yr3_m: number | null
          source: string
          tam_b: number | null
          tb_vs_bu_gap: string | null
          total_users_in_tam: number | null
        }
        Insert: {
          arpu_implied?: number | null
          bottoms_up_rev_yr1_m?: number | null
          bottoms_up_rev_yr3_m?: number | null
          business?: string | null
          case_id: string
          data_date?: string
          data_version?: string
          industry?: string | null
          market_growth_yr?: number | null
          market_signal?: string | null
          penetration_needed?: number | null
          sam_m?: number | null
          sam_tam?: number | null
          sample_size?: number
          som_sam_yr1?: number | null
          som_sam_yr3?: number | null
          som_yr1_m?: number | null
          som_yr3_m?: number | null
          source?: string
          tam_b?: number | null
          tb_vs_bu_gap?: string | null
          total_users_in_tam?: number | null
        }
        Update: {
          arpu_implied?: number | null
          bottoms_up_rev_yr1_m?: number | null
          bottoms_up_rev_yr3_m?: number | null
          business?: string | null
          case_id?: string
          data_date?: string
          data_version?: string
          industry?: string | null
          market_growth_yr?: number | null
          market_signal?: string | null
          penetration_needed?: number | null
          sam_m?: number | null
          sam_tam?: number | null
          sample_size?: number
          som_sam_yr1?: number | null
          som_sam_yr3?: number | null
          som_yr1_m?: number | null
          som_yr3_m?: number | null
          source?: string
          tam_b?: number | null
          tb_vs_bu_gap?: string | null
          total_users_in_tam?: number | null
        }
        Relationships: []
      }
      analysis_unit_economics: {
        Row: {
          annual_churn: number | null
          arpu: number | null
          business: string | null
          cac: number | null
          cac_payback_mo: number | null
          case_id: string
          cohort_ltv_m12: number | null
          cohort_ltv_m3: number | null
          cohort_ltv_m6: number | null
          data_date: string
          data_version: string
          gm: number | null
          health_signal: string | null
          ltv: number | null
          ltv_cac: number | null
          ltv_tier: string | null
          magic_number: number | null
          monthly_churn: number | null
          n_12mo_retention: number | null
          nrr_net_rev_ret: number | null
          payback_ok: number | null
          rule_of_40: number | null
          sample_size: number
          source: string
        }
        Insert: {
          annual_churn?: number | null
          arpu?: number | null
          business?: string | null
          cac?: number | null
          cac_payback_mo?: number | null
          case_id: string
          cohort_ltv_m12?: number | null
          cohort_ltv_m3?: number | null
          cohort_ltv_m6?: number | null
          data_date?: string
          data_version?: string
          gm?: number | null
          health_signal?: string | null
          ltv?: number | null
          ltv_cac?: number | null
          ltv_tier?: string | null
          magic_number?: number | null
          monthly_churn?: number | null
          n_12mo_retention?: number | null
          nrr_net_rev_ret?: number | null
          payback_ok?: number | null
          rule_of_40?: number | null
          sample_size?: number
          source?: string
        }
        Update: {
          annual_churn?: number | null
          arpu?: number | null
          business?: string | null
          cac?: number | null
          cac_payback_mo?: number | null
          case_id?: string
          cohort_ltv_m12?: number | null
          cohort_ltv_m3?: number | null
          cohort_ltv_m6?: number | null
          data_date?: string
          data_version?: string
          gm?: number | null
          health_signal?: string | null
          ltv?: number | null
          ltv_cac?: number | null
          ltv_tier?: string | null
          magic_number?: number | null
          monthly_churn?: number | null
          n_12mo_retention?: number | null
          nrr_net_rev_ret?: number | null
          payback_ok?: number | null
          rule_of_40?: number | null
          sample_size?: number
          source?: string
        }
        Relationships: []
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
          access_token: string | null
          account_id: string | null
          id: string
          is_active: boolean
          last_tested: string | null
          page_id: string | null
          platform: string
          refresh_token: string | null
          token_expires: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          id?: string
          is_active?: boolean
          last_tested?: string | null
          page_id?: string | null
          platform: string
          refresh_token?: string | null
          token_expires?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          id?: string
          is_active?: boolean
          last_tested?: string | null
          page_id?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires?: string | null
          updated_at?: string
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
      benchmark_calibration: {
        Row: {
          bias_pct: number | null
          confidence_adjustment: number
          geo_region: string
          id: string
          last_updated: string
          mape: number | null
          mean_actual: number | null
          mean_predicted: number | null
          metric_name: string
          sample_size: number
          sector_level1: string
          sector_level2: string
        }
        Insert: {
          bias_pct?: number | null
          confidence_adjustment?: number
          geo_region?: string
          id?: string
          last_updated?: string
          mape?: number | null
          mean_actual?: number | null
          mean_predicted?: number | null
          metric_name: string
          sample_size?: number
          sector_level1: string
          sector_level2?: string
        }
        Update: {
          bias_pct?: number | null
          confidence_adjustment?: number
          geo_region?: string
          id?: string
          last_updated?: string
          mape?: number | null
          mean_actual?: number | null
          mean_predicted?: number | null
          metric_name?: string
          sample_size?: number
          sector_level1?: string
          sector_level2?: string
        }
        Relationships: []
      }
      benchmark_ingestion_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          provenance_id: string | null
          rows_fetched: number | null
          rows_inserted: number | null
          rows_skipped: number | null
          rows_updated: number | null
          source_name: string
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          provenance_id?: string | null
          rows_fetched?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          source_name: string
          started_at?: string
          status: string
          triggered_by?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          provenance_id?: string | null
          rows_fetched?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          source_name?: string
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_ingestion_runs_provenance_id_fkey"
            columns: ["provenance_id"]
            isOneToOne: false
            referencedRelation: "data_provenance"
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
          data_date: string
          data_version: string
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
          sample_size: number
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
          source: string
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
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
          sample_size?: number
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
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
          sample_size?: number
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
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
          data_date: string
          data_version: string
          geo_region: string | null
          id: number
          rent_multiplier: number | null
          sample_size: number
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
          source: string
          wage_multiplier: number | null
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country?: string | null
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          rent_multiplier?: number | null
          sample_size?: number
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
          wage_multiplier?: number | null
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country?: string | null
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          rent_multiplier?: number | null
          sample_size?: number
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
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
          data_date: string
          data_version: string
          geo_region: string | null
          id: number
          late_payment_rate: number | null
          max_safe_invoice_to_rev_ratio: number | null
          safe_dscr_threshold: number | null
          sample_size: number
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
          source: string
        }
        Insert: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sample_size?: number
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
        }
        Update: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sample_size?: number
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
        }
        Relationships: []
      }
      benchmark_master_risk: {
        Row: {
          business_model: string | null
          city_tier: string | null
          company_stage: string | null
          country: string | null
          data_date: string
          data_version: string
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
          sample_size: number
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
          source: string
        }
        Insert: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
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
          sample_size?: number
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
        }
        Update: {
          business_model?: string | null
          city_tier?: string | null
          company_stage?: string | null
          country?: string | null
          data_date?: string
          data_version?: string
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
          sample_size?: number
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
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
          data_date: string
          data_version: string
          geo_region: string | null
          id: number
          ltv_cac_ratio_p25: number | null
          ltv_cac_ratio_p50: number | null
          ltv_cac_ratio_p75: number | null
          ltv_p25: number | null
          ltv_p50: number | null
          ltv_p75: number | null
          retention_12m: number | null
          sample_size: number
          sector_level1: string
          sector_level2: string | null
          size_bucket: string | null
          source: string
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
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sample_size?: number
          sector_level1: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
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
          data_date?: string
          data_version?: string
          geo_region?: string | null
          id?: number
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sample_size?: number
          sector_level1?: string
          sector_level2?: string | null
          size_bucket?: string | null
          source?: string
        }
        Relationships: []
      }
      benchmark_sources: {
        Row: {
          benchmark_id: string | null
          created_at: string | null
          id: string
          metric_name: string | null
          provenance_id: string | null
          weight: number | null
        }
        Insert: {
          benchmark_id?: string | null
          created_at?: string | null
          id?: string
          metric_name?: string | null
          provenance_id?: string | null
          weight?: number | null
        }
        Update: {
          benchmark_id?: string | null
          created_at?: string | null
          id?: string
          metric_name?: string | null
          provenance_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_sources_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "industry_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_sources_provenance_id_fkey"
            columns: ["provenance_id"]
            isOneToOne: false
            referencedRelation: "data_provenance"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_store: {
        Row: {
          created_at: string | null
          geo_scope: string
          id: string
          industry_type: string
          is_active: boolean | null
          notes: string | null
          p10: number
          p25: number
          p50: number
          p75: number
          p90: number
          parameter: string
          sample_size: number | null
          source: string
          source_year: number
          unit: string
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          geo_scope?: string
          id?: string
          industry_type: string
          is_active?: boolean | null
          notes?: string | null
          p10: number
          p25: number
          p50: number
          p75: number
          p90: number
          parameter: string
          sample_size?: number | null
          source: string
          source_year: number
          unit: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          geo_scope?: string
          id?: string
          industry_type?: string
          is_active?: boolean | null
          notes?: string | null
          p10?: number
          p25?: number
          p50?: number
          p75?: number
          p90?: number
          parameter?: string
          sample_size?: number | null
          source?: string
          source_year?: number
          unit?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      benchmarks_v2_core: {
        Row: {
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at: string | null
          days_payable: number | null
          days_receivable: number | null
          ebitda_margin_p50: number | null
          geo_region: string
          gm_margin_p25: number | null
          gm_margin_p50: number | null
          gm_margin_p75: number | null
          id: string
          inventory_turnover: number | null
          marketing_pct_rev_p50: number | null
          op_margin_p50: number | null
          payroll_pct_rev_p50: number | null
          rent_pct_rev_p50: number | null
          revenue_growth_yoy_p50: number | null
          revenue_volatility: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Insert: {
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at?: string | null
          days_payable?: number | null
          days_receivable?: number | null
          ebitda_margin_p50?: number | null
          geo_region: string
          gm_margin_p25?: number | null
          gm_margin_p50?: number | null
          gm_margin_p75?: number | null
          id?: string
          inventory_turnover?: number | null
          marketing_pct_rev_p50?: number | null
          op_margin_p50?: number | null
          payroll_pct_rev_p50?: number | null
          rent_pct_rev_p50?: number | null
          revenue_growth_yoy_p50?: number | null
          revenue_volatility?: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Update: {
          business_model?: string
          city_tier?: string
          company_stage?: string
          country?: string
          created_at?: string | null
          days_payable?: number | null
          days_receivable?: number | null
          ebitda_margin_p50?: number | null
          geo_region?: string
          gm_margin_p25?: number | null
          gm_margin_p50?: number | null
          gm_margin_p75?: number | null
          id?: string
          inventory_turnover?: number | null
          marketing_pct_rev_p50?: number | null
          op_margin_p50?: number | null
          payroll_pct_rev_p50?: number | null
          rent_pct_rev_p50?: number | null
          revenue_growth_yoy_p50?: number | null
          revenue_volatility?: number | null
          sector_level1?: string
          sector_level2?: string
          size_bucket?: string
        }
        Relationships: []
      }
      benchmarks_v2_geo: {
        Row: {
          business_model: string
          city_tier: string
          company_stage: string
          consumer_spend_index: number | null
          cost_of_living_index: number | null
          country: string
          created_at: string | null
          geo_region: string
          id: string
          rent_multiplier: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
          wage_multiplier: number | null
        }
        Insert: {
          business_model: string
          city_tier: string
          company_stage: string
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country: string
          created_at?: string | null
          geo_region: string
          id?: string
          rent_multiplier?: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
          wage_multiplier?: number | null
        }
        Update: {
          business_model?: string
          city_tier?: string
          company_stage?: string
          consumer_spend_index?: number | null
          cost_of_living_index?: number | null
          country?: string
          created_at?: string | null
          geo_region?: string
          id?: string
          rent_multiplier?: number | null
          sector_level1?: string
          sector_level2?: string
          size_bucket?: string
          wage_multiplier?: number | null
        }
        Relationships: []
      }
      benchmarks_v2_invoice: {
        Row: {
          avg_invoice_terms_days: number | null
          bad_debt_pct_rev: number | null
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at: string | null
          geo_region: string
          id: string
          late_payment_rate: number | null
          max_safe_invoice_to_rev_ratio: number | null
          safe_dscr_threshold: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Insert: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at?: string | null
          geo_region: string
          id?: string
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Update: {
          avg_invoice_terms_days?: number | null
          bad_debt_pct_rev?: number | null
          business_model?: string
          city_tier?: string
          company_stage?: string
          country?: string
          created_at?: string | null
          geo_region?: string
          id?: string
          late_payment_rate?: number | null
          max_safe_invoice_to_rev_ratio?: number | null
          safe_dscr_threshold?: number | null
          sector_level1?: string
          sector_level2?: string
          size_bucket?: string
        }
        Relationships: []
      }
      benchmarks_v2_risk: {
        Row: {
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at: string | null
          failure_mode_1: string | null
          failure_mode_2: string | null
          failure_mode_3: string | null
          geo_region: string
          id: string
          median_survival_years: number | null
          risk_customer_concentration: number | null
          risk_market_volatility: number | null
          risk_operational: number | null
          risk_regulatory: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Insert: {
          business_model: string
          city_tier: string
          company_stage: string
          country: string
          created_at?: string | null
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          geo_region: string
          id?: string
          median_survival_years?: number | null
          risk_customer_concentration?: number | null
          risk_market_volatility?: number | null
          risk_operational?: number | null
          risk_regulatory?: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Update: {
          business_model?: string
          city_tier?: string
          company_stage?: string
          country?: string
          created_at?: string | null
          failure_mode_1?: string | null
          failure_mode_2?: string | null
          failure_mode_3?: string | null
          geo_region?: string
          id?: string
          median_survival_years?: number | null
          risk_customer_concentration?: number | null
          risk_market_volatility?: number | null
          risk_operational?: number | null
          risk_regulatory?: number | null
          sector_level1?: string
          sector_level2?: string
          size_bucket?: string
        }
        Relationships: []
      }
      benchmarks_v2_unit_econ: {
        Row: {
          arpu_median: number | null
          business_model: string
          cac_p25: number | null
          cac_p50: number | null
          cac_p75: number | null
          cac_payback_p25: number | null
          cac_payback_p50: number | null
          cac_payback_p75: number | null
          churn_monthly_p25: number | null
          churn_monthly_p50: number | null
          churn_monthly_p75: number | null
          city_tier: string
          company_stage: string
          country: string
          created_at: string | null
          geo_region: string
          id: string
          ltv_cac_ratio_p25: number | null
          ltv_cac_ratio_p50: number | null
          ltv_cac_ratio_p75: number | null
          ltv_p25: number | null
          ltv_p50: number | null
          ltv_p75: number | null
          retention_12m: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Insert: {
          arpu_median?: number | null
          business_model: string
          cac_p25?: number | null
          cac_p50?: number | null
          cac_p75?: number | null
          cac_payback_p25?: number | null
          cac_payback_p50?: number | null
          cac_payback_p75?: number | null
          churn_monthly_p25?: number | null
          churn_monthly_p50?: number | null
          churn_monthly_p75?: number | null
          city_tier: string
          company_stage: string
          country: string
          created_at?: string | null
          geo_region: string
          id?: string
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sector_level1: string
          sector_level2: string
          size_bucket: string
        }
        Update: {
          arpu_median?: number | null
          business_model?: string
          cac_p25?: number | null
          cac_p50?: number | null
          cac_p75?: number | null
          cac_payback_p25?: number | null
          cac_payback_p50?: number | null
          cac_payback_p75?: number | null
          churn_monthly_p25?: number | null
          churn_monthly_p50?: number | null
          churn_monthly_p75?: number | null
          city_tier?: string
          company_stage?: string
          country?: string
          created_at?: string | null
          geo_region?: string
          id?: string
          ltv_cac_ratio_p25?: number | null
          ltv_cac_ratio_p50?: number | null
          ltv_cac_ratio_p75?: number | null
          ltv_p25?: number | null
          ltv_p50?: number | null
          ltv_p75?: number | null
          retention_12m?: number | null
          sector_level1?: string
          sector_level2?: string
          size_bucket?: string
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
        Relationships: []
      }
      data_provenance: {
        Row: {
          allowed_uses: string[] | null
          coverage_description: string | null
          created_at: string | null
          dataset_type: string
          date_range_end: string | null
          date_range_start: string | null
          id: string
          last_ingested_at: string | null
          license_type: string
          notes: string | null
          record_count: number | null
          restricted_uses: string[] | null
          source_name: string
          source_url: string | null
        }
        Insert: {
          allowed_uses?: string[] | null
          coverage_description?: string | null
          created_at?: string | null
          dataset_type: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          last_ingested_at?: string | null
          license_type: string
          notes?: string | null
          record_count?: number | null
          restricted_uses?: string[] | null
          source_name: string
          source_url?: string | null
        }
        Update: {
          allowed_uses?: string[] | null
          coverage_description?: string | null
          created_at?: string | null
          dataset_type?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          last_ingested_at?: string | null
          license_type?: string
          notes?: string | null
          record_count?: number | null
          restricted_uses?: string[] | null
          source_name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      doc_generation_jobs: {
        Row: {
          analysis_id: string | null
          cache_hit: boolean | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_id: string
          output_size_kb: number | null
          output_url: string | null
          priority: number | null
          processing_ms: number | null
          retry_count: number | null
          status: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          cache_hit?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_id: string
          output_size_kb?: number | null
          output_url?: string | null
          priority?: number | null
          processing_ms?: number | null
          retry_count?: number | null
          status?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          cache_hit?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_id?: string
          output_size_kb?: number | null
          output_url?: string | null
          priority?: number | null
          processing_ms?: number | null
          retry_count?: number | null
          status?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: []
      }
      doc_performance_signals: {
        Row: {
          context: Json | null
          created_at: string | null
          document_id: string | null
          id: string
          signal_type: string
          signal_value: number | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          signal_type: string
          signal_value?: number | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
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
        ]
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
      document_downloads: {
        Row: {
          download_format: string
          downloaded_at: string
          id: string
          ip_hash: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          download_format?: string
          downloaded_at?: string
          id?: string
          ip_hash?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          download_format?: string
          downloaded_at?: string
          id?: string
          ip_hash?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: []
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
      email_send_log: {
        Row: {
          email: string
          id: string
          resend_id: string | null
          sent_at: string
          template_key: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          resend_id?: string | null
          sent_at?: string
          template_key: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          resend_id?: string | null
          sent_at?: string
          template_key?: string
          user_id?: string
        }
        Relationships: []
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
      engine_learning_signals: {
        Row: {
          actual_value: number
          analysis_id: string | null
          created_at: string
          geo_region: string | null
          id: string
          metric_name: string
          predicted_value: number
          sector_level1: string
          sector_level2: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          actual_value: number
          analysis_id?: string | null
          created_at?: string
          geo_region?: string | null
          id?: string
          metric_name: string
          predicted_value: number
          sector_level1: string
          sector_level2?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          actual_value?: number
          analysis_id?: string | null
          created_at?: string
          geo_region?: string | null
          id?: string
          metric_name?: string
          predicted_value?: number
          sector_level1?: string
          sector_level2?: string | null
          source?: string
          user_id?: string | null
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
          business_type: string
          confidence_threshold: number | null
          consecutive_passes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_ranges: Json
          failure_count: number | null
          id: string
          input_data: Json
          is_active: boolean | null
          last_failed_at: string | null
          last_passed_at: string | null
          location: string
          tags: string[] | null
          tolerance_pct: number | null
          total_runs: number | null
          updated_at: string | null
          vector_code: string | null
          version: string | null
        }
        Insert: {
          business_type: string
          confidence_threshold?: number | null
          consecutive_passes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_ranges: Json
          failure_count?: number | null
          id?: string
          input_data: Json
          is_active?: boolean | null
          last_failed_at?: string | null
          last_passed_at?: string | null
          location: string
          tags?: string[] | null
          tolerance_pct?: number | null
          total_runs?: number | null
          updated_at?: string | null
          vector_code?: string | null
          version?: string | null
        }
        Update: {
          business_type?: string
          confidence_threshold?: number | null
          consecutive_passes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_ranges?: Json
          failure_count?: number | null
          id?: string
          input_data?: Json
          is_active?: boolean | null
          last_failed_at?: string | null
          last_passed_at?: string | null
          location?: string
          tags?: string[] | null
          tolerance_pct?: number | null
          total_runs?: number | null
          updated_at?: string | null
          vector_code?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "golden_test_vectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          gross_margin_p10: number | null
          gross_margin_p25: number | null
          gross_margin_p75: number | null
          gross_margin_p90: number | null
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
          net_margin_p10: number | null
          net_margin_p25: number | null
          net_margin_p75: number | null
          net_margin_p90: number | null
          orders_per_client: number | null
          other_fixed: number | null
          region: string | null
          rent_fixed: number | null
          revenue_volatility_pct: number | null
          salaries_fixed: number | null
          sample_size: number | null
          seasonality_coefficients: Json | null
          source: string | null
          source_count: number | null
          survival_rate_1yr: number | null
          survival_rate_3yr: number | null
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
          gross_margin_p10?: number | null
          gross_margin_p25?: number | null
          gross_margin_p75?: number | null
          gross_margin_p90?: number | null
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
          net_margin_p10?: number | null
          net_margin_p25?: number | null
          net_margin_p75?: number | null
          net_margin_p90?: number | null
          orders_per_client?: number | null
          other_fixed?: number | null
          region?: string | null
          rent_fixed?: number | null
          revenue_volatility_pct?: number | null
          salaries_fixed?: number | null
          sample_size?: number | null
          seasonality_coefficients?: Json | null
          source?: string | null
          source_count?: number | null
          survival_rate_1yr?: number | null
          survival_rate_3yr?: number | null
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
          gross_margin_p10?: number | null
          gross_margin_p25?: number | null
          gross_margin_p75?: number | null
          gross_margin_p90?: number | null
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
          net_margin_p10?: number | null
          net_margin_p25?: number | null
          net_margin_p75?: number | null
          net_margin_p90?: number | null
          orders_per_client?: number | null
          other_fixed?: number | null
          region?: string | null
          rent_fixed?: number | null
          revenue_volatility_pct?: number | null
          salaries_fixed?: number | null
          sample_size?: number | null
          seasonality_coefficients?: Json | null
          source?: string | null
          source_count?: number | null
          survival_rate_1yr?: number | null
          survival_rate_3yr?: number | null
          utilities_fixed?: number | null
        }
        Relationships: []
      }
      industry_distributions: {
        Row: {
          id: string
          last_updated: string | null
          mean: number
          median: number | null
          metric_name: string
          naics_code: string
          p10: number | null
          p25: number | null
          p75: number | null
          p90: number | null
          sample_size: number | null
          segment: string
          source: string | null
          stddev: number
        }
        Insert: {
          id?: string
          last_updated?: string | null
          mean: number
          median?: number | null
          metric_name: string
          naics_code: string
          p10?: number | null
          p25?: number | null
          p75?: number | null
          p90?: number | null
          sample_size?: number | null
          segment?: string
          source?: string | null
          stddev?: number
        }
        Update: {
          id?: string
          last_updated?: string | null
          mean?: number
          median?: number | null
          metric_name?: string
          naics_code?: string
          p10?: number | null
          p25?: number | null
          p75?: number | null
          p90?: number | null
          sample_size?: number | null
          segment?: string
          source?: string | null
          stddev?: number
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
        Relationships: [
          {
            foreignKeyName: "invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
      quality_metrics_daily: {
        Row: {
          avg_confidence_score: number | null
          avg_consensus_score: number | null
          benchmark_coverage_rate: number | null
          created_at: string
          error_rate_by_code: Json | null
          id: string
          inconsistency_rate: number | null
          metric_date: string
          p50_latency_ms: number | null
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          reconciliation_rate: number | null
          total_analyses: number | null
        }
        Insert: {
          avg_confidence_score?: number | null
          avg_consensus_score?: number | null
          benchmark_coverage_rate?: number | null
          created_at?: string
          error_rate_by_code?: Json | null
          id?: string
          inconsistency_rate?: number | null
          metric_date: string
          p50_latency_ms?: number | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          reconciliation_rate?: number | null
          total_analyses?: number | null
        }
        Update: {
          avg_confidence_score?: number | null
          avg_consensus_score?: number | null
          benchmark_coverage_rate?: number | null
          created_at?: string
          error_rate_by_code?: Json | null
          id?: string
          inconsistency_rate?: number | null
          metric_date?: string
          p50_latency_ms?: number | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          reconciliation_rate?: number | null
          total_analyses?: number | null
        }
        Relationships: []
      }
      quantis_learning_config: {
        Row: {
          created_at: string
          created_by: string
          is_active: boolean
          notes: string | null
          priors: Json
          prompt_hints: Json
          quality_metrics: Json
          segments_count: number
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          is_active?: boolean
          notes?: string | null
          priors?: Json
          prompt_hints?: Json
          quality_metrics?: Json
          segments_count?: number
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          is_active?: boolean
          notes?: string | null
          priors?: Json
          prompt_hints?: Json
          quality_metrics?: Json
          segments_count?: number
          version?: number
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
      reconciliation_log: {
        Row: {
          analysis_id: string | null
          checks_json: Json
          created_at: string
          id: string
          reconciled: boolean
          run_id: string
          summary: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          checks_json?: Json
          created_at?: string
          id?: string
          reconciled?: boolean
          run_id: string
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          checks_json?: Json
          created_at?: string
          id?: string
          reconciled?: boolean
          run_id?: string
          summary?: string | null
          user_id?: string | null
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
      report_outputs: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          id: string
          pdf_url: string | null
          report_json: Json
          user_id: string | null
          version: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          report_json: Json
          user_id?: string | null
          version: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          report_json?: Json
          user_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_outputs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
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
      rvce_cache: {
        Row: {
          business_type: string | null
          cache_key: string
          created_at: string
          evidence: Json
          expires_at: string
          id: string
          location: string | null
          observation_count: number
          tier_cap: number
          variable: string
        }
        Insert: {
          business_type?: string | null
          cache_key: string
          created_at?: string
          evidence: Json
          expires_at?: string
          id?: string
          location?: string | null
          observation_count?: number
          tier_cap: number
          variable: string
        }
        Update: {
          business_type?: string | null
          cache_key?: string
          created_at?: string
          evidence?: Json
          expires_at?: string
          id?: string
          location?: string | null
          observation_count?: number
          tier_cap?: number
          variable?: string
        }
        Relationships: []
      }
      rvce_observation_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          id: string
          metric: string
          observation_value: number | null
          ref_class_id: string
          source_snippet: string | null
          source_url: string | null
        }
        Insert: {
          expires_at?: string
          fetched_at?: string
          id?: string
          metric: string
          observation_value?: number | null
          ref_class_id: string
          source_snippet?: string | null
          source_url?: string | null
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          id?: string
          metric?: string
          observation_value?: number | null
          ref_class_id?: string
          source_snippet?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      rvce_validation_log: {
        Row: {
          analysis_id: string
          created_at: string
          evidence_samples: Json | null
          flags: Json | null
          global_confidence: number | null
          id: string
          latency_ms: number | null
          metrics_count: number | null
          metrics_validation: Json | null
          no_data_count: number | null
          outlier_count: number | null
          reference_classes: Json | null
          rvce_version: string
          status: string | null
          total_observations: number | null
          user_id: string | null
          warn_count: number | null
        }
        Insert: {
          analysis_id: string
          created_at?: string
          evidence_samples?: Json | null
          flags?: Json | null
          global_confidence?: number | null
          id?: string
          latency_ms?: number | null
          metrics_count?: number | null
          metrics_validation?: Json | null
          no_data_count?: number | null
          outlier_count?: number | null
          reference_classes?: Json | null
          rvce_version?: string
          status?: string | null
          total_observations?: number | null
          user_id?: string | null
          warn_count?: number | null
        }
        Update: {
          analysis_id?: string
          created_at?: string
          evidence_samples?: Json | null
          flags?: Json | null
          global_confidence?: number | null
          id?: string
          latency_ms?: number | null
          metrics_count?: number | null
          metrics_validation?: Json | null
          no_data_count?: number | null
          outlier_count?: number | null
          reference_classes?: Json | null
          rvce_version?: string
          status?: string | null
          total_observations?: number | null
          user_id?: string | null
          warn_count?: number | null
        }
        Relationships: []
      }
      safety_evaluations: {
        Row: {
          analysis_id: string | null
          benchmark_versions: Json | null
          blocking_issues: Json | null
          confidence_score: number
          created_at: string | null
          engine_version: string | null
          evaluated_at: string | null
          evaluation_duration_ms: number | null
          evaluator: string | null
          evaluator_version: string | null
          geo_calibration: Json | null
          id: string
          override_by: string | null
          override_reason: string | null
          passed_checks: Json | null
          safety_level: number
          updated_at: string | null
        }
        Insert: {
          analysis_id?: string | null
          benchmark_versions?: Json | null
          blocking_issues?: Json | null
          confidence_score: number
          created_at?: string | null
          engine_version?: string | null
          evaluated_at?: string | null
          evaluation_duration_ms?: number | null
          evaluator?: string | null
          evaluator_version?: string | null
          geo_calibration?: Json | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          passed_checks?: Json | null
          safety_level: number
          updated_at?: string | null
        }
        Update: {
          analysis_id?: string | null
          benchmark_versions?: Json | null
          blocking_issues?: Json | null
          confidence_score?: number
          created_at?: string | null
          engine_version?: string | null
          evaluated_at?: string | null
          evaluation_duration_ms?: number | null
          evaluator?: string | null
          evaluator_version?: string | null
          geo_calibration?: Json | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          passed_checks?: Json | null
          safety_level?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_evaluations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_comparisons: {
        Row: {
          created_at: string
          id: string
          scenario_ids: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scenario_ids: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scenario_ids?: string[]
          user_id?: string
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
      scenarios: {
        Row: {
          analysis_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          is_pinned: boolean
          monte_carlo_result: Json | null
          name: string
          output: Json | null
          params: Json
          scenario_type: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          monte_carlo_result?: Json | null
          name: string
          output?: Json | null
          params: Json
          scenario_type?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          monte_carlo_result?: Json | null
          name?: string
          output?: Json | null
          params?: Json
          scenario_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
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
          unit: string
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
          default_margin_pct: number
          default_overhead_pct: number
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
          pricing_profile: Json
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
        ]
      }
      shared_reports: {
        Row: {
          analysis_id: string
          caption: string | null
          created_at: string | null
          expires_at: string
          headline_verdict: string | null
          id: string
          is_revoked: boolean | null
          kind: string
          og_image_url: string | null
          token: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          analysis_id: string
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          headline_verdict?: string | null
          id?: string
          is_revoked?: boolean | null
          kind?: string
          og_image_url?: string | null
          token?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          analysis_id?: string
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          headline_verdict?: string | null
          id?: string
          is_revoked?: boolean | null
          kind?: string
          og_image_url?: string | null
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
      template_improvement_suggestions: {
        Row: {
          ai_confidence: number | null
          created_at: string
          id: string
          status: string
          suggestion: Json
          template_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          id?: string
          status?: string
          suggestion?: Json
          template_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          id?: string
          status?: string
          suggestion?: Json
          template_id?: string
        }
        Relationships: []
      }
      template_performance_history: {
        Row: {
          avg_rating: number | null
          id: string
          performance_score: number | null
          recorded_date: string
          sample_size: number | null
          template_id: string
          total_signals: number | null
        }
        Insert: {
          avg_rating?: number | null
          id?: string
          performance_score?: number | null
          recorded_date?: string
          sample_size?: number | null
          template_id: string
          total_signals?: number | null
        }
        Update: {
          avg_rating?: number | null
          id?: string
          performance_score?: number | null
          recorded_date?: string
          sample_size?: number | null
          template_id?: string
          total_signals?: number | null
        }
        Relationships: []
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
      training_cases: {
        Row: {
          accuracy_score: number | null
          actual_quantis_outputs: Json | null
          case_name: string
          created_at: string | null
          expected_outputs: Json
          id: string
          industry_id: string
          input_params: Json
          is_active: boolean | null
          last_tested_at: string | null
          provenance_id: string | null
          tags: string[] | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_quantis_outputs?: Json | null
          case_name: string
          created_at?: string | null
          expected_outputs: Json
          id?: string
          industry_id: string
          input_params: Json
          is_active?: boolean | null
          last_tested_at?: string | null
          provenance_id?: string | null
          tags?: string[] | null
        }
        Update: {
          accuracy_score?: number | null
          actual_quantis_outputs?: Json | null
          case_name?: string
          created_at?: string | null
          expected_outputs?: Json
          id?: string
          industry_id?: string
          input_params?: Json
          is_active?: boolean | null
          last_tested_at?: string | null
          provenance_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "training_cases_provenance_id_fkey"
            columns: ["provenance_id"]
            isOneToOne: false
            referencedRelation: "data_provenance"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          analyses_count: number
          created_at: string
          downloads_date: string | null
          downloads_today: number
          id: string
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
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_brand_profiles: {
        Row: {
          accent_color: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          font_preference: string | null
          id: string
          invoice_counter: number | null
          invoice_prefix: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          tax_id: string | null
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
          email?: string | null
          font_preference?: string | null
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          tax_id?: string | null
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
          email?: string | null
          font_preference?: string | null
          id?: string
          invoice_counter?: number | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          tax_id?: string | null
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
      user_settings: {
        Row: {
          bio_text: string | null
          created_at: string | null
          id: string
          pinned_post_text: string | null
          public_profile_slug: string | null
          show_in_teardowns: boolean
          updated_at: string | null
          use_v2_engine: boolean
          user_id: string
        }
        Insert: {
          bio_text?: string | null
          created_at?: string | null
          id?: string
          pinned_post_text?: string | null
          public_profile_slug?: string | null
          show_in_teardowns?: boolean
          updated_at?: string | null
          use_v2_engine?: boolean
          user_id: string
        }
        Update: {
          bio_text?: string | null
          created_at?: string | null
          id?: string
          pinned_post_text?: string | null
          public_profile_slug?: string | null
          show_in_teardowns?: boolean
          updated_at?: string | null
          use_v2_engine?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_validation_progress: {
        Row: {
          analysis_id: string | null
          completed_actions: string[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          completed_actions?: string[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          completed_actions?: string[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_validation_progress_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      autoposter_credentials_safe: {
        Row: {
          account_id: string | null
          has_access_token: boolean | null
          has_refresh_token: boolean | null
          id: string | null
          is_active: boolean | null
          last_tested: string | null
          page_id: string | null
          platform: string | null
          token_expires: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          has_access_token?: never
          has_refresh_token?: never
          id?: string | null
          is_active?: boolean | null
          last_tested?: string | null
          page_id?: string | null
          platform?: string | null
          token_expires?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          has_access_token?: never
          has_refresh_token?: never
          id?: string | null
          is_active?: boolean | null
          last_tested?: string | null
          page_id?: string | null
          platform?: string | null
          token_expires?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_daily_30d: {
        Row: {
          day: string | null
          event_name: string | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      funnel_summary_30d: {
        Row: {
          event_name: string | null
          first_seen: string | null
          last_seen: string | null
          total_events: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      realism_by_industry: {
        Row: {
          avg_score: number | null
          business_type: string | null
          responses: number | null
          std_dev: number | null
          too_optimistic: number | null
          too_pessimistic: number | null
        }
        Relationships: []
      }
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
      check_anonymous_rate_limit: {
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
      claim_anonymous_analysis: {
        Args: { p_analysis_id: string; p_anonymous_session_id: string }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_expired_shares: { Args: never; Returns: undefined }
      cleanup_old_analysis_jobs: { Args: never; Returns: undefined }
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
      consume_analysis_quota: {
        Args: { p_limit: number; p_user_id: string }
        Returns: Json
      }
      consume_download_quota: {
        Args: { p_limit: number; p_user_id: string }
        Returns: Json
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
      get_daily_signups: {
        Args: { days_back?: number }
        Returns: {
          signup_count: number
          signup_date: string
        }[]
      }
      get_latest_audit_timestamp: { Args: never; Returns: string }
      get_lead_email: { Args: { p_lead_id: string }; Returns: string }
      get_monthly_analyses: {
        Args: { months_back?: number }
        Returns: {
          analysis_count: number
          month_year: string
        }[]
      }
      get_my_phone: { Args: never; Returns: string }
      get_next_invoice_number: { Args: { p_user_id: string }; Returns: string }
      get_public_teardown_by_slug: {
        Args: { p_slug: string }
        Returns: {
          confidence_score: number
          founder_display_name: string
          id: string
          idea: string
          idea_summary: string
          industry: string
          location: string
          made_public_at: string
          public_slug: string
          result: Json
        }[]
      }
      get_public_teardowns: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          confidence_score: number
          founder_display_name: string
          headline_verdict: string
          id: string
          idea_summary: string
          industry: string
          location: string
          made_public_at: string
          public_slug: string
        }[]
      }
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
      get_unique_users_with_analysis: { Args: never; Returns: number }
      get_user_activation_score: { Args: { p_user_id: string }; Returns: Json }
      get_user_engagement_stats: { Args: { p_user_id: string }; Returns: Json }
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
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      increment_usage: {
        Args: { p_month_year: string; p_user_id: string }
        Returns: undefined
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
      log_sensitive_access: {
        Args: {
          p_accessed_resource: string
          p_additional_data?: Json
          p_event_type: string
          p_resource_id?: string
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
      record_engine_learning_signal: {
        Args: {
          p_actual: number
          p_analysis_id: string
          p_geo_region: string
          p_metric_name: string
          p_predicted: number
          p_sector_level1: string
          p_sector_level2: string
          p_source?: string
          p_user_id: string
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
      rotate_pii_encryption_key: { Args: never; Returns: Json }
      run_scheduled_cleanup: { Args: never; Returns: Json }
      set_analysis_public: {
        Args: {
          p_analysis_id: string
          p_founder_name?: string
          p_idea_summary?: string
          p_is_public: boolean
        }
        Returns: Json
      }
      track_referral_click: {
        Args: { p_code: string; p_ip_hash?: string; p_user_agent?: string }
        Returns: string
      }
      user_in_shared_pro_team: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      user_owns_subscription: {
        Args: { subscription_user_id: string }
        Returns: boolean
      }
      validate_analysis_run: { Args: { p_analysis_id: string }; Returns: Json }
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
