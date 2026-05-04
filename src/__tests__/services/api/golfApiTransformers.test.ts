/**
 * GolfAPI.io Transformers Tests
 *
 * Tests for GolfAPI.io v2.3 data transformers.
 * These transformers convert API responses to app domain types.
 *
 * Key test areas:
 * - Club response transformation (with string lat/long)
 * - Course response transformation (with nested tees, par/index arrays)
 * - Tee transformation (with empty string ratings)
 * - Coordinate transformation (with numeric POI codes)
 * - State normalization
 * - Validation helpers
 */

import {
  normalizeAustralianState,
  isAustralianState,
  transformApiClubResponse,
  transformApiClubSearchResult,
  transformHolesFromArrays,
  transformApiTee,
  transformApiTees,
  transformApiCourseResponse,
  mapPoiToPoiType,
  transformApiCoordinate,
  transformApiCoordinates,
  filterEssentialCoordinates,
  isValidTransformedCourse,
  hasHoleData,
  hasCompleteHoleData,
  hasTeeData,
  hasCoordinateData,
  calculateTotalPar,
  isValidClubResponse,
  parseApiTimestamp,
  getCourseDataStatus,
} from '@/services/api/golfApiTransformers';

import type {
  GolfApiClubResponse,
  GolfApiClubSearchResult,
  GolfApiCourseResponse,
  GolfApiTee,
  GolfApiCoordinate,
  GolfApiCoordinatesResponse,
} from '@/services/api/golfApiTypes';

import { GolfApiPoiType, GolfApiLocation } from '@/services/api/golfApiTypes';
import type { Hole } from '@/types/database.types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock GolfAPI.io club response
 */
function createMockClubResponse(
  overrides?: Partial<GolfApiClubResponse>
): GolfApiClubResponse {
  return {
    clubID: '141520610397251566',
    clubName: 'Royal Melbourne Golf Club',
    address: '450 Golf Links Rd',
    city: 'Sandringham',
    postalCode: '3191',
    state: 'Victoria',
    country: 'AUS',
    latitude: '-37.9201',
    longitude: '145.0059',
    website: 'https://royalmelbourne.com.au',
    telephone: '+61 3 9598 0001',
    timestampUpdated: '1704067200', // 2024-01-01
    courses: [
      {
        courseID: '012141520658891108829',
        courseName: 'West Course',
        numHoles: 18,
        timestampUpdated: '1704067200',
        hasGPS: 1,
      },
    ],
    apiRequestsLeft: '19',
    ...overrides,
  };
}

/**
 * Create a mock GolfAPI.io club search result
 */
function createMockClubSearchResult(
  overrides?: Partial<GolfApiClubSearchResult>
): GolfApiClubSearchResult {
  return {
    clubID: '141520610397251566',
    clubName: 'Royal Melbourne Golf Club',
    city: 'Sandringham',
    state: 'Victoria',
    country: 'AUS',
    latitude: '-37.9201',
    longitude: '145.0059',
    ...overrides,
  };
}

/**
 * Create a mock GolfAPI.io tee
 */
function createMockTee(overrides?: Partial<GolfApiTee>): GolfApiTee {
  return {
    teeID: 'tee123',
    teeName: 'Blue',
    teeColor: '#0000FF',
    length1: 385,
    length2: 420,
    length3: 175,
    length4: 440,
    length5: 510,
    length6: 390,
    length7: 165,
    length8: 425,
    length9: 450,
    length10: 395,
    length11: 180,
    length12: 460,
    length13: 405,
    length14: 505,
    length15: 385,
    length16: 195,
    length17: 430,
    length18: 445,
    courseRatingMen: 73.5,
    slopeMen: 135,
    courseRatingMenFront9: 36.5,
    courseRatingMenBack9: 37.0,
    slopeMenFront9: 132,
    slopeMenBack9: 138,
    courseRatingWomen: 78.2,
    slopeWomen: 145,
    courseRatingWomenFront9: 38.5,
    courseRatingWomenBack9: 39.7,
    slopeWomenFront9: 142,
    slopeWomenBack9: 148,
    ...overrides,
  };
}

/**
 * Create a mock GolfAPI.io course response
 */
function createMockCourseResponse(
  overrides?: Partial<GolfApiCourseResponse>
): GolfApiCourseResponse {
  return {
    // Club info
    clubID: '141520610397251566',
    clubName: 'Royal Melbourne Golf Club',
    address: '450 Golf Links Rd',
    city: 'Sandringham',
    postalCode: '3191',
    state: 'Victoria',
    country: 'AUS',
    latitude: '-37.9201',
    longitude: '145.0059',
    website: 'https://royalmelbourne.com.au',
    telephone: '+61 3 9598 0001',
    // Course info
    courseID: '012141520658891108829',
    courseName: 'West Course',
    numHoles: '18',
    timestampUpdated: '1704067200',
    hasGPS: '1',
    measure: 'y',
    // Par and stroke index arrays
    parsMen: [4, 5, 3, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4],
    indexesMen: [7, 15, 9, 1, 11, 3, 17, 5, 13, 8, 16, 4, 12, 2, 18, 6, 10, 14],
    parsWomen: [4, 5, 3, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4],
    indexesWomen: [7, 15, 9, 1, 11, 3, 17, 5, 13, 8, 16, 4, 12, 2, 18, 6, 10, 14],
    // Tees
    numTees: 1,
    tees: [createMockTee()],
    numCoordinates: 54,
    apiRequestsLeft: '19',
    ...overrides,
  };
}

/**
 * Create a mock GolfAPI.io coordinate
 */
