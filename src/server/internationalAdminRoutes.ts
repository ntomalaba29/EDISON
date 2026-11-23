// Compatibility helpers for the international administrator.
// HTTP endpoints are registered only in src/server/app.ts; this module must not
// register competing /api/international-admin routes.

export {
  CONTINENT_NAMES,
  CONTINENT_TARGET_MARKETS,
  COUNTRY_NAMES,
  getContinentForMarket,
  getCountriesForContinent,
  REGION_PROFILES,
} from './continentCountryRegionData';
