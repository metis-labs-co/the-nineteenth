import { fetchOsmHazards } from '@/services/hazards/osmHazards';

const bbox = { south: -37.83, west: 144.95, north: -37.8, east: 144.98 };

const buildFetch = (response: unknown): typeof fetch =>
  jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => response,
  })) as unknown as typeof fetch;

describe('fetchOsmHazards', () => {
  it('parses bunker ways', async () => {
    const json = {
      elements: [
        {
          type: 'way',
          id: 1,
          tags: { golf: 'bunker' },
          geometry: [
            { lat: -37.81, lon: 144.96 },
            { lat: -37.811, lon: 144.961 },
            { lat: -37.812, lon: 144.96 },
            { lat: -37.81, lon: 144.96 },
          ],
        },
      ],
    };
    const result = await fetchOsmHazards(bbox, buildFetch(json));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'bunker',
      source: 'osm',
      externalId: 'osm/way/1',
    });
    expect(result[0].polygon).toHaveLength(4);
  });

  it('parses water hazard ways', async () => {
    const json = {
      elements: [
        {
          type: 'way',
          id: 2,
          tags: { golf: 'water_hazard' },
          geometry: [
            { lat: 0, lon: 0 },
            { lat: 1, lon: 0 },
            { lat: 1, lon: 1 },
            { lat: 0, lon: 0 },
          ],
        },
      ],
    };
    const result = await fetchOsmHazards(bbox, buildFetch(json));
    expect(result[0].type).toBe('water');
  });

  it('parses natural=water on a golf-tagged way as water', async () => {
    const json = {
      elements: [
        {
          type: 'way',
          id: 3,
          tags: { natural: 'water', golf: 'lateral_water_hazard' },
          geometry: [
            { lat: 0, lon: 0 },
            { lat: 1, lon: 0 },
            { lat: 1, lon: 1 },
            { lat: 0, lon: 0 },
          ],
        },
      ],
    };
    const result = await fetchOsmHazards(bbox, buildFetch(json));
    expect(result[0].type).toBe('water');
  });

  it('skips non-hazard ways', async () => {
    const json = {
      elements: [
        {
          type: 'way',
          id: 4,
          tags: { highway: 'unclassified' },
          geometry: [
            { lat: 0, lon: 0 },
            { lat: 1, lon: 0 },
          ],
        },
      ],
    };
    const result = await fetchOsmHazards(bbox, buildFetch(json));
    expect(result).toEqual([]);
  });

  it('skips ways with fewer than 3 points', async () => {
    const json = {
      elements: [
        {
          type: 'way',
          id: 5,
          tags: { golf: 'bunker' },
          geometry: [
            { lat: 0, lon: 0 },
            { lat: 1, lon: 0 },
          ],
        },
      ],
    };
    const result = await fetchOsmHazards(bbox, buildFetch(json));
    expect(result).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    const badFetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(fetchOsmHazards(bbox, badFetch)).rejects.toThrow(/503/);
  });
});
