/**
 * User Preferences Configuration
 * 
 * Configure your personal preferences for vacation planning:
 * - spouseAvailable: Whether your spouse/partner is available for childcare
 * - wfhAbility: Your ability to work from home (0.0 = None, 1.0 = Full)
 */

export interface UserPreferences {
  /**
   * Whether your spouse/partner is available for childcare
   * Set to true if your spouse can cover childcare, false otherwise
   */
  spouseAvailable: boolean;
  
  /**
   * Your ability to work from home
   * 0.0 = Cannot work from home at all
   * 0.5 = Can work from home but with reduced productivity (e.g., with kids around)
   * 1.0 = Can work from home with full productivity
   */
  wfhAbility: number;
}

/**
 * Default user preferences
 * Modify these values according to your personal situation
 */
export const userPreferences: UserPreferences = {
  spouseAvailable: true,
  wfhAbility: 1.0,
};

