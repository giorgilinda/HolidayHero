/**
 * Application constants
 * 
 * Centralized constants for the application that can be reused across components
 */

export const APP_NAME = "HolidayHero";
export const APP_DESCRIPTION = "A smart vacation planning engine that balances local holidays, school closures, and WFH flexibility to find the best days for PTO."
export const APP_EMOJI = "🏖️";

// OpenHolidays API Configuration
// ISO 3166-1 country code (e.g., 'GB' for United Kingdom, 'DE' for Germany, 'US' for United States)
export const HOLIDAY_COUNTRY_CODE = 'DE';
export const HOLIDAY_LANGUAGE_CODE = 'EN'; // Language for holiday names
// Subdivision/Region code (e.g., 'DE-BY' for Bayern, 'DE-BE' for Berlin)
// Leave undefined or empty string for country-wide holidays only
// For Germany: DE-BW (Baden-Württemberg), DE-BY (Bayern), DE-BE (Berlin), DE-BB (Brandenburg), 
//              DE-HB (Bremen), DE-HH (Hamburg), DE-HE (Hessen), DE-MV (Mecklenburg-Vorpommern),
//              DE-NI (Niedersachsen), DE-NW (Nordrhein-Westfalen), DE-RP (Rheinland-Pfalz),
//              DE-SL (Saarland), DE-SN (Sachsen), DE-ST (Sachsen-Anhalt), DE-SH (Schleswig-Holstein), DE-TH (Thüringen)
export const HOLIDAY_SUBDIVISION_CODE = 'DE-BY'; // Bayern (Bavaria)

