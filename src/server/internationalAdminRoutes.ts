// Continent-Country-Region data for EDISON international administrator
// Maps continents to their ADR-015 launch markets and provides region profiles

import type { Request, Response } from 'express';
import type { EdisonPrototypeStore } from './store';
import type { PublicUser } from '../types/edison.ts';

// continent codes and names
export const CONTINENT_NAMES: Record<string, string> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  oceania: 'Oceania',
  antarctica: 'Antarctica',
};

// continent -> list of target market codes (LaunchMarketCode)
export const CONTINENT_TARGET_MARKETS: Record<string, string[]> = {
  africa: ['ZW', 'ZA', 'KE_NG'],
  asia: [],
  europe: ['GB', 'EU'],
  north_america: ['US'],
  south_america: [],
  oceania: [],
  antarctica: [],
};

// Get available continents for the administrator
export function getAvailableContinents(): { code: string; name: string }[] {
  const allCodes: string[] = ['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania', 'antarctica'];
  return allCodes.map((code) => ({
    code,
    name: CONTINENT_NAMES[code] || code,
  }));
}

// Get countries for a given continent
export function getCountriesForContinent(continent: string): string[] {
  return CONTINENT_TARGET_MARKETS[continent] || [];
}

// Get country name from code
export function getCountryName(countryCode: string): string {
  const names: Record<string, string> = {
    ZW: 'Zimbabwe',
    ZA: 'South Africa',
    GB: 'United Kingdom',
    EU: 'European Union',
    US: 'United States',
    KE_NG: 'Kenya/Nigeria',
  };
  return names[countryCode] || countryCode;
}

// Get regions for a given country code
export function getRegionsForCountry(countryCode: string): { regionId: string; regionName: string; targetMarkets: string[] }[] {
  return [];
}

// API route handlers
export function registerRoutes(app: any) {
  // GET /api/international-admin/continents - Get available continents
  app.get('/api/international-admin/continents', (_req, res) => {
    res.json({ success: true, continents: getAvailableContinents() });
  });

  // GET /api/international-admin/continents/:continent/countries - Get countries for continent
  app.get('/api/international-admin/continents/:continent/countries', (req, res) => {
    const continent = req.params.continent as string;
    const countries = getCountriesForContinent(continent);
    res.json({ success: true, countries, countryNames: countries.map(getCountryName) });
  });

  // GET /api/international-admin/countries/:countryCode/regions - Get regions for country
  app.get('/api/international-admin/countries/:countryCode/regions', (req, res) => {
    const countryCode = req.params.countryCode as string;
    const regions = getRegionsForCountry(countryCode);
    res.json({ success: true, regions });
  });

  // GET /api/international-admin/dashboard - Get dashboard overview
  app.get('/api/international-admin/dashboard', (req, res) => {
    const continents = getAvailableContinents();
    const continentSummaries: any[] = [];
    for (const continent of continents.map((c) => c.code)) {
      const markets = getCountriesForContinent(continent);
      continentSummaries.push({
        continent,
        regionCount: markets.length,
        countryCount: markets.length,
      });
    }
    res.json({ success: true, overview: { continents, continentSummaries } });
  });

  // GET /api/international-admin/global-launch-status - Get global launch status
  app.get('/api/international-admin/global-launch-status', (req, res) => {
    res.json({
      success: true,
      status: {
        currentRegionId: null,
        regionsIncluded: ['africa_south_zw_za', 'europe_uk_eu', 'africa_east_west_ke_ng', 'north_america_us'],
        activatedCount: 0,
        totalCount: 4,
        rolloutStatus: 'not_activated',
        confirmationRequired: true,
        safeTestMode: true,
        message: 'Zero regions activated. Expand from the continent/country selector to configure rollout. Fail-closed gates enforce Stage P6 & Phase 14 dependencies.',
      },
    });
  });

  // GET /api/international-admin/charity-availability - Charity advertising availability
  app.get('/api/international-admin/charity-availability', (req, res) => {
    res.json({
      success: true,
      availability: {
        availableWorldwide: true,
        restrictedMarkets: [],
        feeFree: true,
        message: 'Charity advertisements are FREE and available worldwide. The international administrator must not restrict charity advertising to activated commercial markets or introduce fees.',
      },
    });
  });
}
