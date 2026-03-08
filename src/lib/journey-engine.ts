/**
 * Validation Journey Engine — 5-stage progressive validation system
 */

export interface ValidationAction {
  id: string;
  label: string;
  description: string;
}

export interface ValidationStage {
  id: number;
  name: string;
  description: string;
  requiredActions: string[];
  actionLabels: Record<string, ValidationAction>;
  unlocksCriteria: string[];
  confidenceBoost: number;
}

export const VALIDATION_STAGES: ValidationStage[] = [
  {
    id: 1,
    name: 'Idea + Model',
    description: 'Define business model and run base projection',
    requiredActions: ['complete_analysis', 'review_stress_map'],
    actionLabels: {
      complete_analysis: { id: 'complete_analysis', label: 'Run Analysis', description: 'Complete your first business analysis' },
      review_stress_map: { id: 'review_stress_map', label: 'Review Risk Map', description: 'Check the stress map for vulnerabilities' },
    },
    unlocksCriteria: ['Base projection available', 'Risk map reviewed'],
    confidenceBoost: 10,
  },
  {
    id: 2,
    name: 'Customer Discovery',
    description: 'Conduct 10+ customer interviews',
    requiredActions: ['log_interviews_count', 'update_assumptions_from_interviews'],
    actionLabels: {
      log_interviews_count: { id: 'log_interviews_count', label: 'Log Interviews', description: 'Record at least 10 customer interviews' },
      update_assumptions_from_interviews: { id: 'update_assumptions_from_interviews', label: 'Update Assumptions', description: 'Revise model assumptions based on interview findings' },
    },
    unlocksCriteria: ['10+ interviews logged', 'Assumptions updated'],
    confidenceBoost: 15,
  },
  {
    id: 3,
    name: 'Market Test',
    description: 'Run first traffic/lead experiment',
    requiredActions: ['import_actuals_month1', 'recalibrate_model'],
    actionLabels: {
      import_actuals_month1: { id: 'import_actuals_month1', label: 'Import Month 1 Data', description: 'Import your first month of actual performance data' },
      recalibrate_model: { id: 'recalibrate_model', label: 'Recalibrate Model', description: 'Run calibration to update model with real data' },
    },
    unlocksCriteria: ['1 month of actuals', 'Model recalibrated'],
    confidenceBoost: 20,
  },
  {
    id: 4,
    name: 'Traction',
    description: '3+ months of real data vs model',
    requiredActions: ['import_actuals_3months', 'achieve_model_accuracy_70'],
    actionLabels: {
      import_actuals_3months: { id: 'import_actuals_3months', label: 'Import 3+ Months', description: 'Import at least 3 months of actual data' },
      achieve_model_accuracy_70: { id: 'achieve_model_accuracy_70', label: 'Achieve 70%+ Accuracy', description: 'Reach 70% or higher model accuracy score' },
    },
    unlocksCriteria: ['3+ months data', '≥70% model accuracy'],
    confidenceBoost: 25,
  },
  {
    id: 5,
    name: 'Investor Ready',
    description: 'Validated model, export pitch materials',
    requiredActions: ['export_investor_snapshot', 'stress_test_all_scenarios'],
    actionLabels: {
      export_investor_snapshot: { id: 'export_investor_snapshot', label: 'Export Pitch Pack', description: 'Download investor-ready PDF report' },
      stress_test_all_scenarios: { id: 'stress_test_all_scenarios', label: 'Stress Test All', description: 'Run all risk scenarios and verify resilience' },
    },
    unlocksCriteria: ['Pitch materials exported', 'All scenarios tested'],
    confidenceBoost: 30,
  },
];

export function getCurrentStage(completedActions: string[]): ValidationStage {
  for (const stage of VALIDATION_STAGES) {
    const allCompleted = stage.requiredActions.every(a => completedActions.includes(a));
    if (!allCompleted) return stage;
  }
  return VALIDATION_STAGES[VALIDATION_STAGES.length - 1];
}

export function getStageProgress(stageId: number, completedActions: string[]): number {
  const stage = VALIDATION_STAGES.find(s => s.id === stageId);
  if (!stage) return 0;
  const completed = stage.requiredActions.filter(a => completedActions.includes(a)).length;
  return Math.round((completed / stage.requiredActions.length) * 100);
}

export function isStageComplete(stageId: number, completedActions: string[]): boolean {
  const stage = VALIDATION_STAGES.find(s => s.id === stageId);
  if (!stage) return false;
  return stage.requiredActions.every(a => completedActions.includes(a));
}

export function getNextAction(completedActions: string[]): ValidationAction | null {
  const currentStage = getCurrentStage(completedActions);
  for (const actionId of currentStage.requiredActions) {
    if (!completedActions.includes(actionId)) {
      return currentStage.actionLabels[actionId] || null;
    }
  }
  return null;
}

export function getTotalConfidenceBoost(completedActions: string[]): number {
  let boost = 0;
  for (const stage of VALIDATION_STAGES) {
    if (isStageComplete(stage.id, completedActions)) {
      boost += stage.confidenceBoost;
    }
  }
  return boost;
}
