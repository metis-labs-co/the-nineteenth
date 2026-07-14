/**
 * Unit tests for the shared club-coordinate helpers.
 */

import { parseClubLocation, parseClubCoords } from '@/utils/gpsCalculations';

describe('parseClubLocation', () => {
  it('reads GeoJSON [lng, lat] into { latitude, longitude }', () => {
    expect(parseClubLocation({ coordinates: [144.9, -37.8] })).toEqual({
      latitude: -37.8,
      longitude: 144.9,
    });
  });

  it('returns { null, null } for a missing or too-short coordinate pair', () => {
    expect(parseClubLocation(null)).toEqual({ latitude: null, longitude: null });
    expect(parseClubLocation(undefined)).toEqual({ latitude: null, longitude: null });
    expect(parseClubLocation({ coordinates: null })).toEqual({ latitude: null, longitude: null });
    expect(parseClubLocation({ coordinates: [144.9] })).toEqual({
      latitude: null,
      longitude: null,
    });
  });
});

describe('parseClubCoords', () => {
  it('prefers the hydrated latitude/longitude fields', () => {
    expect(
      parseClubCoords({
        latitude: -37.8,
        longitude: 144.9,
        location: { coordinates: [1, 2] }, // ignored when hydrated fields present
      })
    ).toEqual({ lat: -37.8, lng: 144.9 });
  });

  it('falls back to the GeoJSON location when hydrated fields are absent', () => {
    expect(parseClubCoords({ location: { coordinates: [144.9, -37.8] } })).toEqual({
      lat: -37.8,
      lng: 144.9,
    });
  });

  it('falls back to location when only one hydrated field is present', () => {
    expect(
      parseClubCoords({ latitude: -37.8, location: { coordinates: [144.9, -37.8] } })
    ).toEqual({ lat: -37.8, lng: 144.9 });
  });

  it('returns null when neither hydrated fields nor a location exist', () => {
    expect(parseClubCoords(null)).toBeNull();
    expect(parseClubCoords(undefined)).toBeNull();
    expect(parseClubCoords({})).toBeNull();
    expect(parseClubCoords({ location: null })).toBeNull();
  });
});
