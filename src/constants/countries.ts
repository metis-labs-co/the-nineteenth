/**
 * Country & Region Configuration
 *
 * Single source of truth for all supported countries and their regions.
 * Used by course filtering, country detection, and the CountryRegion picker screen.
 */

// =====================================================
// TYPES
// =====================================================

export interface RegionDefinition {
  /** Database/filter value (e.g. 'NSW', 'England') */
  value: string;
  /** Short display label for filter pills (e.g. 'NSW', 'N. Ireland') */
  label: string;
  /** Full display name (e.g. 'New South Wales', 'Northern Ireland') */
  displayName: string;
}

export interface CountryDefinition {
  /** Country name — matches DB & store values (e.g. 'Australia') */
  name: string;
  /** ISO 3166-1 alpha-2 code (e.g. 'AU') */
  code: string;
  /** Continent for picker UI grouping */
  continent: string;
  /** Emoji flag */
  flag: string;
  /** Lowercase variants for GPS reverse-geocode normalization */
  gpsAliases: string[];
  /** Regions/states for this country (empty if none) */
  regions: RegionDefinition[];
}

// =====================================================
// DATA
// =====================================================

export const COUNTRIES: CountryDefinition[] = [
  // ── Oceania ──────────────────────────────────────
  {
    name: 'Australia',
    code: 'AU',
    continent: 'Oceania',
    flag: '🇦🇺',
    gpsAliases: ['australia'],
    regions: [
      { value: 'NSW', label: 'NSW', displayName: 'New South Wales' },
      { value: 'VIC', label: 'VIC', displayName: 'Victoria' },
      { value: 'QLD', label: 'QLD', displayName: 'Queensland' },
      { value: 'SA', label: 'SA', displayName: 'South Australia' },
      { value: 'WA', label: 'WA', displayName: 'Western Australia' },
      { value: 'TAS', label: 'TAS', displayName: 'Tasmania' },
      { value: 'NT', label: 'NT', displayName: 'Northern Territory' },
      { value: 'ACT', label: 'ACT', displayName: 'Australian Capital Territory' },
    ],
  },
  {
    name: 'New Zealand',
    code: 'NZ',
    continent: 'Oceania',
    flag: '🇳🇿',
    gpsAliases: ['new zealand', 'nz'],
    regions: [
      { value: 'Auckland', label: 'Auckland', displayName: 'Auckland' },
      { value: 'Waikato', label: 'Waikato', displayName: 'Waikato' },
      { value: 'Bay of Plenty', label: 'BOP', displayName: 'Bay of Plenty' },
      { value: 'Canterbury', label: 'Canterbury', displayName: 'Canterbury' },
      { value: 'Wellington', label: 'Wellington', displayName: 'Wellington' },
      { value: 'Otago', label: 'Otago', displayName: 'Otago' },
    ],
  },
  {
    name: 'Fiji',
    code: 'FJ',
    continent: 'Oceania',
    flag: '🇫🇯',
    gpsAliases: ['fiji'],
    regions: [],
  },

  // ── Europe ───────────────────────────────────────
  {
    name: 'United Kingdom',
    code: 'GB',
    continent: 'Europe',
    flag: '🇬🇧',
    gpsAliases: ['united kingdom', 'uk', 'great britain'],
    regions: [
      { value: 'England', label: 'England', displayName: 'England' },
      { value: 'Scotland', label: 'Scotland', displayName: 'Scotland' },
      { value: 'Wales', label: 'Wales', displayName: 'Wales' },
      { value: 'Northern Ireland', label: 'N. Ireland', displayName: 'Northern Ireland' },
    ],
  },
  {
    name: 'Ireland',
    code: 'IE',
    continent: 'Europe',
    flag: '🇮🇪',
    gpsAliases: ['ireland', 'republic of ireland'],
    regions: [
      { value: 'Leinster', label: 'Leinster', displayName: 'Leinster' },
      { value: 'Munster', label: 'Munster', displayName: 'Munster' },
      { value: 'Connacht', label: 'Connacht', displayName: 'Connacht' },
      { value: 'Ulster', label: 'Ulster', displayName: 'Ulster' },
    ],
  },
  {
    name: 'Spain',
    code: 'ES',
    continent: 'Europe',
    flag: '🇪🇸',
    gpsAliases: ['spain', 'españa'],
    regions: [],
  },
  {
    name: 'Portugal',
    code: 'PT',
    continent: 'Europe',
    flag: '🇵🇹',
    gpsAliases: ['portugal'],
    regions: [
      { value: 'Algarve', label: 'Algarve', displayName: 'Algarve' },
      { value: 'Lisbon', label: 'Lisbon', displayName: 'Lisbon' },
    ],
  },
  {
    name: 'France',
    code: 'FR',
    continent: 'Europe',
    flag: '🇫🇷',
    gpsAliases: ['france'],
    regions: [],
  },
  {
    name: 'Germany',
    code: 'DE',
    continent: 'Europe',
    flag: '🇩🇪',
    gpsAliases: ['germany', 'deutschland'],
    regions: [],
  },
  {
    name: 'Italy',
    code: 'IT',
    continent: 'Europe',
    flag: '🇮🇹',
    gpsAliases: ['italy', 'italia'],
    regions: [],
  },
  {
    name: 'Netherlands',
    code: 'NL',
    continent: 'Europe',
    flag: '🇳🇱',
    gpsAliases: ['netherlands', 'holland'],
    regions: [],
  },
  {
    name: 'Sweden',
    code: 'SE',
    continent: 'Europe',
    flag: '🇸🇪',
    gpsAliases: ['sweden', 'sverige'],
    regions: [],
  },
  {
    name: 'Denmark',
    code: 'DK',
    continent: 'Europe',
    flag: '🇩🇰',
    gpsAliases: ['denmark', 'danmark'],
    regions: [],
  },
  {
    name: 'Norway',
    code: 'NO',
    continent: 'Europe',
    flag: '🇳🇴',
    gpsAliases: ['norway', 'norge'],
    regions: [],
  },
  {
    name: 'Finland',
    code: 'FI',
    continent: 'Europe',
    flag: '🇫🇮',
    gpsAliases: ['finland', 'suomi'],
    regions: [],
  },
  {
    name: 'Belgium',
    code: 'BE',
    continent: 'Europe',
    flag: '🇧🇪',
    gpsAliases: ['belgium', 'belgique', 'belgië'],
    regions: [],
  },
  {
    name: 'Switzerland',
    code: 'CH',
    continent: 'Europe',
    flag: '🇨🇭',
    gpsAliases: ['switzerland', 'schweiz', 'suisse'],
    regions: [],
  },
  {
    name: 'Austria',
    code: 'AT',
    continent: 'Europe',
    flag: '🇦🇹',
    gpsAliases: ['austria', 'österreich'],
    regions: [],
  },
  {
    name: 'Czech Republic',
    code: 'CZ',
    continent: 'Europe',
    flag: '🇨🇿',
    gpsAliases: ['czech republic', 'czechia', 'česko'],
    regions: [],
  },
  {
    name: 'Turkey',
    code: 'TR',
    continent: 'Europe',
    flag: '🇹🇷',
    gpsAliases: ['turkey', 'türkiye'],
    regions: [],
  },

  // ── North America ────────────────────────────────
  {
    name: 'United States',
    code: 'US',
    continent: 'North America',
    flag: '🇺🇸',
    gpsAliases: ['united states', 'usa', 'us', 'united states of america'],
    regions: [
      { value: 'CA', label: 'CA', displayName: 'California' },
      { value: 'FL', label: 'FL', displayName: 'Florida' },
      { value: 'TX', label: 'TX', displayName: 'Texas' },
      { value: 'AZ', label: 'AZ', displayName: 'Arizona' },
      { value: 'SC', label: 'SC', displayName: 'South Carolina' },
      { value: 'GA', label: 'GA', displayName: 'Georgia' },
      { value: 'HI', label: 'HI', displayName: 'Hawaii' },
      { value: 'NC', label: 'NC', displayName: 'North Carolina' },
      { value: 'NV', label: 'NV', displayName: 'Nevada' },
      { value: 'NY', label: 'NY', displayName: 'New York' },
    ],
  },
  {
    name: 'Canada',
    code: 'CA',
    continent: 'North America',
    flag: '🇨🇦',
    gpsAliases: ['canada'],
    regions: [
      { value: 'Ontario', label: 'Ontario', displayName: 'Ontario' },
      { value: 'British Columbia', label: 'BC', displayName: 'British Columbia' },
      { value: 'Alberta', label: 'Alberta', displayName: 'Alberta' },
      { value: 'Quebec', label: 'Quebec', displayName: 'Quebec' },
    ],
  },
  {
    name: 'Mexico',
    code: 'MX',
    continent: 'North America',
    flag: '🇲🇽',
    gpsAliases: ['mexico', 'méxico'],
    regions: [],
  },

  // ── South America ────────────────────────────────
  {
    name: 'Brazil',
    code: 'BR',
    continent: 'South America',
    flag: '🇧🇷',
    gpsAliases: ['brazil', 'brasil'],
    regions: [],
  },
  {
    name: 'Argentina',
    code: 'AR',
    continent: 'South America',
    flag: '🇦🇷',
    gpsAliases: ['argentina'],
    regions: [],
  },

  // ── Africa ───────────────────────────────────────
  {
    name: 'South Africa',
    code: 'ZA',
    continent: 'Africa',
    flag: '🇿🇦',
    gpsAliases: ['south africa'],
    regions: [
      { value: 'Western Cape', label: 'W. Cape', displayName: 'Western Cape' },
      { value: 'Gauteng', label: 'Gauteng', displayName: 'Gauteng' },
      { value: 'KwaZulu-Natal', label: 'KZN', displayName: 'KwaZulu-Natal' },
    ],
  },
  {
    name: 'Morocco',
    code: 'MA',
    continent: 'Africa',
    flag: '🇲🇦',
    gpsAliases: ['morocco', 'maroc'],
    regions: [],
  },
  {
    name: 'Kenya',
    code: 'KE',
    continent: 'Africa',
    flag: '🇰🇪',
    gpsAliases: ['kenya'],
    regions: [],
  },
  {
    name: 'Egypt',
    code: 'EG',
    continent: 'Africa',
    flag: '🇪🇬',
    gpsAliases: ['egypt'],
    regions: [],
  },

  // ── Asia ─────────────────────────────────────────
  {
    name: 'Japan',
    code: 'JP',
    continent: 'Asia',
    flag: '🇯🇵',
    gpsAliases: ['japan', '日本'],
    regions: [],
  },
  {
    name: 'South Korea',
    code: 'KR',
    continent: 'Asia',
    flag: '🇰🇷',
    gpsAliases: ['south korea', 'korea', 'republic of korea'],
    regions: [],
  },
  {
    name: 'Thailand',
    code: 'TH',
    continent: 'Asia',
    flag: '🇹🇭',
    gpsAliases: ['thailand'],
    regions: [],
  },
  {
    name: 'Malaysia',
    code: 'MY',
    continent: 'Asia',
    flag: '🇲🇾',
    gpsAliases: ['malaysia'],
    regions: [],
  },
  {
    name: 'Singapore',
    code: 'SG',
    continent: 'Asia',
    flag: '🇸🇬',
    gpsAliases: ['singapore'],
    regions: [],
  },
  {
    name: 'Indonesia',
    code: 'ID',
    continent: 'Asia',
    flag: '🇮🇩',
    gpsAliases: ['indonesia'],
    regions: [],
  },
  {
    name: 'Philippines',
    code: 'PH',
    continent: 'Asia',
    flag: '🇵🇭',
    gpsAliases: ['philippines'],
    regions: [],
  },
  {
    name: 'Vietnam',
    code: 'VN',
    continent: 'Asia',
    flag: '🇻🇳',
    gpsAliases: ['vietnam', 'viet nam'],
    regions: [],
  },
  {
    name: 'China',
    code: 'CN',
    continent: 'Asia',
    flag: '🇨🇳',
    gpsAliases: ['china', "people's republic of china"],
    regions: [],
  },
  {
    name: 'India',
    code: 'IN',
    continent: 'Asia',
    flag: '🇮🇳',
    gpsAliases: ['india'],
    regions: [],
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    continent: 'Asia',
    flag: '🇦🇪',
    gpsAliases: ['united arab emirates', 'uae'],
    regions: [],
  },
];

