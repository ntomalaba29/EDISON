// Continent-Country-Region data for EDISON international administrator
// Maps continents to their ADR-015 launch markets and provides region profiles

import type { ExpansionRegionId, LaunchMarketCode, RegionalLocalizationConfig, ExpansionCurrencyCode } from '../types/edison.ts';

// continent code -> list of target market codes (LaunchMarketCode)
export const CONTINENT_TARGET_MARKETS: Record<string, LaunchMarketCode[]> = {
  // Africa: Zimbabwe, South Africa, Kenya/Nigeria
  africa: ['ZW', 'ZA', 'KE_NG'],
  // Asia: no ADR-015 markets defined yet; placeholder for future expansion
  asia: [],
  // Europe: United Kingdom, European Union
  europe: ['GB', 'EU'],
  // North America: United States
  north_america: ['US'],
  // South America: placeholder for future expansion
  south_america: [],
  // Oceania: placeholder for future expansion
  oceania: [],
  // Antarctica: no markets
  antarctica: [],
};

// continent code -> human-readable name
export const CONTINENT_NAMES: Record<string, string> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  oceania: 'Oceania',
  antarctica: 'Antarctica',
};

// Maps a LaunchMarketCode to its continent
export function getContinentForMarket(code: LaunchMarketCode): string | undefined {
  for (const [continent, markets] of Object.entries(CONTINENT_TARGET_MARKETS)) {
    if (markets.includes(code)) return continent;
  }
  return undefined;
}

// Gets all countries (launch markets) for a given continent
export function getCountriesForContinent(continent: string): LaunchMarketCode[] {
  return CONTINENT_TARGET_MARKETS[continent] || [];
}

// Region profile assessment from the engine's REGION_BLUEPRINTS
export interface RegionProfileAssessment {
  regionId: ExpansionRegionId;
  regionName: string;
  targetMarketCodes: LaunchMarketCode[];
  sovereignResidencyZone: string;
  cdnEdgeClusterTarget: string;
  primaryLanguageCode: string;
  supportedLanguageCodes: string[];
  captionAccessibilityStandard: string;
  multiCurrencyCode: ExpansionCurrencyCode;
  proFormaCpmRateLocal: number;
  dataResidencyZone: string;
  prohibitCrossBorderPiiTransfer: boolean;
  charityZeroCostLocked: boolean;
}

// Pre-computed region profiles from REGION_BLUEPRINTS
export const REGION_PROFILES: RegionProfileAssessment[] = [
  {
    regionId: 'africa_south_zw_za',
    regionName: 'Southern Africa Cluster (Zimbabwe Initial + South Africa)',
    targetMarketCodes: ['ZW', 'ZA'],
    sovereignResidencyZone: 'africa-south-1 (SADC Sovereign Partition)',
    cdnEdgeClusterTarget: 'JNB / HRE Multi-Edge CDN Tier',
    primaryLanguageCode: 'en',
    supportedLanguageCodes: ['en', 'sn', 'nd', 'zu'],
    captionAccessibilityStandard: 'DVB-Sub / EBU-TT-D Closed Captions + High-Contrast 16:9',
    multiCurrencyCode: 'USD',
    proFormaCpmRateLocal: 4.5,
    dataResidencyZone: 'africa-south-1 (ZW/ZA Household Geo Isolated)',
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
  },
  {
    regionId: 'europe_uk_eu',
    regionName: 'Europe & United Kingdom Cluster (GB + EU AVMSD)',
    targetMarketCodes: ['GB', 'EU'],
    sovereignResidencyZone: 'eu-west / uk-london (GDPR & UK GDPR Resident)',
    cdnEdgeClusterTarget: 'LON / FRA / DUB HbbTV & CTV Edge Tier',
    primaryLanguageCode: 'en',
    supportedLanguageCodes: ['en', 'de', 'fr', 'pt'],
    captionAccessibilityStandard: 'EBU-TT-D Multilingual Captions + ETSI EN 300 743',
    multiCurrencyCode: 'EUR',
    proFormaCpmRateLocal: 8.2,
    dataResidencyZone: 'eu-west-2 / eu-central-1 (EEA/UK Residency Isolated)',
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
  },
  {
    regionId: 'africa_east_west_ke_ng',
    regionName: 'East & West Africa Expansion Cluster (Kenya + Nigeria)',
    targetMarketCodes: ['KE_NG'],
    sovereignResidencyZone: 'africa-east-west (KE DPA / NDPA 2023 Partition)',
    cdnEdgeClusterTarget: 'NBO / LOS Hybrid CDN Edge Tier',
    primaryLanguageCode: 'en',
    supportedLanguageCodes: ['en', 'sw'],
    captionAccessibilityStandard: 'DVB-Sub + Clear Low-Bandwidth Static Text Card Support',
    multiCurrencyCode: 'KES',
    proFormaCpmRateLocal: 490.0,
    dataResidencyZone: 'africa-ke-ng-isolated (Local Statutory Residency)',
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
  },
  {
    regionId: 'north_america_us',
    regionName: 'North America Expansion Cluster (United States VPPA / ATSC 3.0)',
    targetMarketCodes: ['US'],
    sovereignResidencyZone: 'us-east-1 (VPPA Watch-History Isolated Partition)',
    cdnEdgeClusterTarget: 'IAD / DFW / LAX ATSC 3.0 Edge Tier',
    primaryLanguageCode: 'en',
    supportedLanguageCodes: ['en', 'es'],
    captionAccessibilityStandard: 'CEA-708 Closed Captions + ADA High-Contrast Safe Zone',
    multiCurrencyCode: 'USD',
    proFormaCpmRateLocal: 11.5,
    dataResidencyZone: 'us-east-1 (VPPA Strictly Non-Shared)',
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
  },
];

// Continent summary
export interface ContinentSummary {
  continent: string;
  regionCount: number;
  countryCount: number;
  regions: RegionProfileAssessment[];
}

// Gets a continent summary
export function getContinentSummary(continent: string): ContinentSummary {
  const markets = getCountriesForContinent(continent);
  const regions = REGION_PROFILES.filter((r) => {
    return r.targetMarketCodes.some((code) => getContinentForMarket(code) === continent);
  });

  return {
    continent,
    regionCount: regions.length,
    countryCount: markets.length,
    regions,
  };
}

// Summary of all continents
export function getAllContinentsSummary(): ContinentSummary[] {
  const continents: string[] = ['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania', 'antarctica'];
  return continents.map((c) => getContinentSummary(c));
}