import { groupGreenCoords } from '../snapshot';

describe('groupGreenCoords', () => {
  it('groups green coords by hole and type, ignoring any tee poi', () => {
    const out = groupGreenCoords([
      { hole: 1, poiType: 'green_center', latitude: 1, longitude: 2 },
      { hole: 1, poiType: 'green_front', latitude: 3, longitude: 4 },
      { hole: 1, poiType: 'tee_back', latitude: 9, longitude: 9 },
      { hole: 2, poiType: 'green_back', latitude: 5, longitude: 6 },
    ]);
    expect(out.get(1)).toEqual({ center: { latitude: 1, longitude: 2 }, front: { latitude: 3, longitude: 4 } });
    expect(out.get(2)).toEqual({ back: { latitude: 5, longitude: 6 } });
  });
});
