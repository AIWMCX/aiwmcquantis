/**
 * Engagement and Retention System Types
 */

export type EngagementTier = 'new' | 'active' | 'power' | 'dormant' | 'churned';
export type EmailFrequency = 'daily' | 'weekly' | 'monthly' | 'never';
export type NotificationType = 'achievement' | 'feature' | 'tip' | 'system' | 'milestone';

export interface UserEngagement {
  current_streak: number;
  longest_streak: number;
  total_analyses: number;
  total_exports: number;
  activity_score: number;
  engagement_tier: EngagementTier;
  milestones_achieved: string[];
  email_frequency: EmailFrequency;
  last_active_date: string | null;
}

export interface UserNotification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  icon?: string;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: { field: string; operator: '>=' | '=' | '>'; value: number | string };
  reward?: string;
}

export interface StreakMilestone {
  days: number;
  badge: string;
  reward: string | null;
}

// Milestone definitions
export const MILESTONES: Milestone[] = [
  { id: 'first_analysis', name: 'First Steps', description: 'Complete your first analysis', icon: 'rocket', condition: { field: 'total_analyses', operator: '>=', value: 1 } },
  { id: 'five_analyses', name: 'Analyzer', description: 'Complete 5 analyses', icon: 'bar-chart-3', condition: { field: 'total_analyses', operator: '>=', value: 5 } },
  { id: 'ten_analyses', name: 'Power User', description: 'Complete 10 analyses', icon: 'zap', condition: { field: 'total_analyses', operator: '>=', value: 10 } },
  { id: 'first_export', name: 'Publisher', description: 'Export your first PDF', icon: 'file-text', condition: { field: 'total_exports', operator: '>=', value: 1 } },
  { id: 'five_exports', name: 'Report Master', description: 'Export 5 PDFs', icon: 'files', condition: { field: 'total_exports', operator: '>=', value: 5 } },
  { id: 'plus_member', name: 'Plus Club', description: 'Subscribe to Plus', icon: 'crown', condition: { field: 'plan_id', operator: '=', value: 'plus' } },
];

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, badge: 'Getting Started', reward: null },
  { days: 7, badge: 'Week Warrior', reward: 'extra_analysis' },
  { days: 14, badge: 'Dedicated', reward: null },
  { days: 30, badge: 'Power Analyst', reward: 'pdf_template' },
];

// Churn risk thresholds
export const CHURN_RISK_THRESHOLDS = {
  healthy: { min: 0, max: 30 },
  atRisk: { min: 31, max: 50 },
  highRisk: { min: 51, max: 70 },
  churning: { min: 71, max: 100 },
} as const;

export function getChurnRiskLevel(score: number): 'healthy' | 'atRisk' | 'highRisk' | 'churning' {
  if (score <= 30) return 'healthy';
  if (score <= 50) return 'atRisk';
  if (score <= 70) return 'highRisk';
  return 'churning';
}