// =====================================================
// DERIVED LOOKUPS (computed once at import time)
// =====================================================

/** All country names */
export const COUNTRY_NAMES: string[] = COUNTRIES.map((c) => c.name);

/** Map of lowercase GPS alias → country name (for fast normalization) */
const GPS_ALIAS_MAP = new Map<string, string>();
for (const country of COUNTRIES) {
  for (const alias of country.gpsAliases) {
    GPS_ALIAS_MAP.set(alias, country.name);
  }
}

/** Map of country name → CountryDefinition */
const COUNTRY_BY_NAME = new Map<string, CountryDefinition>();
for (const country of COUNTRIES) {
  COUNTRY_BY_NAME.set(country.name, country);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Look up a country definition by name
 */
export function getCountryByName(name: string): CountryDefinition | undefined {
  return COUNTRY_BY_NAME.get(name);
}

/**
 * Get regions for a country. Returns empty array for unknown countries or those without regions.
 */
export function getRegionsForCountry(country: string | null | undefined): RegionDefinition[] {
  if (!country) return [];
  return COUNTRY_BY_NAME.get(country)?.regions ?? [];
}

/**
 * Get countries grouped by continent (for picker UI)
 */
export function getCountriesByContinent(): { continent: string; countries: CountryDefinition[] }[] {
  const map = new Map<string, CountryDefinition[]>();

  // Maintain insertion order so continents appear in a sensible sequence
  for (const country of COUNTRIES) {
    const list = map.get(country.continent);
    if (list) {
      list.push(country);
    } else {
      map.set(country.continent, [country]);
    }
  }

  return Array.from(map.entries()).map(([continent, countries]) => ({
    continent,
    countries,
  }));
}

/**
 * Normalize a raw GPS reverse-geocode country string to a known country name.
 * Returns null if the country is not recognized.
 */
export function normalizeCountryFromGps(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return GPS_ALIAS_MAP.get(lower) ?? null;
}