function createMockCoordinate(
  overrides?: Partial<GolfApiCoordinate>
): GolfApiCoordinate {
  return {
    poi: 1, // Tee
    location: 3, // Back
    sideFW: 2, // Center
    hole: 1,
    latitude: -37.9201,
    longitude: 145.0059,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('golfApiTransformers', () => {
  // ==========================================================================
  // normalizeAustralianState
  // ==========================================================================
  describe('normalizeAustralianState', () => {
    describe('full state names', () => {
      it('normalizes "Victoria" to "VIC"', () => {
        expect(normalizeAustralianState('Victoria')).toBe('VIC');
      });

      it('normalizes "New South Wales" to "NSW"', () => {
        expect(normalizeAustralianState('New South Wales')).toBe('NSW');
      });

      it('normalizes "Queensland" to "QLD"', () => {
        expect(normalizeAustralianState('Queensland')).toBe('QLD');
      });

      it('normalizes "South Australia" to "SA"', () => {
        expect(normalizeAustralianState('South Australia')).toBe('SA');
      });

      it('normalizes "Western Australia" to "WA"', () => {
        expect(normalizeAustralianState('Western Australia')).toBe('WA');
      });

      it('normalizes "Tasmania" to "TAS"', () => {
        expect(normalizeAustralianState('Tasmania')).toBe('TAS');
      });

      it('normalizes "Northern Territory" to "NT"', () => {
        expect(normalizeAustralianState('Northern Territory')).toBe('NT');
      });

      it('normalizes "Australian Capital Territory" to "ACT"', () => {
        expect(normalizeAustralianState('Australian Capital Territory')).toBe('ACT');
      });
    });

    describe('case insensitivity', () => {
      it('normalizes "victoria" (lowercase) to "VIC"', () => {
        expect(normalizeAustralianState('victoria')).toBe('VIC');
      });

      it('normalizes "VICTORIA" (uppercase) to "VIC"', () => {
        expect(normalizeAustralianState('VICTORIA')).toBe('VIC');
      });

      it('normalizes "ViCtOrIa" (mixed case) to "VIC"', () => {
        expect(normalizeAustralianState('ViCtOrIa')).toBe('VIC');
      });

      it('normalizes "new south wales" (lowercase) to "NSW"', () => {
        expect(normalizeAustralianState('new south wales')).toBe('NSW');
      });
    });

    describe('already-code values', () => {
      it('returns "VIC" unchanged', () => {
        expect(normalizeAustralianState('VIC')).toBe('VIC');
      });

      it('returns "NSW" unchanged', () => {
        expect(normalizeAustralianState('NSW')).toBe('NSW');
      });

      it('returns "QLD" unchanged', () => {
        expect(normalizeAustralianState('QLD')).toBe('QLD');
      });
    });

    describe('non-Australian states', () => {
      it('passes through US state "CA"', () => {
        expect(normalizeAustralianState('CA')).toBe('CA');
      });

      it('passes through US state "NY"', () => {
        expect(normalizeAustralianState('NY')).toBe('NY');
      });

      it('passes through unknown state "Unknown State"', () => {
        expect(normalizeAustralianState('Unknown State')).toBe('Unknown State');
      });
    });

    describe('edge cases', () => {
      it('returns null for empty string', () => {
        expect(normalizeAustralianState('')).toBe(null);
      });

      it('returns null for undefined', () => {
        expect(normalizeAustralianState(undefined)).toBe(null);
      });

      it('returns null for null', () => {
        expect(normalizeAustralianState(null)).toBe(null);
      });

      it('trims whitespace', () => {
        expect(normalizeAustralianState('  Victoria  ')).toBe('VIC');
      });

      it('returns null for whitespace-only string', () => {
        expect(normalizeAustralianState('   ')).toBe(null);
      });
    });
  });

  // ==========================================================================
  // isAustralianState
  // ==========================================================================
  describe('isAustralianState', () => {
    it('returns true for valid Australian state codes', () => {
      expect(isAustralianState('NSW')).toBe(true);
      expect(isAustralianState('VIC')).toBe(true);
      expect(isAustralianState('QLD')).toBe(true);
      expect(isAustralianState('SA')).toBe(true);
      expect(isAustralianState('WA')).toBe(true);
      expect(isAustralianState('TAS')).toBe(true);
      expect(isAustralianState('NT')).toBe(true);
      expect(isAustralianState('ACT')).toBe(true);
    });

    it('returns false for non-Australian state codes', () => {
      expect(isAustralianState('CA')).toBe(false);
      expect(isAustralianState('NY')).toBe(false);
      expect(isAustralianState('Unknown')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAustralianState(null)).toBe(false);
    });
  });

  // ==========================================================================
  // transformApiClubResponse
  // ==========================================================================
  describe('transformApiClubResponse', () => {
    it('maps camelCase fields correctly', () => {
      const apiClub = createMockClubResponse();
      const result = transformApiClubResponse(apiClub);

      expect(result.golfapi_club_id).toBe('141520610397251566');
      expect(result.name).toBe('Royal Melbourne Golf Club');
      expect(result.address).toBe('450 Golf Links Rd');
      expect(result.city).toBe('Sandringham');
      expect(result.postal_code).toBe('3191');
      expect(result.website).toBe('https://royalmelbourne.com.au');
      expect(result.phone).toBe('+61 3 9598 0001');
      expect(result.country).toBe('AUS');
    });

    it('parses string latitude/longitude to numbers', () => {
      const apiClub = createMockClubResponse({
        latitude: '-37.9201',
        longitude: '145.0059',
      });
      const result = transformApiClubResponse(apiClub);

      expect(result.location).toBeDefined();
      expect(result.location?.type).toBe('Point');
      expect(result.location?.coordinates[0]).toBe(145.0059); // longitude
      expect(result.location?.coordinates[1]).toBe(-37.9201); // latitude
    });

    it('handles invalid latitude/longitude', () => {
      const apiClub = createMockClubResponse({
        latitude: 'invalid',
        longitude: 'invalid',
      });
      const result = transformApiClubResponse(apiClub);

      expect(result.location).toBe(null);
    });

    it('normalizes state code', () => {
      const apiClub = createMockClubResponse({ state: 'Victoria' });
      const result = transformApiClubResponse(apiClub);

      expect(result.state).toBe('VIC');
    });

    it('sets source to "api"', () => {
      const apiClub = createMockClubResponse();
      const result = transformApiClubResponse(apiClub);

      expect(result.source).toBe('api');
    });

    it('calculates total_holes from nested courses', () => {
      const apiClub = createMockClubResponse({
        courses: [
          { courseID: '1', courseName: 'West', numHoles: 18, timestampUpdated: '', hasGPS: 1 },
          { courseID: '2', courseName: 'East', numHoles: 18, timestampUpdated: '', hasGPS: 1 },
        ],
      });
      const result = transformApiClubResponse(apiClub);

      expect(result.total_holes).toBe(36);
    });

    it('handles missing optional fields', () => {
      const apiClub = createMockClubResponse({
        address: undefined,
        city: undefined,
        postalCode: undefined,
        website: undefined,
        telephone: undefined,
      });
      const result = transformApiClubResponse(apiClub);

      expect(result.address).toBe(null);
      expect(result.city).toBe(null);
      expect(result.postal_code).toBe(null);
      expect(result.website).toBe(null);
      expect(result.phone).toBe(null);
    });

    it('sets non-Australian state to null', () => {
      const apiClub = createMockClubResponse({ state: 'CA' });
      const result = transformApiClubResponse(apiClub);

      expect(result.state).toBe(null);
    });

    it('sets last_synced timestamp', () => {
      const apiClub = createMockClubResponse();
      const result = transformApiClubResponse(apiClub);

      expect(result.last_synced).toBeDefined();
      expect(typeof result.last_synced).toBe('string');
    });
  });

  // ==========================================================================
  // transformApiClubSearchResult
  // ==========================================================================
  describe('transformApiClubSearchResult', () => {
    it('transforms search result with fewer fields', () => {
      const searchResult = createMockClubSearchResult();
      const result = transformApiClubSearchResult(searchResult);

      expect(result.golfapi_club_id).toBe('141520610397251566');
      expect(result.name).toBe('Royal Melbourne Golf Club');
      expect(result.city).toBe('Sandringham');
      expect(result.state).toBe('VIC');
      expect(result.country).toBe('AUS');
      expect(result.source).toBe('api');
    });

    it('parses location from string lat/long', () => {
      const searchResult = createMockClubSearchResult();
      const result = transformApiClubSearchResult(searchResult);

      expect(result.location).toBeDefined();
      expect(result.location?.type).toBe('Point');
    });

    it('handles search results with courses', () => {
      const searchResult = createMockClubSearchResult({
        courses: [
          { courseID: '1', courseName: 'Main', numHoles: 18, timestampUpdated: '', hasGPS: 1 },
        ],
      });
      const result = transformApiClubSearchResult(searchResult);

      expect(result.total_holes).toBe(18);
    });
  });

  // ==========================================================================
  // transformHolesFromArrays
  // ==========================================================================
  describe('transformHolesFromArrays', () => {
    describe('18-hole courses', () => {
      it('transforms par and index arrays to hole objects', () => {
        const pars = [4, 5, 3, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4];
        const indexes = [7, 15, 9, 1, 11, 3, 17, 5, 13, 8, 16, 4, 12, 2, 18, 6, 10, 14];

        const result = transformHolesFromArrays(pars, indexes, 18);

        expect(result.length).toBe(18);
        expect(result[0]).toEqual({ number: 1, par: 4, strokeIndex: 7 });
        expect(result[3]).toEqual({ number: 4, par: 4, strokeIndex: 1 }); // SI 1
        expect(result[17]).toEqual({ number: 18, par: 4, strokeIndex: 14 });
      });

      it('validates par values (3, 4, 5)', () => {
        const pars = [2, 6, 3, 4, 5, 7, 3, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 1]; // Invalid 2, 6, 7, 1
        const indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

        const result = transformHolesFromArrays(pars, indexes, 18);

        // Invalid pars should default to 4
        expect(result[0].par).toBe(4); // Was 2
        expect(result[1].par).toBe(4); // Was 6
        expect(result[5].par).toBe(4); // Was 7
        expect(result[17].par).toBe(4); // Was 1
        // Valid pars should be preserved
        expect(result[2].par).toBe(3);
        expect(result[4].par).toBe(5);
      });

      it('validates stroke index (1-18)', () => {
        const pars = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
        const indexes = [0, 19, -1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // Invalid 0, 19, -1

        const result = transformHolesFromArrays(pars, indexes, 18);

        // Invalid stroke indexes should default to hole number
        expect(result[0].strokeIndex).toBe(1); // Was 0, defaults to hole 1
        expect(result[1].strokeIndex).toBe(2); // Was 19, defaults to hole 2
        expect(result[2].strokeIndex).toBe(3); // Was -1, defaults to hole 3
        // Valid indexes should be preserved
        expect(result[3].strokeIndex).toBe(4);
        expect(result[17].strokeIndex).toBe(18);
      });

      it('handles missing values in arrays', () => {
        const pars = [4, 4]; // Only 2 elements
        const indexes = [1, 2]; // Only 2 elements

        const result = transformHolesFromArrays(pars, indexes, 4);

        expect(result.length).toBe(4);
        // First 2 should use array values
        expect(result[0].par).toBe(4);
        expect(result[1].par).toBe(4);
        // Remaining should use defaults
        expect(result[2].par).toBe(4); // undefined defaults to 4
        expect(result[3].par).toBe(4);
      });
    });

    describe('9-hole courses', () => {
      it('transforms 9-hole arrays correctly', () => {
        const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4];
        const indexes = [5, 9, 3, 7, 1, 17, 11, 15, 13]; // Some SI > 9 from shared 18-hole

        const result = transformHolesFromArrays(pars, indexes, 9);

        expect(result.length).toBe(9);
        expect(result[0]).toEqual({ number: 1, par: 4, strokeIndex: 5 });
        expect(result[4]).toEqual({ number: 5, par: 4, strokeIndex: 1 });
        expect(result[8]).toEqual({ number: 9, par: 4, strokeIndex: 13 });
      });
    });
  });

  // ==========================================================================
  // transformApiTee
  // ==========================================================================
  describe('transformApiTee', () => {
    it('maps tee fields correctly', () => {
      const apiTee = createMockTee();
      const result = transformApiTee(apiTee, 'y');

      expect(result.golfapi_tee_id).toBe('tee123');
      expect(result.name).toBe('Blue');
      expect(result.color).toBe('#0000FF');
      expect(result.measure_unit).toBe('y');
    });

    it('maps per-hole lengths', () => {
      const apiTee = createMockTee();
      const result = transformApiTee(apiTee, 'y');

      expect(result.length_hole_1).toBe(385);
      expect(result.length_hole_2).toBe(420);
      expect(result.length_hole_9).toBe(450);
      expect(result.length_hole_10).toBe(395);
      expect(result.length_hole_18).toBe(445);
    });

    it('maps men\'s ratings', () => {
      const apiTee = createMockTee({
        courseRatingMen: 73.5,
        slopeMen: 135,
        courseRatingMenFront9: 36.5,
        courseRatingMenBack9: 37.0,
        slopeMenFront9: 132,
        slopeMenBack9: 138,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.course_rating).toBe(73.5);
      expect(result.slope).toBe(135);
      expect(result.course_rating_front9).toBe(36.5);
      expect(result.course_rating_back9).toBe(37.0);
      expect(result.slope_front9).toBe(132);
      expect(result.slope_back9).toBe(138);
    });

    it('maps women\'s ratings', () => {
      const apiTee = createMockTee({
        courseRatingWomen: 78.2,
        slopeWomen: 145,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.course_rating_women).toBe(78.2);
      expect(result.slope_women).toBe(145);
    });

    it('handles empty string "" ratings (converts to null)', () => {
      const apiTee = createMockTee({
        courseRatingMen: '' as unknown as number,
        slopeMen: '' as unknown as number,
        courseRatingWomen: '' as unknown as number,
        slopeWomen: '' as unknown as number,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.course_rating).toBe(null);
      expect(result.slope).toBe(null);
      expect(result.course_rating_women).toBe(null);
      expect(result.slope_women).toBe(null);
    });

    it('handles numeric ratings (preserves value)', () => {
      const apiTee = createMockTee({
        courseRatingMen: 73.5,
        slopeMen: 135,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.course_rating).toBe(73.5);
      expect(result.slope).toBe(135);
    });

    it('handles string numeric ratings (parses to number)', () => {
      const apiTee = createMockTee({
        courseRatingMen: '73.5' as unknown as number,
        slopeMen: '135' as unknown as number,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.course_rating).toBe(73.5);
      expect(result.slope).toBe(135);
    });

    it('preserves hex color value', () => {
      const apiTee = createMockTee({ teeColor: '#00CCFF' });
      const result = transformApiTee(apiTee, 'y');

      expect(result.color).toBe('#00CCFF');
    });

    it('uses default name when teeName is empty', () => {
      const apiTee = createMockTee({ teeName: '' });
      const result = transformApiTee(apiTee, 'y');

      expect(result.name).toBe('Unknown');
    });

    it('handles meters as measure unit', () => {
      const apiTee = createMockTee();
      const result = transformApiTee(apiTee, 'm');

      expect(result.measure_unit).toBe('m');
    });

    it('handles zero hole lengths', () => {
      const apiTee = createMockTee({
        length1: 0,
        length2: 0,
      });
      const result = transformApiTee(apiTee, 'y');

      expect(result.length_hole_1).toBe(null); // 0 becomes null
      expect(result.length_hole_2).toBe(null);
    });
  });

  // ==========================================================================
  // transformApiTees
  // ==========================================================================
  describe('transformApiTees', () => {
    it('transforms multiple tees', () => {
      const apiTees = [
        createMockTee({ teeID: 'tee1', teeName: 'Blue' }),
        createMockTee({ teeID: 'tee2', teeName: 'White' }),
        createMockTee({ teeID: 'tee3', teeName: 'Red' }),
      ];

      const result = transformApiTees(apiTees, 'y');

      expect(result.length).toBe(3);
      expect(result[0].name).toBe('Blue');
      expect(result[1].name).toBe('White');
      expect(result[2].name).toBe('Red');
    });

    it('handles empty tees array', () => {
      const result = transformApiTees([], 'y');
      expect(result).toEqual([]);
    });

    it('passes measure unit to all tees', () => {
      const apiTees = [createMockTee(), createMockTee()];

      const result = transformApiTees(apiTees, 'm');

      expect(result[0].measure_unit).toBe('m');
      expect(result[1].measure_unit).toBe('m');
    });
  });

  // ==========================================================================
  // transformApiCourseResponse
  // ==========================================================================
  describe('transformApiCourseResponse', () => {
    it('returns course, tees, and club objects', () => {
      const apiCourse = createMockCourseResponse();
      const result = transformApiCourseResponse(apiCourse);

      expect(result).toHaveProperty('course');
      expect(result).toHaveProperty('tees');
      expect(result).toHaveProperty('club');
    });

    it('maps course fields correctly', () => {
      const apiCourse = createMockCourseResponse();
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.golfapi_course_id).toBe('012141520658891108829');
      expect(course.name).toBe('West Course');
      expect(course.num_holes).toBe(18);
      expect(course.measure_unit).toBe('y');
    });

    it('parses string numHoles to number', () => {
      const apiCourse = createMockCourseResponse({ numHoles: '18' });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.num_holes).toBe(18);
    });

    it('extracts club info from course response', () => {
      const apiCourse = createMockCourseResponse();
      const { club } = transformApiCourseResponse(apiCourse);

      expect(club.golfapi_club_id).toBe('141520610397251566');
      expect(club.name).toBe('Royal Melbourne Golf Club');
      expect(club.city).toBe('Sandringham');
      expect(club.state).toBe('VIC');
    });

    it('transforms nested tees', () => {
      const apiCourse = createMockCourseResponse({
        tees: [
          createMockTee({ teeID: 'tee1', teeName: 'Blue' }),
          createMockTee({ teeID: 'tee2', teeName: 'White' }),
        ],
      });
      const { tees } = transformApiCourseResponse(apiCourse);

      expect(tees.length).toBe(2);
      expect(tees[0].name).toBe('Blue');
      expect(tees[1].name).toBe('White');
    });

    it('transforms holes from par/index arrays', () => {
      const apiCourse = createMockCourseResponse({
        parsMen: [4, 5, 3, 4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4],
        indexesMen: [7, 15, 9, 1, 11, 3, 17, 5, 13, 8, 16, 4, 12, 2, 18, 6, 10, 14],
      });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.holes).toBeDefined();
      expect(course.holes?.length).toBe(18);
      expect(course.holes?.[0]).toEqual({ number: 1, par: 4, strokeIndex: 7 });
      expect(course.holes?.[3]).toEqual({ number: 4, par: 4, strokeIndex: 1 });
    });

    it('transforms women\'s holes when different', () => {
      const apiCourse = createMockCourseResponse({
        parsWomen: [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 3, 5, 4, 5, 4, 3, 4, 4],
        indexesWomen: [8, 14, 10, 2, 12, 4, 18, 6, 16, 7, 15, 3, 11, 1, 17, 5, 9, 13],
      });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.holes_women).toBeDefined();
      expect(course.holes_women?.length).toBe(18);
    });

    it('sets holes_women to null when parsWomen is empty', () => {
      const apiCourse = createMockCourseResponse({
        parsWomen: [],
        indexesWomen: [],
      });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.holes_women).toBe(null);
    });

    it('uses default name for single-course clubs', () => {
      const apiCourse = createMockCourseResponse({ courseName: '' });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.name).toBe('Main Course');
    });

    it('maps measure y/m to measure_unit', () => {
      const apiCourseYards = createMockCourseResponse({ measure: 'y' });
      const apiCourseMeters = createMockCourseResponse({ measure: 'm' });

      const resultYards = transformApiCourseResponse(apiCourseYards);
      const resultMeters = transformApiCourseResponse(apiCourseMeters);

      expect(resultYards.course.measure_unit).toBe('y');
      expect(resultMeters.course.measure_unit).toBe('m');
    });

    it('sets ratings from first tee', () => {
      const apiCourse = createMockCourseResponse({
        tees: [createMockTee({ courseRatingMen: 73.5, slopeMen: 135 })],
      });
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.course_rating).toBe(73.5);
      expect(course.slope_rating).toBe(135);
    });

    it('handles empty tees array', () => {
      const apiCourse = createMockCourseResponse({ tees: [] });
      const { course, tees } = transformApiCourseResponse(apiCourse);

      expect(tees).toEqual([]);
      expect(course.course_rating).toBe(null);
      expect(course.slope_rating).toBe(null);
    });

    it('converts timestamp to ISO string', () => {
      const apiCourse = createMockCourseResponse({ timestampUpdated: '1704067200' }); // 2024-01-01
      const { course } = transformApiCourseResponse(apiCourse);

      expect(course.golfapi_updated_at).toBeDefined();
      expect(course.golfapi_updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ==========================================================================
  // mapPoiToPoiType
  // ==========================================================================
  describe('mapPoiToPoiType', () => {
    // GolfAPI.io's poi codes were originally read as: 1=Tee, 11/12=Green*.
    // On-course verification (Cobram-Barooga Old Course among others) showed
    // every coordinate was landing on the wrong end of the hole. The codes
    // are actually inverted from the historical enum names — poi=1 carries
    // green positions (3 entries per hole = front/center/back) and
    // poi=11/12 carry tee positions.

    describe('green positions (poi=1 — formerly mis-labelled "Tee")', () => {
      it('transforms poi=1, location=1 to "green_front"', () => {
        expect(mapPoiToPoiType(1, 1)).toBe('green_front');
        expect(mapPoiToPoiType(GolfApiPoiType.Tee, GolfApiLocation.Front)).toBe('green_front');
      });

      it('transforms poi=1, location=2 to "green_center"', () => {
        expect(mapPoiToPoiType(1, 2)).toBe('green_center');
        expect(mapPoiToPoiType(GolfApiPoiType.Tee, GolfApiLocation.Center)).toBe('green_center');
      });

      it('transforms poi=1, location=3 to "green_back"', () => {
        expect(mapPoiToPoiType(1, 3)).toBe('green_back');
        expect(mapPoiToPoiType(GolfApiPoiType.Tee, GolfApiLocation.Back)).toBe('green_back');
      });

      it('returns null for poi=1 with invalid location', () => {
        expect(mapPoiToPoiType(1, 0)).toBe(null);
        expect(mapPoiToPoiType(1, 4)).toBe(null);
      });
    });

    describe('tee positions (poi=11/12 — formerly mis-labelled "GreenFront/GreenCenter")', () => {
      it('transforms poi=11 to "tee_front"', () => {
        expect(mapPoiToPoiType(11, 1)).toBe('tee_front');
        expect(mapPoiToPoiType(GolfApiPoiType.GreenFront, 1)).toBe('tee_front');
      });

      it('transforms poi=12 to "tee_back"', () => {
        expect(mapPoiToPoiType(12, 1)).toBe('tee_back');
        expect(mapPoiToPoiType(GolfApiPoiType.GreenCenter, 1)).toBe('tee_back');
      });

      it('ignores location for tee POIs', () => {
        expect(mapPoiToPoiType(11, 2)).toBe('tee_front');
        expect(mapPoiToPoiType(11, 3)).toBe('tee_front');
        expect(mapPoiToPoiType(12, 2)).toBe('tee_back');
        expect(mapPoiToPoiType(12, 3)).toBe('tee_back');
      });
    });

    describe('non-essential POIs', () => {
      it('returns null for poi=2 (FairwayLeft)', () => {
        expect(mapPoiToPoiType(2, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.FairwayLeft, 1)).toBe(null);
      });

      it('returns null for poi=3 (FairwayRight)', () => {
        expect(mapPoiToPoiType(3, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.FairwayRight, 1)).toBe(null);
      });

      it('returns null for poi=4 (Hazard)', () => {
        expect(mapPoiToPoiType(4, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.Hazard, 1)).toBe(null);
      });

      it('returns null for poi=5 (Layup)', () => {
        expect(mapPoiToPoiType(5, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.Layup, 1)).toBe(null);
      });

      it('returns null for poi=6 (Crossing)', () => {
        expect(mapPoiToPoiType(6, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.Crossing, 1)).toBe(null);
      });

      it('returns null for poi=9 (DoglegAim)', () => {
        expect(mapPoiToPoiType(9, 1)).toBe(null);
        expect(mapPoiToPoiType(GolfApiPoiType.DoglegAim, 1)).toBe(null);
      });
    });
  });

  // ==========================================================================
  // transformApiCoordinate
  // ==========================================================================
  describe('transformApiCoordinate', () => {
    // poi=1/loc=3 carries the green_back coord (despite the API enum
    // calling it "Tee Back" — see mapPoiToPoiType comment).
    it('transforms poi=1/loc=3 to green_back coordinate', () => {
      const coord = createMockCoordinate({
        poi: 1,
        location: 3,
        hole: 1,
        latitude: -37.9201,
        longitude: 145.0059,
      });

      const result = transformApiCoordinate(coord);

      expect(result).not.toBe(null);
      expect(result?.hole_number).toBe(1);
      expect(result?.poi_type).toBe('green_back');
      expect(result?.latitude).toBe(-37.9201);
      expect(result?.longitude).toBe(145.0059);
    });

    it('transforms poi=1/loc=1 to green_front coordinate', () => {
      const coord = createMockCoordinate({
        poi: 1,
        location: 1,
        hole: 5,
      });

      const result = transformApiCoordinate(coord);

      expect(result?.hole_number).toBe(5);
      expect(result?.poi_type).toBe('green_front');
    });

    it('transforms poi=1/loc=2 to green_center coordinate', () => {
      const coord = createMockCoordinate({
        poi: 1,
        location: 2,
        hole: 7,
      });

      const result = transformApiCoordinate(coord);

      expect(result?.hole_number).toBe(7);
      expect(result?.poi_type).toBe('green_center');
    });

    it('transforms poi=11 to tee_front coordinate', () => {
      const coord = createMockCoordinate({
        poi: 11,
        location: 1,
        hole: 9,
      });

      const result = transformApiCoordinate(coord);

      expect(result?.hole_number).toBe(9);
      expect(result?.poi_type).toBe('tee_front');
    });

    it('transforms poi=12 to tee_back coordinate', () => {
      const coord = createMockCoordinate({
        poi: 12,
        location: 2,
        hole: 18,
      });

      const result = transformApiCoordinate(coord);

      expect(result?.hole_number).toBe(18);
      expect(result?.poi_type).toBe('tee_back');
    });

    it('returns null for non-essential POI (fairway marker)', () => {
      const coord = createMockCoordinate({
        poi: 2, // FairwayLeft
        location: 1,
        hole: 1,
      });

      const result = transformApiCoordinate(coord);

      expect(result).toBe(null);
    });

    it('returns null for non-essential POI (hazard)', () => {
      const coord = createMockCoordinate({
        poi: 4, // Hazard
        location: 1,
        hole: 1,
      });

      const result = transformApiCoordinate(coord);

      expect(result).toBe(null);
    });

    it('maps side_of_fairway from sideFW', () => {
      const coord = createMockCoordinate({
        poi: 1,
        location: 3,
        sideFW: 2, // Center
      });

      const result = transformApiCoordinate(coord);

      expect(result?.side_of_fairway).toBe('2');
    });

    it('handles null sideFW', () => {
      const coord = createMockCoordinate({
        poi: 1,
        location: 3,
        sideFW: 0,
      });

      const result = transformApiCoordinate(coord);

      expect(result?.side_of_fairway).toBe(null);
    });
  });

  // ==========================================================================
  // transformApiCoordinates
  // ==========================================================================
  describe('transformApiCoordinates', () => {
    it('transforms all coordinates and filters non-essential', () => {
      const response: GolfApiCoordinatesResponse = {
        courseID: 'course123',
        numCoordinates: 5,
        coordinates: [
          createMockCoordinate({ poi: 1, location: 3, hole: 1 }), // green_back - keep
          createMockCoordinate({ poi: 2, location: 1, hole: 1 }), // fairway - skip
          createMockCoordinate({ poi: 11, location: 1, hole: 1 }), // tee_front - keep
          createMockCoordinate({ poi: 4, location: 1, hole: 1 }), // hazard - skip
          createMockCoordinate({ poi: 12, location: 2, hole: 1 }), // tee_back - keep
        ],
        apiRequestsLeft: '10',
      };

      const result = transformApiCoordinates(response);

      expect(result.length).toBe(3);
      expect(result[0].poi_type).toBe('green_back');
      expect(result[1].poi_type).toBe('tee_front');
      expect(result[2].poi_type).toBe('tee_back');
    });

    it('handles empty coordinates array', () => {
      const response: GolfApiCoordinatesResponse = {
        courseID: 'course123',
        numCoordinates: 0,
        coordinates: [],
        apiRequestsLeft: '10',
      };

      const result = transformApiCoordinates(response);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // filterEssentialCoordinates
  // ==========================================================================
  describe('filterEssentialCoordinates', () => {
    it('keeps only tee and green coordinates', () => {
      const coords: GolfApiCoordinate[] = [
        createMockCoordinate({ poi: 1 }), // Tee - keep
        createMockCoordinate({ poi: 2 }), // FairwayLeft - skip
        createMockCoordinate({ poi: 3 }), // FairwayRight - skip
        createMockCoordinate({ poi: 4 }), // Hazard - skip
        createMockCoordinate({ poi: 11 }), // GreenFront - keep
        createMockCoordinate({ poi: 12 }), // GreenCenter - keep
      ];

      const result = filterEssentialCoordinates(coords);

      expect(result.length).toBe(3);
      expect(result[0].poi).toBe(1);
      expect(result[1].poi).toBe(11);
      expect(result[2].poi).toBe(12);
    });
  });

  // ==========================================================================
  // Validation Helpers
  // ==========================================================================
  describe('validation helpers', () => {
    describe('hasHoleData', () => {
      it('returns true for 18 valid holes', () => {
        const course = {
          holes: Array.from({ length: 18 }, (_, i) => ({
            number: (i + 1) as Hole['number'],
            par: 4 as Hole['par'],
            strokeIndex: i + 1,
          })),
        };

        expect(hasHoleData(course)).toBe(true);
      });

      it('returns true for 9 valid holes', () => {
        const course = {
          holes: Array.from({ length: 9 }, (_, i) => ({
            number: (i + 1) as Hole['number'],
            par: 4 as Hole['par'],
            strokeIndex: i + 1,
          })),
        };

        expect(hasHoleData(course)).toBe(true);
      });

      it('returns false for empty holes array', () => {
        expect(hasHoleData({ holes: [] })).toBe(false);
      });

      it('returns false for null holes', () => {
        expect(hasHoleData({ holes: null })).toBe(false);
      });

      it('returns false for undefined holes', () => {
        expect(hasHoleData({})).toBe(false);
      });
    });

    describe('hasCompleteHoleData', () => {
      it('returns true for complete 18 holes', () => {
        const holes = Array.from({ length: 18 }, (_, i) => ({
          number: i + 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
          par: 4 as 3 | 4 | 5,
          strokeIndex: i + 1,
        }));

        expect(hasCompleteHoleData(holes)).toBe(true);
      });

      it('returns true for complete 9 holes', () => {
        const holes = Array.from({ length: 9 }, (_, i) => ({
          number: i + 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
          par: 4 as 3 | 4 | 5,
          strokeIndex: i + 1,
        }));

        expect(hasCompleteHoleData(holes)).toBe(true);
      });

      it('returns false for incomplete holes (17 holes)', () => {
        const holes = Array.from({ length: 17 }, (_, i) => ({
          number: i + 1,
          par: 4 as 3 | 4 | 5,
          strokeIndex: i + 1,
        }));

        expect(hasCompleteHoleData(holes as any)).toBe(false);
      });

      it('returns false for null', () => {
        expect(hasCompleteHoleData(null)).toBe(false);
      });

      it('returns false for empty array', () => {
        expect(hasCompleteHoleData([])).toBe(false);
      });
    });

    describe('hasTeeData', () => {
      it('returns true for non-empty tees', () => {
        expect(hasTeeData([{ name: 'Blue' }])).toBe(true);
      });

      it('returns false for empty tees', () => {
        expect(hasTeeData([])).toBe(false);
      });

      it('returns false for null', () => {
        expect(hasTeeData(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(hasTeeData(undefined)).toBe(false);
      });
    });

    describe('hasCoordinateData', () => {
      it('returns true for non-empty coordinates', () => {
        expect(hasCoordinateData([{ hole_number: 1, poi_type: 'tee_back' }])).toBe(true);
      });

      it('returns false for empty coordinates', () => {
        expect(hasCoordinateData([])).toBe(false);
      });

      it('returns false for null', () => {
        expect(hasCoordinateData(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(hasCoordinateData(undefined)).toBe(false);
      });
    });

    describe('calculateTotalPar', () => {
      it('calculates total par for 18 holes', () => {
        const holes = [
          { number: 1, par: 4, strokeIndex: 1 },
          { number: 2, par: 5, strokeIndex: 2 },
          { number: 3, par: 3, strokeIndex: 3 },
          { number: 4, par: 4, strokeIndex: 4 },
          { number: 5, par: 5, strokeIndex: 5 },
          { number: 6, par: 4, strokeIndex: 6 },
          { number: 7, par: 3, strokeIndex: 7 },
          { number: 8, par: 4, strokeIndex: 8 },
          { number: 9, par: 4, strokeIndex: 9 },
          { number: 10, par: 4, strokeIndex: 10 },
          { number: 11, par: 3, strokeIndex: 11 },
          { number: 12, par: 5, strokeIndex: 12 },
          { number: 13, par: 4, strokeIndex: 13 },
          { number: 14, par: 5, strokeIndex: 14 },
          { number: 15, par: 4, strokeIndex: 15 },
          { number: 16, par: 3, strokeIndex: 16 },
          { number: 17, par: 4, strokeIndex: 17 },
          { number: 18, par: 4, strokeIndex: 18 },
        ];

        expect(calculateTotalPar(holes as any)).toBe(72);
      });

      it('returns 0 for empty holes', () => {
        expect(calculateTotalPar([])).toBe(0);
      });
    });

    describe('isValidClubResponse', () => {
      it('returns true for valid club with name and ID', () => {
        expect(isValidClubResponse({ name: 'Test Club', golfapi_club_id: '123' })).toBe(true);
      });

      it('returns false for missing name', () => {
        expect(isValidClubResponse({ golfapi_club_id: '123' })).toBe(false);
      });

      it('returns false for missing golfapi_club_id', () => {
        expect(isValidClubResponse({ name: 'Test Club' })).toBe(false);
      });

      it('returns false for empty name', () => {
        expect(isValidClubResponse({ name: '', golfapi_club_id: '123' })).toBe(false);
      });
    });

    describe('isValidTransformedCourse', () => {
      it('returns true for valid course with name and golfapi_course_id', () => {
        expect(isValidTransformedCourse({ name: 'West Course', golfapi_course_id: '123' })).toBe(true);
      });

      it('returns true for valid course with name and club_id', () => {
        expect(isValidTransformedCourse({ name: 'West Course', club_id: 'uuid-123' })).toBe(true);
      });

      it('returns false for missing name', () => {
        expect(isValidTransformedCourse({ golfapi_course_id: '123' })).toBe(false);
      });

      it('returns false for missing IDs', () => {
        expect(isValidTransformedCourse({ name: 'West Course' })).toBe(false);
      });
    });
  });

  // ==========================================================================
  // parseApiTimestamp
  // ==========================================================================
  describe('parseApiTimestamp', () => {
    it('parses Unix timestamp string (seconds) to ISO string', () => {
      const result = parseApiTimestamp('1704067200'); // 2024-01-01 00:00:00 UTC

      expect(result).toBeDefined();
      expect(result).toMatch(/^2024-01-01T/);
    });

    it('parses Unix timestamp number (seconds)', () => {
      const result = parseApiTimestamp(1704067200);

      expect(result).toBeDefined();
      expect(result).toMatch(/^2024-01-01T/);
    });

    it('handles millisecond timestamps', () => {
      const result = parseApiTimestamp(1704067200000); // Already in ms

      expect(result).toBeDefined();
      expect(result).toMatch(/^2024-01-01T/);
    });

    it('returns null for empty string', () => {
      expect(parseApiTimestamp('')).toBe(null);
    });

    it('returns null for invalid string', () => {
      expect(parseApiTimestamp('invalid')).toBe(null);
    });

    it('returns null for 0', () => {
      expect(parseApiTimestamp(0)).toBe(null);
    });
  });

  // ==========================================================================
  // getCourseDataStatus
  // ==========================================================================
  describe('getCourseDataStatus', () => {
    it('returns full status for complete course', () => {
      const course = {
        name: 'West Course',
        club_id: 'uuid-123',
        course_rating: 73.5,
        slope_rating: 135,
        holes: Array.from({ length: 18 }, (_, i) => ({
          number: i + 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
          par: 4 as 3 | 4 | 5,
          strokeIndex: i + 1,
        })),
      };
      const tees = [{ name: 'Blue' }];
      const coordinates = [{ hole_number: 1, poi_type: 'tee_back' as const }];

      const result = getCourseDataStatus(course, tees, coordinates);

      expect(result.hasBasicInfo).toBe(true);
      expect(result.hasHoles).toBe(true);
      expect(result.hasCompleteHoles).toBe(true);
      expect(result.hasTees).toBe(true);
      expect(result.hasCoordinates).toBe(true);
      expect(result.hasRatings).toBe(true);
      expect(result.hasLocation).toBe(true);
      expect(result.completeness).toBe(100);
    });

    it('calculates partial completeness', () => {
      const course = {
        name: 'West Course',
        holes: Array.from({ length: 18 }, (_, i) => ({
          number: i + 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
          par: 4 as 3 | 4 | 5,
          strokeIndex: i + 1,
        })),
      };

      const result = getCourseDataStatus(course);

      expect(result.hasBasicInfo).toBe(true);
      expect(result.hasHoles).toBe(true);
      expect(result.hasCompleteHoles).toBe(true);
      expect(result.hasTees).toBe(false);
      expect(result.hasCoordinates).toBe(false);
      expect(result.hasRatings).toBe(false);
      expect(result.hasLocation).toBe(false);
      expect(result.completeness).toBe(45); // 20 (basic) + 25 (holes)
    });

    it('returns zero completeness for minimal course', () => {
      const course = {};

      const result = getCourseDataStatus(course);

      expect(result.hasBasicInfo).toBe(false);
      expect(result.hasHoles).toBe(false);
      expect(result.completeness).toBe(0);
    });
  });
});
