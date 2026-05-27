 import { useState, useEffect, useCallback } from 'react';
 import { trackEvent } from '@/lib/analytics';
 
 const STORAGE_KEY = 'quantis_onboarding';
 
 interface OnboardingState {
   hasSeenWelcome: boolean;
   hasCompletedQuickStart: boolean;
   analysisCount: number;
   hasSeenUpgradePrompt: boolean;
   hasSeenFirstAnalysisCelebration: boolean;
   dismissedAt?: string;
 }
 
 const DEFAULT_STATE: OnboardingState = {
   hasSeenWelcome: false,
   hasCompletedQuickStart: false,
   analysisCount: 0,
   hasSeenUpgradePrompt: false,
   hasSeenFirstAnalysisCelebration: false,
 };
 
 function getStoredState(): OnboardingState {
   if (typeof window === 'undefined') return DEFAULT_STATE;
   try {
     const stored = localStorage.getItem(STORAGE_KEY);
     if (stored) {
       return { ...DEFAULT_STATE, ...JSON.parse(stored) };
     }
   } catch {
     // Invalid JSON, reset
   }
   return DEFAULT_STATE;
 }
 
 function saveState(state: OnboardingState): void {
   if (typeof window === 'undefined') return;
   try {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
   } catch {
     // Storage full or unavailable
   }
 }
 
 export function useOnboarding() {
   const [state, setState] = useState<OnboardingState>(getStoredState);
   
   // Sync to localStorage on change
   useEffect(() => {
     saveState(state);
   }, [state]);
 
   // Mark welcome as seen
   const markWelcomeSeen = useCallback(() => {
     setState(prev => ({ ...prev, hasSeenWelcome: true }));
     trackEvent('onboarding_welcome_seen');
   }, []);
 
   // Mark quick start as completed
   const markQuickStartComplete = useCallback(() => {
     setState(prev => ({ ...prev, hasCompletedQuickStart: true }));
     trackEvent('onboarding_quickstart_completed');
   }, []);
 
   // Increment analysis count
   const incrementAnalysisCount = useCallback(() => {
     setState(prev => ({ ...prev, analysisCount: prev.analysisCount + 1 }));
   }, []);
 
   // Mark first analysis celebration as seen
   const markFirstAnalysisCelebrationSeen = useCallback(() => {
     setState(prev => ({ ...prev, hasSeenFirstAnalysisCelebration: true }));
     trackEvent('onboarding_first_analysis_celebration');
   }, []);
 
   // Mark upgrade prompt as seen
   const markUpgradePromptSeen = useCallback(() => {
     setState(prev => ({ ...prev, hasSeenUpgradePrompt: true }));
     trackEvent('onboarding_upgrade_prompt_seen');
   }, []);
 
   // Dismiss onboarding entirely
   const dismissOnboarding = useCallback(() => {
     setState(prev => ({
       ...prev,
       hasSeenWelcome: true,
       hasCompletedQuickStart: true,
       dismissedAt: new Date().toISOString(),
     }));
     trackEvent('onboarding_dismissed');
   }, []);
 
   // Reset for testing
   const resetOnboarding = useCallback(() => {
     setState(DEFAULT_STATE);
     trackEvent('onboarding_reset');
   }, []);
 
  // Computed flags
  // Note: QuickStartWizard's own Step 0 is a welcome screen, so we don't
  // gate it behind a separate WelcomeModal (which isn't mounted anywhere).
  // First-time signed-in users on /app see the wizard immediately.
  const shouldShowWelcome = !state.hasSeenWelcome;
  const shouldShowQuickStart = !state.hasCompletedQuickStart;
  const shouldShowFirstAnalysisCelebration = 
    state.analysisCount === 1 && !state.hasSeenFirstAnalysisCelebration;
  const shouldShowUpgradePrompt = 
    state.analysisCount >= 2 && !state.hasSeenUpgradePrompt;
 
   return {
     state,
     shouldShowWelcome,
     shouldShowQuickStart,
     shouldShowFirstAnalysisCelebration,
     shouldShowUpgradePrompt,
     markWelcomeSeen,
     markQuickStartComplete,
     incrementAnalysisCount,
     markFirstAnalysisCelebrationSeen,
     markUpgradePromptSeen,
     dismissOnboarding,
     resetOnboarding,
   };
 }