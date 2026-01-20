/**
 * User Preferences Configuration
 * 
 * Configure your personal preferences for vacation planning:
 * - Each adult person has their own availability and wfhAbility settings
 * - maxMandatoryDaysForWfhSuggestion: Maximum number of mandatory days before suggesting WFH
 * 
 * Preferences are loaded from src/config/people.json
 * Each person's availability and wfhAbility are defined directly on their person object
 */

import peopleConfig from './people.json';

export interface UserPreferences {
  /**
   * Per-adult availability for childcare
   * Maps person ID to whether they are available for childcare
   * Extracted from each person's "availability" property
   */
  adultAvailability: Record<string, boolean>;
  
  /**
   * Per-adult WFH ability mapping
   * Maps person ID to whether they can work from home
   * Extracted from each person's "wfhAbility" property
   * false = Cannot work from home
   * true = Can work from home
   */
  adultWfhAbilities: Record<string, boolean>;
  
  /**
   * Maximum number of mandatory days before suggesting WFH
   * If mandatory days are less than this threshold, suggest WFH if possible
   * Default: 2
   */
  maxMandatoryDaysForWfhSuggestion: number;
}

interface PersonConfig {
  id: string;
  name: string;
  isChild?: boolean;
  availability?: boolean; // For adults: whether they are available for childcare
  wfhAbility?: boolean; // For adults: whether they can work from home
}

interface PeopleConfig {
  people: PersonConfig[];
  preferences?: {
    maxMandatoryDaysForWfhSuggestion?: number;
  };
}

/**
 * User preferences loaded from people.json
 * Each adult's availability and wfhAbility are defined on their person object
 * Modify settings in src/config/people.json
 */
const config = peopleConfig as PeopleConfig;

// Extract adult availability and WFH abilities from people array
const adultAvailability: Record<string, boolean> = {};
const adultWfhAbilities: Record<string, boolean> = {};

config.people.forEach((person) => {
  if (!person.isChild) {
    // For adults, extract availability and wfhAbility
    if (person.availability !== undefined) {
      adultAvailability[person.id] = person.availability;
    }
    if (person.wfhAbility !== undefined) {
      adultWfhAbilities[person.id] = person.wfhAbility;
    }
  }
});

export const userPreferences: UserPreferences = {
  adultAvailability,
  adultWfhAbilities,
  maxMandatoryDaysForWfhSuggestion: config.preferences?.maxMandatoryDaysForWfhSuggestion ?? 2,
};

